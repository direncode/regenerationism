import Link from 'next/link'
import { Activity, Github, Twitter, Mail } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-dark-800 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-regen-500 flex items-center justify-center">
                <Activity className="w-5 h-5 text-black" />
              </div>
              <span className="font-bold">Regenerationism</span>
            </div>
            <p className="text-sm text-gray-400">
              Macro crisis detection powered by the National Impact Velocity indicator.
            </p>
          </div>
          
          {/* Product */}
          <div>
            <h4 className="font-bold mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/dashboard" className="hover:text-white transition">Dashboard</Link></li>
              <li><Link href="/explorer" className="hover:text-white transition">Data Explorer</Link></li>
              <li><Link href="/api-docs" className="hover:text-white transition">API Documentation</Link></li>
            </ul>
          </div>
          
          {/* Research */}
          <div>
            <h4 className="font-bold mb-4">Research</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/methodology" className="hover:text-white transition">Methodology</Link></li>
              <li><Link href="/validation" className="hover:text-white transition">Validation Results</Link></li>
              <li><Link href="/papers" className="hover:text-white transition">Papers & Citations</Link></li>
            </ul>
          </div>
          
          {/* Connect */}
          <div>
            <h4 className="font-bold mb-4">Connect</h4>
            <div className="flex gap-4">
              <a href="https://github.com/direncode/regenerationism" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition">
                <Github className="w-5 h-5" />
              </a>
              <a href="https://twitter.com/regenerationism" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="mailto:contact@regenerationism.ai" className="text-gray-400 hover:text-white transition">
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-white/5 flex flex-wrap items-center justify-between gap-4 text-sm text-gray-500">
          <p>© 2025 Regenerationism. MIT License.</p>
          <p>Data sourced from Federal Reserve (FRED)</p>
        </div>
      </div>
    </footer>
  )
}
