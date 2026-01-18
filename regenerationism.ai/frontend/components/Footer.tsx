import Link from 'next/link'
import { Activity, Github, Twitter, Mail } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-slate-50 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-4 gap-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg text-slate-900">Regenerationism</span>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">
              Macro crisis detection powered by the National Impact Velocity indicator.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold text-slate-900 mb-4">Product</h4>
            <ul className="space-y-3 text-sm">
              <li><Link href="/dashboard" className="text-slate-600 hover:text-accent-600 transition">Dashboard</Link></li>
              <li><Link href="/explorer" className="text-slate-600 hover:text-accent-600 transition">Data Explorer</Link></li>
              <li><Link href="/api-docs" className="text-slate-600 hover:text-accent-600 transition">API Documentation</Link></li>
            </ul>
          </div>

          {/* Research */}
          <div>
            <h4 className="font-semibold text-slate-900 mb-4">Research</h4>
            <ul className="space-y-3 text-sm">
              <li><Link href="/methodology" className="text-slate-600 hover:text-accent-600 transition">Methodology</Link></li>
              <li><Link href="/oos-tests" className="text-slate-600 hover:text-accent-600 transition">OOS Testing</Link></li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="font-semibold text-slate-900 mb-4">Connect</h4>
            <div className="flex gap-3">
              <a
                href="https://github.com/direncode/regenerationism"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-accent-600 hover:border-accent-200 transition"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="https://twitter.com/regenerationism"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-accent-600 hover:border-accent-200 transition"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="mailto:contact@regenerationism.ai"
                className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-accent-600 hover:border-accent-200 transition"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-sm text-slate-500">
          <p>© 2025 Regenerationism. MIT License.</p>
          <p>Data sourced from Federal Reserve (FRED)</p>
        </div>
      </div>
    </footer>
  )
}
