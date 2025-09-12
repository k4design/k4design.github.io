import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const agentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  phone: z.string().optional(),
  license: z.string().optional(),
  bio: z.string().optional(),
  portrait: z.string().url().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  specialties: z.array(z.string()),
  markets: z.array(z.string()),
  featured: z.boolean().default(false),
  order: z.number().default(0),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !['ADMIN', 'EDITOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const agents = await prisma.agent.findMany({
      orderBy: {
        order: 'asc'
      }
    })

    return NextResponse.json({ agents })
  } catch (error) {
    console.error('Error fetching agents:', error)
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
    const validatedData = agentSchema.parse(body)
    
    // Generate slug from name
    const slug = validatedData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    // Check if slug already exists
    const existingAgent = await prisma.agent.findUnique({
      where: { slug }
    })

    if (existingAgent) {
      return NextResponse.json({ error: 'Agent with this name already exists' }, { status: 400 })
    }

    const agent = await prisma.agent.create({
      data: {
        ...validatedData,
        slug,
        specialties: JSON.stringify(validatedData.specialties),
        markets: JSON.stringify(validatedData.markets),
      }
    })

    return NextResponse.json({ agent }, { status: 201 })
  } catch (error) {
    console.error('Error creating agent:', error)
    
    if (error instanceof z.ZodError) {
      console.log('Validation errors:', error.issues)
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
