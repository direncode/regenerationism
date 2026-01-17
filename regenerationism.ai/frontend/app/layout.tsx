import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import AuditLogButton from '@/components/AuditLogButton'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const metadata: Metadata = {
  title: 'Regenerationism | NIV Macro Crisis Detection',
  description: 'National Impact Velocity (NIV) - Real-time recession probability and economic crisis detection. Outperforms the Fed Yield Curve with 0.85 AUC.',
  keywords: ['recession', 'economics', 'macro', 'NIV', 'crisis detection', 'yield curve', 'Federal Reserve'],
  authors: [{ name: 'Diren Akkocdemir' }],
  openGraph: {
    title: 'Regenerationism | NIV Macro Crisis Detection',
    description: 'Real-time recession probability. Outperforms the Fed.',
    url: 'https://regenerationism.ai',
    siteName: 'Regenerationism',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Regenerationism | NIV',
    description: 'Real-time recession probability. Outperforms the Fed.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`}>
      <body className="bg-dark-900 text-white min-h-screen flex flex-col">
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
