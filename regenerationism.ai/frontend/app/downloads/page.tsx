'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Download, Monitor, Shield, Cpu, HardDrive, CheckCircle, ArrowLeft } from 'lucide-react'

const DOWNLOADS = {
  windows: {
    installer: {
      name: 'Windows Installer',
      filename: 'RegenerationismNIV-Setup-1.0.0.exe',
      size: '85 MB',
      description: 'Full installer with Start Menu and Desktop shortcuts',
      url: 'https://github.com/regenerationism/niv-desktop/releases/download/v1.0.0/RegenerationismNIV-Setup-1.0.0.exe'
    },
    portable: {
      name: 'Windows Portable',
      filename: 'RegenerationismNIV-1.0.0-portable.exe',
      size: '82 MB',
      description: 'No installation required - run directly',
      url: 'https://github.com/regenerationism/niv-desktop/releases/download/v1.0.0/RegenerationismNIV-1.0.0-portable.exe'
    }
  }
}

export default function DownloadsPage() {
  const [downloading, setDownloading] = useState<string | null>(null)

  const handleDownload = (type: string, url: string) => {
    setDownloading(type)
    // Direct download
    window.open(url, '_blank')
    setTimeout(() => setDownloading(null), 3000)
  }

  return (
    <div className="min-h-screen bg-neutral-950 pt-20 pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Link */}
        <Link href="/" className="inline-flex items-center gap-2 text-neutral-500 hover:text-neutral-300 mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6">
            <Download className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-purple-300">Download Center</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            Download Regenerationism NIV
          </h1>
          <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
            Get the full desktop application for Third-Order Accounting and NIV analysis
          </p>
        </motion.div>

        {/* Windows Downloads */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <Monitor className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-semibold text-white">Windows</h2>
            <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">64-bit</span>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Installer */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 hover:border-purple-500/50 transition">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-white mb-1">{DOWNLOADS.windows.installer.name}</h3>
                  <p className="text-sm text-neutral-500">{DOWNLOADS.windows.installer.description}</p>
                </div>
                <span className="text-xs text-neutral-600">{DOWNLOADS.windows.installer.size}</span>
              </div>
              <div className="text-xs font-mono text-neutral-600 mb-4 truncate">
                {DOWNLOADS.windows.installer.filename}
              </div>
              <button
                onClick={() => handleDownload('installer', DOWNLOADS.windows.installer.url)}
                disabled={downloading === 'installer'}
                className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition"
              >
                {downloading === 'installer' ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Download Started
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Download Installer
                  </>
                )}
              </button>
            </div>

            {/* Portable */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 hover:border-purple-500/50 transition">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-white mb-1">{DOWNLOADS.windows.portable.name}</h3>
                  <p className="text-sm text-neutral-500">{DOWNLOADS.windows.portable.description}</p>
                </div>
                <span className="text-xs text-neutral-600">{DOWNLOADS.windows.portable.size}</span>
              </div>
              <div className="text-xs font-mono text-neutral-600 mb-4 truncate">
                {DOWNLOADS.windows.portable.filename}
              </div>
              <button
                onClick={() => handleDownload('portable', DOWNLOADS.windows.portable.url)}
                disabled={downloading === 'portable'}
                className="w-full px-4 py-3 bg-neutral-700 hover:bg-neutral-600 disabled:bg-neutral-800 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition"
              >
                {downloading === 'portable' ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Download Started
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Download Portable
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>

        {/* System Requirements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 mb-8"
        >
          <h3 className="font-semibold text-white mb-4">System Requirements</h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start gap-3">
              <Monitor className="w-5 h-5 text-neutral-500 mt-0.5" />
              <div>
                <div className="text-neutral-300">Operating System</div>
                <div className="text-neutral-500">Windows 10/11 (64-bit)</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Cpu className="w-5 h-5 text-neutral-500 mt-0.5" />
              <div>
                <div className="text-neutral-300">Processor</div>
                <div className="text-neutral-500">Intel/AMD 64-bit</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <HardDrive className="w-5 h-5 text-neutral-500 mt-0.5" />
              <div>
                <div className="text-neutral-300">Storage</div>
                <div className="text-neutral-500">200 MB available</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-r from-purple-900/20 to-cyan-900/20 border border-purple-500/20 rounded-xl p-6"
        >
          <h3 className="font-semibold text-white mb-4">What's Included</h3>
          <div className="grid md:grid-cols-2 gap-3 text-sm">
            {[
              'NIV Calculator with real-time analysis',
              'Third-Order Engine with 5-year projections',
              'S&P 500 company analysis',
              'AI Decision Engine with insights',
              'Data Provenance tracking',
              'Offline capability',
              'Local data storage',
              'No subscription required'
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-2 text-neutral-300">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                {feature}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Security Note */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 flex items-start gap-3 text-sm text-neutral-500"
        >
          <Shield className="w-5 h-5 mt-0.5" />
          <p>
            All downloads are served directly from our GitHub releases. The application is open source
            and does not collect any personal data. Your analysis data stays on your computer.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
