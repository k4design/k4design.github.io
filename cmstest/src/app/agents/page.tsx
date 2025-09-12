import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Mail, Phone, Award, MapPin } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export default async function AgentsPage() {
  const agents = await prisma.agent.findMany({
    orderBy: { order: 'asc' }
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Our Expert Agents
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Meet the dedicated professionals who make luxury real estate dreams come true. 
              Our agents combine local expertise with global reach to deliver exceptional results.
            </p>
          </div>
        </div>
      </div>

      {/* Agents Grid */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {agents.map((agent) => {
            const specialties = JSON.parse(agent.specialties || '[]')
            const markets = JSON.parse(agent.markets || '[]')
            const socials = agent.socials ? JSON.parse(agent.socials) : {}

            return (
              <Card key={agent.id} className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
                <div className="relative">
                  {agent.featured && (
                    <Badge className="absolute top-4 right-4 z-10 bg-gold text-white">
                      <Award className="w-3 h-3 mr-1" />
                      Featured
                    </Badge>
                  )}
                  <div className="relative w-full h-64 bg-gray-200">
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
                          <div className="w-16 h-16 bg-gray-300 rounded-full mx-auto mb-2"></div>
                          <span className="text-sm">No Photo</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <CardHeader>
                  <CardTitle className="text-xl">{agent.name}</CardTitle>
                  {agent.license && (
                    <CardDescription className="text-sm text-gray-500">
                      License: {agent.license}
                    </CardDescription>
                  )}
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {agent.bio && (
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {agent.bio}
                    </p>
                  )}

                  {/* Specialties */}
                  {specialties.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm text-gray-900 mb-2">Specialties</h4>
                      <div className="flex flex-wrap gap-1">
                        {specialties.map((specialty: string, index: number) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {specialty}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Markets */}
                  {markets.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm text-gray-900 mb-2 flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        Markets
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {markets.map((market: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {market}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Contact Info */}
                  <div className="space-y-2 pt-4 border-t">
                    {agent.email && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail className="w-4 h-4 mr-2" />
                        <a href={`mailto:${agent.email}`} className="hover:text-navy">
                          {agent.email}
                        </a>
                      </div>
                    )}
                    {agent.phone && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Phone className="w-4 h-4 mr-2" />
                        <a href={`tel:${agent.phone}`} className="hover:text-navy">
                          {agent.phone}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Social Links */}
                  {Object.keys(socials).length > 0 && (
                    <div className="flex gap-2 pt-2">
                      {socials.linkedin && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={socials.linkedin} target="_blank" rel="noopener noreferrer">
                            LinkedIn
                          </a>
                        </Button>
                      )}
                      {socials.instagram && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={socials.instagram} target="_blank" rel="noopener noreferrer">
                            Instagram
                          </a>
                        </Button>
                      )}
                      {socials.twitter && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={socials.twitter} target="_blank" rel="noopener noreferrer">
                            Twitter
                          </a>
                        </Button>
                      )}
                    </div>
                  )}

                  {/* View Profile Button */}
                  <Button className="w-full mt-4" asChild>
                    <Link href={`/agents/${agent.slug}`}>
                      View Full Profile
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-navy text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Work With Our Team?</h2>
          <p className="text-xl text-gray-200 mb-8 max-w-2xl mx-auto">
            Contact us today to discuss your luxury real estate needs with our expert agents.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" asChild>
              <Link href="/contact">Get In Touch</Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-navy" asChild>
              <Link href="/properties">View Properties</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
