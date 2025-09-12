'use client'

import { PropertyCard } from '@/components/properties/PropertyCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Search, MapPin, Star, Users, Award, TrendingUp, Home, DollarSign, User } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function HomePage() {
  const [properties, setProperties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFeaturedProperties()
  }, [])

  const fetchFeaturedProperties = async () => {
    try {
      const response = await fetch('/api/properties/search?limit=3')
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
    <div className="min-h-screen bg-black text-white">
      
      {/* Hero Carousel Section */}
      <section className="relative h-screen overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1920&h=1080&fit=crop"
            alt="Manhattan Penthouse"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent"></div>
        </div>
        
        <div className="relative z-10 h-full flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <div className="text-blue-400 text-sm font-medium uppercase tracking-wider mb-4">
                Premiere Listing
              </div>
              <div className="flex items-center text-gray-300 mb-4">
                <MapPin className="w-4 h-4 mr-2" />
                <span>Manhattan, New York</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-light mb-6 font-serif">
                Manhattan Skyline Penthouse
              </h1>
              <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                Spectacular triplex penthouse with 360-degree city views, private elevator, and rooftop terrace overlooking Central Park.
              </p>
              <div className="flex flex-wrap gap-4 mb-8">
                <span className="text-gray-300">6 Bedrooms</span>
                <span className="text-gray-300">8 Bathrooms</span>
                <span className="text-gray-300">8,500 sq ft</span>
              </div>
              <div className="text-4xl md:text-5xl font-light text-blue-400 mb-8 font-serif">
                $45,000,000
              </div>
              <div className="flex gap-4">
                <Link href="/properties">
                  <Button className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 text-lg">
                    View Details
                  </Button>
                </Link>
                <Button variant="outline" className="border-white text-white hover:bg-white hover:text-black px-8 py-3 text-lg">
                  Schedule Tour
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Property Search Bar */}
      <section className="py-16 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white/5 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-8">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <button className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg">
                <Home className="w-5 h-5" />
                <span>Buying</span>
              </button>
              <button className="flex items-center gap-2 px-6 py-3 text-gray-300 hover:text-white transition-colors">
                <DollarSign className="w-5 h-5" />
                <span>Selling</span>
              </button>
              <button className="flex items-center gap-2 px-6 py-3 text-gray-300 hover:text-white transition-colors">
                <User className="w-5 h-5" />
                <span>Agent</span>
              </button>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Detecting your location..."
                  className="w-full pl-12 pr-4 py-4 bg-white/10 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
              </div>
              <Button className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-4">
                <Search className="w-5 h-5 mr-2" />
                Search
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-light mb-6 font-serif">
              International Luxury<br />Real Estate Brokerage
            </h2>
            <p className="text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
              Aperture Global is pioneering a new era in the international real estate market as the first of its kind in the global luxury space. With a vision to become the premier name in high-end real estate, Aperture Global operates with a presence concentrated on the greatest luxury cities around the world, spanning 6 continents and 20+ countries.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="bg-white/5 border-gray-800">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Home className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-2xl font-light mb-4 font-serif">Curated Luxury Listings</h3>
                <p className="text-gray-300 leading-relaxed">
                  Our bespoke marketing packages are meticulously designed to present your luxury property with unparalleled sophistication and precision.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-gray-800">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <TrendingUp className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-2xl font-light mb-4 font-serif">Maximize Your Property Results</h3>
                <p className="text-gray-300 leading-relaxed">
                  We craft high-impact marketing strategies tailored to each residence we represent–strategically maximizing visibility and elevating desirability.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-gray-800">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Star className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-2xl font-light mb-4 font-serif">Exclusive Media Platform</h3>
                <p className="text-gray-300 leading-relaxed">
                  Elite View Media is the best-in-class platform that exclusively targets high-net-worth and ultra-high-net-worth households.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Featured Properties Section */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-light mb-6 font-serif">Global Luxury Properties</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Discover our curated selection of exceptional properties from our international MLS feed spanning the world's most prestigious markets
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white/5 rounded-lg overflow-hidden">
                  <div className="h-64 bg-gray-700 animate-pulse"></div>
                  <div className="p-6">
                    <div className="h-4 bg-gray-700 rounded animate-pulse mb-2"></div>
                    <div className="h-4 bg-gray-700 rounded animate-pulse mb-4 w-3/4"></div>
                    <div className="h-6 bg-gray-700 rounded animate-pulse w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
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
          )}

          <div className="text-center mt-12">
            <Link href="/properties">
              <Button className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 text-lg">
                View All Properties
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* New Development Section */}
      <section className="py-20 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-light mb-4 font-serif">New Development</h2>
            <p className="text-blue-400 text-sm uppercase tracking-wider mb-4">Exclusive Pre-Construction Opportunities</p>
            <p className="text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
              Discover the world's most prestigious new developments, where architectural innovation meets uncompromising luxury. Our curated portfolio features groundbreaking projects from renowned developers, offering unparalleled investment opportunities and lifestyle experiences.
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 bg-white/5 border-gray-800 overflow-hidden">
              <div className="relative h-96">
                <Image
                  src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&h=600&fit=crop"
                  alt="The Residences at 1428 Brickell"
                  fill
                  className="object-cover"
                />
                <div className="absolute top-4 left-4 bg-blue-500 text-white px-3 py-1 rounded-full text-sm">
                  Exclusive Penthouses
                </div>
              </div>
              <CardContent className="p-8">
                <div className="flex items-center text-gray-300 mb-4">
                  <MapPin className="w-4 h-4 mr-2" />
                  <span>1428 Brickell Avenue, Miami, FL</span>
                </div>
                <h3 className="text-2xl font-light mb-4">The Residences at 1428 Brickell</h3>
                <p className="text-gray-300 mb-6 leading-relaxed">
                  Two extraordinary penthouses at the pinnacle of luxury living in Miami. These exclusive residences occupy the highest floors of this 70-story architectural masterpiece, offering unparalleled panoramic views of Biscayne Bay and the Miami skyline.
                </p>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-blue-400 font-semibold">2 Penthouses</div>
                    <div className="text-gray-400 text-sm">Exclusive</div>
                  </div>
                  <div className="text-center">
                    <div className="text-blue-400 font-semibold">Private Elevator</div>
                    <div className="text-gray-400 text-sm">Access</div>
                  </div>
                  <div className="text-center">
                    <div className="text-blue-400 font-semibold">80,000 SF</div>
                    <div className="text-gray-400 text-sm">Amenities</div>
                  </div>
                </div>
                <div className="flex gap-2 mb-6">
                  <span className="bg-white/10 text-gray-300 px-3 py-1 rounded-full text-sm">Rooftop Observatory</span>
                  <span className="bg-white/10 text-gray-300 px-3 py-1 rounded-full text-sm">Private Wellness Club</span>
                  <span className="bg-white/10 text-gray-300 px-3 py-1 rounded-full text-sm">Botanical Oasis</span>
                </div>
                <div className="flex gap-4">
                  <Button className="bg-blue-500 hover:bg-blue-600 text-white">
                    Schedule Private Tour
                  </Button>
                  <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-white hover:text-black">
                    Request Brochure
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-8">
              <Card className="bg-white/5 border-gray-800 overflow-hidden">
                <div className="relative h-48">
                  <Image
                    src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&h=400&fit=crop"
                    alt="Beverly Hills Estates"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute top-4 left-4 bg-yellow-500 text-black px-3 py-1 rounded-full text-sm">
                    Pre-Construction
                  </div>
                </div>
                <CardContent className="p-6">
                  <h3 className="text-xl font-light mb-2">Beverly Hills Estates</h3>
                  <p className="text-gray-300 text-sm mb-4">Beverly Hills, California</p>
                  <p className="text-gray-400 text-sm mb-4">
                    Ultra-luxury single-family estates featuring contemporary architecture, private grounds, and resort-style amenities.
                  </p>
                  <div className="text-blue-400 font-semibold mb-4">From $8,500,000</div>
                  <Button variant="outline" className="w-full border-gray-600 text-gray-300 hover:bg-white hover:text-black">
                    View Project
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-gray-800 overflow-hidden">
                <div className="relative h-48">
                  <Image
                    src="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&h=400&fit=crop"
                    alt="Monaco Riviera Residences"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute top-4 left-4 bg-purple-500 text-white px-3 py-1 rounded-full text-sm">
                    Limited Release
                  </div>
                </div>
                <CardContent className="p-6">
                  <h3 className="text-xl font-light mb-2">Monaco Riviera Residences</h3>
                  <p className="text-gray-300 text-sm mb-4">Monaco, French Riviera</p>
                  <p className="text-gray-400 text-sm mb-4">
                    Exclusive waterfront residences offering breathtaking Mediterranean views, private yacht berths, and access to Monaco's most prestigious lifestyle amenities.
                  </p>
                  <div className="text-blue-400 font-semibold mb-4">From €12,000,000</div>
                  <Button variant="outline" className="w-full border-gray-600 text-gray-300 hover:bg-white hover:text-black">
                    View Project
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-light mb-6 font-serif">By the Numbers</h2>
            <p className="text-xl text-gray-300">Our track record speaks for itself</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl md:text-5xl font-light text-blue-400 mb-2">$2.5B+</div>
              <div className="text-gray-300">Total Sales Volume</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-light text-blue-400 mb-2">500+</div>
              <div className="text-gray-300">Luxury Properties Sold</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-light text-blue-400 mb-2">25+</div>
              <div className="text-gray-300">Years of Experience</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-light text-blue-400 mb-2">15</div>
              <div className="text-gray-300">Global Markets</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-light mb-6 font-serif">
            Ready to Discover Your Perfect Property?
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
            Our team of luxury real estate specialists is here to help you find the perfect property that matches your unique lifestyle and investment goals.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact">
              <Button size="lg" className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 text-lg">
                Contact Our Specialists
              </Button>
            </Link>
            <Link href="/properties">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-black px-8 py-4 text-lg">
                Browse Properties
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}