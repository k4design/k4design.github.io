'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'

interface City {
  name: string
  lat: number
  lng: number
  country: string
}

interface CityLegendProps {
  cities: City[]
  selectedCity: City | null
  onCitySelect: (city: City | null) => void
}

export function CityLegend({ cities, selectedCity, onCitySelect }: CityLegendProps) {
  const [hoveredCity, setHoveredCity] = useState<City | null>(null)

  return (
    <Card className="bg-white/5 border-gray-800 backdrop-blur-sm">
      <CardContent className="p-4">
        <h3 className="text-lg font-semibold text-gold mb-4">Our Global Markets</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {cities.map((city) => (
            <div
              key={`${city.name}-${city.country}`}
              className={`cursor-pointer p-2 rounded-lg transition-all duration-200 ${
                selectedCity?.name === city.name
                  ? 'bg-gold/20 text-gold border border-gold/30'
                  : hoveredCity?.name === city.name
                  ? 'bg-white/10 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
              onClick={() => onCitySelect(selectedCity?.name === city.name ? null : city)}
              onMouseEnter={() => setHoveredCity(city)}
              onMouseLeave={() => setHoveredCity(null)}
            >
              <div className="font-medium">{city.name}</div>
              <div className="text-xs text-gray-400">{city.country}</div>
            </div>
          ))}
        </div>
        {selectedCity && (
          <div className="mt-4 p-3 bg-gold/10 border border-gold/20 rounded-lg">
            <div className="text-gold font-semibold">{selectedCity.name}</div>
            <div className="text-gray-300 text-sm">{selectedCity.country}</div>
            <div className="text-xs text-gray-400 mt-1">
              Luxury real estate market • Premium properties
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
