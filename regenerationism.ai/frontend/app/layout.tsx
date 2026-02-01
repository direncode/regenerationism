import type { Metadata } from 'next'
import './globals.css'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Regenerationism | Macro Crisis Detection',
  description: 'We build systems that detect economic crises before they unfold. The National Impact Velocity indicator synthesizes Federal Reserve data into a single measure of systemic stress.',
  keywords: ['crisis detection', 'systemic stress', 'economics', 'macro', 'NIV', 'Federal Reserve', 'FRED'],
  authors: [{ name: 'Regenerationism' }],
  openGraph: {
    title: 'Regenerationism',
    description: 'Real-time macro crisis detection. Outperforms the Fed yield curve.',
    url: 'https://regenerationism.ai',
    siteName: 'Regenerationism',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Regenerationism',
    description: 'Real-time macro crisis detection. Outperforms the Fed yield curve.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-black text-white min-h-screen flex flex-col antialiased">
        <Navigation />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}
