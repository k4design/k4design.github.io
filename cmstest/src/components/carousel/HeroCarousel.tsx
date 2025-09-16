'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, MapPin, Bed, Bath, Square } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface FeaturedProperty {
  id: string
  title: string
  price: number
  priceDisplay: string
  city: string
  state: string
  bedrooms: number
  bathrooms: number
  squareFeet: number
  heroImage: string
  slug: string
  featuredOrder: number
}

interface HeroCarouselProps {
  properties: FeaturedProperty[]
}

export function HeroCarousel({ properties }: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  // Auto-advance carousel
  useEffect(() => {
    if (!isAutoPlaying || properties.length <= 1) return

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => 
        prevIndex === properties.length - 1 ? 0 : prevIndex + 1
      )
    }, 5000) // Change slide every 5 seconds

    return () => clearInterval(interval)
  }, [isAutoPlaying, properties.length])

  const goToPrevious = () => {
    setCurrentIndex(currentIndex === 0 ? properties.length - 1 : currentIndex - 1)
    setIsAutoPlaying(false)
  }

  const goToNext = () => {
    setCurrentIndex(currentIndex === properties.length - 1 ? 0 : currentIndex + 1)
    setIsAutoPlaying(false)
  }

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
    setIsAutoPlaying(false)
  }

  if (properties.length === 0) {
    return (
      <div className="relative h-screen bg-gradient-to-br from-gray-900 to-gray-700 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-4xl font-bold mb-4">Welcome to Aperture Global</h1>
          <p className="text-xl mb-8">Your gateway to the world's most exceptional properties</p>
          <Button asChild size="lg" className="bg-gold hover:bg-gold/90">
            <Link href="/properties">Explore Properties</Link>
          </Button>
        </div>
      </div>
    )
  }

  const currentProperty = properties[currentIndex]

  return (
    <div className="relative h-screen overflow-hidden group">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src={currentProperty.heroImage || '/img/default-hero.jpg'}
          alt={currentProperty.title}
          fill
          className="object-cover transition-opacity duration-1000"
          priority={currentIndex === 0}
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-3xl">
            <div className="text-white">
              <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
                {currentProperty.title}
              </h1>
              
              <div className="flex items-center gap-4 mb-6 text-xl">
                <div className="flex items-center gap-1">
                  <MapPin className="w-5 h-5" />
                  <span>{currentProperty.city}, {currentProperty.state}</span>
                </div>
                <div className="text-3xl font-bold text-gold">
                  {currentProperty.priceDisplay}
                </div>
              </div>

              <div className="flex items-center gap-6 mb-8">
                <div className="flex items-center gap-1">
                  <Bed className="w-5 h-5" />
                  <span>{currentProperty.bedrooms} bed</span>
                </div>
                <div className="flex items-center gap-1">
                  <Bath className="w-5 h-5" />
                  <span>{currentProperty.bathrooms} bath</span>
                </div>
                <div className="flex items-center gap-1">
                  <Square className="w-5 h-5" />
                  <span>{currentProperty.squareFeet?.toLocaleString()} sq ft</span>
                </div>
              </div>

              <div className="flex gap-4">
                <Button asChild size="lg" className="bg-gold hover:bg-gold/90">
                  <Link href={`/properties/${currentProperty.slug}`}>
                    View Details
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="border-white text-white hover:bg-white hover:text-gray-900">
                  <Link href="/properties">
                    View All Properties
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      {properties.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 z-20 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100"
            aria-label="Previous property"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 z-20 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100"
            aria-label="Next property"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {properties.length > 1 && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20">
          <div className="flex gap-2">
            {properties.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-3 h-3 rounded-full transition-all duration-200 ${
                  index === currentIndex
                    ? 'bg-gold scale-125'
                    : 'bg-white/50 hover:bg-white/70'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Play/Pause Button */}
      {properties.length > 1 && (
        <button
          onClick={() => setIsAutoPlaying(!isAutoPlaying)}
          className="absolute top-8 right-8 z-20 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all duration-200"
          aria-label={isAutoPlaying ? 'Pause slideshow' : 'Play slideshow'}
        >
          <div className={`w-4 h-4 ${isAutoPlaying ? 'bg-white/80' : 'bg-white'}`} />
        </button>
      )}
    </div>
  )
}
