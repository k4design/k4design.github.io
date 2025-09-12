'use client'

import { useState, useEffect } from 'react'
import { PropertyCard } from '@/components/properties/PropertyCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { MapPin, Home, Mountain, Waves, TreePine } from 'lucide-react'

const lifestyleCategories = [
  { id: 'luxury', name: 'Luxury', icon: Home, description: 'Ultimate in comfort and sophistication' },
  { id: 'family', name: 'Family', icon: Home, description: 'Perfect for growing families' },
  { id: 'urban', name: 'Urban', icon: MapPin, description: 'City living at its finest' },
  { id: 'mountain', name: 'Mountain', icon: Mountain, description: 'Escape to the mountains' },
  { id: 'coastal', name: 'Coastal', icon: Waves, description: 'Beachfront and waterfront living' },
  { id: 'countryside', name: 'Countryside', icon: TreePine, description: 'Peaceful rural retreats' },
]

export default function LifestylePage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [properties, setProperties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProperties()
  }, [selectedCategory])

  const fetchProperties = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedCategory) {
        params.append('lifestyles', selectedCategory)
      }
      params.append('limit', '12')
      
      const response = await fetch(`/api/properties/search?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setProperties(data.data.listings)
      }
    } catch (error) {
      console.error('Error fetching properties:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-navy to-gray-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-light mb-4">
              Lifestyle Properties
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Discover properties that match your unique lifestyle, from urban penthouses to mountain retreats and coastal villas.
            </p>
          </div>
        </div>
      </section>

      {/* Lifestyle Categories */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-light text-gray-900 mb-4">Choose Your Lifestyle</h2>
            <p className="text-xl text-gray-600">
              Find properties that align with your way of life
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {lifestyleCategories.map((category) => {
              const Icon = category.icon
              return (
                <Card 
                  key={category.id}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                    selectedCategory === category.id 
                      ? 'border-gold bg-gold/5' 
                      : 'border-gray-200 hover:border-gold/50'
                  }`}
                  onClick={() => setSelectedCategory(
                    selectedCategory === category.id ? '' : category.id
                  )}
                >
                  <CardContent className="p-6 text-center">
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                      selectedCategory === category.id 
                        ? 'bg-gold text-white' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      <Icon className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{category.name}</h3>
                    <p className="text-gray-600 text-sm">{category.description}</p>
                    {selectedCategory === category.id && (
                      <Badge className="mt-3 bg-gold text-white">Selected</Badge>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {selectedCategory && (
            <div className="text-center mb-8">
              <Button 
                variant="outline" 
                onClick={() => setSelectedCategory('')}
                className="text-gold border-gold hover:bg-gold hover:text-white"
              >
                Clear Filter
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Properties Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-light text-gray-900 mb-4">
              {selectedCategory 
                ? `${lifestyleCategories.find(c => c.id === selectedCategory)?.name} Properties`
                : 'All Lifestyle Properties'
              }
            </h2>
            <p className="text-xl text-gray-600">
              {selectedCategory 
                ? `Discover properties perfect for ${lifestyleCategories.find(c => c.id === selectedCategory)?.name.toLowerCase()} living`
                : 'Explore our curated collection of lifestyle properties'
              }
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="h-64 bg-gray-200 animate-pulse"></div>
                  <div className="p-6">
                    <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse mb-4 w-3/4"></div>
                    <div className="h-6 bg-gray-200 rounded animate-pulse w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : properties.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {properties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onSave={() => {}}
                  onShare={() => {}}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Home className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Properties Found</h3>
              <p className="text-gray-600 mb-6">
                {selectedCategory 
                  ? `No properties found for ${lifestyleCategories.find(c => c.id === selectedCategory)?.name.toLowerCase()} lifestyle.`
                  : 'No properties available at the moment.'
                }
              </p>
              {selectedCategory && (
                <Button 
                  variant="outline"
                  onClick={() => setSelectedCategory('')}
                  className="text-gold border-gold hover:bg-gold hover:text-white"
                >
                  View All Properties
                </Button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-light text-gray-900 mb-4">
            Ready to Find Your Perfect Lifestyle Property?
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Our team of lifestyle specialists is here to help you discover properties that perfectly match your unique way of life.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-gold hover:bg-gold/90 text-white">
              Contact Our Lifestyle Specialists
            </Button>
            <Button size="lg" variant="outline" className="text-gold border-gold hover:bg-gold hover:text-white">
              Schedule a Consultation
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
