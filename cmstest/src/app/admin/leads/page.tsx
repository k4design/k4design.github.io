'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Mail, Phone, Calendar, MapPin, Eye } from 'lucide-react'

interface Lead {
  id: string
  name: string
  email: string
  phone: string
  message: string
  source: string
  status: string
  createdAt: string
  listing?: {
    title: string
    price: number
  }
}

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    fetchLeads()
  }, [])

  const fetchLeads = async () => {
    try {
      const response = await fetch('/api/admin/leads')
      const data = await response.json()
      setLeads(data.leads || [])
    } catch (error) {
      console.error('Error fetching leads:', error)
      // For now, show mock data
      setLeads([
        {
          id: '1',
          name: 'John Smith',
          email: 'john@example.com',
          phone: '+1 (555) 123-4567',
          message: 'I\'m interested in learning more about the Beverly Hills property. When can I schedule a viewing?',
          source: 'contact-form',
          status: 'NEW',
          createdAt: '2024-01-15T10:30:00.000Z',
          listing: {
            title: '123 Beverly Hills Dr, Beverly Hills, CA',
            price: 2500000
          }
        },
        {
          id: '2',
          name: 'Sarah Johnson',
          email: 'sarah@example.com',
          phone: '+1 (555) 234-5678',
          message: 'Could you send me more information about your luxury properties in Manhattan?',
          source: 'property-inquiry',
          status: 'CONTACTED',
          createdAt: '2024-01-14T15:45:00.000Z'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/leads/${leadId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })
      
      if (response.ok) {
        setLeads(leads.map(lead => 
          lead.id === leadId ? { ...lead, status: newStatus } : lead
        ))
      }
    } catch (error) {
      console.error('Error updating lead status:', error)
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'NEW': return 'default'
      case 'CONTACTED': return 'secondary'
      case 'QUALIFIED': return 'default'
      case 'INTERESTED': return 'default'
      case 'CONVERTED': return 'default'
      case 'NOT_INTERESTED': return 'secondary'
      default: return 'outline'
    }
  }

  const getSourceBadgeVariant = (source: string) => {
    switch (source) {
      case 'contact-form': return 'default'
      case 'property-inquiry': return 'secondary'
      case 'agent-referral': return 'default'
      default: return 'outline'
    }
  }

  const filteredLeads = statusFilter === 'all' 
    ? leads 
    : leads.filter(lead => lead.status === statusFilter)

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading leads...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-600 mt-1">Manage and track your leads</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Leads</SelectItem>
              <SelectItem value="NEW">New</SelectItem>
              <SelectItem value="CONTACTED">Contacted</SelectItem>
              <SelectItem value="QUALIFIED">Qualified</SelectItem>
              <SelectItem value="INTERESTED">Interested</SelectItem>
              <SelectItem value="CONVERTED">Converted</SelectItem>
              <SelectItem value="NOT_INTERESTED">Not Interested</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredLeads.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-500">
                {statusFilter === 'all' ? 'No leads found' : `No leads with status "${statusFilter}"`}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredLeads.map((lead) => (
            <Card key={lead.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {lead.name}
                      </h3>
                      <Badge variant={getStatusBadgeVariant(lead.status)}>
                        {lead.status}
                      </Badge>
                      <Badge variant={getSourceBadgeVariant(lead.source)}>
                        {lead.source.replace('-', ' ')}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        <a href={`mailto:${lead.email}`} className="hover:text-blue-600">
                          {lead.email}
                        </a>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        <a href={`tel:${lead.phone}`} className="hover:text-blue-600">
                          {lead.phone}
                        </a>
                      </div>
                      <div className="flex items-center gap-2 md:col-span-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(lead.createdAt).toLocaleDateString()} at {new Date(lead.createdAt).toLocaleTimeString()}
                      </div>
                    </div>

                    {lead.listing && (
                      <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 rounded-lg">
                        <MapPin className="w-4 h-4 text-blue-600" />
                        <div>
                          <p className="font-medium text-blue-900">{lead.listing.title}</p>
                          <p className="text-sm text-blue-700">
                            ${lead.listing.price.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="mb-4">
                      <p className="text-gray-700">{lead.message}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    <Select value={lead.status} onValueChange={(value) => updateLeadStatus(lead.id, value)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NEW">New</SelectItem>
                        <SelectItem value="CONTACTED">Contacted</SelectItem>
                        <SelectItem value="QUALIFIED">Qualified</SelectItem>
                        <SelectItem value="INTERESTED">Interested</SelectItem>
                        <SelectItem value="CONVERTED">Converted</SelectItem>
                        <SelectItem value="NOT_INTERESTED">Not Interested</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
