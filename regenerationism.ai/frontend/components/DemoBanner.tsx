'use client'

import { useState } from 'react'
import { AlertTriangle, X, CheckCircle } from 'lucide-react'

export default function DemoBanner() {
  const [dismissed, setDismissed] = useState(false)

  // Set this to false to hide the demo banner in production
  const SHOW_DEMO_BANNER = true

  if (!SHOW_DEMO_BANNER || dismissed) return null

  return (
    <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-b border-amber-500/20">
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-2 py-1 bg-amber-500/20 rounded-md">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                Demo Mode
              </span>
            </div>
            <span className="text-sm text-amber-200/80">
              Preview environment — data is live from FRED API
            </span>
            <div className="hidden md:flex items-center gap-2 text-xs text-neutral-400">
              <CheckCircle className="w-3 h-3 text-emerald-400" />
              <span>Formula exposed</span>
              <span className="mx-1">•</span>
              <CheckCircle className="w-3 h-3 text-emerald-400" />
              <span>Open data</span>
              <span className="mx-1">•</span>
              <CheckCircle className="w-3 h-3 text-emerald-400" />
              <span>Reproducible</span>
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-amber-400/60 hover:text-amber-400 transition p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
