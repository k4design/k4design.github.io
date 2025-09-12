export interface MlsListing {
  ListingKey: string
  ListingId: string
  StandardStatus: string
  ListPrice?: number
  UnparsedAddress?: string
  City?: string
  StateOrProvince?: string
  PostalCode?: string
  BedroomsTotal?: number
  BathroomsTotalInteger?: number
  LivingArea?: number
  PropertyType?: string
  PropertySubType?: string
  YearBuilt?: number
  LotSizeAcres?: number
  PublicRemarks?: string
  ListingContractDate?: string
  ModificationTimestamp?: string
  Media?: MlsMedia[]
}

export interface MlsMedia {
  MediaKey: string
  MediaType: string
  MediaURL?: string
  ShortDescription?: string
  Order?: number
}

export interface MlsSearchParams {
  limit?: number
  offset?: number
  modifiedSince?: string
  propertyType?: string
  city?: string
  state?: string
  minPrice?: number
  maxPrice?: number
  minBedrooms?: number
  minBathrooms?: number
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
}

export interface MlsSearchResponse {
  value: MlsListing[]
  '@odata.count': number
  '@odata.nextLink'?: string
}

export interface MlsAdapter {
  authorize(): Promise<void>
  searchListings(params: MlsSearchParams): Promise<MlsSearchResponse>
  getListing(listingKey: string): Promise<MlsListing | null>
  getMedia(listingKey: string): Promise<MlsMedia[]>
  isConnected(): boolean
}
