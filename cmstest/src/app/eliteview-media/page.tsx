import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Play, Calendar, Users, TrendingUp, Star } from 'lucide-react'

const mediaContent = [
  {
    id: 1,
    title: 'Inside the $50M Beverly Hills Estate',
    type: 'Video',
    category: 'Property Tours',
    duration: '12:34',
    views: '2.3M',
    publishedDate: '2024-01-15',
    description: 'Take an exclusive tour of one of Beverly Hills\' most luxurious estates, featuring stunning architecture and breathtaking views.',
    thumbnail: '/api/placeholder/400/225',
    featured: true
  },
  {
    id: 2,
    title: 'Monaco Real Estate Market Report 2024',
    type: 'Article',
    category: 'Market Analysis',
    readTime: '8 min read',
    views: '156K',
    publishedDate: '2024-01-12',
    description: 'Comprehensive analysis of Monaco\'s luxury real estate market, including price trends and investment opportunities.',
    thumbnail: '/api/placeholder/400/225'
  },
  {
    id: 3,
    title: 'Luxury Home Staging Secrets',
    type: 'Video',
    category: 'Design & Styling',
    duration: '15:22',
    views: '890K',
    publishedDate: '2024-01-10',
    description: 'Professional staging tips from top luxury home designers to maximize your property\'s appeal.',
    thumbnail: '/api/placeholder/400/225'
  },
  {
    id: 4,
    title: 'New York Penthouse Market Trends',
    type: 'Article',
    category: 'Market Analysis',
    readTime: '6 min read',
    views: '234K',
    publishedDate: '2024-01-08',
    description: 'In-depth look at Manhattan\'s luxury penthouse market, featuring exclusive data and expert insights.',
    thumbnail: '/api/placeholder/400/225'
  },
  {
    id: 5,
    title: 'Celebrity Real Estate Investments',
    type: 'Video',
    category: 'Lifestyle',
    duration: '18:45',
    views: '1.7M',
    publishedDate: '2024-01-05',
    description: 'Explore the luxury properties owned by Hollywood\'s biggest stars and their investment strategies.',
    thumbnail: '/api/placeholder/400/225'
  },
  {
    id: 6,
    title: 'Sustainable Luxury: Eco-Friendly Mansions',
    type: 'Article',
    category: 'Innovation',
    readTime: '10 min read',
    views: '98K',
    publishedDate: '2024-01-03',
    description: 'Discover how luxury homes are embracing sustainable design without compromising on elegance.',
    thumbnail: '/api/placeholder/400/225'
  }
]

const categories = [
  { id: 'all', name: 'All Content', count: mediaContent.length },
  { id: 'property-tours', name: 'Property Tours', count: 1 },
  { id: 'market-analysis', name: 'Market Analysis', count: 2 },
  { id: 'design-styling', name: 'Design & Styling', count: 1 },
  { id: 'lifestyle', name: 'Lifestyle', count: 1 },
  { id: 'innovation', name: 'Innovation', count: 1 }
]

export default function EliteViewMediaPage() {
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Property Tours':
        return 'bg-blue-100 text-blue-800'
      case 'Market Analysis':
        return 'bg-green-100 text-green-800'
      case 'Design & Styling':
        return 'bg-purple-100 text-purple-800'
      case 'Lifestyle':
        return 'bg-pink-100 text-pink-800'
      case 'Innovation':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-white">
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-navy to-gray-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-light mb-4">
              EliteView Media
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Exclusive content showcasing the world's most extraordinary properties, market insights, and luxury lifestyle.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Content */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="bg-gold text-white mb-4">Featured Content</Badge>
            <h2 className="text-3xl font-light text-gray-900 mb-4">
              Inside the $50M Beverly Hills Estate
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Take an exclusive tour of one of Beverly Hills' most luxurious estates, featuring stunning architecture and breathtaking views.
            </p>
          </div>

          <Card className="overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="aspect-[16/9] bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center relative">
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <Button size="lg" className="bg-gold hover:bg-gold/90 text-white rounded-full w-20 h-20">
                    <Play className="w-8 h-8 ml-1" />
                  </Button>
                </div>
                <span className="text-gray-600">Featured Video Thumbnail</span>
              </div>
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <Badge className={`${getCategoryColor('Property Tours')}`}>
                      Property Tours
                    </Badge>
                    <Badge variant="outline">Video</Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center">
                      <Play className="w-4 h-4 text-gold mr-2" />
                      <div>
                        <div className="text-gray-600">Duration</div>
                        <div className="font-semibold">12:34</div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Users className="w-4 h-4 text-gold mr-2" />
                      <div>
                        <div className="text-gray-600">Views</div>
                        <div className="font-semibold">2.3M</div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 text-gold mr-2" />
                      <div>
                        <div className="text-gray-600">Published</div>
                        <div className="font-semibold">Jan 15</div>
                      </div>
                    </div>
                  </div>

                  <p className="text-gray-600">
                    Step inside one of the most magnificent estates in Beverly Hills. This architectural masterpiece 
                    features 12 bedrooms, 16 bathrooms, and over 20,000 square feet of living space, all designed 
                    to capture the essence of California luxury living.
                  </p>

                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-gold fill-current" />
                    <span className="text-sm text-gray-600">Featured on EliteView Media</span>
                  </div>

                  <Button className="w-full bg-gold hover:bg-gold/90 text-white">
                    Watch Now
                    <Play className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </div>
          </Card>
        </div>
      </section>

      {/* Content Categories */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-light text-gray-900 mb-4">Browse by Category</h2>
            <p className="text-xl text-gray-600">
              Explore our diverse range of luxury real estate content
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((category) => (
              <Card key={category.id} className="text-center hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="text-2xl font-semibold text-gold mb-1">
                    {category.count}
                  </div>
                  <div className="text-sm text-gray-600">
                    {category.name}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* All Content */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-light text-gray-900 mb-4">All Content</h2>
            <p className="text-xl text-gray-600">
              Discover our complete library of luxury real estate content
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {mediaContent.slice(1).map((content) => (
              <Card key={content.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-[16/9] bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center relative">
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <Button size="sm" className="bg-gold hover:bg-gold/90 text-white rounded-full w-12 h-12">
                      <Play className="w-4 h-4 ml-0.5" />
                    </Button>
                  </div>
                  <span className="text-gray-600 text-sm">Video Thumbnail</span>
                </div>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className={`${getCategoryColor(content.category)} text-xs`}>
                      {content.category}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {content.type}
                    </Badge>
                  </div>

                  <h3 className="text-lg font-semibold mb-2 line-clamp-2">
                    {content.title}
                  </h3>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {content.description}
                  </p>

                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-1" />
                        {content.views}
                      </div>
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {formatDate(content.publishedDate)}
                      </div>
                    </div>
                    <div className="text-gold font-medium">
                      {content.type === 'Video' ? content.duration : content.readTime}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Signup */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="bg-gradient-to-r from-gold to-gold/80 text-white">
            <CardContent className="p-12 text-center">
              <h2 className="text-3xl font-light mb-4">
                Stay Updated with EliteView Media
              </h2>
              <p className="text-xl mb-8 max-w-3xl mx-auto opacity-90">
                Get exclusive access to new content, market insights, and behind-the-scenes footage 
                from the world's most extraordinary properties.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-3 rounded-lg text-gray-900 placeholder-gray-500"
                />
                <Button size="lg" variant="secondary" className="bg-white text-gold hover:bg-gray-100">
                  Subscribe
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-light text-gray-900 mb-4">
            Ready to Feature Your Property?
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Showcase your luxury property to our global audience of high-net-worth individuals and real estate enthusiasts.
          </p>
          <Button size="lg" className="bg-gold hover:bg-gold/90 text-white">
            Contact Media Team
          </Button>
        </div>
      </section>
    </div>
  )
}
