import Link from 'next/link'
import { Activity, Github, Twitter, Mail, ExternalLink, CheckCircle, Database } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-neutral-900 border-t border-neutral-800">
      {/* Validation Banner */}
      <div className="bg-gradient-to-r from-accent-500/10 to-emerald-500/10 border-b border-accent-500/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span className="text-sm text-neutral-300">
                Seeking academic/industry validation — full transparency, open formula, reproducible results
              </span>
            </div>
            <Link
              href="/validation"
              className="inline-flex items-center gap-2 px-4 py-1.5 bg-accent-500/20 border border-accent-500/30 rounded-lg text-accent-300 hover:bg-accent-500/30 transition text-sm font-medium"
            >
              <Mail className="w-4 h-4" />
              Contact for Code/Repo Access
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-4 gap-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg text-neutral-100">Regenerationism</span>
            </div>
            <p className="text-sm text-neutral-500 leading-relaxed">
              Macro crisis detection powered by the National Impact Velocity indicator.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold text-neutral-100 mb-4">Product</h4>
            <ul className="space-y-3 text-sm">
              <li><Link href="/dashboard" className="text-neutral-400 hover:text-accent-400 transition">Dashboard</Link></li>
              <li><Link href="/explorer" className="text-neutral-400 hover:text-accent-400 transition">Data Explorer</Link></li>
              <li><Link href="/api-docs" className="text-neutral-400 hover:text-accent-400 transition">API Documentation</Link></li>
            </ul>
          </div>

          {/* Research */}
          <div>
            <h4 className="font-semibold text-neutral-100 mb-4">Research</h4>
            <ul className="space-y-3 text-sm">
              <li><Link href="/methodology" className="text-neutral-400 hover:text-accent-400 transition">Methodology</Link></li>
              <li><Link href="/oos-tests" className="text-neutral-400 hover:text-accent-400 transition">OOS Testing</Link></li>
              <li><Link href="/validation" className="text-neutral-400 hover:text-accent-400 transition">Validation Guide</Link></li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="font-semibold text-neutral-100 mb-4">Connect</h4>
            <div className="flex gap-3">
              <a
                href="https://github.com/direncode/regenerationism"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-400 hover:text-accent-400 hover:border-accent-500/30 transition"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="https://twitter.com/regenerationism"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-400 hover:text-accent-400 hover:border-accent-500/30 transition"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="mailto:contact@regenerationism.ai"
                className="w-10 h-10 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-400 hover:text-accent-400 hover:border-accent-500/30 transition"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Data Source & Transparency Note */}
        <div className="mt-12 pt-8 border-t border-neutral-800">
          <div className="flex flex-wrap items-start justify-between gap-6 mb-6">
            <div className="flex items-start gap-3 max-w-xl">
              <Database className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-neutral-500 leading-relaxed">
                <strong className="text-neutral-400">Open Data Source:</strong> All data from{' '}
                <a
                  href="https://fred.stlouisfed.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  FRED (Federal Reserve Economic Data)
                </a>
                . Formula fully exposed. No proprietary data or hidden parameters. Endorsement/validation welcome on practical merits.
              </p>
            </div>
            <a
              href="https://fred.stlouisfed.org"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-neutral-300 transition"
            >
              fred.stlouisfed.org
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-neutral-500">
            <p>© 2026 Regenerationism. MIT License.</p>
            <p>Formula: NIV = (u × P²) / (X + F)^η</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
