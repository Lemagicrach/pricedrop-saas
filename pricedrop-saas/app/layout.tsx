import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from './providers'
import { Toaster } from 'react-hot-toast'
import { Analytics } from '@vercel/analytics/react'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PriceDrop - Never Overpay for Products Again',
  description: 'Track product prices across major retailers and get instant alerts when prices drop.',
  keywords: 'price tracking, price drop alerts, product monitoring, ebay, amazon',
  authors: [{ name: 'PriceDrop Team' }],
  openGraph: {
    title: 'PriceDrop - Smart Price Tracking',
    description: 'Save money with automated price tracking and alerts',
    url: 'https://pricedrop.io',
    siteName: 'PriceDrop',
    images: [
      {
        url: 'https://pricedrop.io/og-image.png',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster 
            position="bottom-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                style: {
                  background: 'green',
                },
              },
              error: {
                style: {
                  background: 'red',
                },
              },
            }}
          />
        </Providers>
        <Analytics />
      </body>
    </html>
  )
}
