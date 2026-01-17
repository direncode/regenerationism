'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FileText, Activity } from 'lucide-react'
import { auditLog } from '@/lib/auditLog'
import AuditLogViewer from './AuditLogViewer'

export default function AuditLogButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [entryCount, setEntryCount] = useState(0)
  const [hasNewEntries, setHasNewEntries] = useState(false)

  useEffect(() => {
    const updateCount = () => {
      const newCount = auditLog.getSessionInfo().entryCount
      if (newCount > entryCount && entryCount > 0) {
        setHasNewEntries(true)
        setTimeout(() => setHasNewEntries(false), 2000)
      }
      setEntryCount(newCount)
    }

    updateCount()
    const interval = setInterval(updateCount, 1000)
    return () => clearInterval(interval)
  }, [entryCount])

  return (
    <>
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 bg-dark-800 border border-white/10 rounded-full shadow-lg hover:bg-dark-700 transition group"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title="View Audit Log"
      >
        <div className="relative">
          <FileText className="w-5 h-5 text-regen-400" />
          {hasNewEntries && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-2 h-2 bg-regen-400 rounded-full"
            />
          )}
        </div>
        <span className="text-sm text-gray-300 group-hover:text-white transition">
          Audit Log
        </span>
        <span className="text-xs font-mono bg-dark-600 px-2 py-0.5 rounded-full text-gray-400">
          {entryCount}
        </span>
        {hasNewEntries && (
          <Activity className="w-4 h-4 text-regen-400 animate-pulse" />
        )}
      </motion.button>

      <AuditLogViewer isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}
