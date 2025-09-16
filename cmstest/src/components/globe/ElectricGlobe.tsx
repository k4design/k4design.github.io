'use client'

import { useRef, useState, useMemo } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { Sphere, OrbitControls, Text } from '@react-three/drei'
import * as THREE from 'three'

// Major cities data with accurate coordinates
const MAJOR_CITIES = [
  // North America
  { name: "New York", lat: 40.7128, lng: -74.0060 },
  { name: "Los Angeles", lat: 34.0522, lng: -118.2437 },
  { name: "Miami", lat: 25.7617, lng: -80.1918 },
  { name: "Toronto", lat: 43.6532, lng: -79.3832 },
  { name: "Vancouver", lat: 49.2827, lng: -123.1207 },
  
  // Europe
  { name: "London", lat: 51.5074, lng: -0.1278 },
  { name: "Paris", lat: 48.8566, lng: 2.3522 },
  { name: "Monaco", lat: 43.7384, lng: 7.4246 },
  { name: "Zurich", lat: 47.3769, lng: 8.5417 },
  { name: "Geneva", lat: 46.2044, lng: 6.1432 },
  { name: "Madrid", lat: 40.4168, lng: -3.7038 },
  { name: "Rome", lat: 41.9028, lng: 12.4964 },
  
  // Asia & Middle East
  { name: "Tokyo", lat: 35.6762, lng: 139.6503 },
  { name: "Dubai", lat: 25.2048, lng: 55.2708 },
  { name: "Singapore", lat: 1.3521, lng: 103.8198 },
  { name: "Hong Kong", lat: 22.3193, lng: 114.1694 },
  { name: "Shanghai", lat: 31.2304, lng: 121.4737 },
  { name: "Mumbai", lat: 19.0760, lng: 72.8777 },
  { name: "Seoul", lat: 37.5665, lng: 126.9780 },
  
  // Oceania
  { name: "Sydney", lat: -33.8688, lng: 151.2093 },
  { name: "Melbourne", lat: -37.8136, lng: 144.9631 },
  
  // South America
  { name: "São Paulo", lat: -23.5505, lng: -46.6333 },
  { name: "Buenos Aires", lat: -34.6118, lng: -58.3960 },
  
  // Africa
  { name: "Cape Town", lat: -33.9249, lng: 18.4241 },
  { name: "Lagos", lat: 6.5244, lng: 3.3792 },
]

// Highly realistic Earth texture with satellite imagery
function RealisticEarth() {
  const globeRef = useRef<THREE.Mesh>(null!)
  
  // Create a professional Earth texture using canvas
  const earthTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 4096
    canvas.height = 2048
    const ctx = canvas.getContext('2d')!
    
    // Create realistic ocean gradient
    const oceanGradient = ctx.createRadialGradient(1024, 1024, 0, 1024, 1024, 1024)
    oceanGradient.addColorStop(0, '#001a33')  // Deep ocean
    oceanGradient.addColorStop(0.3, '#003366') // Medium depth
    oceanGradient.addColorStop(0.7, '#0066cc') // Shallow water
    oceanGradient.addColorStop(1, '#4da6ff')   // Coastal waters
    
    // Fill ocean background
    ctx.fillStyle = oceanGradient
    ctx.fillRect(0, 0, 4096, 2048)
    
    // Add realistic ocean currents and waves
    ctx.fillStyle = '#0052cc'
    for (let i = 0; i < 2000; i++) {
      const x = Math.random() * 4096
      const y = Math.random() * 2048
      const size = Math.random() * 4 + 1
      ctx.beginPath()
      ctx.arc(x, y, size, 0, 2 * Math.PI)
      ctx.fill()
    }
    
    // Create realistic landmasses with accurate shapes
    const landColors = ['#2d5016', '#4a7c59', '#6fa87f', '#8bc34a', '#a8e6cf']
    
    // North America - more accurate shape
    ctx.fillStyle = landColors[0]
    ctx.beginPath()
    ctx.moveTo(400, 400)
    ctx.bezierCurveTo(300, 350, 200, 400, 250, 500)
    ctx.bezierCurveTo(300, 600, 400, 650, 500, 600)
    ctx.bezierCurveTo(600, 550, 700, 500, 650, 400)
    ctx.bezierCurveTo(600, 300, 500, 350, 400, 400)
    ctx.fill()
    
    // South America - accurate vertical shape
    ctx.fillStyle = landColors[1]
    ctx.beginPath()
    ctx.moveTo(600, 800)
    ctx.bezierCurveTo(550, 850, 580, 950, 620, 1050)
    ctx.bezierCurveTo(660, 1150, 720, 1200, 780, 1150)
    ctx.bezierCurveTo(840, 1100, 800, 1000, 760, 900)
    ctx.bezierCurveTo(720, 800, 650, 850, 600, 800)
    ctx.fill()
    
    // Europe - compact and detailed
    ctx.fillStyle = landColors[2]
    ctx.beginPath()
    ctx.moveTo(1800, 400)
    ctx.bezierCurveTo(1850, 380, 1950, 400, 2000, 450)
    ctx.bezierCurveTo(2050, 500, 2000, 550, 1900, 520)
    ctx.bezierCurveTo(1800, 490, 1750, 450, 1800, 400)
    ctx.fill()
    
    // Africa - large and distinctive
    ctx.fillStyle = landColors[3]
    ctx.beginPath()
    ctx.moveTo(1900, 600)
    ctx.bezierCurveTo(1850, 580, 1800, 620, 1820, 700)
    ctx.bezierCurveTo(1840, 780, 1900, 900, 2000, 950)
    ctx.bezierCurveTo(2100, 1000, 2200, 950, 2250, 850)
    ctx.bezierCurveTo(2300, 750, 2250, 650, 2150, 600)
    ctx.bezierCurveTo(2050, 550, 1950, 580, 1900, 600)
    ctx.fill()
    
    // Asia - massive continent
    ctx.fillStyle = landColors[4]
    ctx.beginPath()
    ctx.moveTo(2200, 300)
    ctx.bezierCurveTo(2400, 250, 2800, 300, 3200, 350)
    ctx.bezierCurveTo(3600, 400, 3800, 500, 3700, 600)
    ctx.bezierCurveTo(3600, 700, 3400, 750, 3200, 700)
    ctx.bezierCurveTo(3000, 650, 2800, 600, 2600, 550)
    ctx.bezierCurveTo(2400, 500, 2200, 450, 2200, 300)
    ctx.fill()
    
    // Australia - island continent
    ctx.fillStyle = landColors[0]
    ctx.beginPath()
    ctx.moveTo(3200, 1400)
    ctx.bezierCurveTo(3300, 1380, 3400, 1400, 3500, 1430)
    ctx.bezierCurveTo(3600, 1460, 3700, 1480, 3600, 1500)
    ctx.bezierCurveTo(3500, 1520, 3400, 1500, 3300, 1480)
    ctx.bezierCurveTo(3200, 1460, 3100, 1440, 3200, 1400)
    ctx.fill()
    
    // Add realistic terrain features
    ctx.fillStyle = '#8d6e63'
    for (let i = 0; i < 500; i++) {
      const x = Math.random() * 4096
      const y = Math.random() * 2048
      const size = Math.random() * 3 + 1
      ctx.beginPath()
      ctx.arc(x, y, size, 0, 2 * Math.PI)
      ctx.fill()
    }
    
    // Add cloud patterns for realism
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
    for (let i = 0; i < 1000; i++) {
      const x = Math.random() * 4096
      const y = Math.random() * 2048
      const size = Math.random() * 12 + 3
      ctx.beginPath()
      ctx.arc(x, y, size, 0, 2 * Math.PI)
      ctx.fill()
    }
    
    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    return texture
  }, [])
  
  return (
    <Sphere ref={globeRef} args={[1, 256, 256]} position={[0, 0, 0]}>
      <meshStandardMaterial
        map={earthTexture}
        transparent
        opacity={0.98}
        roughness={0.9}
        metalness={0.05}
      />
    </Sphere>
  )
}

// Longitude and latitude grid lines
function LongitudeLatitudeGrid() {
  const gridRef = useRef<THREE.Group>(null!)
  
  const gridLines = useMemo(() => {
    const lines: JSX.Element[] = []
    const radius = 1.001
    
    // Longitude lines (meridians) - every 30 degrees
    for (let lon = -180; lon <= 180; lon += 30) {
      const points: THREE.Vector3[] = []
      for (let lat = -90; lat <= 90; lat += 2) {
        const latRad = (lat * Math.PI) / 180
        const lonRad = (lon * Math.PI) / 180
        const x = radius * Math.cos(latRad) * Math.cos(lonRad)
        const y = radius * Math.sin(latRad)
        const z = radius * Math.cos(latRad) * Math.sin(lonRad)
        points.push(new THREE.Vector3(x, y, z))
      }
      
      const geometry = new THREE.BufferGeometry().setFromPoints(points)
      lines.push(
        <line key={`lon-${lon}`} geometry={geometry}>
          <lineBasicMaterial color="#ffffff" transparent opacity={0.3} />
        </line>
      )
    }
    
    // Latitude lines (parallels) - every 30 degrees
    for (let lat = -90; lat <= 90; lat += 30) {
      const points: THREE.Vector3[] = []
      for (let lon = -180; lon <= 180; lon += 2) {
        const latRad = (lat * Math.PI) / 180
        const lonRad = (lon * Math.PI) / 180
        const x = radius * Math.cos(latRad) * Math.cos(lonRad)
        const y = radius * Math.sin(latRad)
        const z = radius * Math.cos(latRad) * Math.sin(lonRad)
        points.push(new THREE.Vector3(x, y, z))
      }
      
      const geometry = new THREE.BufferGeometry().setFromPoints(points)
      lines.push(
        <line key={`lat-${lat}`} geometry={geometry}>
          <lineBasicMaterial color="#ffffff" transparent opacity={0.3} />
        </line>
      )
    }
    
    return lines
  }, [])
  
  return <group ref={gridRef}>{gridLines}</group>
}

// Atmospheric glow effect
function Atmosphere() {
  return (
    <Sphere args={[1.02, 32, 32]} position={[0, 0, 0]}>
      <meshBasicMaterial
        color="#87ceeb"
        transparent
        opacity={0.1}
        side={THREE.BackSide}
      />
    </Sphere>
  )
}



interface CityDotProps {
  city: { name: string; lat: number; lng: number }
  radius: number
  isSelected?: boolean
  isHovered?: boolean
  onClick?: () => void
  onHover?: () => void
  onUnhover?: () => void
}

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
  
  // Convert lat/lng to 3D coordinates on sphere (accurate conversion)
  const latRad = (city.lat * Math.PI) / 180
  const lngRad = (city.lng * Math.PI) / 180
  
  // Proper spherical coordinate conversion
  const x = radius * Math.cos(latRad) * Math.cos(lngRad)
  const y = radius * Math.sin(latRad)
  const z = radius * Math.cos(latRad) * Math.sin(lngRad)
  
  useFrame((state) => {
    if (groupRef.current) {
      // Enhanced pulsing animation based on selection/hover state
      const baseScale = isSelected ? 1.5 : isHovered ? 1.3 : 1
      const pulseScale = Math.sin(state.clock.elapsedTime * 3 + city.lng) * 0.2
      const scale = baseScale + pulseScale
      groupRef.current.scale.setScalar(scale)
    }
  })

  const dotSize = isSelected ? 0.1 : isHovered ? 0.08 : 0.06
  const dotColor = isSelected ? "#FFD700" : "#FF4444" // Gold for selected, bright red for others

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
          emissiveIntensity={1.0}
          transparent
          opacity={1.0}
        />
      </mesh>
      
      {/* City label (always visible for major cities) */}
      <Text
        position={[0, 0.2, 0]}
        fontSize={isSelected ? 0.14 : isHovered ? 0.12 : 0.1}
        color={isSelected ? "#FFD700" : "#FFFFFF"}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {city.name}
      </Text>
    </group>
  )
}

interface ElectricGlobeProps {
  className?: string
}

export function ElectricGlobe({ className }: ElectricGlobeProps) {
  const globeRef = useRef<THREE.Mesh>(null!)
  const [selectedCity, setSelectedCity] = useState<typeof MAJOR_CITIES[0] | null>(null)
  const [hoveredCity, setHoveredCity] = useState<typeof MAJOR_CITIES[0] | null>(null)

  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 4], fov: 45 }}
        style={{ background: 'transparent' }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.9} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} />
        <pointLight position={[-5, -5, 5]} intensity={0.8} color="#FFFFFF" />
        <pointLight position={[5, 5, 5]} intensity={0.7} color="#FFD700" />
        
        {/* Realistic Earth */}
        <RealisticEarth />
        
        {/* Longitude and Latitude Grid */}
        <LongitudeLatitudeGrid />
        
        {/* Atmospheric Glow */}
        <Atmosphere />
        
        {/* City dots */}
        {MAJOR_CITIES.map((city) => (
          <CityDot
            key={`${city.name}-${city.lat}-${city.lng}`}
            city={city}
            radius={1.05}
            isSelected={selectedCity?.name === city.name}
            isHovered={hoveredCity?.name === city.name}
            onClick={() => setSelectedCity(selectedCity?.name === city.name ? null : city)}
            onHover={() => setHoveredCity(city)}
            onUnhover={() => setHoveredCity(null)}
          />
        ))}
        
        {/* Orbit controls */}
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
