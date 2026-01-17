'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Activity, Menu, X, ExternalLink, Terminal } from 'lucide-react'

const navLinks = [
  { href: '/', label: 'HOME' },
  { href: '/dashboard', label: 'DASHBOARD' },
  { href: '/methodology', label: 'METHODOLOGY' },
  { href: '/simulator', label: 'SIMULATOR' },
  { href: '/explorer', label: 'EXPLORER' },
  { href: '/oos-tests', label: 'OOS TESTS' },
  { href: '/api-docs', label: 'API' },
]

export default function Navigation() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  return (
    <nav className="sticky top-0 z-50 bg-terminal-bg border-b border-terminal-border">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded bg-bb-orange flex items-center justify-center">
              <Terminal className="w-5 h-5 text-black" />
            </div>
            <div className="hidden sm:block">
              <span className="font-mono font-bold text-bb-orange text-sm tracking-wider">
                REGEN
              </span>
              <span className="font-mono text-bb-gray text-xs ml-1">
                NIV TERMINAL
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 font-mono text-xs tracking-wide transition ${
                  pathname === link.href
                    ? 'bg-bb-orange text-black font-bold'
                    : 'text-bb-gray hover:text-bb-white hover:bg-terminal-highlight'
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
              className="hidden sm:flex items-center gap-1 px-2 py-1 text-xs font-mono text-bb-gray hover:text-bb-orange transition border border-terminal-border hover:border-bb-orange"
            >
              GITHUB
              <ExternalLink className="w-3 h-3" />
            </a>

            <Link
              href="/dashboard"
              className="hidden sm:block px-3 py-1.5 bg-bb-orange text-black text-xs font-mono font-bold tracking-wide hover:bg-bb-amber transition"
            >
              LIVE DATA
            </Link>

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-bb-gray hover:text-bb-orange"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden py-2 border-t border-terminal-border bg-terminal-panel">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`block px-4 py-2 font-mono text-xs tracking-wide transition ${
                  pathname === link.href
                    ? 'bg-bb-orange text-black font-bold'
                    : 'text-bb-gray hover:text-bb-white hover:bg-terminal-highlight'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Bloomberg-style ticker strip */}
      <div className="h-6 bg-terminal-panel border-t border-terminal-border overflow-hidden">
        <div className="flex items-center h-full px-4 text-xxs font-mono">
          <span className="text-bb-orange mr-4">NIV</span>
          <span className="text-bb-gray mr-2">RECESSION PROBABILITY MODEL</span>
          <span className="text-bb-muted">|</span>
          <span className="text-bb-green ml-2 mr-1">LIVE</span>
          <span className="w-1.5 h-1.5 rounded-full bg-bb-green animate-pulse"></span>
        </div>
      </div>
    </nav>
  )
}
