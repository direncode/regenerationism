import Link from 'next/link'
import { Terminal, Github, Twitter, Mail } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-terminal-panel border-t border-terminal-border">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded bg-bb-orange flex items-center justify-center">
                <Terminal className="w-4 h-4 text-black" />
              </div>
              <span className="font-mono font-bold text-bb-orange text-sm">REGEN</span>
            </div>
            <p className="text-xs font-mono text-bb-muted leading-relaxed">
              MACRO CRISIS DETECTION SYSTEM
              <br />
              NATIONAL IMPACT VELOCITY (NIV)
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-mono text-xs text-bb-gray mb-3 tracking-wide">PRODUCT</h4>
            <ul className="space-y-2 text-xs font-mono">
              <li><Link href="/dashboard" className="text-bb-muted hover:text-bb-orange transition">DASHBOARD</Link></li>
              <li><Link href="/explorer" className="text-bb-muted hover:text-bb-orange transition">DATA EXPLORER</Link></li>
              <li><Link href="/api-docs" className="text-bb-muted hover:text-bb-orange transition">API DOCS</Link></li>
            </ul>
          </div>

          {/* Research */}
          <div>
            <h4 className="font-mono text-xs text-bb-gray mb-3 tracking-wide">RESEARCH</h4>
            <ul className="space-y-2 text-xs font-mono">
              <li><Link href="/methodology" className="text-bb-muted hover:text-bb-orange transition">METHODOLOGY</Link></li>
              <li><Link href="/oos-tests" className="text-bb-muted hover:text-bb-orange transition">OOS TESTS</Link></li>
              <li><Link href="/simulator" className="text-bb-muted hover:text-bb-orange transition">SIMULATOR</Link></li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="font-mono text-xs text-bb-gray mb-3 tracking-wide">CONNECT</h4>
            <div className="flex gap-3">
              <a
                href="https://github.com/direncode/regenerationism"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 flex items-center justify-center border border-terminal-border text-bb-muted hover:text-bb-orange hover:border-bb-orange transition"
              >
                <Github className="w-4 h-4" />
              </a>
              <a
                href="https://twitter.com/regenerationism"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 flex items-center justify-center border border-terminal-border text-bb-muted hover:text-bb-orange hover:border-bb-orange transition"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a
                href="mailto:contact@regenerationism.ai"
                className="w-8 h-8 flex items-center justify-center border border-terminal-border text-bb-muted hover:text-bb-orange hover:border-bb-orange transition"
              >
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-terminal-border flex flex-wrap items-center justify-between gap-4 text-xxs font-mono text-bb-muted">
          <p>2025 REGENERATIONISM | MIT LICENSE</p>
          <p>DATA: FEDERAL RESERVE ECONOMIC DATA (FRED)</p>
        </div>
      </div>
    </footer>
  )
}
