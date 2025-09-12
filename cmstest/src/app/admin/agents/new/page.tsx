'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function NewAgentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    license: '',
    bio: '',
    portrait: '',
    specialties: '',
    markets: '',
    featured: false,
    order: 0
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const requestData = {
        ...formData,
        specialties: formData.specialties.split(',').map(s => s.trim()).filter(s => s),
        markets: formData.markets.split(',').map(s => s.trim()).filter(s => s),
      }
      
      const response = await fetch('/api/admin/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })

      const responseData = await response.json()

      if (response.ok) {
        toast.success('Agent created successfully')
        router.push('/admin/agents')
      } else {
        // Show detailed error message
        const errorMessage = responseData.details 
          ? `Validation failed: ${responseData.details.map((d: any) => d.message).join(', ')}`
          : responseData.error || 'Unknown error'
        toast.error(`Failed to create agent: ${errorMessage}`)
      }
    } catch (error) {
      console.error('Error creating agent:', error)
      toast.error('Failed to create agent')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string | boolean | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/agents">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Agents
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Add New Agent</h1>
          <p className="text-gray-600 mt-1">Create a new agent profile</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Enter the agent's basic contact and professional information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="license">License Number</Label>
                <Input
                  id="license"
                  value={formData.license}
                  onChange={(e) => handleInputChange('license', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="portrait">Portrait Image URL</Label>
              <Input
                id="portrait"
                type="url"
                value={formData.portrait}
                onChange={(e) => handleInputChange('portrait', e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                rows={4}
                placeholder="Tell us about this agent's experience and expertise..."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Specialties & Markets</CardTitle>
            <CardDescription>
              Define the agent's areas of expertise and market coverage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="specialties">Specialties</Label>
              <Input
                id="specialties"
                value={formData.specialties}
                onChange={(e) => handleInputChange('specialties', e.target.value)}
                placeholder="Luxury Homes, New Construction, Investment Properties (comma separated)"
              />
              <p className="text-sm text-gray-500">
                Separate multiple specialties with commas
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="markets">Markets</Label>
              <Input
                id="markets"
                value={formData.markets}
                onChange={(e) => handleInputChange('markets', e.target.value)}
                placeholder="Beverly Hills, West Hollywood, Bel Air (comma separated)"
              />
              <p className="text-sm text-gray-500">
                Separate multiple markets with commas
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Display Settings</CardTitle>
            <CardDescription>
              Configure how this agent appears on your website
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="featured"
                checked={formData.featured}
                onCheckedChange={(checked) => handleInputChange('featured', checked)}
              />
              <Label htmlFor="featured">Featured Agent</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="order">Display Order</Label>
              <Input
                id="order"
                type="number"
                value={formData.order}
                onChange={(e) => handleInputChange('order', parseInt(e.target.value) || 0)}
                min="0"
              />
              <p className="text-sm text-gray-500">
                Lower numbers appear first (0 = first position)
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/admin/agents">Cancel</Link>
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {loading ? 'Creating...' : 'Create Agent'}
          </Button>
        </div>
      </form>
    </div>
  )
}
