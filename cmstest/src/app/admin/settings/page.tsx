'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Save, RefreshCw, AlertCircle } from 'lucide-react'

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({
    siteName: 'Aperture Global',
    siteDescription: 'Your gateway to the world\'s most exceptional properties.',
    contactEmail: 'info@apertureglobal.com',
    contactPhone: '+1 (234) 567-890',
    address: '123 Luxury Lane, Beverly Hills, CA 90210',
    socialMedia: {
      facebook: '',
      instagram: '',
      twitter: '',
      linkedin: ''
    }
  })

  const [mlsStatus, setMlsStatus] = useState({
    connected: false,
    lastSync: null,
    totalListings: 0,
    pendingUpdates: 0
  })

  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      // Here you would save to your backend
      console.log('Settings saved:', settings)
    } catch (error) {
      console.error('Error saving settings:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleMlsSync = async () => {
    try {
      const response = await fetch('/api/mls/sync', {
        method: 'POST',
      })
      if (response.ok) {
        // Refresh MLS status
        console.log('MLS sync triggered')
      }
    } catch (error) {
      console.error('Error triggering MLS sync:', error)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your site configuration and integrations</p>
      </div>

      <div className="grid gap-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>
              Configure your site's basic information and branding
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="siteName">Site Name</Label>
                <Input
                  id="siteName"
                  value={settings.siteName}
                  onChange={(e) => setSettings({...settings, siteName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={settings.contactEmail}
                  onChange={(e) => setSettings({...settings, contactEmail: e.target.value})}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="siteDescription">Site Description</Label>
              <Textarea
                id="siteDescription"
                value={settings.siteDescription}
                onChange={(e) => setSettings({...settings, siteDescription: e.target.value})}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Contact Phone</Label>
                <Input
                  id="contactPhone"
                  value={settings.contactPhone}
                  onChange={(e) => setSettings({...settings, contactPhone: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={settings.address}
                  onChange={(e) => setSettings({...settings, address: e.target.value})}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* MLS Integration */}
        <Card>
          <CardHeader>
            <CardTitle>MLS Integration</CardTitle>
            <CardDescription>
              Manage your MLS data synchronization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-medium">MLS Connection Status</h3>
                  <Badge variant={mlsStatus.connected ? 'default' : 'secondary'}>
                    {mlsStatus.connected ? 'Connected' : 'Not Connected'}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">
                  {mlsStatus.connected 
                    ? 'MLS integration is active and syncing data'
                    : 'MLS integration is not configured'
                  }
                </p>
              </div>
              <Button onClick={handleMlsSync} disabled={!mlsStatus.connected}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync Now
              </Button>
            </div>

            {mlsStatus.connected && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{mlsStatus.totalListings}</div>
                  <div className="text-sm text-blue-600">Total Listings</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {mlsStatus.lastSync ? 'Active' : 'Never'}
                  </div>
                  <div className="text-sm text-green-600">Last Sync</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{mlsStatus.pendingUpdates}</div>
                  <div className="text-sm text-yellow-600">Pending Updates</div>
                </div>
              </div>
            )}

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800">MLS Configuration Required</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    To enable MLS integration, configure your RESO API credentials in the environment variables.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Social Media */}
        <Card>
          <CardHeader>
            <CardTitle>Social Media</CardTitle>
            <CardDescription>
              Add your social media links to display on your website
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="facebook">Facebook</Label>
                <Input
                  id="facebook"
                  placeholder="https://facebook.com/yourpage"
                  value={settings.socialMedia.facebook}
                  onChange={(e) => setSettings({
                    ...settings, 
                    socialMedia: {...settings.socialMedia, facebook: e.target.value}
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  id="instagram"
                  placeholder="https://instagram.com/yourpage"
                  value={settings.socialMedia.instagram}
                  onChange={(e) => setSettings({
                    ...settings, 
                    socialMedia: {...settings.socialMedia, instagram: e.target.value}
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="twitter">Twitter</Label>
                <Input
                  id="twitter"
                  placeholder="https://twitter.com/yourpage"
                  value={settings.socialMedia.twitter}
                  onChange={(e) => setSettings({
                    ...settings, 
                    socialMedia: {...settings.socialMedia, twitter: e.target.value}
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn</Label>
                <Input
                  id="linkedin"
                  placeholder="https://linkedin.com/company/yourpage"
                  value={settings.socialMedia.linkedin}
                  onChange={(e) => setSettings({
                    ...settings, 
                    socialMedia: {...settings.socialMedia, linkedin: e.target.value}
                  })}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
