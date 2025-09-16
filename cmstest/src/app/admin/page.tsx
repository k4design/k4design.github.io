'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Building2, 
  Users, 
  RefreshCw, 
  TrendingUp, 
  Plus,
  Upload
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface DashboardStats {
  totalProperties: number
  totalAgents: number
  recentMlsSyncs: Array<{
    id: string
    source: string
    status: string
    recordsProcessed: number
    completedAt: string
  }>
}

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    totalProperties: 0,
    totalAgents: 0,
    recentMlsSyncs: [],
  })
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session || !['ADMIN', 'EDITOR'].includes(session.user.role)) {
      router.push('/')
      return
    }

    fetchDashboardStats()
  }, [session, status, router])

  const fetchDashboardStats = async () => {
    try {
      // Mock data for now - in production, fetch from API
      setStats({
        totalProperties: 127,
        totalAgents: 8,
        recentMlsSyncs: [
          {
            id: '1',
            source: 'RESO',
            status: 'success',
            recordsProcessed: 45,
            completedAt: '2024-01-15T10:30:00Z',
          },
          {
            id: '2',
            source: 'RETS',
            status: 'error',
            recordsProcessed: 12,
            completedAt: '2024-01-14T15:20:00Z',
          },
        ],
      })
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error)
    }
  }

  const handleMlsSync = async () => {
    try {
      setSyncing(true)
      const response = await fetch('/api/mls/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          limit: 100,
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        toast.success('MLS sync completed successfully')
        fetchDashboardStats()
      } else {
        toast.error('MLS sync failed')
      }
    } catch (error) {
      console.error('MLS sync error:', error)
      toast.error('MLS sync failed')
    } finally {
      setSyncing(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gold mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!session || !['ADMIN', 'EDITOR'].includes(session.user.role)) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600">Welcome back, {session.user.name}</p>
            </div>
            <div className="flex items-center gap-4">
              <Button onClick={handleMlsSync} disabled={syncing}>
                <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync MLS'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProperties}</div>
              <p className="text-xs text-muted-foreground">
                Active listings in database
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAgents}</div>
              <p className="text-xs text-muted-foreground">
                Registered agents
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Manage Properties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Add, edit, and manage property listings
              </p>
              <div className="flex gap-2">
                <Button asChild className="flex-1">
                  <Link href="/admin/properties">
                    <Building2 className="w-4 h-4 mr-2" />
                    View All
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/admin/properties/new">
                    <Plus className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Manage Agents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Add and manage agent profiles
              </p>
              <div className="flex gap-2">
                <Button asChild className="flex-1">
                  <Link href="/admin/agents">
                    <Users className="w-4 h-4 mr-2" />
                    View All
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/admin/agents/new">
                    <Plus className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>MLS Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Upload and manage MLS data files
              </p>
              <div className="flex gap-2">
                <Button asChild className="flex-1">
                  <Link href="/admin/mls">
                    <Upload className="w-4 h-4 mr-2" />
                    MLS Uploader
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent MLS Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent MLS Syncs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.recentMlsSyncs.map((sync) => (
                  <div key={sync.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        sync.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <div>
                        <p className="font-medium">{sync.source} Sync</p>
                        <p className="text-sm text-gray-600">
                          {sync.recordsProcessed} records processed
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={sync.status === 'success' ? 'default' : 'destructive'}>
                        {sync.status}
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(sync.completedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Database</span>
                  <Badge variant="default">Online</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">MLS Connection</span>
                  <Badge variant="default">Connected</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Property Feed</span>
                  <Badge variant="default">Active</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Agent Profiles</span>
                  <Badge variant="default">Updated</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
