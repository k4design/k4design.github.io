import { prisma } from '@/lib/prisma'
import { MockMlsAdapter } from './mock-adapter'
import { MlsAdapter } from './types'
import { Decimal } from '@prisma/client/runtime/library'

export class MlsSyncService {
  private adapter: MlsAdapter

  constructor(adapter?: MlsAdapter) {
    this.adapter = adapter || new MockMlsAdapter({
      baseUrl: 'https://mock-mls-api.com',
      clientId: 'mock-client-id',
      clientSecret: 'mock-client-secret'
    })
  }

  async syncListings(options: {
    source: string
    limit?: number
    modifiedSince?: string
  } = { source: 'mock' }): Promise<{
    processed: number
    created: number
    updated: number
    errors: string[]
  }> {
    const { source, limit = 100, modifiedSince } = options
    const errors: string[] = []
    let processed = 0
    let created = 0
    let updated = 0

    try {
      // Create sync record
      const syncRecord = await prisma.mlsSync.create({
        data: {
          source,
          status: 'in_progress',
          startedAt: new Date(),
        },
      })

      // Fetch listings from MLS
      const response = await this.adapter.searchListings({
        limit,
        modifiedSince,
      })

      for (const mlsListing of response.value) {
        try {
          const result = await this.upsertListing(mlsListing, source)
          if (result.created) {
            created++
          } else {
            updated++
          }
          processed++
        } catch (error) {
          errors.push(`Failed to process listing ${mlsListing.ListingKey}: ${error}`)
        }
      }

      // Update sync record
      await prisma.mlsSync.update({
        where: { id: syncRecord.id },
        data: {
          status: errors.length > 0 ? 'error' : 'success',
          recordsProcessed: processed,
          recordsCreated: created,
          recordsUpdated: updated,
          completedAt: new Date(),
          errors: errors.length > 0 ? JSON.stringify({ errors }) : undefined,
        },
      })

      return { processed, created, updated, errors }
    } catch (error) {
      console.error('MLS sync failed:', error)
      throw error
    }
  }

  private async upsertListing(mlsListing: any, source: string) {
    const listingData = {
      mlsId: mlsListing.ListingId,
      mlsListingKey: mlsListing.ListingKey,
      mlsSource: source,
      title: this.generateTitle(mlsListing),
      description: mlsListing.PublicRemarks,
      status: this.mapMlsStatus(mlsListing.StandardStatus),
      price: mlsListing.ListPrice ? new Decimal(mlsListing.ListPrice) : null,
      priceDisplay: mlsListing.ListPrice ? this.formatPrice(mlsListing.ListPrice) : null,
      streetAddress: mlsListing.UnparsedAddress,
      city: mlsListing.City,
      state: mlsListing.StateOrProvince,
      zipCode: mlsListing.PostalCode,
      bedrooms: mlsListing.BedroomsTotal,
      bathrooms: mlsListing.BathroomsTotalInteger,
      squareFeet: mlsListing.LivingArea,
      lotSize: mlsListing.LotSizeAcres,
      yearBuilt: mlsListing.YearBuilt,
      propertyType: mlsListing.PropertySubType || mlsListing.PropertyType,
      lifestyles: JSON.stringify(this.extractLifestyles(mlsListing)),
      amenities: JSON.stringify(this.extractAmenities(mlsListing)),
      heroImage: mlsListing.Media?.[0]?.MediaURL,
      mlsLastUpdated: mlsListing.ModificationTimestamp ? new Date(mlsListing.ModificationTimestamp) : null,
      mlsStatus: mlsListing.StandardStatus,
      isMlsSourced: true,
    }

    const existingListing = await prisma.listing.findFirst({
      where: {
        OR: [
          { mlsId: mlsListing.ListingId },
          { mlsListingKey: mlsListing.ListingKey },
        ],
      },
    })

    let listing
    let created = false

    if (existingListing) {
      listing = await prisma.listing.update({
        where: { id: existingListing.id },
        data: listingData,
      })
    } else {
      // Generate slug for new listing
      const slug = await this.generateSlug(listingData.title)
      listing = await prisma.listing.create({
        data: {
          ...listingData,
          slug,
        },
      })
      created = true
    }

    // Sync media
    if (mlsListing.Media && mlsListing.Media.length > 0) {
      await this.syncMedia(listing.id, mlsListing.Media)
    }

    return { listing, created }
  }

  private async syncMedia(listingId: string, mlsMedia: any[]) {
    // Delete existing media
    await prisma.media.deleteMany({
      where: { listingId },
    })

    // Create new media records
    for (let i = 0; i < mlsMedia.length; i++) {
      const media = mlsMedia[i]
      await prisma.media.create({
        data: {
          listingId,
          type: this.mapMediaType(media.MediaType),
          url: media.MediaURL || '',
          alt: media.ShortDescription,
          caption: media.ShortDescription,
          order: media.Order || i,
          isHero: i === 0,
        },
      })
    }
  }

  private generateTitle(mlsListing: any): string {
    const address = mlsListing.UnparsedAddress || 'Property'
    const city = mlsListing.City || ''
    const state = mlsListing.StateOrProvince || ''
    
    if (city && state) {
      return `${address}, ${city}, ${state}`
    } else if (city) {
      return `${address}, ${city}`
    }
    
    return address
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  private async generateUniqueSlug(baseSlug: string): Promise<string> {
    let slug = baseSlug
    let counter = 1

    while (true) {
      const existing = await prisma.listing.findUnique({
        where: { slug },
      })

      if (!existing) {
        return slug
      }

      slug = `${baseSlug}-${counter}`
      counter++
    }
  }

  private mapMlsStatus(mlsStatus: string): 'ACTIVE' | 'PENDING' | 'SOLD' | 'RENTED' | 'WITHDRAWN' | 'EXPIRED' {
    const statusMap: Record<string, any> = {
      'Active': 'ACTIVE',
      'Pending': 'PENDING',
      'Sold': 'SOLD',
      'Rented': 'RENTED',
      'Withdrawn': 'WITHDRAWN',
      'Expired': 'EXPIRED',
    }

    return statusMap[mlsStatus] || 'ACTIVE'
  }

  private mapMediaType(mlsMediaType: string): 'IMAGE' | 'VIDEO' | 'VIRTUAL_TOUR' | 'DOCUMENT' {
    const typeMap: Record<string, any> = {
      'Photo': 'IMAGE',
      'Video': 'VIDEO',
      'Virtual Tour': 'VIRTUAL_TOUR',
      'Document': 'DOCUMENT',
    }

    return typeMap[mlsMediaType] || 'IMAGE'
  }

  private formatPrice(price: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  private extractLifestyles(mlsListing: any): string[] {
    const lifestyles: string[] = []
    
    // Add basic lifestyle tags based on property characteristics
    if (mlsListing.LivingArea && mlsListing.LivingArea > 5000) {
      lifestyles.push('luxury')
    }
    
    if (mlsListing.PropertyType === 'Residential' && mlsListing.BedroomsTotal && mlsListing.BedroomsTotal >= 4) {
      lifestyles.push('family')
    }
    
    if (mlsListing.City === 'Beverly Hills' || mlsListing.City === 'Manhattan') {
      lifestyles.push('urban')
    }
    
    return lifestyles
  }

  private extractAmenities(mlsListing: any): string[] {
    const amenities: string[] = []
    
    // Add basic amenities based on property characteristics
    if (mlsListing.BathroomsTotalInteger && mlsListing.BathroomsTotalInteger >= 3) {
      amenities.push('multiple-bathrooms')
    }
    
    if (mlsListing.LivingArea && mlsListing.LivingArea > 3000) {
      amenities.push('spacious')
    }
    
    return amenities
  }
}
