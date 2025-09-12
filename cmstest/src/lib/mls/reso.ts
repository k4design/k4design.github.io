import { MlsAdapter, MlsListing, MlsMedia, MlsSearchParams, MlsSearchResponse } from './types'

export class ResoAdapter implements MlsAdapter {
  private accessToken: string | null = null
  private tokenExpiry: Date | null = null
  private baseUrl: string
  private clientId: string
  private clientSecret: string
  private redirectUri: string

  constructor() {
    this.baseUrl = process.env.RESO_API_BASE_URL || 'https://api.reso.org'
    this.clientId = process.env.RESO_CLIENT_ID || ''
    this.clientSecret = process.env.RESO_CLIENT_SECRET || ''
    this.redirectUri = process.env.RESO_REDIRECT_URI || ''
  }

  async authorize(): Promise<void> {
    // For production, implement OAuth 2.0 flow
    // For now, we'll use a mock token for development
    this.accessToken = 'mock-access-token'
    this.tokenExpiry = new Date(Date.now() + 3600000) // 1 hour from now
  }

  async searchListings(params: MlsSearchParams): Promise<MlsSearchResponse> {
    if (!this.isConnected()) {
      await this.authorize()
    }

    const queryParams = new URLSearchParams()
    
    if (params.limit) queryParams.append('$top', params.limit.toString())
    if (params.offset) queryParams.append('$skip', params.offset.toString())
    if (params.modifiedSince) queryParams.append('$filter', `ModificationTimestamp ge ${params.modifiedSince}`)
    if (params.propertyType) queryParams.append('$filter', `PropertyType eq '${params.propertyType}'`)
    if (params.city) queryParams.append('$filter', `City eq '${params.city}'`)
    if (params.state) queryParams.append('$filter', `StateOrProvince eq '${params.state}'`)
    if (params.minPrice) queryParams.append('$filter', `ListPrice ge ${params.minPrice}`)
    if (params.maxPrice) queryParams.append('$filter', `ListPrice le ${params.maxPrice}`)
    if (params.minBedrooms) queryParams.append('$filter', `BedroomsTotal ge ${params.minBedrooms}`)
    if (params.minBathrooms) queryParams.append('$filter', `BathroomsTotalInteger ge ${params.minBathrooms}`)

    const orderBy = params.orderBy || 'ModificationTimestamp'
    const orderDirection = params.orderDirection || 'desc'
    queryParams.append('$orderby', `${orderBy} ${orderDirection}`)

    const response = await fetch(`${this.baseUrl}/Property?${queryParams}`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`MLS API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    return {
      value: data.value || [],
      '@odata.count': data['@odata.count'] || 0,
      '@odata.nextLink': data['@odata.nextLink'],
    }
  }

  async getListing(listingKey: string): Promise<MlsListing | null> {
    if (!this.isConnected()) {
      await this.authorize()
    }

    const response = await fetch(`${this.baseUrl}/Property('${listingKey}')`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error(`MLS API error: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  }

  async getMedia(listingKey: string): Promise<MlsMedia[]> {
    if (!this.isConnected()) {
      await this.authorize()
    }

    const response = await fetch(`${this.baseUrl}/Property('${listingKey}')/Media`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      if (response.status === 404) return []
      throw new Error(`MLS API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.value || []
  }

  isConnected(): boolean {
    return !!(this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date())
  }
}

// Mock data for development
export const mockListings: MlsListing[] = [
  {
    ListingKey: 'mock-1',
    ListingId: 'MLS-001',
    StandardStatus: 'Active',
    ListPrice: 2500000,
    UnparsedAddress: '123 Beverly Hills Dr',
    City: 'Beverly Hills',
    StateOrProvince: 'CA',
    PostalCode: '90210',
    BedroomsTotal: 5,
    BathroomsTotalInteger: 7,
    LivingArea: 8500,
    PropertyType: 'Residential',
    PropertySubType: 'Single Family Residence',
    YearBuilt: 2020,
    LotSizeAcres: 0.5,
    PublicRemarks: 'Stunning luxury estate in the heart of Beverly Hills.',
    ListingContractDate: '2024-01-01',
    ModificationTimestamp: '2024-01-15T10:30:00Z',
    Media: [
      {
        MediaKey: 'mock-media-1',
        MediaType: 'Photo',
        MediaURL: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&h=600&fit=crop',
        ShortDescription: 'Front exterior',
        Order: 1,
      },
    ],
  },
  {
    ListingKey: 'mock-2',
    ListingId: 'MLS-002',
    StandardStatus: 'Active',
    ListPrice: 1800000,
    UnparsedAddress: '456 Manhattan Ave',
    City: 'New York',
    StateOrProvince: 'NY',
    PostalCode: '10001',
    BedroomsTotal: 4,
    BathroomsTotalInteger: 5,
    LivingArea: 4200,
    PropertyType: 'Residential',
    PropertySubType: 'Condo/Co-op',
    YearBuilt: 2018,
    PublicRemarks: 'Modern penthouse with city views.',
    ListingContractDate: '2024-01-02',
    ModificationTimestamp: '2024-01-16T14:20:00Z',
    Media: [
      {
        MediaKey: 'mock-media-2',
        MediaType: 'Photo',
        MediaURL: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&h=600&fit=crop',
        ShortDescription: 'Living room',
        Order: 1,
      },
    ],
  },
  {
    ListingKey: 'mock-3',
    ListingId: 'MLS-003',
    StandardStatus: 'Active',
    ListPrice: 3200000,
    UnparsedAddress: '789 Monaco Blvd',
    City: 'Monaco',
    StateOrProvince: 'Monaco',
    PostalCode: '98000',
    BedroomsTotal: 6,
    BathroomsTotalInteger: 8,
    LivingArea: 12000,
    PropertyType: 'Residential',
    PropertySubType: 'Single Family Residence',
    YearBuilt: 2015,
    LotSizeAcres: 0.75,
    PublicRemarks: 'Mediterranean villa with ocean views.',
    ListingContractDate: '2024-01-03',
    ModificationTimestamp: '2024-01-17T09:15:00Z',
    Media: [
      {
        MediaKey: 'mock-media-3',
        MediaType: 'Photo',
        MediaURL: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop',
        ShortDescription: 'Villa exterior',
        Order: 1,
      },
    ],
  },
]

export class MockResoAdapter implements MlsAdapter {
  async authorize(): Promise<void> {
    // Mock implementation - always succeeds
  }

  async searchListings(params: MlsSearchParams): Promise<MlsSearchResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100))
    
    let filteredListings = [...mockListings]
    
    // Apply filters
    if (params.propertyType) {
      filteredListings = filteredListings.filter(
        listing => listing.PropertyType === params.propertyType
      )
    }
    
    if (params.city) {
      filteredListings = filteredListings.filter(
        listing => listing.City?.toLowerCase().includes(params.city!.toLowerCase())
      )
    }
    
    if (params.minPrice) {
      filteredListings = filteredListings.filter(
        listing => (listing.ListPrice || 0) >= params.minPrice!
      )
    }
    
    if (params.maxPrice) {
      filteredListings = filteredListings.filter(
        listing => (listing.ListPrice || 0) <= params.maxPrice!
      )
    }
    
    if (params.minBedrooms) {
      filteredListings = filteredListings.filter(
        listing => (listing.BedroomsTotal || 0) >= params.minBedrooms!
      )
    }
    
    if (params.minBathrooms) {
      filteredListings = filteredListings.filter(
        listing => (listing.BathroomsTotalInteger || 0) >= params.minBathrooms!
      )
    }
    
    // Apply pagination
    const limit = params.limit || 10
    const offset = params.offset || 0
    const paginatedListings = filteredListings.slice(offset, offset + limit)
    
    return {
      value: paginatedListings,
      '@odata.count': filteredListings.length,
    }
  }

  async getListing(listingKey: string): Promise<MlsListing | null> {
    await new Promise(resolve => setTimeout(resolve, 50))
    return mockListings.find(listing => listing.ListingKey === listingKey) || null
  }

  async getMedia(listingKey: string): Promise<MlsMedia[]> {
    await new Promise(resolve => setTimeout(resolve, 50))
    const listing = mockListings.find(listing => listing.ListingKey === listingKey)
    return listing?.Media || []
  }

  isConnected(): boolean {
    return true // Mock is always connected
  }
}
