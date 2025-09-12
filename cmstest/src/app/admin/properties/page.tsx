'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, Eye } from 'lucide-react'
import Link from 'next/link'

interface Property {
  id: string
  title: string
  price: number
  city: string
  state: string
  status: string
  propertyType: string
  bedrooms: number
  bathrooms: number
  squareFeet: number
  isMlsSourced: boolean
}

export default function AdminPropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProperties()
  }, [])

  const fetchProperties = async () => {
    try {
      const response = await fetch('/api/properties/search?limit=50')
      const data = await response.json()
      setProperties(data.properties || [])
    } catch (error) {
      console.error('Error fetching properties:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price)
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading properties...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Properties</h1>
          <p className="text-gray-600 mt-1">Manage your property listings</p>
        </div>
        <Button asChild>
          <Link href="/admin/properties/new">
            <Plus className="w-4 h-4 mr-2" />
            Add Property
          </Link>
        </Button>
      </div>

      <div className="grid gap-4">
        {properties.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-500 mb-4">No properties found</p>
              <Button asChild>
                <Link href="/admin/properties/new">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Property
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          properties.map((property) => (
            <Card key={property.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {property.title}
                      </h3>
                      <Badge variant={property.isMlsSourced ? 'default' : 'secondary'}>
                        {property.isMlsSourced ? 'MLS' : 'Exclusive'}
                      </Badge>
                      <Badge variant="outline">{property.status}</Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-4">
                      <div>
                        <span className="font-medium">Price:</span> {formatPrice(property.price)}
                      </div>
                      <div>
                        <span className="font-medium">Location:</span> {property.city}, {property.state}
                      </div>
                      <div>
                        <span className="font-medium">Type:</span> {property.propertyType}
                      </div>
                      <div>
                        <span className="font-medium">Size:</span> {property.squareFeet?.toLocaleString()} sq ft
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>{property.bedrooms} bed</span>
                      <span>•</span>
                      <span>{property.bathrooms} bath</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/properties/${property.id}`}>
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
