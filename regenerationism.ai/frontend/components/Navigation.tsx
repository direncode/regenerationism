'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'

const navLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/methodology', label: 'Methodology' },
  { href: '/explorer', label: 'Explorer' },
  { href: '/custom-model', label: 'Custom Model' },
  { href: '/oos-tests', label: 'Validation' },
  { href: '/api-docs', label: 'API' },
]

export default function Navigation() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-black/90 backdrop-blur-md' : 'bg-transparent'
      }`}
    >
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="text-white text-lg font-medium tracking-tight">
              REGENERATIONISM
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-10">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-link ${pathname === link.href ? 'active' : ''}`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* CTA */}
          <div className="hidden lg:flex items-center gap-6">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-white border border-white/30 px-5 py-2.5 hover:bg-white hover:text-black transition-all duration-200"
            >
              LAUNCH DASHBOARD
            </Link>
          </div>

          {/* Mobile Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 text-white"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 top-20 bg-black z-40">
          <div className="px-6 py-8 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`block py-4 text-lg border-b border-white/10 ${
                  pathname === link.href ? 'text-white' : 'text-gray-400'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-8">
              <Link
                href="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="block w-full text-center py-4 bg-white text-black font-medium text-sm uppercase tracking-wider"
              >
                Launch Dashboard
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
