import type { Metadata } from 'next'
import './globals.css'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import AuditLogButton from '@/components/AuditLogButton'
import DemoBanner from '@/components/DemoBanner'

export const metadata: Metadata = {
  title: 'Regenerationism | NIV Macro Crisis Detection',
  description: 'National Impact Velocity (NIV) - Real-time systemic stress indicator for macro crisis detection. Outperforms the Fed Yield Curve with 0.85 AUC.',
  keywords: ['crisis detection', 'systemic stress', 'economics', 'macro', 'NIV', 'yield curve', 'Federal Reserve'],
  authors: [{ name: 'Diren Akkocdemir' }],
  openGraph: {
    title: 'Regenerationism | NIV Macro Crisis Detection',
    description: 'Real-time systemic stress indicator. Outperforms the Fed.',
    url: 'https://regenerationism.ai',
    siteName: 'Regenerationism',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Regenerationism | NIV',
    description: 'Real-time systemic stress indicator. Outperforms the Fed.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-neutral-950 text-neutral-100 min-h-screen flex flex-col antialiased font-sans">
        <DemoBanner />
        <Navigation />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
        <AuditLogButton />
      </body>
    </html>
  )
}
