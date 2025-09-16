'use client'

import { useRef, useMemo, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Sphere, OrbitControls, Environment, Text } from '@react-three/drei'
import * as THREE from 'three'

interface CityDotProps {
  city: {
    name: string
    lat: number
    lng: number
    country: string
  }
  radius: number
  isSelected?: boolean
  isHovered?: boolean
  onClick?: () => void
  onHover?: () => void
  onUnhover?: () => void
}

// Major cities where Aperture Global operates
const MAJOR_CITIES = [
  { name: "New York", lat: 40.7128, lng: -74.0060, country: "USA" },
  { name: "Los Angeles", lat: 34.0522, lng: -118.2437, country: "USA" },
  { name: "Miami", lat: 25.7617, lng: -80.1918, country: "USA" },
  { name: "London", lat: 51.5074, lng: -0.1278, country: "UK" },
  { name: "Paris", lat: 48.8566, lng: 2.3522, country: "France" },
  { name: "Monaco", lat: 43.7384, lng: 7.4246, country: "Monaco" },
  { name: "Dubai", lat: 25.2048, lng: 55.2708, country: "UAE" },
  { name: "Singapore", lat: 1.3521, lng: 103.8198, country: "Singapore" },
  { name: "Tokyo", lat: 35.6762, lng: 139.6503, country: "Japan" },
  { name: "Hong Kong", lat: 22.3193, lng: 114.1694, country: "Hong Kong" },
  { name: "Sydney", lat: -33.8688, lng: 151.2093, country: "Australia" },
  { name: "Toronto", lat: 43.6532, lng: -79.3832, country: "Canada" },
  { name: "Zurich", lat: 47.3769, lng: 8.5417, country: "Switzerland" },
  { name: "Geneva", lat: 46.2044, lng: 6.1432, country: "Switzerland" },
  { name: "Vancouver", lat: 49.2827, lng: -123.1207, country: "Canada" },
]

function CityDot({ 
  city, 
  radius, 
  isSelected = false, 
  isHovered = false, 
  onClick, 
  onHover, 
  onUnhover 
}: CityDotProps) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const groupRef = useRef<THREE.Group>(null!)
  
  // Convert lat/lng to 3D coordinates on sphere
  const latRad = (city.lat * Math.PI) / 180
  const lngRad = (city.lng * Math.PI) / 180
  
  const x = radius * Math.cos(latRad) * Math.cos(lngRad)
  const y = radius * Math.sin(latRad)
  const z = radius * Math.cos(latRad) * Math.sin(lngRad)
  
  useFrame((state) => {
    if (groupRef.current) {
      // Enhanced pulsing animation based on selection/hover state
      const baseScale = isSelected ? 1.3 : isHovered ? 1.2 : 1
      const pulseScale = Math.sin(state.clock.elapsedTime * 3 + city.lng) * 0.15
      const scale = baseScale + pulseScale
      groupRef.current.scale.setScalar(scale)
    }
  })

  const dotSize = isSelected ? 0.035 : isHovered ? 0.03 : 0.025
  const dotColor = isSelected ? "#FF6B35" : "#FFD700" // Orange for selected, gold for others
  const emissiveIntensity = isSelected ? 0.6 : isHovered ? 0.5 : 0.4

  return (
    <group ref={groupRef} position={[x, y, z]}>
      {/* City dot */}
      <mesh 
        ref={meshRef}
        onClick={onClick}
        onPointerEnter={onHover}
        onPointerLeave={onUnhover}
      >
        <sphereGeometry args={[dotSize, 12, 12]} />
        <meshStandardMaterial 
          color={dotColor} 
          emissive={dotColor} 
          emissiveIntensity={emissiveIntensity}
          transparent
          opacity={0.9}
        />
      </mesh>
      
      {/* City label (show for selected or hovered cities) */}
      {(isSelected || isHovered) && (
        <Text
          position={[0, 0.12, 0]}
          fontSize={isSelected ? 0.1 : 0.08}
          color={isSelected ? "#FF6B35" : "#FFD700"}
          anchorX="center"
          anchorY="middle"
        >
          {city.name}
        </Text>
      )}
    </group>
  )
}

interface GlobeProps {
  className?: string
}

export function RotatingGlobe({ className }: GlobeProps) {
  const globeRef = useRef<THREE.Mesh>(null!)
  const [selectedCity, setSelectedCity] = useState<typeof MAJOR_CITIES[0] | null>(null)
  const [hoveredCity, setHoveredCity] = useState<typeof MAJOR_CITIES[0] | null>(null)

  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        style={{ background: 'transparent' }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={0.7} />
        <pointLight position={[-10, -10, -5]} intensity={0.4} color="#00BFFF" />
        <pointLight position={[5, 5, 5]} intensity={0.3} color="#FFD700" />
        
        {/* Environment for reflections */}
        <Environment preset="night" />
        
        {/* Main Globe */}
        <Sphere ref={globeRef} args={[1, 64, 64]} position={[0, 0, 0]}>
          <meshStandardMaterial
            color="#00BFFF"
            transparent
            opacity={0.4}
            roughness={0.1}
            metalness={0.7}
            envMapIntensity={1}
            emissive="#00BFFF"
            emissiveIntensity={0.1}
          />
        </Sphere>
        
        {/* Globe wireframe */}
        <Sphere args={[1.01, 32, 16]}>
          <meshBasicMaterial
            color="#00BFFF"
            transparent
            opacity={0.3}
            wireframe
          />
        </Sphere>
        
        {/* City dots */}
        {MAJOR_CITIES.map((city) => (
          <CityDot
            key={`${city.name}-${city.country}`}
            city={city}
            radius={1.05}
            isSelected={selectedCity?.name === city.name}
            isHovered={hoveredCity?.name === city.name}
            onClick={() => setSelectedCity(selectedCity?.name === city.name ? null : city)}
            onHover={() => setHoveredCity(city)}
            onUnhover={() => setHoveredCity(null)}
          />
        ))}
        
        {/* Orbit controls for interaction */}
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.3}
          maxPolarAngle={Math.PI}
          minPolarAngle={0}
        />
      </Canvas>
    </div>
  )
}
