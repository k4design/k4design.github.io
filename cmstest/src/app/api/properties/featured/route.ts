import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const featuredProperties = await prisma.listing.findMany({
      where: {
        featured: true,
        status: 'ACTIVE'
      },
      orderBy: [
        { featuredOrder: 'asc' },
        { createdAt: 'desc' }
      ],
      take: 10 // Limit to 10 featured properties
    })

    // Transform the properties to match the expected format
    const properties = featuredProperties.map(property => ({
      id: property.id,
      title: property.title,
      price: property.price ? Number(property.price) : 0,
      priceDisplay: property.priceDisplay || `$${property.price ? Number(property.price).toLocaleString() : '0'}`,
      city: property.city || '',
      state: property.state || '',
      bedrooms: property.bedrooms || 0,
      bathrooms: property.bathrooms || 0,
      squareFeet: property.squareFeet || 0,
      heroImage: property.heroImage || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop',
      slug: property.slug,
      featuredOrder: property.featuredOrder
    }))

    return NextResponse.json({
      success: true,
      properties
    })

  } catch (error) {
    console.error('Error fetching featured properties:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch featured properties'
    }, { status: 500 })
  }
}
