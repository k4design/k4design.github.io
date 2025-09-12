import { ContactForm } from '@/components/forms/ContactForm'
import { Card, CardContent } from '@/components/ui/card'
import { MapPin, Phone, Mail, Clock, MessageSquare } from 'lucide-react'

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white">
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-navy to-gray-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-light mb-4">
              Contact Us
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Ready to find your dream property? Our luxury real estate experts are here to help.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Content */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Information */}
            <div className="space-y-8">
              <div>
                <h2 className="text-3xl font-light text-gray-900 mb-6">
                  Get In Touch
                </h2>
                <p className="text-lg text-gray-600 mb-8">
                  Whether you're looking to buy, sell, or invest in luxury real estate, 
                  our team of expert agents is ready to provide personalized service 
                  tailored to your unique needs.
                </p>
              </div>

              {/* Contact Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gold rounded-full flex items-center justify-center">
                        <Phone className="w-6 h-6 text-black" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Phone</h3>
                        <p className="text-gray-600">+1 (555) 123-4567</p>
                        <p className="text-sm text-gray-500">Mon-Fri 9AM-6PM</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gold rounded-full flex items-center justify-center">
                        <Mail className="w-6 h-6 text-black" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Email</h3>
                        <p className="text-gray-600">info@apertureglobal.com</p>
                        <p className="text-sm text-gray-500">24/7 Response</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gold rounded-full flex items-center justify-center">
                        <MapPin className="w-6 h-6 text-black" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Headquarters</h3>
                        <p className="text-gray-600">
                          123 Luxury Lane<br />
                          Beverly Hills, CA 90210
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gold rounded-full flex items-center justify-center">
                        <Clock className="w-6 h-6 text-black" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Business Hours</h3>
                        <p className="text-gray-600">
                          Monday - Friday<br />
                          9:00 AM - 6:00 PM PST
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Additional Information */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Why Choose Aperture Global?
                </h3>
                <ul className="space-y-3 text-gray-600">
                  <li className="flex items-start gap-3">
                    <MessageSquare className="w-5 h-5 text-gold mt-0.5 flex-shrink-0" />
                    <span>Personalized service from dedicated luxury real estate specialists</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <MessageSquare className="w-5 h-5 text-gold mt-0.5 flex-shrink-0" />
                    <span>Access to exclusive off-market properties</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <MessageSquare className="w-5 h-5 text-gold mt-0.5 flex-shrink-0" />
                    <span>Comprehensive market analysis and pricing expertise</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <MessageSquare className="w-5 h-5 text-gold mt-0.5 flex-shrink-0" />
                    <span>International network of luxury property experts</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <MessageSquare className="w-5 h-5 text-gold mt-0.5 flex-shrink-0" />
                    <span>Concierge-level service throughout your real estate journey</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Contact Form */}
            <div className="lg:sticky lg:top-8">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-light text-gray-900 mb-4">
              Visit Our Office
            </h2>
            <p className="text-lg text-gray-600">
              Located in the heart of Beverly Hills, our flagship office welcomes clients from around the world.
            </p>
          </div>

          {/* Map Placeholder */}
          <div className="bg-gray-200 rounded-lg h-96 flex items-center justify-center">
            <div className="text-center">
              <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                Interactive Map
              </h3>
              <p className="text-gray-500">
                Map integration coming soon
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-gold to-yellow-400">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-light text-black mb-6">
            Ready to Start Your Journey?
          </h2>
          <p className="text-xl text-black/80 mb-8 max-w-2xl mx-auto">
            Our team of luxury real estate experts is standing by to help you find 
            your perfect property or maximize the value of your current investment.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="tel:+15551234567"
              className="inline-block bg-black text-white px-8 py-4 rounded-lg font-semibold hover:bg-black/90 transition-colors"
            >
              Call Now: (555) 123-4567
            </a>
            <a
              href="mailto:info@apertureglobal.com"
              className="inline-block border-2 border-black text-black px-8 py-4 rounded-lg font-semibold hover:bg-black hover:text-white transition-colors"
            >
              Email Us
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
