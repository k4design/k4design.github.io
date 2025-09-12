'use client'

import { useState, useEffect } from 'react'
import { PropertyCard } from '@/components/properties/PropertyCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Search, Filter, MapPin, Grid, List, SortAsc, SortDesc } from 'lucide-react'
import { toast } from 'sonner'

interface Property {
  id: string
  slug: string
  title: string
  description?: string
  price?: number
  priceDisplay?: string
  address: {
    street?: string
    city?: string
    state?: string
    zipCode?: string
  }
  details: {
    bedrooms?: number
    bathrooms?: number
    squareFeet?: number
    lotSize?: number
    yearBuilt?: number
    propertyType?: string
  }
  features: {
    lifestyles: string[]
    amenities: string[]
  }
  media: {
    heroImage?: string
    gallery: Array<{
      id: string
      url: string
      alt?: string
      type: string
    }>
  }
  agent?: {
    id: string
    name: string
    portrait?: string
  }
  metadata: {
    isMlsSourced: boolean
    mlsId?: string
    createdAt: string
    updatedAt: string
  }
}

interface SearchFilters {
  search: string
  propertyType: string
  city: string
  state: string
  minPrice: string
  maxPrice: string
  minBedrooms: string
  minBathrooms: string
  minSquareFeet: string
  lifestyles: string[]
  sortBy: string
  sortOrder: string
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
    hasNext: false,
    hasPrev: false,
  })

  const [filters, setFilters] = useState<SearchFilters>({
    search: '',
    propertyType: '',
    city: '',
    state: '',
    minPrice: '',
    maxPrice: '',
    minBedrooms: '',
    minBathrooms: '',
    minSquareFeet: '',
    lifestyles: [],
    sortBy: 'createdAt',
    sortOrder: 'desc',
  })

  const propertyTypes = [
    'Single Family Residence',
    'Condo/Co-op',
    'Townhouse',
    'Multi-Family',
    'Luxury Home',
    'Estate',
    'Penthouse',
    'Villa',
  ]

  const cities = [
    'Beverly Hills',
    'Manhattan',
    'Monaco',
    'London',
    'Paris',
    'Miami',
    'Los Angeles',
    'New York',
  ]

  const lifestyles = [
    'luxury',
    'urban',
    'waterfront',
    'historic',
    'modern',
    'family',
    'mediterranean',
    'exclusive',
  ]

  const priceRanges = [
    { label: 'Any Price', value: '' },
    { label: 'Under $1M', value: '0-1000000' },
    { label: '$1M - $5M', value: '1000000-5000000' },
    { label: '$5M - $10M', value: '5000000-10000000' },
    { label: '$10M - $25M', value: '10000000-25000000' },
    { label: '$25M+', value: '25000000-999999999' },
  ]

  const fetchProperties = async (page = 1, newFilters?: Partial<SearchFilters>) => {
    try {
      setLoading(true)
      const currentFilters = { ...filters, ...newFilters }
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
        ...Object.fromEntries(
          Object.entries(currentFilters).filter(([_, value]) => 
            value !== '' && value !== null && value !== undefined
          )
        ),
      })

      // Handle price range
      if (currentFilters.minPrice && currentFilters.maxPrice) {
        const [min, max] = currentFilters.minPrice.split('-').map(Number)
        params.set('minPrice', min.toString())
        params.set('maxPrice', max.toString())
        params.delete('minPrice')
        params.delete('maxPrice')
      }

      // Handle lifestyles array
      if (currentFilters.lifestyles.length > 0) {
        params.set('lifestyles', currentFilters.lifestyles.join(','))
      }

      const response = await fetch(`/api/properties/search?${params}`)
      const data = await response.json()

      if (data.success) {
        setProperties(data.data.listings)
        setPagination(data.data.pagination)
      } else {
        toast.error('Failed to fetch properties')
      }
    } catch (error) {
      console.error('Error fetching properties:', error)
      toast.error('Failed to fetch properties')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProperties(1, filters)
  }, [])

  const handleFilterChange = (key: keyof SearchFilters, value: string | string[]) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    fetchProperties(1, newFilters)
  }

  const handleSearch = () => {
    fetchProperties(1, filters)
  }

  const clearFilters = () => {
    const clearedFilters = {
      search: '',
      propertyType: '',
      city: '',
      state: '',
      minPrice: '',
      maxPrice: '',
      minBedrooms: '',
      minBathrooms: '',
      minSquareFeet: '',
      lifestyles: [],
      sortBy: 'createdAt',
      sortOrder: 'desc',
    }
    setFilters(clearedFilters)
    fetchProperties(1, clearedFilters)
  }

  const toggleLifestyle = (lifestyle: string) => {
    const newLifestyles = filters.lifestyles.includes(lifestyle)
      ? filters.lifestyles.filter(l => l !== lifestyle)
      : [...filters.lifestyles, lifestyle]
    handleFilterChange('lifestyles', newLifestyles)
  }

  return (
    <div className="min-h-screen bg-white">
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-navy to-gray-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-light mb-4">
              Luxury Properties
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Discover exceptional properties in the world's most prestigious locations
            </p>
          </div>
        </div>
      </section>

      {/* Search and Filters */}
      <section className="py-8 bg-gray-50 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Search Bar */}
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Search properties, locations, or keywords..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-10 h-12"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
            </div>
            <Button onClick={handleSearch} className="h-12 px-8">
              Search
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="h-12"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2">
            {filters.lifestyles.map((lifestyle) => (
              <Badge
                key={lifestyle}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => toggleLifestyle(lifestyle)}
              >
                {lifestyle} ×
              </Badge>
            ))}
            {filters.lifestyles.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-gray-500"
              >
                Clear All
              </Button>
            )}
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <Card className="mt-6">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Property Type
                    </label>
                    <Select
                      value={filters.propertyType}
                      onValueChange={(value) => handleFilterChange('propertyType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Types</SelectItem>
                        {propertyTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location
                    </label>
                    <Select
                      value={filters.city}
                      onValueChange={(value) => handleFilterChange('city', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Locations" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Locations</SelectItem>
                        {cities.map((city) => (
                          <SelectItem key={city} value={city}>
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price Range
                    </label>
                    <Select
                      value={filters.minPrice}
                      onValueChange={(value) => handleFilterChange('minPrice', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Any Price" />
                      </SelectTrigger>
                      <SelectContent>
                        {priceRanges.map((range) => (
                          <SelectItem key={range.value} value={range.value}>
                            {range.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sort By
                    </label>
                    <Select
                      value={filters.sortBy}
                      onValueChange={(value) => handleFilterChange('sortBy', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="createdAt">Date Added</SelectItem>
                        <SelectItem value="price">Price</SelectItem>
                        <SelectItem value="bedrooms">Bedrooms</SelectItem>
                        <SelectItem value="squareFeet">Square Feet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Lifestyle Tags */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Lifestyle Features
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {lifestyles.map((lifestyle) => (
                      <Badge
                        key={lifestyle}
                        variant={filters.lifestyles.includes(lifestyle) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleLifestyle(lifestyle)}
                      >
                        {lifestyle}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Properties Section */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Results Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">
                {loading ? 'Loading...' : `${pagination.total} Properties Found`}
              </h2>
              <p className="text-gray-600">
                Showing {properties.length} of {pagination.total} properties
              </p>
            </div>
            
            <div className="flex items-center gap-2 mt-4 sm:mt-0">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Properties Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <div className="aspect-[4/3] bg-gray-200 animate-pulse" />
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="h-4 bg-gray-200 rounded animate-pulse" />
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
                      <div className="h-6 bg-gray-200 rounded animate-pulse w-1/2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : properties.length > 0 ? (
            <div className={`grid gap-8 ${
              viewMode === 'grid' 
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
                : 'grid-cols-1'
            }`}>
              {properties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onSave={(id) => toast.success('Property saved!')}
                  onShare={(id) => toast.success('Property shared!')}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No Properties Found
              </h3>
              <p className="text-gray-600 mb-6">
                Try adjusting your search criteria or filters to find more properties.
              </p>
              <Button onClick={clearFilters} variant="outline">
                Clear All Filters
              </Button>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center mt-12">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => fetchProperties(pagination.page - 1)}
                  disabled={!pagination.hasPrev}
                >
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    const pageNum = i + 1
                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === pagination.page ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => fetchProperties(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>
                
                <Button
                  variant="outline"
                  onClick={() => fetchProperties(pagination.page + 1)}
                  disabled={!pagination.hasNext}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
