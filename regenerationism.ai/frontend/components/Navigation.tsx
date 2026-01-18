'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Activity, Menu, X, ExternalLink, FileText } from 'lucide-react'

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/methodology', label: 'Methodology' },
  { href: '/explorer', label: 'Explorer' },
  { href: '/oos-tests', label: 'OOS Tests' },
  { href: '/api-docs', label: 'API' },
]

export default function Navigation() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center shadow-soft">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-slate-900 hidden sm:block">
              Regenerationism
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                  pathname === link.href
                    ? 'text-accent-600 bg-accent-50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* CTA + Mobile Toggle */}
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/direncode/regenerationism"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition"
            >
              <ExternalLink className="w-4 h-4" />
              GitHub
            </a>

            <Link
              href="/api-docs"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition"
            >
              <FileText className="w-4 h-4" />
              Docs
            </Link>

            <Link
              href="/dashboard"
              className="hidden sm:block px-4 py-2 bg-gradient-to-r from-accent-500 to-accent-600 text-white text-sm font-semibold rounded-lg hover:from-accent-600 hover:to-accent-700 transition shadow-soft"
            >
              Live Data
            </Link>

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden py-4 border-t border-slate-100">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`block py-3 px-2 text-sm font-medium rounded-lg transition ${
                  pathname === link.href
                    ? 'text-accent-600 bg-accent-50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-2">
              <a
                href="https://github.com/direncode/regenerationism"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 py-2 px-2 text-sm text-slate-600"
              >
                <ExternalLink className="w-4 h-4" />
                GitHub
              </a>
              <Link
                href="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="block py-3 px-4 bg-gradient-to-r from-accent-500 to-accent-600 text-white text-sm font-semibold rounded-lg text-center"
              >
                Live Data
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
