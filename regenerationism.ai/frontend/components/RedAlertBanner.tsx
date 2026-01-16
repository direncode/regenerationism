'use client'

import { AlertTriangle, X } from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface RedAlertBannerProps {
  probability: number
}

export default function RedAlertBanner({ probability }: RedAlertBannerProps) {
  const [dismissed, setDismissed] = useState(false)
  
  if (dismissed) return null
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="bg-gradient-to-r from-red-900/50 via-red-800/50 to-red-900/50 border-b border-red-500/30"
      >
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1 bg-red-500 rounded animate-pulse">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-red-400">RED ALERT: </span>
              <span className="text-white">
                Recession probability at <strong>{probability}%</strong>. 
                NIV detects elevated liquidity stress.
              </span>
            </div>
          </div>
          
          <button
            onClick={() => setDismissed(true)}
            className="p-1 text-gray-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
