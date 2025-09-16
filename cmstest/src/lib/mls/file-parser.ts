import * as XLSX from 'xlsx'

export function parseCSV(content: string): any[] {
  const lines = content.split('\n').filter(line => line.trim())
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(header => header.trim().replace(/"/g, ''))
  const listings: any[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length !== headers.length) continue

    const listing: any = {}
    headers.forEach((header, index) => {
      listing[header] = values[index]?.trim().replace(/"/g, '') || ''
    })

    // Skip empty rows
    if (listing.ListingKey || listing.UnparsedAddress) {
      listings.push(listing)
    }
  }

  return listings
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  
  result.push(current)
  return result
}

export async function parseExcel(buffer: ArrayBuffer): Promise<any[]> {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    const jsonData = XLSX.utils.sheet_to_json(worksheet)
    
    // Filter out empty rows and ensure we have valid data
    return jsonData.filter((row: any) => 
      row.ListingKey || row.UnparsedAddress || row.ListPrice
    )
  } catch (error) {
    console.error('Excel parsing error:', error)
    throw new Error('Failed to parse Excel file')
  }
}

export function parseJSON(content: string): any[] {
  try {
    const data = JSON.parse(content)
    
    // Handle different JSON structures
    if (Array.isArray(data)) {
      return data.filter(item => item.ListingKey || item.UnparsedAddress)
    } else if (data.listings && Array.isArray(data.listings)) {
      return data.listings.filter((item: any) => item.ListingKey || item.UnparsedAddress)
    } else if (data.value && Array.isArray(data.value)) {
      return data.value.filter((item: any) => item.ListingKey || item.UnparsedAddress)
    } else {
      throw new Error('Invalid JSON structure. Expected array or object with listings/value property')
    }
  } catch (error) {
    console.error('JSON parsing error:', error)
    throw new Error('Failed to parse JSON file')
  }
}

// Utility function to validate MLS data structure
export function validateMlsData(listings: any[]): { valid: any[], errors: string[] } {
  const valid: any[] = []
  const errors: string[] = []
  
  const requiredFields = ['ListingKey', 'ListPrice', 'UnparsedAddress', 'City', 'StateOrProvince']
  
  listings.forEach((listing, index) => {
    const missingFields = requiredFields.filter(field => !listing[field])
    
    if (missingFields.length > 0) {
      errors.push(`Row ${index + 1}: Missing required fields: ${missingFields.join(', ')}`)
    } else {
      // Additional validation
      if (!listing.BedroomsTotal && !listing.BathroomsTotalInteger) {
        errors.push(`Row ${index + 1}: Must have at least bedrooms or bathrooms`)
      } else {
        valid.push(listing)
      }
    }
  })
  
  return { valid, errors }
}

// Utility function to normalize MLS data
export function normalizeMlsData(listings: any[]): any[] {
  return listings.map(listing => ({
    ...listing,
    // Ensure numeric fields are properly converted
    ListPrice: listing.ListPrice ? Number(listing.ListPrice) : 0,
    BedroomsTotal: listing.BedroomsTotal ? Number(listing.BedroomsTotal) : 0,
    BathroomsTotalInteger: listing.BathroomsTotalInteger ? Number(listing.BathroomsTotalInteger) : 0,
    LivingArea: listing.LivingArea ? Number(listing.LivingArea) : null,
    LotSizeAcres: listing.LotSizeAcres ? Number(listing.LotSizeAcres) : null,
    YearBuilt: listing.YearBuilt ? Number(listing.YearBuilt) : null,
    
    // Ensure string fields are trimmed
    ListingKey: listing.ListingKey?.trim() || '',
    UnparsedAddress: listing.UnparsedAddress?.trim() || '',
    City: listing.City?.trim() || '',
    StateOrProvince: listing.StateOrProvince?.trim() || '',
    PostalCode: listing.PostalCode?.trim() || '',
    PropertyType: listing.PropertyType?.trim() || 'Residential',
    PublicRemarks: listing.PublicRemarks?.trim() || '',
    
    // Handle media URLs
    MediaURL: listing.MediaURL || listing.Media || '',
    
    // Handle property features
    PropertyFeatures: listing.PropertyFeatures || listing.Features || '',
  }))
}
