'use client'

import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function SignOutPage() {
  const router = useRouter()

  useEffect(() => {
    const handleSignOut = async () => {
      await signOut({ 
        callbackUrl: '/',
        redirect: false 
      })
      router.push('/')
    }
    
    handleSignOut()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Signing out...
        </h2>
        <p className="text-gray-600">
          You are being redirected to the homepage.
        </p>
      </div>
    </div>
  )
}
