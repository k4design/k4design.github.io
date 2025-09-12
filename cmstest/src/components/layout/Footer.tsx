'use client'

import Link from 'next/link'
import Image from 'next/image'

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="relative w-32 h-8 mb-4">
              <Image
                src="/img/apertureglobal_logo-white.png"
                alt="Aperture Global"
                fill
                className="object-contain"
              />
            </div>
            <p className="text-gray-400">
              Your gateway to the world's most exceptional properties.
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Properties</h3>
            <ul className="space-y-2 text-gray-400">
              <li><Link href="/properties" className="hover:text-gold">All Properties</Link></li>
              <li><Link href="/lifestyle" className="hover:text-gold">Lifestyle Properties</Link></li>
              <li><Link href="/new-developments" className="hover:text-gold">New Developments</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Company</h3>
            <ul className="space-y-2 text-gray-400">
              <li><Link href="/about" className="hover:text-gold">About Us</Link></li>
              <li><Link href="/agents" className="hover:text-gold">Our Agents</Link></li>
              <li><Link href="/eliteview-media" className="hover:text-gold">EliteView Media</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact</h3>
            <ul className="space-y-2 text-gray-400">
              <li><Link href="/contact" className="hover:text-gold">Get In Touch</Link></li>
              <li><a href="tel:+1234567890" className="hover:text-gold">+1 (234) 567-890</a></li>
              <li><a href="mailto:info@apertureglobal.com" className="hover:text-gold">info@apertureglobal.com</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
          <p>&copy; 2024 Aperture Global. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
