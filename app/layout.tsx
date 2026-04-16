import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import Image from 'next/image'
import './globals.css'

const _geist = Geist({ subsets: ['latin'] })
const _geistMono = Geist_Mono({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'LinkedUp - Connect at Events',
  description:
    'Real-time event-based social app. Join events, take selfies, and connect with people around you.',
  generator: 'v0.app',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark bg-background">
      <body className="font-sans antialiased min-h-dvh">
        
        {/* GLOBAL HEADER WITH LOGO */}
        <header className="w-full flex items-center px-6 py-4 border-b border-border">
         
        </header>

        {/* PAGE CONTENT */}
        <main>{children}</main>

        {/* ANALYTICS */}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}