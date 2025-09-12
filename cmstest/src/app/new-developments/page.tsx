import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MapPin, Calendar, Users, Star, ArrowRight } from 'lucide-react'

const newDevelopments = [
  {
    id: 1,
    name: 'The Residences at Central Park',
    location: 'Manhattan, New York',
    status: 'Coming Soon',
    completionDate: '2025',
    units: 45,
    startingPrice: '$4.2M',
    description: 'Luxury condominiums with panoramic Central Park views, featuring world-class amenities and concierge services.',
    features: ['Central Park Views', 'Concierge Service', 'Rooftop Pool', 'Private Gym'],
    image: '/api/placeholder/600/400'
  },
  {
    id: 2,
    name: 'Beverly Hills Estates',
    location: 'Beverly Hills, California',
    status: 'Under Construction',
    completionDate: '2025',
    units: 28,
    startingPrice: '$8.5M',
    description: 'Exclusive estate homes in the heart of Beverly Hills, combining modern luxury with classic California living.',
    features: ['Private Pools', 'Wine Cellars', 'Smart Home Technology', 'Gated Community'],
    image: '/api/placeholder/600/400'
  },
  {
    id: 3,
    name: 'Monaco Marina Residences',
    location: 'Monaco',
    status: 'Pre-Construction',
    completionDate: '2026',
    units: 35,
    startingPrice: '€12M',
    description: 'Ultra-luxury waterfront residences overlooking the Mediterranean, featuring private marina access.',
    features: ['Marina Access', 'Helipad', 'Private Beach', '24/7 Security'],
    image: '/api/placeholder/600/400'
  },
  {
    id: 4,
    name: 'The Pinnacle at One57',
    location: 'Manhattan, New York',
    status: 'Completed',
    completionDate: '2024',
    units: 94,
    startingPrice: '$6.8M',
    description: 'Iconic supertall residential tower with unparalleled city and river views, featuring luxury amenities.',
    features: ['City Views', 'Private Dining', 'Spa Services', 'Valet Parking'],
    image: '/api/placeholder/600/400'
  }
]

export default function NewDevelopmentsPage() {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800'
      case 'Under Construction':
        return 'bg-blue-100 text-blue-800'
      case 'Coming Soon':
        return 'bg-yellow-100 text-yellow-800'
      case 'Pre-Construction':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-white">
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-navy to-gray-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-light mb-4">
              New Developments
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Be among the first to own in the world's most exclusive new residential developments, from Manhattan to Monaco.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Development */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="bg-gold text-white mb-4">Featured Development</Badge>
            <h2 className="text-3xl font-light text-gray-900 mb-4">
              The Residences at Central Park
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Experience the pinnacle of Manhattan living with panoramic Central Park views and world-class amenities.
            </p>
          </div>

          <Card className="overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="aspect-[4/3] bg-gradient-to-br from-gold to-navy flex items-center justify-center">
                <span className="text-white text-lg">Featured Development Image</span>
              </div>
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div>
                    <Badge className={`mb-3 ${getStatusColor('Coming Soon')}`}>
                      Coming Soon
                    </Badge>
                    <h3 className="text-2xl font-semibold mb-2">The Residences at Central Park</h3>
                    <div className="flex items-center text-gray-600 mb-4">
                      <MapPin className="w-4 h-4 mr-2" />
                      Manhattan, New York
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center">
                      <Calendar className="w-5 h-5 text-gold mr-2" />
                      <div>
                        <div className="text-sm text-gray-600">Completion</div>
                        <div className="font-semibold">2025</div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Users className="w-5 h-5 text-gold mr-2" />
                      <div>
                        <div className="text-sm text-gray-600">Units</div>
                        <div className="font-semibold">45</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-600 mb-1">Starting from</div>
                    <div className="text-3xl font-light text-gold">$4.2M</div>
                  </div>

                  <p className="text-gray-600">
                    Luxury condominiums with panoramic Central Park views, featuring world-class amenities and concierge services.
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {['Central Park Views', 'Concierge Service', 'Rooftop Pool', 'Private Gym'].map((feature) => (
                      <Badge key={feature} variant="outline" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>

                  <Button className="w-full bg-gold hover:bg-gold/90 text-white">
                    Learn More
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </div>
          </Card>
        </div>
      </section>

      {/* All Developments */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-light text-gray-900 mb-4">All Developments</h2>
            <p className="text-xl text-gray-600">
              Explore our complete portfolio of luxury residential developments
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {newDevelopments.map((development) => (
              <Card key={development.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-[4/3] bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                  <span className="text-gray-600">Development Image</span>
                </div>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <Badge className={`${getStatusColor(development.status)}`}>
                      {development.status}
                    </Badge>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">Starting from</div>
                      <div className="text-xl font-semibold text-gold">{development.startingPrice}</div>
                    </div>
                  </div>

                  <h3 className="text-xl font-semibold mb-2">{development.name}</h3>
                  <div className="flex items-center text-gray-600 mb-3">
                    <MapPin className="w-4 h-4 mr-2" />
                    {development.location}
                  </div>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {development.description}
                  </p>

                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 text-gold mr-2" />
                      <span className="text-gray-600">Completion: </span>
                      <span className="font-medium">{development.completionDate}</span>
                    </div>
                    <div className="flex items-center">
                      <Users className="w-4 h-4 text-gold mr-2" />
                      <span className="text-gray-600">Units: </span>
                      <span className="font-medium">{development.units}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-4">
                    {development.features.slice(0, 3).map((feature) => (
                      <Badge key={feature} variant="outline" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                    {development.features.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{development.features.length - 3} more
                      </Badge>
                    )}
                  </div>

                  <Button variant="outline" className="w-full text-gold border-gold hover:bg-gold hover:text-white">
                    View Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Investment Opportunity */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="bg-gradient-to-r from-gold to-gold/80 text-white">
            <CardContent className="p-12 text-center">
              <h2 className="text-3xl font-light mb-4">
                Early Investment Opportunity
              </h2>
              <p className="text-xl mb-8 max-w-3xl mx-auto opacity-90">
                Get exclusive access to pre-construction pricing and premium unit selection. 
                Early investors receive special incentives and preferred financing options.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" variant="secondary" className="bg-white text-gold hover:bg-gray-100">
                  Request Investment Package
                </Button>
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-gold">
                  Schedule Private Tour
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-light text-gray-900 mb-4">
            Ready to Invest in the Future of Luxury Living?
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Our development specialists can help you find the perfect investment opportunity in the world's most prestigious new developments.
          </p>
          <Button size="lg" className="bg-gold hover:bg-gold/90 text-white">
            Contact Development Team
          </Button>
        </div>
      </section>
    </div>
  )
}
