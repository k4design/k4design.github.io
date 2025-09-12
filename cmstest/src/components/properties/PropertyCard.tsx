'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Heart, Share2, MapPin, Bed, Bath, Square, Calendar } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

interface PropertyCardProps {
  property: {
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
  onSave?: (propertyId: string) => void
  onShare?: (propertyId: string) => void
}

export function PropertyCard({ property, onSave, onShare }: PropertyCardProps) {
  const [imageError, setImageError] = useState(false)
  const [isSaved, setIsSaved] = useState(false)

  const handleSave = () => {
    setIsSaved(!isSaved)
    onSave?.(property.id)
  }

  const handleShare = () => {
    onShare?.(property.id)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const getLocationString = () => {
    const parts = []
    if (property.address.city) parts.push(property.address.city)
    if (property.address.state) parts.push(property.address.state)
    return parts.join(', ')
  }

  const getPropertyTypeBadge = () => {
    if (property.details.propertyType) {
      return property.details.propertyType.replace('Single Family Residence', 'Single Family')
    }
    return 'Property'
  }

  const isNew = () => {
    const createdDate = new Date(property.metadata.createdAt)
    const daysDiff = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
    return daysDiff <= 7
  }

  const isFeatured = () => {
    return property.features.lifestyles.includes('luxury') || property.features.lifestyles.includes('exclusive')
  }

  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      <div className="relative aspect-[4/3] overflow-hidden">
        {property.media.heroImage && !imageError ? (
          <Image
            src={property.media.heroImage}
            alt={property.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <Square className="w-12 h-12 mx-auto mb-2" />
              <p>No Image Available</p>
            </div>
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {isNew() && (
            <Badge variant="default" className="bg-green-600 hover:bg-green-700">
              New
            </Badge>
          )}
          {isFeatured() && (
            <Badge variant="default" className="bg-gold-600 hover:bg-gold-700">
              Featured
            </Badge>
          )}
          {property.metadata.isMlsSourced ? (
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              MLS
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-purple-100 text-purple-800">
              Exclusive
            </Badge>
          )}
        </div>

        {/* Action Buttons */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="sm"
            variant="secondary"
            className="w-10 h-10 p-0 rounded-full shadow-lg"
            onClick={handleSave}
          >
            <Heart 
              className={`w-4 h-4 ${isSaved ? 'fill-red-500 text-red-500' : ''}`} 
            />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="w-10 h-10 p-0 rounded-full shadow-lg"
            onClick={handleShare}
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <CardContent className="p-6">
        {/* Location */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
          <MapPin className="w-4 h-4" />
          <span>{getLocationString()}</span>
        </div>

        {/* Title */}
        <h3 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-2">
          {property.title}
        </h3>

        {/* Property Details */}
        <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
          {property.details.bedrooms && (
            <div className="flex items-center gap-1">
              <Bed className="w-4 h-4" />
              <span>{property.details.bedrooms} Bed</span>
            </div>
          )}
          {property.details.bathrooms && (
            <div className="flex items-center gap-1">
              <Bath className="w-4 h-4" />
              <span>{property.details.bathrooms} Bath</span>
            </div>
          )}
          {property.details.squareFeet && (
            <div className="flex items-center gap-1">
              <Square className="w-4 h-4" />
              <span>{property.details.squareFeet.toLocaleString()} sq ft</span>
            </div>
          )}
        </div>

        {/* Lifestyle Tags */}
        {property.features.lifestyles.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {property.features.lifestyles.slice(0, 3).map((lifestyle) => (
              <Badge key={lifestyle} variant="outline" className="text-xs">
                {lifestyle}
              </Badge>
            ))}
            {property.features.lifestyles.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{property.features.lifestyles.length - 3} more
              </Badge>
            )}
          </div>
        )}

        {/* Price */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-2xl font-bold text-gray-900">
            {property.priceDisplay || (property.price ? formatPrice(property.price) : 'Price Upon Request')}
          </div>
          <Badge variant="outline" className="text-xs">
            {getPropertyTypeBadge()}
          </Badge>
        </div>

        {/* Agent Info */}
        {property.agent && (
          <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
            {property.agent.portrait ? (
              <Image
                src={property.agent.portrait}
                alt={property.agent.name}
                width={40}
                height={40}
                className="rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-gray-600">
                  {property.agent.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-900">{property.agent.name}</p>
              <p className="text-xs text-gray-600">Listing Agent</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button asChild className="flex-1">
            <Link href={`/properties/${property.slug}`}>
              View Details
            </Link>
          </Button>
          <Button variant="outline" className="flex-1">
            Schedule Tour
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
