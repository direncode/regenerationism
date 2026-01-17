'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  Download,
  Trash2,
  Filter,
  Search,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  AlertTriangle,
  Info,
  Bug,
  Zap,
  Database,
  Calculator,
  Activity,
  Shield,
  FileDown,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Hash,
} from 'lucide-react'
import {
  auditLog,
  AuditLogEntry,
  LogLevel,
  LogCategory,
  LogFilter,
  LogStats,
} from '@/lib/auditLog'

const LEVEL_COLORS: Record<LogLevel, string> = {
  DEBUG: 'text-gray-400 bg-gray-500/10',
  INFO: 'text-green-400 bg-green-500/10',
  WARN: 'text-yellow-400 bg-yellow-500/10',
  ERROR: 'text-red-400 bg-red-500/10',
  CRITICAL: 'text-red-500 bg-red-500/20 font-bold',
}

const LEVEL_ICONS: Record<LogLevel, React.ReactNode> = {
  DEBUG: <Bug className="w-3 h-3" />,
  INFO: <Info className="w-3 h-3" />,
  WARN: <AlertTriangle className="w-3 h-3" />,
  ERROR: <AlertCircle className="w-3 h-3" />,
  CRITICAL: <Zap className="w-3 h-3" />,
}

const CATEGORY_ICONS: Record<LogCategory, React.ReactNode> = {
  DATA_FETCH: <Database className="w-3 h-3" />,
  CALCULATION: <Calculator className="w-3 h-3" />,
  MODEL: <Activity className="w-3 h-3" />,
  USER_ACTION: <Activity className="w-3 h-3" />,
  VALIDATION: <Shield className="w-3 h-3" />,
  SYSTEM: <Activity className="w-3 h-3" />,
  EXPORT: <FileDown className="w-3 h-3" />,
}

interface AuditLogViewerProps {
  isOpen: boolean
  onClose: () => void
}

export default function AuditLogViewer({ isOpen, onClose }: AuditLogViewerProps) {
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [stats, setStats] = useState<LogStats | null>(null)
  const [filter, setFilter] = useState<LogFilter>({})
  const [searchText, setSearchText] = useState('')
  const [selectedLevels, setSelectedLevels] = useState<LogLevel[]>([])
  const [selectedCategories, setSelectedCategories] = useState<LogCategory[]>([])
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set())
  const [autoRefresh, setAutoRefresh] = useState(true)

  const refreshLogs = useCallback(() => {
    const newFilter: LogFilter = {
      levels: selectedLevels.length > 0 ? selectedLevels : undefined,
      categories: selectedCategories.length > 0 ? selectedCategories : undefined,
      searchText: searchText || undefined,
    }
    setFilter(newFilter)
    setEntries(auditLog.getFilteredEntries(newFilter))
    setStats(auditLog.getStats())
  }, [selectedLevels, selectedCategories, searchText])

  useEffect(() => {
    if (isOpen) {
      refreshLogs()
    }
  }, [isOpen, refreshLogs])

  useEffect(() => {
    if (!isOpen || !autoRefresh) return

    const interval = setInterval(refreshLogs, 2000)
    return () => clearInterval(interval)
  }, [isOpen, autoRefresh, refreshLogs])

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedEntries)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedEntries(newExpanded)
  }

  const handleExportJSON = () => {
    const json = auditLog.exportToJSON()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportCSV = () => {
    const csv = auditLog.exportToCSV()
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleClear = () => {
    if (confirm('Are you sure you want to clear all audit logs? This cannot be undone.')) {
      auditLog.clear()
      refreshLogs()
    }
  }

  const handleVerifyIntegrity = () => {
    const result = auditLog.verifyIntegrity()
    if (result.valid) {
      alert('Log integrity verified: All checksums match.')
    } else {
      alert(`Integrity check failed:\n${result.errors.join('\n')}`)
    }
  }

  const sessionInfo = useMemo(() => auditLog.getSessionInfo(), [entries])

  const allLevels: LogLevel[] = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL']
  const allCategories: LogCategory[] = [
    'DATA_FETCH', 'CALCULATION', 'MODEL', 'USER_ACTION', 'VALIDATION', 'SYSTEM', 'EXPORT'
  ]

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-dark-900 border border-white/10 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-regen-400" />
            <div>
              <h2 className="text-xl font-bold">Audit Log Viewer</h2>
              <p className="text-sm text-gray-400">
                Session: {sessionInfo.sessionId.slice(0, 8)}... | {sessionInfo.entryCount} entries
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`p-2 rounded-lg transition ${autoRefresh ? 'bg-regen-500/20 text-regen-400' : 'bg-dark-700 text-gray-400'}`}
              title={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
            >
              <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
            </button>
            <button
              onClick={handleVerifyIntegrity}
              className="p-2 bg-dark-700 rounded-lg text-gray-400 hover:text-white transition"
              title="Verify Integrity"
            >
              <Shield className="w-4 h-4" />
            </button>
            <button
              onClick={handleExportJSON}
              className="p-2 bg-dark-700 rounded-lg text-gray-400 hover:text-white transition"
              title="Export JSON"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={handleExportCSV}
              className="p-2 bg-dark-700 rounded-lg text-gray-400 hover:text-white transition"
              title="Export CSV"
            >
              <FileDown className="w-4 h-4" />
            </button>
            <button
              onClick={handleClear}
              className="p-2 bg-red-500/20 rounded-lg text-red-400 hover:bg-red-500/30 transition"
              title="Clear Logs"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-dark-700 rounded-lg text-gray-400 hover:text-white transition"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        {stats && (
          <div className="px-4 py-2 bg-dark-800 border-b border-white/10 flex items-center gap-4 text-xs overflow-x-auto">
            <div className="flex items-center gap-1">
              <Hash className="w-3 h-3 text-gray-400" />
              <span className="text-gray-400">Total:</span>
              <span className="font-mono">{stats.totalEntries}</span>
            </div>
            <div className="h-4 w-px bg-white/10" />
            {allLevels.map(level => (
              <div key={level} className={`flex items-center gap-1 ${LEVEL_COLORS[level]} px-2 py-0.5 rounded`}>
                {LEVEL_ICONS[level]}
                <span className="font-mono">{stats.byLevel[level]}</span>
              </div>
            ))}
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-1">
              <span className="text-gray-400">Error Rate:</span>
              <span className={`font-mono ${stats.errorRate > 0.1 ? 'text-red-400' : 'text-green-400'}`}>
                {(stats.errorRate * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="p-4 border-b border-white/10 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="Search logs..."
              className="w-full bg-dark-700 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-regen-500"
            />
          </div>

          {/* Level Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-400 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Levels:
            </span>
            {allLevels.map(level => (
              <button
                key={level}
                onClick={() => {
                  if (selectedLevels.includes(level)) {
                    setSelectedLevels(selectedLevels.filter(l => l !== level))
                  } else {
                    setSelectedLevels([...selectedLevels, level])
                  }
                }}
                className={`px-2 py-1 text-xs rounded transition ${
                  selectedLevels.includes(level) || selectedLevels.length === 0
                    ? LEVEL_COLORS[level]
                    : 'bg-dark-700 text-gray-500'
                }`}
              >
                {level}
              </button>
            ))}
          </div>

          {/* Category Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-400">Categories:</span>
            {allCategories.map(cat => (
              <button
                key={cat}
                onClick={() => {
                  if (selectedCategories.includes(cat)) {
                    setSelectedCategories(selectedCategories.filter(c => c !== cat))
                  } else {
                    setSelectedCategories([...selectedCategories, cat])
                  }
                }}
                className={`px-2 py-1 text-xs rounded transition flex items-center gap-1 ${
                  selectedCategories.includes(cat) || selectedCategories.length === 0
                    ? 'bg-regen-500/20 text-regen-400'
                    : 'bg-dark-700 text-gray-500'
                }`}
              >
                {CATEGORY_ICONS[cat]}
                {cat.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Log Entries */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {entries.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No log entries found</p>
            </div>
          ) : (
            entries.slice().reverse().map(entry => (
              <LogEntry
                key={entry.id}
                entry={entry}
                isExpanded={expandedEntries.has(entry.id)}
                onToggle={() => toggleExpanded(entry.id)}
              />
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

function LogEntry({
  entry,
  isExpanded,
  onToggle,
}: {
  entry: AuditLogEntry
  isExpanded: boolean
  onToggle: () => void
}) {
  const hasDetails = entry.metadata || entry.calculation || entry.dataFetch || entry.model || entry.validation

  return (
    <div className="bg-dark-800 rounded-lg border border-white/5 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-dark-700 transition"
      >
        {hasDetails ? (
          isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
          )
        ) : (
          <div className="w-4" />
        )}

        <span className={`px-1.5 py-0.5 rounded text-xs font-mono flex items-center gap-1 ${LEVEL_COLORS[entry.level]}`}>
          {LEVEL_ICONS[entry.level]}
          {entry.level}
        </span>

        <span className="px-1.5 py-0.5 rounded text-xs bg-dark-600 text-gray-300 flex items-center gap-1">
          {CATEGORY_ICONS[entry.category]}
          {entry.category}
        </span>

        {entry.component && (
          <span className="px-1.5 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400">
            {entry.component}
          </span>
        )}

        <span className="flex-1 text-sm text-gray-200 truncate">{entry.message}</span>

        <span className="text-xs text-gray-500 font-mono flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {new Date(entry.timestamp).toLocaleTimeString()}
        </span>
      </button>

      <AnimatePresence>
        {isExpanded && hasDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/5 bg-dark-900"
          >
            <div className="p-3 space-y-3 text-xs">
              {/* Entry ID and Checksum */}
              <div className="flex items-center gap-4 text-gray-500">
                <span>ID: <code className="text-gray-400">{entry.id}</code></span>
                <span>Checksum: <code className="text-gray-400">{entry.checksum}</code></span>
              </div>

              {/* Calculation Details */}
              {entry.calculation && (
                <div className="bg-dark-800 rounded p-2">
                  <div className="text-gray-400 mb-1 font-bold">Calculation</div>
                  <div className="font-mono text-regen-400 mb-2">{entry.calculation.formula}</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-gray-500 mb-1">Inputs:</div>
                      {Object.entries(entry.calculation.inputs).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-gray-400">{key}:</span>
                          <span className="font-mono text-white">
                            {typeof value === 'number' ? value.toFixed(6) : JSON.stringify(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="text-gray-500 mb-1">Output:</div>
                      <div className="font-mono text-green-400">
                        {typeof entry.calculation.output === 'number'
                          ? entry.calculation.output.toFixed(6)
                          : JSON.stringify(entry.calculation.output)}
                      </div>
                    </div>
                  </div>
                  {entry.calculation.intermediateSteps && (
                    <div className="mt-2 border-t border-white/5 pt-2">
                      <div className="text-gray-500 mb-1">Intermediate Steps:</div>
                      {entry.calculation.intermediateSteps.map((step, i) => (
                        <div key={i} className="flex justify-between">
                          <span className="text-gray-400">{step.step}:</span>
                          <span className="font-mono text-yellow-400">
                            {typeof step.value === 'number' ? step.value.toFixed(6) : JSON.stringify(step.value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Data Fetch Details */}
              {entry.dataFetch && (
                <div className="bg-dark-800 rounded p-2">
                  <div className="text-gray-400 mb-1 font-bold">Data Fetch</div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Method:</span>
                      <span className="font-mono text-blue-400">{entry.dataFetch.method}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">URL:</span>
                      <span className="font-mono text-gray-300 text-xs break-all">{entry.dataFetch.url}</span>
                    </div>
                    {entry.dataFetch.responseStatus && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Status:</span>
                        <span className={`font-mono ${entry.dataFetch.responseStatus < 400 ? 'text-green-400' : 'text-red-400'}`}>
                          {entry.dataFetch.responseStatus}
                        </span>
                      </div>
                    )}
                    {entry.dataFetch.duration && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Duration:</span>
                        <span className="font-mono text-yellow-400">{entry.dataFetch.duration.toFixed(2)}ms</span>
                      </div>
                    )}
                    {entry.dataFetch.responseSize && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Response Size:</span>
                        <span className="font-mono text-gray-300">{entry.dataFetch.responseSize} items</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Model Details */}
              {entry.model && (
                <div className="bg-dark-800 rounded p-2">
                  <div className="text-gray-400 mb-1 font-bold">Model: {entry.model.modelType}</div>
                  <div className="grid grid-cols-2 gap-2">
                    {entry.model.trainingSamples && (
                      <div>
                        <span className="text-gray-500">Training Samples:</span>
                        <span className="font-mono text-white ml-2">{entry.model.trainingSamples}</span>
                      </div>
                    )}
                    {entry.model.testSamples && (
                      <div>
                        <span className="text-gray-500">Test Samples:</span>
                        <span className="font-mono text-white ml-2">{entry.model.testSamples}</span>
                      </div>
                    )}
                  </div>
                  {entry.model.metrics && (
                    <div className="mt-2 border-t border-white/5 pt-2">
                      <div className="text-gray-500 mb-1">Metrics:</div>
                      <div className="grid grid-cols-3 gap-2">
                        {Object.entries(entry.model.metrics).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-gray-400">{key}:</span>
                            <span className="font-mono text-green-400">{value.toFixed(6)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Validation Details */}
              {entry.validation && (
                <div className="bg-dark-800 rounded p-2">
                  <div className="text-gray-400 mb-1 font-bold flex items-center gap-2">
                    Validation
                    {entry.validation.valid ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <div><span className="text-gray-500">Field:</span> <span className="text-white">{entry.validation.field}</span></div>
                    <div><span className="text-gray-500">Expected:</span> <span className="text-blue-400">{entry.validation.expectedType}</span></div>
                    <div><span className="text-gray-500">Actual:</span> <span className="text-yellow-400">{entry.validation.actualType}</span></div>
                    {entry.validation.reason && (
                      <div><span className="text-gray-500">Reason:</span> <span className="text-red-400">{entry.validation.reason}</span></div>
                    )}
                  </div>
                </div>
              )}

              {/* Generic Metadata */}
              {entry.metadata && !entry.calculation && !entry.dataFetch && !entry.model && !entry.validation && (
                <div className="bg-dark-800 rounded p-2">
                  <div className="text-gray-400 mb-1 font-bold">Metadata</div>
                  <pre className="font-mono text-xs text-gray-300 whitespace-pre-wrap">
                    {JSON.stringify(entry.metadata, null, 2)}
                  </pre>
                </div>
              )}

              {/* Stack Trace */}
              {entry.stackTrace && (
                <div className="bg-red-500/10 rounded p-2">
                  <div className="text-red-400 mb-1 font-bold">Stack Trace</div>
                  <pre className="font-mono text-xs text-red-300 whitespace-pre-wrap overflow-x-auto">
                    {entry.stackTrace}
                  </pre>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
