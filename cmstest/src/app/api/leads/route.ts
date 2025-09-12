import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { emailService } from '@/lib/email'
import { z } from 'zod'

const leadSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  message: z.string().optional(),
  source: z.string().default('contact-form'),
  propertyId: z.string().optional(),
  context: z.record(z.string(), z.any()).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = leadSchema.parse(body)
    
    // Create lead in database
    const lead = await prisma.lead.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        phone: validatedData.phone,
        message: validatedData.message,
        source: validatedData.source,
        listingId: validatedData.propertyId,
        context: validatedData.context,
        status: 'NEW',
      },
      include: {
        listing: {
          select: {
            title: true,
            slug: true,
          },
        },
      },
    })

    // Send email notifications
    const emailData = {
      name: lead.name || 'Unknown',
      email: lead.email,
      phone: lead.phone || undefined,
      message: lead.message || undefined,
      propertyTitle: lead.listing?.title,
      propertyUrl: lead.listing ? `${process.env.NEXTAUTH_URL}/properties/${lead.listing.slug}` : undefined,
      source: lead.source || 'contact-form',
    }

    // Send notification to admin
    await emailService.sendLeadNotification(emailData)
    
    // Send confirmation to lead
    await emailService.sendLeadConfirmation(emailData)

    // Log the lead creation
    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        entity: 'lead',
        entityId: lead.id,
        changes: { created: emailData },
        metadata: {
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          userAgent: request.headers.get('user-agent'),
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: lead.id,
        message: 'Thank you for your inquiry! We will contact you within 24 hours.',
      },
    })
  } catch (error) {
    console.error('Lead creation error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation failed',
          details: error.issues,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to submit your inquiry. Please try again.' 
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // This endpoint would typically be protected for admin access
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')

    const where: any = {}
    if (status) {
      where.status = status
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          listing: {
            select: {
              title: true,
              slug: true,
            },
          },
        },
      }),
      prisma.lead.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        leads,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    console.error('Failed to fetch leads:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch leads' },
      { status: 500 }
    )
  }
}
