'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, Eye } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

interface Agent {
  id: string
  name: string
  email: string
  phone: string
  license: string
  bio: string
  portrait: string
  specialties: string
  markets: string
  featured: boolean
  order: number
}

export default function AdminAgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAgents()
  }, [])

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/agents')
      const data = await response.json()
      setAgents(data.agents || [])
    } catch (error) {
      console.error('Error fetching agents:', error)
      // For now, show mock data
      setAgents([
        {
          id: '1',
          name: 'Sarah Mitchell',
          email: 'sarah@apertureglobal.com',
          phone: '+1 (555) 123-4567',
          license: 'BRE #01234567',
          bio: 'With over 15 years of experience in luxury real estate...',
          portrait: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face',
          specialties: JSON.stringify(['Luxury Homes', 'Beverly Hills', 'West Hollywood']),
          markets: JSON.stringify(['Beverly Hills', 'West Hollywood', 'Bel Air']),
          featured: true,
          order: 1
        },
        {
          id: '2',
          name: 'Michael Rodriguez',
          email: 'michael@apertureglobal.com',
          phone: '+1 (555) 234-5678',
          license: 'BRE #02345678',
          bio: 'Michael brings a wealth of international experience...',
          portrait: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
          specialties: JSON.stringify(['Manhattan Condos', 'Penthouses', 'International Clients']),
          markets: JSON.stringify(['Manhattan', 'Brooklyn Heights', 'Tribeca']),
          featured: true,
          order: 2
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading agents...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Agents</h1>
          <p className="text-gray-600 mt-1">Manage your agent profiles</p>
        </div>
        <Button asChild>
          <Link href="/admin/agents/new">
            <Plus className="w-4 h-4 mr-2" />
            Add Agent
          </Link>
        </Button>
      </div>

      <div className="grid gap-4">
        {agents.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-500 mb-4">No agents found</p>
              <Button asChild>
                <Link href="/admin/agents/new">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Agent
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          agents.map((agent) => {
            const specialties = JSON.parse(agent.specialties || '[]')
            const markets = JSON.parse(agent.markets || '[]')
            
            return (
              <Card key={agent.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gray-200">
                      {agent.portrait ? (
                        <Image
                          src={agent.portrait}
                          alt={agent.name}
                          width={64}
                          height={64}
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                          {agent.name.charAt(0)}
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {agent.name}
                        </h3>
                        {agent.featured && (
                          <Badge variant="default">Featured</Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                        <div>
                          <span className="font-medium">Email:</span> {agent.email}
                        </div>
                        <div>
                          <span className="font-medium">Phone:</span> {agent.phone}
                        </div>
                        <div>
                          <span className="font-medium">License:</span> {agent.license}
                        </div>
                        <div>
                          <span className="font-medium">Order:</span> {agent.order}
                        </div>
                      </div>

                      <div className="mb-4">
                        <p className="text-sm text-gray-600 line-clamp-2">{agent.bio}</p>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {specialties.slice(0, 3).map((specialty: string) => (
                          <Badge key={specialty} variant="outline" className="text-xs">
                            {specialty}
                          </Badge>
                        ))}
                        {specialties.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{specialties.length - 3} more
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/agents/${agent.id}`}>
                            <Eye className="w-4 h-4" />
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
