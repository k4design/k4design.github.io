import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Award, Globe, Heart } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-navy to-gray-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-light mb-4">
              About Aperture Global
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              We are a premier luxury real estate brokerage dedicated to connecting discerning clients with the world's most exceptional properties.
            </p>
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-light text-gray-900 mb-6">Our Story</h2>
              <div className="space-y-4 text-gray-600">
                <p>
                  Founded with a vision to redefine luxury real estate, Aperture Global has established itself as a trusted partner for high-net-worth individuals seeking exceptional properties worldwide.
                </p>
                <p>
                  Our team of seasoned professionals brings decades of experience in luxury markets, from Beverly Hills to Manhattan, from Monaco to London. We understand that buying or selling a luxury property is more than a transaction—it's a life-changing decision.
                </p>
                <p>
                  We combine local market expertise with global reach, ensuring our clients have access to the most exclusive properties and the most favorable opportunities in the world's most prestigious locations.
                </p>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-[4/3] bg-gray-200 rounded-lg overflow-hidden">
                <div className="w-full h-full bg-gradient-to-br from-gold to-navy flex items-center justify-center">
                  <span className="text-white text-lg">Luxury Property Image</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-light text-gray-900 mb-4">Our Values</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              The principles that guide everything we do
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-gold" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Client-First</h3>
                <p className="text-gray-600">
                  Every decision we make is guided by what's best for our clients' unique needs and aspirations.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="w-8 h-8 text-gold" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Excellence</h3>
                <p className="text-gray-600">
                  We strive for perfection in every aspect of our service, from property selection to transaction management.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Globe className="w-8 h-8 text-gold" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Global Reach</h3>
                <p className="text-gray-600">
                  Our worldwide network ensures access to the most exclusive properties in the world's finest locations.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-8 h-8 text-gold" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Integrity</h3>
                <p className="text-gray-600">
                  We conduct business with the highest ethical standards, building lasting relationships based on trust.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-light text-gray-900 mb-4">By the Numbers</h2>
            <p className="text-xl text-gray-600">
              Our track record speaks for itself
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-light text-gold mb-2">$2.5B+</div>
              <div className="text-gray-600">Total Sales Volume</div>
            </div>
            <div>
              <div className="text-4xl font-light text-gold mb-2">500+</div>
              <div className="text-gray-600">Luxury Properties Sold</div>
            </div>
            <div>
              <div className="text-4xl font-light text-gold mb-2">25+</div>
              <div className="text-gray-600">Years of Experience</div>
            </div>
            <div>
              <div className="text-4xl font-light text-gold mb-2">15</div>
              <div className="text-gray-600">Global Markets</div>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-light text-gray-900 mb-4">Meet Our Team</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our success is built on the expertise and dedication of our world-class team of real estate professionals.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="w-32 h-32 bg-gray-200 rounded-full mx-auto mb-4"></div>
                <h3 className="text-xl font-semibold mb-2">Sarah Mitchell</h3>
                <p className="text-gold mb-2">Senior Vice President</p>
                <p className="text-gray-600 text-sm">
                  Specializes in Beverly Hills and Malibu luxury estates with over 15 years of experience.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="w-32 h-32 bg-gray-200 rounded-full mx-auto mb-4"></div>
                <h3 className="text-xl font-semibold mb-2">Michael Rodriguez</h3>
                <p className="text-gold mb-2">Vice President</p>
                <p className="text-gray-600 text-sm">
                  Manhattan luxury specialist with expertise in penthouses and townhouses.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="w-32 h-32 bg-gray-200 rounded-full mx-auto mb-4"></div>
                <h3 className="text-xl font-semibold mb-2">Kyle Foreman</h3>
                <p className="text-gold mb-2">Founder & CEO</p>
                <p className="text-gray-600 text-sm">
                  Visionary leader with 25+ years in luxury real estate across global markets.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}
