import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !['ADMIN', 'EDITOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    const { featured } = await request.json()

    if (typeof featured !== 'boolean') {
      return NextResponse.json({ error: 'Featured must be a boolean' }, { status: 400 })
    }

    // Get the current property to check if it exists
    const existingProperty = await prisma.listing.findUnique({
      where: { id }
    })

    if (!existingProperty) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    // If setting as featured, assign the next available order number
    let featuredOrder = null
    if (featured) {
      const maxOrder = await prisma.listing.findFirst({
        where: { featured: true },
        orderBy: { featuredOrder: 'desc' },
        select: { featuredOrder: true }
      })
      featuredOrder = (maxOrder?.featuredOrder || 0) + 1
    }

    // Update the property
    const updatedProperty = await prisma.listing.update({
      where: { id },
      data: {
        featured,
        featuredOrder
      },
      select: {
        id: true,
        title: true,
        featured: true,
        featuredOrder: true
      }
    })

    return NextResponse.json({
      success: true,
      property: updatedProperty
    })

  } catch (error) {
    console.error('Error updating featured status:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update featured status'
    }, { status: 500 })
  }
}
