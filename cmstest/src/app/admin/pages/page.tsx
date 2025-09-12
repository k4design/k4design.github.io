'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, Eye, Globe } from 'lucide-react'
import Link from 'next/link'

interface Page {
  id: string
  slug: string
  title: string
  seoTitle: string
  seoDescription: string
  published: boolean
  createdAt: string
  updatedAt: string
}

export default function AdminPagesPage() {
  const [pages, setPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPages()
  }, [])

  const fetchPages = async () => {
    try {
      const response = await fetch('/api/admin/pages')
      const data = await response.json()
      setPages(data.pages || [])
    } catch (error) {
      console.error('Error fetching pages:', error)
      // For now, show mock data
      setPages([
        {
          id: '1',
          slug: 'home',
          title: 'Aperture Global - Luxury Real Estate',
          seoTitle: 'Aperture Global - Luxury Real Estate',
          seoDescription: 'Discover exceptional properties in the world\'s most prestigious locations with Aperture Global.',
          published: true,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        },
        {
          id: '2',
          slug: 'about',
          title: 'About Aperture Global',
          seoTitle: 'About Aperture Global - Luxury Real Estate Experts',
          seoDescription: 'Learn about Aperture Global\'s commitment to excellence in luxury real estate and our team of expert agents.',
          published: true,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading pages...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pages</h1>
          <p className="text-gray-600 mt-1">Manage your website pages and content</p>
        </div>
        <Button asChild>
          <Link href="/admin/pages/new">
            <Plus className="w-4 h-4 mr-2" />
            Add Page
          </Link>
        </Button>
      </div>

      <div className="grid gap-4">
        {pages.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-500 mb-4">No pages found</p>
              <Button asChild>
                <Link href="/admin/pages/new">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Page
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          pages.map((page) => (
            <Card key={page.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {page.title}
                      </h3>
                      <Badge variant={page.published ? 'default' : 'secondary'}>
                        {page.published ? 'Published' : 'Draft'}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                      <div>
                        <span className="font-medium">Slug:</span> /{page.slug}
                      </div>
                      <div>
                        <span className="font-medium">SEO Title:</span> {page.seoTitle}
                      </div>
                      <div className="md:col-span-2">
                        <span className="font-medium">SEO Description:</span> {page.seoDescription}
                      </div>
                    </div>

                    <div className="text-xs text-gray-500">
                      Created: {new Date(page.createdAt).toLocaleDateString()} • 
                      Updated: {new Date(page.updatedAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/${page.slug}`}>
                        <Eye className="w-4 h-4" />
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
