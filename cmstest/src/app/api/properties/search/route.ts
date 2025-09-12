import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const search = searchParams.get('search') || ''
    const propertyType = searchParams.get('propertyType') || ''
    const city = searchParams.get('city') || ''
    const state = searchParams.get('state') || ''
    const minPrice = searchParams.get('minPrice') ? parseInt(searchParams.get('minPrice')!) : null
    const maxPrice = searchParams.get('maxPrice') ? parseInt(searchParams.get('maxPrice')!) : null
    const minBedrooms = searchParams.get('minBedrooms') ? parseInt(searchParams.get('minBedrooms')!) : null
    const minBathrooms = searchParams.get('minBathrooms') ? parseInt(searchParams.get('minBathrooms')!) : null
    const minSquareFeet = searchParams.get('minSquareFeet') ? parseInt(searchParams.get('minSquareFeet')!) : null
    const lifestyles = searchParams.get('lifestyles')?.split(',').filter(Boolean) || []
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Build where clause
    const where: any = {
      status: 'ACTIVE',
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { streetAddress: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (propertyType) {
      where.propertyType = { contains: propertyType, mode: 'insensitive' }
    }

    if (city) {
      where.city = { contains: city, mode: 'insensitive' }
    }

    if (state) {
      where.state = { contains: state, mode: 'insensitive' }
    }

    if (minPrice !== null || maxPrice !== null) {
      where.price = {}
      if (minPrice !== null) {
        where.price.gte = new Decimal(minPrice)
      }
      if (maxPrice !== null) {
        where.price.lte = new Decimal(maxPrice)
      }
    }

    if (minBedrooms !== null) {
      where.bedrooms = { gte: minBedrooms }
    }

    if (minBathrooms !== null) {
      where.bathrooms = { gte: minBathrooms }
    }

    if (minSquareFeet !== null) {
      where.squareFeet = { gte: minSquareFeet }
    }

    if (lifestyles.length > 0) {
      where.lifestyles = {
        hasSome: lifestyles,
      }
    }

    // Build orderBy clause
    const orderBy: any = {}
    if (sortBy === 'price') {
      orderBy.price = sortOrder
    } else if (sortBy === 'bedrooms') {
      orderBy.bedrooms = sortOrder
    } else if (sortBy === 'squareFeet') {
      orderBy.squareFeet = sortOrder
    } else {
      orderBy.createdAt = sortOrder
    }

    // Calculate offset
    const offset = (page - 1) * limit

    // Execute query
    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        orderBy,
        skip: offset,
        take: limit,
        include: {
          media: {
            orderBy: { order: 'asc' },
            take: 1,
          },
          agent: {
            select: {
              id: true,
              name: true,
              portrait: true,
            },
          },
        },
      }),
      prisma.listing.count({ where }),
    ])

    // Format response
    const formattedListings = listings.map(listing => ({
      id: listing.id,
      slug: listing.slug,
      title: listing.title,
      description: listing.description,
      price: listing.price ? Number(listing.price) : null,
      priceDisplay: listing.priceDisplay,
      address: {
        street: listing.streetAddress,
        city: listing.city,
        state: listing.state,
        zipCode: listing.zipCode,
        country: listing.country,
      },
      coordinates: listing.latitude && listing.longitude ? {
        lat: listing.latitude,
        lng: listing.longitude,
      } : null,
      details: {
        bedrooms: listing.bedrooms,
        bathrooms: listing.bathrooms,
        squareFeet: listing.squareFeet,
        lotSize: listing.lotSize,
        yearBuilt: listing.yearBuilt,
        propertyType: listing.propertyType,
      },
      features: {
        lifestyles: typeof listing.lifestyles === 'string' ? JSON.parse(listing.lifestyles) : listing.lifestyles,
        amenities: typeof listing.amenities === 'string' ? JSON.parse(listing.amenities) : listing.amenities,
      },
      media: {
        heroImage: listing.heroImage,
        gallery: listing.media.map(media => ({
          id: media.id,
          url: media.url,
          alt: media.alt,
          caption: media.caption,
          type: media.type,
        })),
      },
      agent: listing.agent ? {
        id: listing.agent.id,
        name: listing.agent.name,
        portrait: listing.agent.portrait,
      } : null,
      metadata: {
        isMlsSourced: listing.isMlsSourced,
        mlsId: listing.mlsId,
        mlsSource: listing.mlsSource,
        createdAt: listing.createdAt,
        updatedAt: listing.updatedAt,
      },
    }))

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      success: true,
      data: {
        listings: formattedListings,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
        filters: {
          search,
          propertyType,
          city,
          state,
          minPrice,
          maxPrice,
          minBedrooms,
          minBathrooms,
          minSquareFeet,
          lifestyles,
          sortBy,
          sortOrder,
        },
      },
    })
  } catch (error) {
    console.error('Property search error:', error)
    return NextResponse.json(
      { error: 'Failed to search properties' },
      { status: 500 }
    )
  }
}
