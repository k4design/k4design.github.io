import { MlsAdapter, MlsListing, MlsMedia, MlsSearchParams, MlsSearchResponse } from './types'

export interface MockMlsListing {
  ListingKey: string
  ListingId: string
  PropertyType: string
  PropertySubType: string
  StandardStatus: string
  ListingContractDate: string
  CloseDate?: string
  ListPrice: number
  UnparsedAddress: string
  StreetName: string
  StreetNumber: string
  City: string
  StateOrProvince: string
  PostalCode: string
  BedroomsTotal: number
  BathroomsTotalInteger: number
  LivingArea: number
  LotSizeAcres?: number
  YearBuilt?: number
  PublicRemarks: string
  Media: Array<{
    MediaKey: string
    MediaURL: string
    MediaType: string
    ShortDescription?: string
  }>
  VirtualTourURL?: string
  ListingAgents?: Array<{
    MemberKey: string
    MemberFirstName: string
    MemberLastName: string
    MemberEmail: string
    MemberPhone: string
  }>
  PropertyFeatures?: string[]
  SubdivisionName?: string
  ElementarySchool?: string
  MiddleOrJuniorSchool?: string
  HighSchool?: string
  TaxAssessedValue?: number
  TaxAnnualAmount?: number
  LastChangeTimestamp: string
}

export class MockMlsAdapter implements MlsAdapter {
  private baseUrl: string
  private clientId: string
  private clientSecret: string
  private accessToken?: string
  private connected: boolean = false

  constructor(config: { baseUrl: string; clientId: string; clientSecret: string }) {
    this.baseUrl = config.baseUrl
    this.clientId = config.clientId
    this.clientSecret = config.clientSecret
  }

  async authorize(): Promise<void> {
    // Mock authentication - always succeeds
    this.accessToken = 'mock-access-token-' + Date.now()
    this.connected = true
  }

  isConnected(): boolean {
    return this.connected
  }

  async searchListings(params: MlsSearchParams): Promise<MlsSearchResponse> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100))

    const { limit = 50, offset = 0 } = params
    
    const mockListings: MockMlsListing[] = [
      {
        ListingKey: 'mock-luxury-1',
        ListingId: 'MLS-LUX-001',
        PropertyType: 'Residential',
        PropertySubType: 'Single Family Residence',
        StandardStatus: 'Active',
        ListingContractDate: '2024-01-15T10:00:00Z',
        ListPrice: 8500000,
        UnparsedAddress: '123 Beverly Hills Drive, Beverly Hills, CA 90210',
        StreetName: 'Beverly Hills Drive',
        StreetNumber: '123',
        City: 'Beverly Hills',
        StateOrProvince: 'CA',
        PostalCode: '90210',
        BedroomsTotal: 8,
        BathroomsTotalInteger: 10,
        LivingArea: 12500,
        LotSizeAcres: 2.5,
        YearBuilt: 2020,
        PublicRemarks: 'Stunning contemporary estate in the heart of Beverly Hills. This architectural masterpiece features 8 bedrooms, 10 bathrooms, and over 12,500 sq ft of living space. The property includes a resort-style pool, home theater, wine cellar, and panoramic city views. Smart home technology throughout with premium finishes and designer touches.',
        Media: [
          {
            MediaKey: 'img-001',
            MediaURL: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&h=800&fit=crop',
            MediaType: 'Photo',
            ShortDescription: 'Front elevation'
          },
          {
            MediaKey: 'img-002',
            MediaURL: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1200&h=800&fit=crop',
            MediaType: 'Photo',
            ShortDescription: 'Living room'
          },
          {
            MediaKey: 'img-003',
            MediaURL: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&h=800&fit=crop',
            MediaType: 'Photo',
            ShortDescription: 'Kitchen'
          }
        ],
        VirtualTourURL: 'https://example.com/virtual-tour/luxury-1',
        PropertyFeatures: ['Pool', 'Spa', 'Home Theater', 'Wine Cellar', 'Smart Home', 'City Views', 'Gated Community'],
        SubdivisionName: 'Beverly Hills Estates',
        ElementarySchool: 'Hawthorne Elementary',
        MiddleOrJuniorSchool: 'Beverly Hills Middle School',
        HighSchool: 'Beverly Hills High School',
        TaxAssessedValue: 8200000,
        TaxAnnualAmount: 82000,
        LastChangeTimestamp: '2024-01-20T15:30:00Z'
      },
      {
        ListingKey: 'mock-penthouse-1',
        ListingId: 'MLS-PENT-002',
        PropertyType: 'Residential',
        PropertySubType: 'Condo/Co-op',
        StandardStatus: 'Active',
        ListingContractDate: '2024-01-16T09:00:00Z',
        ListPrice: 4200000,
        UnparsedAddress: '456 Central Park South, New York, NY 10019',
        StreetName: 'Central Park South',
        StreetNumber: '456',
        City: 'New York',
        StateOrProvince: 'NY',
        PostalCode: '10019',
        BedroomsTotal: 4,
        BathroomsTotalInteger: 4,
        LivingArea: 4200,
        YearBuilt: 2018,
        PublicRemarks: 'Spectacular penthouse with unobstructed Central Park views. This 4-bedroom, 4-bathroom residence features floor-to-ceiling windows, premium finishes, and a private terrace. Building amenities include 24/7 concierge, fitness center, and rooftop lounge.',
        Media: [
          {
            MediaKey: 'img-004',
            MediaURL: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&h=800&fit=crop',
            MediaType: 'Photo',
            ShortDescription: 'Living room with park views'
          },
          {
            MediaKey: 'img-005',
            MediaURL: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&h=800&fit=crop',
            MediaType: 'Photo',
            ShortDescription: 'Master bedroom'
          }
        ],
        VirtualTourURL: 'https://example.com/virtual-tour/penthouse-1',
        PropertyFeatures: ['City Views', 'Park Views', 'Private Terrace', 'Concierge', 'Fitness Center', 'Rooftop Lounge'],
        ElementarySchool: 'PS 111',
        MiddleOrJuniorSchool: 'MS 104',
        HighSchool: 'Fiorello H. LaGuardia High School',
        TaxAssessedValue: 4000000,
        TaxAnnualAmount: 48000,
        LastChangeTimestamp: '2024-01-19T11:45:00Z'
      },
      {
        ListingKey: 'mock-villa-1',
        ListingId: 'MLS-VILLA-003',
        PropertyType: 'Residential',
        PropertySubType: 'Villa',
        StandardStatus: 'Active',
        ListingContractDate: '2024-01-17T14:00:00Z',
        ListPrice: 12500000,
        UnparsedAddress: '789 Avenue Princesse Grace, Monaco 98000',
        StreetName: 'Avenue Princesse Grace',
        StreetNumber: '789',
        City: 'Monaco',
        StateOrProvince: 'Monaco',
        PostalCode: '98000',
        BedroomsTotal: 6,
        BathroomsTotalInteger: 8,
        LivingArea: 15000,
        LotSizeAcres: 0.8,
        YearBuilt: 2015,
        PublicRemarks: 'Magnificent Mediterranean villa overlooking the azure waters of the French Riviera. This 6-bedroom, 8-bathroom estate features infinity pool, private beach access, yacht berth, and panoramic sea views. Impeccably designed with the finest materials and finishes.',
        Media: [
          {
            MediaKey: 'img-006',
            MediaURL: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&h=800&fit=crop',
            MediaType: 'Photo',
            ShortDescription: 'Villa exterior with sea views'
          },
          {
            MediaKey: 'img-007',
            MediaURL: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1200&h=800&fit=crop',
            MediaType: 'Photo',
            ShortDescription: 'Infinity pool'
          }
        ],
        VirtualTourURL: 'https://example.com/virtual-tour/villa-1',
        PropertyFeatures: ['Sea Views', 'Infinity Pool', 'Private Beach', 'Yacht Berth', 'Wine Cellar', 'Home Theater', 'Staff Quarters'],
        TaxAssessedValue: 12000000,
        TaxAnnualAmount: 60000,
        LastChangeTimestamp: '2024-01-18T16:20:00Z'
      },
      {
        ListingKey: 'mock-mansion-1',
        ListingId: 'MLS-MANS-004',
        PropertyType: 'Residential',
        PropertySubType: 'Single Family Residence',
        StandardStatus: 'Active',
        ListingContractDate: '2024-01-18T12:00:00Z',
        ListPrice: 18500000,
        UnparsedAddress: '101 Bel Air Road, Los Angeles, CA 90077',
        StreetName: 'Bel Air Road',
        StreetNumber: '101',
        City: 'Los Angeles',
        StateOrProvince: 'CA',
        PostalCode: '90077',
        BedroomsTotal: 12,
        BathroomsTotalInteger: 15,
        LivingArea: 25000,
        LotSizeAcres: 5.2,
        YearBuilt: 2019,
        PublicRemarks: 'Extraordinary Bel Air estate with unparalleled luxury and privacy. This 12-bedroom, 15-bathroom mansion features a 10-car garage, tennis court, putting green, infinity pool with cabana, home theater, wine cellar, and guest house. Stunning city and ocean views.',
        Media: [
          {
            MediaKey: 'img-008',
            MediaURL: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&h=800&fit=crop',
            MediaType: 'Photo',
            ShortDescription: 'Main entrance'
          },
          {
            MediaKey: 'img-009',
            MediaURL: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&h=800&fit=crop',
            MediaType: 'Photo',
            ShortDescription: 'Tennis court'
          }
        ],
        VirtualTourURL: 'https://example.com/virtual-tour/mansion-1',
        PropertyFeatures: ['Tennis Court', 'Putting Green', 'Infinity Pool', '10-Car Garage', 'Guest House', 'Home Theater', 'Wine Cellar', 'City Views', 'Ocean Views'],
        SubdivisionName: 'Bel Air',
        ElementarySchool: 'Roscomare Road Elementary',
        MiddleOrJuniorSchool: 'Emerson Middle School',
        HighSchool: 'University High School',
        TaxAssessedValue: 18000000,
        TaxAnnualAmount: 180000,
        LastChangeTimestamp: '2024-01-19T08:15:00Z'
      },
      {
        ListingKey: 'mock-loft-1',
        ListingId: 'MLS-LOFT-005',
        PropertyType: 'Residential',
        PropertySubType: 'Loft',
        StandardStatus: 'Active',
        ListingContractDate: '2024-01-19T10:30:00Z',
        ListPrice: 2800000,
        UnparsedAddress: '321 West Broadway, New York, NY 10013',
        StreetName: 'West Broadway',
        StreetNumber: '321',
        City: 'New York',
        StateOrProvince: 'NY',
        PostalCode: '10013',
        BedroomsTotal: 3,
        BathroomsTotalInteger: 3,
        LivingArea: 3200,
        YearBuilt: 2021,
        PublicRemarks: 'Stunning converted loft in trendy SoHo. This 3-bedroom, 3-bathroom residence features exposed brick walls, high ceilings, hardwood floors, and large windows. Perfect for entertaining with open-concept living space and modern kitchen.',
        Media: [
          {
            MediaKey: 'img-010',
            MediaURL: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&h=800&fit=crop',
            MediaType: 'Photo',
            ShortDescription: 'Open living space'
          },
          {
            MediaKey: 'img-011',
            MediaURL: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&h=800&fit=crop',
            MediaType: 'Photo',
            ShortDescription: 'Kitchen'
          }
        ],
        VirtualTourURL: 'https://example.com/virtual-tour/loft-1',
        PropertyFeatures: ['Exposed Brick', 'High Ceilings', 'Hardwood Floors', 'Large Windows', 'Modern Kitchen', 'SoHo Location'],
        ElementarySchool: 'PS 3',
        MiddleOrJuniorSchool: 'MS 297',
        HighSchool: 'Stuyvesant High School',
        TaxAssessedValue: 2700000,
        TaxAnnualAmount: 32400,
        LastChangeTimestamp: '2024-01-20T13:45:00Z'
      },
      {
        ListingKey: 'mock-townhouse-1',
        ListingId: 'MLS-TH-006',
        PropertyType: 'Residential',
        PropertySubType: 'Townhouse',
        StandardStatus: 'Active',
        ListingContractDate: '2024-01-20T14:00:00Z',
        ListPrice: 3200000,
        UnparsedAddress: '555 Park Avenue, New York, NY 10021',
        StreetName: 'Park Avenue',
        StreetNumber: '555',
        City: 'New York',
        StateOrProvince: 'NY',
        PostalCode: '10021',
        BedroomsTotal: 5,
        BathroomsTotalInteger: 5,
        LivingArea: 4800,
        YearBuilt: 2017,
        PublicRemarks: 'Elegant townhouse on prestigious Park Avenue. This 5-bedroom, 5-bathroom residence features a private elevator, rooftop terrace, and modern amenities. Prime Upper East Side location with easy access to Central Park.',
        Media: [
          {
            MediaKey: 'img-012',
            MediaURL: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1200&h=800&fit=crop',
            MediaType: 'Photo',
            ShortDescription: 'Townhouse exterior'
          }
        ],
        PropertyFeatures: ['Private Elevator', 'Rooftop Terrace', 'Park Views', 'Modern Amenities', 'Upper East Side'],
        ElementarySchool: 'PS 6',
        MiddleOrJuniorSchool: 'MS 167',
        HighSchool: 'Hunter College High School',
        TaxAssessedValue: 3100000,
        TaxAnnualAmount: 37200,
        LastChangeTimestamp: '2024-01-21T09:30:00Z'
      },
      {
        ListingKey: 'mock-penthouse-2',
        ListingId: 'MLS-PENT-007',
        PropertyType: 'Residential',
        PropertySubType: 'Condo/Co-op',
        StandardStatus: 'Active',
        ListingContractDate: '2024-01-21T11:00:00Z',
        ListPrice: 6800000,
        UnparsedAddress: '1 Central Park West, New York, NY 10023',
        StreetName: 'Central Park West',
        StreetNumber: '1',
        City: 'New York',
        StateOrProvince: 'NY',
        PostalCode: '10023',
        BedroomsTotal: 6,
        BathroomsTotalInteger: 7,
        LivingArea: 7200,
        YearBuilt: 2016,
        PublicRemarks: 'Spectacular penthouse with panoramic Central Park views. This 6-bedroom, 7-bathroom residence features a private terrace, chef\'s kitchen, and premium finishes throughout. Building amenities include concierge, fitness center, and valet parking.',
        Media: [
          {
            MediaKey: 'img-013',
            MediaURL: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&h=800&fit=crop',
            MediaType: 'Photo',
            ShortDescription: 'Park views from living room'
          }
        ],
        PropertyFeatures: ['Park Views', 'Private Terrace', 'Chef\'s Kitchen', 'Concierge', 'Fitness Center', 'Valet Parking'],
        ElementarySchool: 'PS 87',
        MiddleOrJuniorSchool: 'MS 54',
        HighSchool: 'Fiorello H. LaGuardia High School',
        TaxAssessedValue: 6500000,
        TaxAnnualAmount: 78000,
        LastChangeTimestamp: '2024-01-22T15:20:00Z'
      },
      {
        ListingKey: 'mock-estate-1',
        ListingId: 'MLS-EST-008',
        PropertyType: 'Residential',
        PropertySubType: 'Single Family Residence',
        StandardStatus: 'Active',
        ListingContractDate: '2024-01-22T13:30:00Z',
        ListPrice: 12500000,
        UnparsedAddress: '456 Sunset Boulevard, Los Angeles, CA 90028',
        StreetName: 'Sunset Boulevard',
        StreetNumber: '456',
        City: 'Los Angeles',
        StateOrProvince: 'CA',
        PostalCode: '90028',
        BedroomsTotal: 9,
        BathroomsTotalInteger: 12,
        LivingArea: 18000,
        LotSizeAcres: 3.8,
        YearBuilt: 2018,
        PublicRemarks: 'Stunning Hollywood Hills estate with breathtaking city views. This 9-bedroom, 12-bathroom residence features a home theater, wine cellar, infinity pool, and guest house. Perfect for entertaining with multiple outdoor spaces.',
        Media: [
          {
            MediaKey: 'img-014',
            MediaURL: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&h=800&fit=crop',
            MediaType: 'Photo',
            ShortDescription: 'Estate with city views'
          }
        ],
        PropertyFeatures: ['City Views', 'Home Theater', 'Wine Cellar', 'Infinity Pool', 'Guest House', 'Multiple Outdoor Spaces'],
        SubdivisionName: 'Hollywood Hills',
        ElementarySchool: 'Hollywood Elementary',
        MiddleOrJuniorSchool: 'Le Conte Middle School',
        HighSchool: 'Hollywood High School',
        TaxAssessedValue: 12000000,
        TaxAnnualAmount: 120000,
        LastChangeTimestamp: '2024-01-23T10:45:00Z'
      },
      {
        ListingKey: 'mock-condo-1',
        ListingId: 'MLS-CONDO-009',
        PropertyType: 'Residential',
        PropertySubType: 'Condo/Co-op',
        StandardStatus: 'Active',
        ListingContractDate: '2024-01-23T09:15:00Z',
        ListPrice: 1800000,
        UnparsedAddress: '888 Biscayne Boulevard, Miami, FL 33132',
        StreetName: 'Biscayne Boulevard',
        StreetNumber: '888',
        City: 'Miami',
        StateOrProvince: 'FL',
        PostalCode: '33132',
        BedroomsTotal: 2,
        BathroomsTotalInteger: 2,
        LivingArea: 1800,
        YearBuilt: 2020,
        PublicRemarks: 'Modern waterfront condo with stunning bay views. This 2-bedroom, 2-bathroom residence features floor-to-ceiling windows, private balcony, and high-end finishes. Building amenities include pool, gym, and concierge.',
        Media: [
          {
            MediaKey: 'img-015',
            MediaURL: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&h=800&fit=crop',
            MediaType: 'Photo',
            ShortDescription: 'Waterfront views'
          }
        ],
        PropertyFeatures: ['Bay Views', 'Floor-to-Ceiling Windows', 'Private Balcony', 'Pool', 'Gym', 'Concierge'],
        ElementarySchool: 'Miami Beach Elementary',
        MiddleOrJuniorSchool: 'Nautilus Middle School',
        HighSchool: 'Miami Beach Senior High',
        TaxAssessedValue: 1750000,
        TaxAnnualAmount: 21000,
        LastChangeTimestamp: '2024-01-24T12:30:00Z'
      },
      {
        ListingKey: 'mock-villa-2',
        ListingId: 'MLS-VILLA-010',
        PropertyType: 'Residential',
        PropertySubType: 'Villa',
        StandardStatus: 'Active',
        ListingContractDate: '2024-01-24T16:00:00Z',
        ListPrice: 9500000,
        UnparsedAddress: '123 Ocean Drive, Malibu, CA 90265',
        StreetName: 'Ocean Drive',
        StreetNumber: '123',
        City: 'Malibu',
        StateOrProvince: 'CA',
        PostalCode: '90265',
        BedroomsTotal: 7,
        BathroomsTotalInteger: 8,
        LivingArea: 11000,
        LotSizeAcres: 1.2,
        YearBuilt: 2017,
        PublicRemarks: 'Spectacular beachfront villa with direct beach access. This 7-bedroom, 8-bathroom residence features panoramic ocean views, infinity pool, and modern architecture. Perfect for luxury beachside living.',
        Media: [
          {
            MediaKey: 'img-016',
            MediaURL: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&h=800&fit=crop',
            MediaType: 'Photo',
            ShortDescription: 'Beachfront villa'
          }
        ],
        PropertyFeatures: ['Ocean Views', 'Direct Beach Access', 'Infinity Pool', 'Modern Architecture', 'Beachside Living'],
        SubdivisionName: 'Malibu Colony',
        ElementarySchool: 'Malibu Elementary',
        MiddleOrJuniorSchool: 'Malibu Middle School',
        HighSchool: 'Malibu High School',
        TaxAssessedValue: 9200000,
        TaxAnnualAmount: 92000,
        LastChangeTimestamp: '2024-01-25T14:15:00Z'
      }
    ]

    // Return subset based on limit and offset
    const listings = mockListings.slice(offset, offset + limit)
    
    return {
      value: listings.map(this.convertToMlsListing),
      '@odata.count': mockListings.length
    }
  }

  private convertToMlsListing(mockListing: MockMlsListing): MlsListing {
    return {
      ListingKey: mockListing.ListingKey,
      ListingId: mockListing.ListingId,
      StandardStatus: mockListing.StandardStatus,
      ListPrice: mockListing.ListPrice,
      UnparsedAddress: mockListing.UnparsedAddress,
      City: mockListing.City,
      StateOrProvince: mockListing.StateOrProvince,
      PostalCode: mockListing.PostalCode,
      BedroomsTotal: mockListing.BedroomsTotal,
      BathroomsTotalInteger: mockListing.BathroomsTotalInteger,
      LivingArea: mockListing.LivingArea,
      PropertyType: mockListing.PropertyType,
      PropertySubType: mockListing.PropertySubType,
      YearBuilt: mockListing.YearBuilt,
      LotSizeAcres: mockListing.LotSizeAcres,
      PublicRemarks: mockListing.PublicRemarks,
      ListingContractDate: mockListing.ListingContractDate,
      ModificationTimestamp: mockListing.LastChangeTimestamp,
      Media: mockListing.Media?.map(media => ({
        MediaKey: media.MediaKey,
        MediaType: media.MediaType,
        MediaURL: media.MediaURL,
        ShortDescription: media.ShortDescription,
        Order: 0
      }))
    }
  }

  async getListing(listingKey: string): Promise<MlsListing | null> {
    const response = await this.searchListings({ limit: 100 })
    const listing = response.value.find(listing => listing.ListingKey === listingKey)
    return listing || null
  }

  async getMedia(listingKey: string): Promise<MlsMedia[]> {
    const listing = await this.getListing(listingKey)
    return listing?.Media || []
  }
}
