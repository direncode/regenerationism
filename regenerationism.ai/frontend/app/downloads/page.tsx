'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Download, Monitor, Shield, Cpu, HardDrive, CheckCircle, ArrowLeft, Clock } from 'lucide-react'

export default function DownloadsPage() {
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
            <Clock className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-purple-300">Coming Soon</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            Desktop Application
          </h1>
          <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
            The Regenerationism NIV desktop application is currently in development.
            Sign up to be notified when it's ready.
          </p>
        </motion.div>

        {/* Coming Soon Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-6">
              <Monitor className="w-8 h-8 text-purple-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-3">Windows Desktop App</h2>
            <p className="text-neutral-400 mb-6 max-w-md mx-auto">
              A native Windows application with offline capability, local data storage,
              and the full power of Third-Order Accounting analysis.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-800 rounded-lg text-neutral-400">
              <Clock className="w-4 h-4" />
              <span className="text-sm">Release date to be announced</span>
            </div>
          </div>
        </motion.div>

        {/* Features Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-purple-900/20 to-cyan-900/20 border border-purple-500/20 rounded-xl p-6 mb-8"
        >
          <h3 className="font-semibold text-white mb-4">Planned Features</h3>
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

        {/* System Requirements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 mb-8"
        >
          <h3 className="font-semibold text-white mb-4">Target System Requirements</h3>
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

        {/* Web App CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center"
        >
          <p className="text-neutral-400 mb-4">
            In the meantime, explore the full web application:
          </p>
          <Link
            href="/third-order-accounting"
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent-600 hover:bg-accent-700 text-white rounded-lg font-medium transition"
          >
            Launch Web App
          </Link>
        </motion.div>

        {/* Info Note */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 flex items-start gap-3 text-sm text-neutral-500"
        >
          <Shield className="w-5 h-5 mt-0.5" />
          <p>
            The desktop application will be open source and will not collect any personal data.
            All analysis data will stay on your computer.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
