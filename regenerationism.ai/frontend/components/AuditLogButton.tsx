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
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-3 py-2 bg-terminal-panel border border-terminal-border hover:border-bb-orange transition group"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        title="View Audit Log"
      >
        <div className="relative">
          <FileText className="w-4 h-4 text-bb-orange" />
          {hasNewEntries && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-2 h-2 bg-bb-green rounded-full"
            />
          )}
        </div>
        <span className="text-xs font-mono text-bb-gray group-hover:text-bb-white transition">
          AUDIT LOG
        </span>
        <span className="text-xxs font-mono bg-terminal-highlight px-1.5 py-0.5 text-bb-orange">
          {entryCount}
        </span>
        {hasNewEntries && (
          <Activity className="w-3 h-3 text-bb-green animate-pulse" />
        )}
      </motion.button>

      <AuditLogViewer isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}
