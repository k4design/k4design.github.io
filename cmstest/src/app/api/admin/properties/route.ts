import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const propertySchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  status: z.enum(['ACTIVE', 'PENDING', 'SOLD', 'RENTED', 'WITHDRAWN', 'EXPIRED']).default('ACTIVE'),
  price: z.number().nullable().optional(),
  streetAddress: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  bedrooms: z.number().nullable().optional(),
  bathrooms: z.number().nullable().optional(),
  squareFeet: z.number().nullable().optional(),
  lotSize: z.number().nullable().optional(),
  yearBuilt: z.number().nullable().optional(),
  propertyType: z.string().optional(),
  lifestyles: z.array(z.string()).default([]),
  amenities: z.array(z.string()).default([]),
  heroImage: z.string().url().optional(),
  virtualTour: z.string().url().optional(),
  isMlsSourced: z.boolean().default(false),
  mlsId: z.string().optional(),
  mlsListingKey: z.string().optional(),
  mlsSource: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !['ADMIN', 'EDITOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const page = parseInt(searchParams.get('page') || '1')

    const properties = await prisma.listing.findMany({
      take: limit,
      skip: (page - 1) * limit,
      orderBy: {
        createdAt: 'desc'
      }
    })

    const total = await prisma.listing.count()

    return NextResponse.json({ 
      properties, 
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching properties:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !['ADMIN', 'EDITOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate input
    const validatedData = propertySchema.parse(body)
    
    // Generate slug from title
    const slug = validatedData.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    // Check if slug already exists
    const existingProperty = await prisma.listing.findUnique({
      where: { slug }
    })

    if (existingProperty) {
      return NextResponse.json({ error: 'Property with this title already exists' }, { status: 400 })
    }

    // Generate price display
    const priceDisplay = validatedData.price 
      ? new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
        }).format(validatedData.price)
      : null

    const property = await prisma.listing.create({
      data: {
        ...validatedData,
        slug,
        priceDisplay,
        lifestyles: JSON.stringify(validatedData.lifestyles),
        amenities: JSON.stringify(validatedData.amenities),
      }
    })

    return NextResponse.json({ property }, { status: 201 })
  } catch (error) {
    console.error('Error creating property:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
