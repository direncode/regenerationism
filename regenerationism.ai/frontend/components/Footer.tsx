import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-black border-t border-white/10">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
        {/* Main footer content */}
        <div className="py-16 grid grid-cols-2 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="text-white text-lg font-medium tracking-tight">
              REGENERATIONISM
            </Link>
            <p className="text-sm text-gray-600 mt-4 leading-relaxed">
              Real-time macro crisis detection powered by the National Impact Velocity indicator.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-caption uppercase text-gray-500 mb-6">Product</h4>
            <ul className="space-y-4">
              <FooterLink href="/dashboard">Dashboard</FooterLink>
              <FooterLink href="/explorer">Explorer</FooterLink>
              <FooterLink href="/api-docs">API</FooterLink>
            </ul>
          </div>

          {/* Research */}
          <div>
            <h4 className="text-caption uppercase text-gray-500 mb-6">Research</h4>
            <ul className="space-y-4">
              <FooterLink href="/methodology">Methodology</FooterLink>
              <FooterLink href="/oos-tests">Validation</FooterLink>
              <FooterLink href="/validation">Reproduce</FooterLink>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-caption uppercase text-gray-500 mb-6">Resources</h4>
            <ul className="space-y-4">
              <FooterLink href="https://github.com/direncode/regenerationism" external>
                GitHub
              </FooterLink>
              <FooterLink href="https://fred.stlouisfed.org" external>
                FRED Data
              </FooterLink>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="py-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-600">
            Open data source: Federal Reserve Economic Data (FRED)
          </p>
          <p className="text-sm text-gray-600">
            © {new Date().getFullYear()} Regenerationism
          </p>
        </div>
      </div>
    </footer>
  )
}

function FooterLink({
  href,
  children,
  external,
}: {
  href: string
  children: React.ReactNode
  external?: boolean
}) {
  if (external) {
    return (
      <li>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-gray-400 hover:text-white transition-colors inline-flex items-center gap-1"
        >
          {children}
          <ArrowUpRight className="w-3 h-3" />
        </a>
      </li>
    )
  }

  return (
    <li>
      <Link
        href={href}
        className="text-sm text-gray-400 hover:text-white transition-colors"
      >
        {children}
      </Link>
    </li>
  )
}
