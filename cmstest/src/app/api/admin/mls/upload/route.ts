import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseCSV, parseExcel, parseJSON } from '@/lib/mls/file-parser'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !['ADMIN', 'EDITOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/json'
    ]
    
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.csv')) {
      return NextResponse.json({ error: 'Invalid file type. Please upload CSV, Excel, or JSON files.' }, { status: 400 })
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 50MB' }, { status: 400 })
    }

    // Create upload record
    const uploadRecord = await prisma.mlsUpload.create({
      data: {
        filename: file.name,
        status: 'processing',
        recordsProcessed: 0,
        recordsTotal: 0,
        uploadedBy: session.user.id,
      }
    })

    try {
      // Read file content
      const buffer = await file.arrayBuffer()
      const content = Buffer.from(buffer).toString('utf-8')

      let listings: any[] = []

      // Parse file based on type
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        listings = parseJSON(content)
      } else if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        listings = parseCSV(content)
      } else if (file.type.includes('sheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        listings = await parseExcel(buffer)
      } else {
        throw new Error('Unsupported file format')
      }

      if (listings.length === 0) {
        throw new Error('No valid listings found in file')
      }

      // Update upload record with total count
      await prisma.mlsUpload.update({
        where: { id: uploadRecord.id },
        data: { recordsTotal: listings.length }
      })

      let processedCount = 0
      const errors: string[] = []

      // Process each listing
      for (const listingData of listings) {
        try {
          // Validate required fields
          const requiredFields = ['ListingKey', 'ListPrice', 'UnparsedAddress', 'City', 'StateOrProvince']
          const missingFields = requiredFields.filter(field => !listingData[field])
          
          if (missingFields.length > 0) {
            errors.push(`Listing ${listingData.ListingKey || 'unknown'}: Missing required fields: ${missingFields.join(', ')}`)
            continue
          }

          // Check if listing already exists
          const existingListing = await prisma.listing.findUnique({
            where: { mlsId: listingData.ListingKey }
          })

          const listingDataToSave = {
            mlsId: listingData.ListingKey,
            mlsListingKey: listingData.ListingKey,
            mlsSource: 'uploaded',
            title: listingData.UnparsedAddress || `${listingData.StreetNumber || ''} ${listingData.StreetName || ''}`.trim(),
            description: listingData.PublicRemarks || '',
            status: 'ACTIVE',
            price: listingData.ListPrice ? Number(listingData.ListPrice) : 0,
            priceDisplay: listingData.ListPrice ? `$${Number(listingData.ListPrice).toLocaleString()}` : 'Price upon request',
            streetAddress: listingData.StreetNumber && listingData.StreetName 
              ? `${listingData.StreetNumber} ${listingData.StreetName}`.trim()
              : listingData.UnparsedAddress || '',
            city: listingData.City,
            state: listingData.StateOrProvince,
            zipCode: listingData.PostalCode || '',
            bedrooms: listingData.BedroomsTotal ? Number(listingData.BedroomsTotal) : 0,
            bathrooms: listingData.BathroomsTotalInteger ? Number(listingData.BathroomsTotalInteger) : 0,
            squareFeet: listingData.LivingArea ? Number(listingData.LivingArea) : null,
            lotSize: listingData.LotSizeAcres ? Number(listingData.LotSizeAcres) : null,
            yearBuilt: listingData.YearBuilt ? Number(listingData.YearBuilt) : null,
            propertyType: listingData.PropertyType || listingData.PropertySubType || 'Residential',
            lifestyles: JSON.stringify(['luxury']), // Default lifestyle
            amenities: JSON.stringify([]), // Default empty amenities
            heroImage: listingData.MediaURL || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop',
            mlsLastUpdated: new Date(),
            mlsStatus: 'Active',
            isMlsSourced: true,
            slug: generateSlug(listingData.UnparsedAddress || listingData.ListingKey),
          }

          if (existingListing) {
            // Update existing listing
            await prisma.listing.update({
              where: { id: existingListing.id },
              data: listingDataToSave
            })
          } else {
            // Create new listing
            await prisma.listing.create({
              data: listingDataToSave
            })
          }

          processedCount++

          // Update progress every 10 records
          if (processedCount % 10 === 0) {
            await prisma.mlsUpload.update({
              where: { id: uploadRecord.id },
              data: { recordsProcessed: processedCount }
            })
          }

        } catch (error) {
          console.error(`Error processing listing ${listingData.ListingKey}:`, error)
          errors.push(`Listing ${listingData.ListingKey}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      // Update final status
      const finalStatus = errors.length > 0 && processedCount === 0 ? 'error' : 'completed'
      
      await prisma.mlsUpload.update({
        where: { id: uploadRecord.id },
        data: {
          status: finalStatus,
          recordsProcessed: processedCount,
          completedAt: new Date(),
          error: errors.length > 0 ? errors.slice(0, 5).join('; ') : null // Store first 5 errors
        }
      })

      return NextResponse.json({
        success: true,
        message: `Successfully processed ${processedCount} listings`,
        processed: processedCount,
        total: listings.length,
        errors: errors.length,
        uploadId: uploadRecord.id
      })

    } catch (error) {
      console.error('File processing error:', error)
      
      await prisma.mlsUpload.update({
        where: { id: uploadRecord.id },
        data: {
          status: 'error',
          completedAt: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })

      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'File processing failed'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({
      success: false,
      error: 'Upload failed'
    }, { status: 500 })
  }
}

function generateSlug(address: string): string {
  return address
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}
