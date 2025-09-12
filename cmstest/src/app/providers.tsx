'use client'

import { SessionProvider } from 'next-auth/react'
import { SWRConfig } from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SWRConfig value={{ fetcher }}>
        {children}
      </SWRConfig>
    </SessionProvider>
  )
}
