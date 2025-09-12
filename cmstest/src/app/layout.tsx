import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { Toaster } from '@/components/ui/sonner'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Aperture Global - Luxury Real Estate',
  description: 'Discover exceptional properties in the world\'s most prestigious locations with Aperture Global.',
  keywords: 'luxury real estate, premium properties, Beverly Hills, Manhattan, Monaco, luxury homes',
  authors: [{ name: 'Aperture Global' }],
  openGraph: {
    title: 'Aperture Global - Luxury Real Estate',
    description: 'Discover exceptional properties in the world\'s most prestigious locations.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Aperture Global - Luxury Real Estate',
    description: 'Discover exceptional properties in the world\'s most prestigious locations.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full bg-white antialiased`}>
        <Providers>
          <Navigation />
          <main>
            {children}
          </main>
          <Footer />
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}