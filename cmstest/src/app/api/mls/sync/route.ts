import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { MlsSyncService } from '@/lib/mls/sync'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !['ADMIN', 'EDITOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { limit = 100, modifiedSince } = body

    const syncService = new MlsSyncService()
    const result = await syncService.syncListings({
      source: 'reso',
      limit,
      modifiedSince,
    })

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('MLS sync error:', error)
    return NextResponse.json(
      { error: 'Failed to sync MLS data' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !['ADMIN', 'EDITOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get recent sync history
    const { prisma } = await import('@/lib/prisma')
    
    const syncs = await prisma.mlsSync.findMany({
      orderBy: { startedAt: 'desc' },
      take: 10,
    })

    return NextResponse.json({
      success: true,
      data: syncs,
    })
  } catch (error) {
    console.error('Failed to fetch sync history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sync history' },
      { status: 500 }
    )
  }
}
