import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Mail, Phone, Award, MapPin, ArrowLeft, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

interface AgentPageProps {
  params: {
    slug: string
  }
}

export default async function AgentPage({ params }: AgentPageProps) {
  const { slug } = await params
  const agent = await prisma.agent.findUnique({
    where: { slug }
  })

  if (!agent) {
    notFound()
  }

  const specialties = JSON.parse(agent.specialties || '[]')
  const markets = JSON.parse(agent.markets || '[]')
  const socials = agent.socials ? JSON.parse(agent.socials) : {}

  // Get agent's listings
  const listings = await prisma.listing.findMany({
    where: { 
      agentId: agent.id,
      status: 'ACTIVE'
    },
    take: 6,
    orderBy: { createdAt: 'desc' }
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center mb-6">
            <Button variant="outline" size="sm" asChild>
              <Link href="/agents">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Agents
              </Link>
            </Button>
          </div>
          
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Agent Photo */}
            <div className="lg:w-1/3">
              <div className="relative">
                {agent.featured && (
                  <Badge className="absolute top-4 right-4 z-10 bg-gold text-white">
                    <Award className="w-3 h-3 mr-1" />
                    Featured Agent
                  </Badge>
                )}
                <div className="relative w-full h-96 lg:h-[500px] bg-gray-200 rounded-lg overflow-hidden">
                  {agent.portrait ? (
                    <Image
                      src={agent.portrait}
                      alt={agent.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <div className="text-center">
                        <div className="w-24 h-24 bg-gray-300 rounded-full mx-auto mb-4"></div>
                        <span>No Photo Available</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Agent Info */}
            <div className="lg:w-2/3">
              <div className="mb-6">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">{agent.name}</h1>
                {agent.license && (
                  <p className="text-lg text-gray-600">License: {agent.license}</p>
                )}
              </div>

              {agent.bio && (
                <div className="mb-8">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">About</h2>
                  <p className="text-gray-600 leading-relaxed text-lg">
                    {agent.bio}
                  </p>
                </div>
              )}

              {/* Specialties */}
              {specialties.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Specialties</h3>
                  <div className="flex flex-wrap gap-2">
                    {specialties.map((specialty: string, index: number) => (
                      <Badge key={index} variant="secondary" className="text-sm py-1 px-3">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Markets */}
              {markets.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <MapPin className="w-5 h-5 mr-2" />
                    Markets
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {markets.map((market: string, index: number) => (
                      <Badge key={index} variant="outline" className="text-sm py-1 px-3">
                        {market}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact Information */}
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {agent.email && (
                    <div className="flex items-center">
                      <Mail className="w-5 h-5 mr-3 text-gray-500" />
                      <a href={`mailto:${agent.email}`} className="text-lg hover:text-navy">
                        {agent.email}
                      </a>
                    </div>
                  )}
                  {agent.phone && (
                    <div className="flex items-center">
                      <Phone className="w-5 h-5 mr-3 text-gray-500" />
                      <a href={`tel:${agent.phone}`} className="text-lg hover:text-navy">
                        {agent.phone}
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Social Links */}
              {Object.keys(socials).length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Connect</h3>
                  <div className="flex gap-3">
                    {socials.linkedin && (
                      <Button variant="outline" asChild>
                        <a href={socials.linkedin} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          LinkedIn
                        </a>
                      </Button>
                    )}
                    {socials.instagram && (
                      <Button variant="outline" asChild>
                        <a href={socials.instagram} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Instagram
                        </a>
                      </Button>
                    )}
                    {socials.twitter && (
                      <Button variant="outline" asChild>
                        <a href={socials.twitter} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Twitter
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" asChild>
                  <a href={`mailto:${agent.email}`}>
                    <Mail className="w-5 h-5 mr-2" />
                    Contact {agent.name.split(' ')[0]}
                  </a>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/contact">
                    Schedule Consultation
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Agent's Properties */}
      {listings.length > 0 && (
        <div className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {agent.name.split(' ')[0]}'s Properties
            </h2>
            <p className="text-lg text-gray-600">
              Current listings by {agent.name}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {listings.map((listing) => {
              const lifestyles = JSON.parse(listing.lifestyles || '[]')
              const amenities = JSON.parse(listing.amenities || '[]')

              return (
                <Card key={listing.id} className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
                  <div className="relative w-full h-48 bg-gray-200">
                    {listing.heroImage ? (
                      <Image
                        src={listing.heroImage}
                        alt={listing.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        No Image
                      </div>
                    )}
                  </div>
                  
                  <CardHeader>
                    <CardTitle className="text-lg">{listing.title}</CardTitle>
                    <CardDescription className="text-navy font-semibold">
                      {listing.priceDisplay}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>{listing.bedrooms} beds</span>
                        <span>{listing.bathrooms} baths</span>
                        {listing.squareFeet && <span>{listing.squareFeet.toLocaleString()} sq ft</span>}
                      </div>
                    </div>

                    {lifestyles.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {lifestyles.slice(0, 3).map((lifestyle: string, index: number) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {lifestyle}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <Button className="w-full" asChild>
                      <Link href={`/properties/${listing.slug}`}>
                        View Details
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="text-center mt-8">
            <Button variant="outline" size="lg" asChild>
              <Link href="/properties">
                View All Properties
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* CTA Section */}
      <div className="bg-navy text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Work With {agent.name}?</h2>
          <p className="text-xl text-gray-200 mb-8 max-w-2xl mx-auto">
            Contact {agent.name} today to discuss your luxury real estate needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" asChild>
              <a href={`mailto:${agent.email}`}>
                <Mail className="w-5 h-5 mr-2" />
                Email {agent.name.split(' ')[0]}
              </a>
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-navy" asChild>
              <Link href="/contact">Schedule Consultation</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
