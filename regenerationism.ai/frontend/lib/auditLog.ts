/**
 * Comprehensive Audit Logging System for Regenerationism.ai
 * Provides air-tight verifiability for all model calculations, data fetches, and user actions
 */

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL'
export type LogCategory =
  | 'DATA_FETCH'      // External API calls (FRED, etc.)
  | 'CALCULATION'     // NIV formula calculations
  | 'MODEL'           // Statistical model operations (regression, AUC, etc.)
  | 'USER_ACTION'     // User interactions
  | 'VALIDATION'      // Input/output validation
  | 'SYSTEM'          // System events
  | 'EXPORT'          // Data exports

export interface LogMetadata {
  [key: string]: unknown
}

export interface DataFetchLog {
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  requestParams?: Record<string, unknown>
  responseStatus?: number
  responseSize?: number
  duration?: number
  cached?: boolean
}

export interface CalculationLog {
  formula: string
  inputs: Record<string, number | number[]>
  output: number | number[]
  intermediateSteps?: Array<{
    step: string
    value: number | number[]
  }>
}

export interface ModelLog {
  modelType: string
  trainingSamples?: number
  testSamples?: number
  parameters?: Record<string, unknown>
  metrics?: Record<string, number>
  predictions?: number[]
  actuals?: number[]
}

export interface ValidationLog {
  field: string
  expectedType: string
  actualType: string
  value: unknown
  valid: boolean
  reason?: string
}

export interface AuditLogEntry {
  id: string
  timestamp: string
  level: LogLevel
  category: LogCategory
  message: string
  sessionId: string
  component?: string
  metadata?: LogMetadata
  dataFetch?: DataFetchLog
  calculation?: CalculationLog
  model?: ModelLog
  validation?: ValidationLog
  stackTrace?: string
  checksum?: string
}

export interface LogSession {
  sessionId: string
  startTime: string
  userAgent: string
  timezone: string
  entries: AuditLogEntry[]
}

export interface LogFilter {
  levels?: LogLevel[]
  categories?: LogCategory[]
  startTime?: string
  endTime?: string
  component?: string
  searchText?: string
}

export interface LogStats {
  totalEntries: number
  byLevel: Record<LogLevel, number>
  byCategory: Record<LogCategory, number>
  errorRate: number
  avgCalculationTime?: number
}

// =============================================================================
// UTILITIES
// =============================================================================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function generateChecksum(data: string): string {
  // Simple hash for integrity verification
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16).padStart(8, '0')
}

function getStackTrace(): string {
  const stack = new Error().stack || ''
  return stack.split('\n').slice(3).join('\n')
}

function formatTimestamp(): string {
  return new Date().toISOString()
}

// =============================================================================
// AUDIT LOGGER CLASS
// =============================================================================

class AuditLogger {
  private static instance: AuditLogger
  private session: LogSession
  private maxEntries: number = 10000
  private persistToStorage: boolean = true
  private consoleOutput: boolean = true
  private logLevelThreshold: LogLevel = 'DEBUG'

  private levelPriority: Record<LogLevel, number> = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    CRITICAL: 4,
  }

  private constructor() {
    this.session = this.initSession()
    this.loadFromStorage()
  }

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger()
    }
    return AuditLogger.instance
  }

  private initSession(): LogSession {
    return {
      sessionId: generateId(),
      startTime: formatTimestamp(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      entries: [],
    }
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined' || !this.persistToStorage) return

    try {
      const stored = localStorage.getItem('audit_log_session')
      if (stored) {
        const parsed = JSON.parse(stored) as LogSession
        // Only restore if session is less than 24 hours old
        const sessionAge = Date.now() - new Date(parsed.startTime).getTime()
        if (sessionAge < 24 * 60 * 60 * 1000) {
          this.session = parsed
        }
      }
    } catch (e) {
      console.warn('Failed to load audit log from storage:', e)
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined' || !this.persistToStorage) return

    try {
      localStorage.setItem('audit_log_session', JSON.stringify(this.session))
    } catch (e) {
      console.warn('Failed to save audit log to storage:', e)
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levelPriority[level] >= this.levelPriority[this.logLevelThreshold]
  }

  private createEntry(
    level: LogLevel,
    category: LogCategory,
    message: string,
    options: Partial<Omit<AuditLogEntry, 'id' | 'timestamp' | 'level' | 'category' | 'message' | 'sessionId' | 'checksum'>> = {}
  ): AuditLogEntry {
    const entry: AuditLogEntry = {
      id: generateId(),
      timestamp: formatTimestamp(),
      level,
      category,
      message,
      sessionId: this.session.sessionId,
      ...options,
    }

    // Generate checksum for integrity verification
    const checksumData = JSON.stringify({
      id: entry.id,
      timestamp: entry.timestamp,
      level: entry.level,
      category: entry.category,
      message: entry.message,
    })
    entry.checksum = generateChecksum(checksumData)

    return entry
  }

  private addEntry(entry: AuditLogEntry): void {
    this.session.entries.push(entry)

    // Trim old entries if exceeding max
    if (this.session.entries.length > this.maxEntries) {
      this.session.entries = this.session.entries.slice(-this.maxEntries)
    }

    // Console output
    if (this.consoleOutput) {
      const style = this.getConsoleStyle(entry.level)
      console.log(
        `%c[${entry.level}] [${entry.category}] ${entry.message}`,
        style,
        entry.metadata || ''
      )
    }

    this.saveToStorage()
  }

  private getConsoleStyle(level: LogLevel): string {
    const styles: Record<LogLevel, string> = {
      DEBUG: 'color: #888',
      INFO: 'color: #4ade80',
      WARN: 'color: #fbbf24',
      ERROR: 'color: #ef4444',
      CRITICAL: 'color: #fff; background: #ef4444; padding: 2px 4px',
    }
    return styles[level]
  }

  // ===========================================================================
  // PUBLIC LOGGING METHODS
  // ===========================================================================

  /**
   * Log a data fetch operation (API calls)
   */
  logDataFetch(
    message: string,
    dataFetch: DataFetchLog,
    level: LogLevel = 'INFO',
    component?: string
  ): string {
    if (!this.shouldLog(level)) return ''

    const entry = this.createEntry(level, 'DATA_FETCH', message, {
      component,
      dataFetch,
      metadata: {
        url: dataFetch.url,
        status: dataFetch.responseStatus,
        duration: dataFetch.duration,
      },
    })

    this.addEntry(entry)
    return entry.id
  }

  /**
   * Log a calculation with full audit trail
   */
  logCalculation(
    message: string,
    calculation: CalculationLog,
    level: LogLevel = 'INFO',
    component?: string
  ): string {
    if (!this.shouldLog(level)) return ''

    const entry = this.createEntry(level, 'CALCULATION', message, {
      component,
      calculation,
      metadata: {
        formula: calculation.formula,
        inputCount: Object.keys(calculation.inputs).length,
        hasIntermediateSteps: !!calculation.intermediateSteps,
      },
    })

    this.addEntry(entry)
    return entry.id
  }

  /**
   * Log a model operation (training, prediction, evaluation)
   */
  logModel(
    message: string,
    model: ModelLog,
    level: LogLevel = 'INFO',
    component?: string
  ): string {
    if (!this.shouldLog(level)) return ''

    const entry = this.createEntry(level, 'MODEL', message, {
      component,
      model,
      metadata: {
        modelType: model.modelType,
        trainingSamples: model.trainingSamples,
        metrics: model.metrics,
      },
    })

    this.addEntry(entry)
    return entry.id
  }

  /**
   * Log a validation result
   */
  logValidation(
    message: string,
    validation: ValidationLog,
    level: LogLevel = validation.valid ? 'DEBUG' : 'WARN',
    component?: string
  ): string {
    if (!this.shouldLog(level)) return ''

    const entry = this.createEntry(level, 'VALIDATION', message, {
      component,
      validation,
    })

    this.addEntry(entry)
    return entry.id
  }

  /**
   * Log a user action
   */
  logUserAction(
    message: string,
    metadata?: LogMetadata,
    component?: string
  ): string {
    if (!this.shouldLog('INFO')) return ''

    const entry = this.createEntry('INFO', 'USER_ACTION', message, {
      component,
      metadata,
    })

    this.addEntry(entry)
    return entry.id
  }

  /**
   * Log a system event
   */
  logSystem(
    message: string,
    level: LogLevel = 'INFO',
    metadata?: LogMetadata,
    component?: string
  ): string {
    if (!this.shouldLog(level)) return ''

    const entry = this.createEntry(level, 'SYSTEM', message, {
      component,
      metadata,
      stackTrace: level === 'ERROR' || level === 'CRITICAL' ? getStackTrace() : undefined,
    })

    this.addEntry(entry)
    return entry.id
  }

  /**
   * Log an export operation
   */
  logExport(
    message: string,
    metadata?: LogMetadata,
    component?: string
  ): string {
    if (!this.shouldLog('INFO')) return ''

    const entry = this.createEntry('INFO', 'EXPORT', message, {
      component,
      metadata,
    })

    this.addEntry(entry)
    return entry.id
  }

  /**
   * Generic log method
   */
  log(
    level: LogLevel,
    category: LogCategory,
    message: string,
    options?: Partial<Omit<AuditLogEntry, 'id' | 'timestamp' | 'level' | 'category' | 'message' | 'sessionId' | 'checksum'>>
  ): string {
    if (!this.shouldLog(level)) return ''

    const entry = this.createEntry(level, category, message, options)
    this.addEntry(entry)
    return entry.id
  }

  // ===========================================================================
  // QUERY & EXPORT METHODS
  // ===========================================================================

  /**
   * Get all log entries
   */
  getEntries(): AuditLogEntry[] {
    return [...this.session.entries]
  }

  /**
   * Get filtered log entries
   */
  getFilteredEntries(filter: LogFilter): AuditLogEntry[] {
    let entries = this.session.entries

    if (filter.levels?.length) {
      entries = entries.filter(e => filter.levels!.includes(e.level))
    }

    if (filter.categories?.length) {
      entries = entries.filter(e => filter.categories!.includes(e.category))
    }

    if (filter.startTime) {
      entries = entries.filter(e => e.timestamp >= filter.startTime!)
    }

    if (filter.endTime) {
      entries = entries.filter(e => e.timestamp <= filter.endTime!)
    }

    if (filter.component) {
      entries = entries.filter(e => e.component === filter.component)
    }

    if (filter.searchText) {
      const search = filter.searchText.toLowerCase()
      entries = entries.filter(e =>
        e.message.toLowerCase().includes(search) ||
        JSON.stringify(e.metadata).toLowerCase().includes(search)
      )
    }

    return entries
  }

  /**
   * Get log statistics
   */
  getStats(): LogStats {
    const entries = this.session.entries
    const byLevel: Record<LogLevel, number> = {
      DEBUG: 0, INFO: 0, WARN: 0, ERROR: 0, CRITICAL: 0
    }
    const byCategory: Record<LogCategory, number> = {
      DATA_FETCH: 0, CALCULATION: 0, MODEL: 0, USER_ACTION: 0,
      VALIDATION: 0, SYSTEM: 0, EXPORT: 0
    }

    entries.forEach(e => {
      byLevel[e.level]++
      byCategory[e.category]++
    })

    const errorCount = byLevel.ERROR + byLevel.CRITICAL
    const errorRate = entries.length > 0 ? errorCount / entries.length : 0

    // Calculate average calculation time if available
    const calcEntries = entries.filter(e =>
      e.category === 'CALCULATION' && e.dataFetch?.duration
    )
    const avgCalculationTime = calcEntries.length > 0
      ? calcEntries.reduce((sum, e) => sum + (e.dataFetch?.duration || 0), 0) / calcEntries.length
      : undefined

    return {
      totalEntries: entries.length,
      byLevel,
      byCategory,
      errorRate,
      avgCalculationTime,
    }
  }

  /**
   * Export logs to JSON
   */
  exportToJSON(): string {
    const exportData = {
      exportTimestamp: formatTimestamp(),
      session: this.session,
      stats: this.getStats(),
      integrity: {
        entryCount: this.session.entries.length,
        firstEntry: this.session.entries[0]?.timestamp,
        lastEntry: this.session.entries[this.session.entries.length - 1]?.timestamp,
        sessionChecksum: generateChecksum(JSON.stringify(this.session.entries.map(e => e.checksum))),
      },
    }

    this.logExport('Exported audit log to JSON', {
      entryCount: this.session.entries.length,
    })

    return JSON.stringify(exportData, null, 2)
  }

  /**
   * Export logs to CSV
   */
  exportToCSV(): string {
    const headers = [
      'ID', 'Timestamp', 'Level', 'Category', 'Component', 'Message', 'Checksum'
    ]

    const rows = this.session.entries.map(e => [
      e.id,
      e.timestamp,
      e.level,
      e.category,
      e.component || '',
      `"${e.message.replace(/"/g, '""')}"`,
      e.checksum || '',
    ])

    this.logExport('Exported audit log to CSV', {
      entryCount: this.session.entries.length,
    })

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  }

  /**
   * Verify log integrity
   */
  verifyIntegrity(): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    this.session.entries.forEach((entry, index) => {
      const checksumData = JSON.stringify({
        id: entry.id,
        timestamp: entry.timestamp,
        level: entry.level,
        category: entry.category,
        message: entry.message,
      })
      const expectedChecksum = generateChecksum(checksumData)

      if (entry.checksum !== expectedChecksum) {
        errors.push(`Entry ${index} (${entry.id}): checksum mismatch`)
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Clear all logs
   */
  clear(): void {
    this.logSystem('Audit log cleared', 'WARN', {
      previousEntryCount: this.session.entries.length,
    })
    this.session = this.initSession()
    this.saveToStorage()
  }

  /**
   * Get current session info
   */
  getSessionInfo(): Omit<LogSession, 'entries'> & { entryCount: number } {
    return {
      sessionId: this.session.sessionId,
      startTime: this.session.startTime,
      userAgent: this.session.userAgent,
      timezone: this.session.timezone,
      entryCount: this.session.entries.length,
    }
  }

  /**
   * Configure logger settings
   */
  configure(options: {
    maxEntries?: number
    persistToStorage?: boolean
    consoleOutput?: boolean
    logLevelThreshold?: LogLevel
  }): void {
    if (options.maxEntries !== undefined) this.maxEntries = options.maxEntries
    if (options.persistToStorage !== undefined) this.persistToStorage = options.persistToStorage
    if (options.consoleOutput !== undefined) this.consoleOutput = options.consoleOutput
    if (options.logLevelThreshold !== undefined) this.logLevelThreshold = options.logLevelThreshold
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const auditLog = AuditLogger.getInstance()

// =============================================================================
// HELPER FUNCTIONS FOR COMMON OPERATIONS
// =============================================================================

/**
 * Create a timed operation wrapper that automatically logs start/end
 */
export function withAuditLog<T>(
  operationName: string,
  category: LogCategory,
  component: string,
  operation: () => T | Promise<T>
): Promise<T> {
  const startTime = performance.now()

  auditLog.log('DEBUG', category, `Starting: ${operationName}`, { component })

  const handleResult = (result: T) => {
    const duration = performance.now() - startTime
    auditLog.log('INFO', category, `Completed: ${operationName}`, {
      component,
      metadata: { duration: `${duration.toFixed(2)}ms` },
    })
    return result
  }

  const handleError = (error: unknown) => {
    const duration = performance.now() - startTime
    auditLog.log('ERROR', category, `Failed: ${operationName}`, {
      component,
      metadata: {
        duration: `${duration.toFixed(2)}ms`,
        error: error instanceof Error ? error.message : String(error),
      },
      stackTrace: error instanceof Error ? error.stack : undefined,
    })
    throw error
  }

  try {
    const result = operation()
    if (result instanceof Promise) {
      return result.then(handleResult).catch(handleError)
    }
    return Promise.resolve(handleResult(result))
  } catch (error) {
    return Promise.reject(handleError(error))
  }
}

/**
 * Log NIV calculation with full formula breakdown
 */
export function logNIVCalculation(
  thrust: number,
  efficiency: number,
  slack: number,
  drag: number,
  eta: number,
  niv: number,
  component: string = 'NIV'
): string {
  return auditLog.logCalculation(
    `NIV calculated: ${niv.toFixed(6)}`,
    {
      formula: 'NIV = (u × P²) / (X + F)^η',
      inputs: {
        'u (thrust)': thrust,
        'P (efficiency)': efficiency,
        'X (slack)': slack,
        'F (drag)': drag,
        'η (eta)': eta,
      },
      output: niv,
      intermediateSteps: [
        { step: 'P² (efficiency squared)', value: efficiency * efficiency },
        { step: 'u × P² (numerator)', value: thrust * (efficiency * efficiency) },
        { step: 'X + F (denominator base)', value: slack + drag },
        { step: '(X + F)^η (denominator)', value: Math.pow(slack + drag, eta) },
      ],
    },
    'INFO',
    component
  )
}

/**
 * Log FRED data fetch
 */
export function logFREDFetch(
  series: string,
  startDate: string,
  endDate: string,
  dataPoints: number,
  duration: number,
  component: string = 'FRED'
): string {
  return auditLog.logDataFetch(
    `Fetched FRED series: ${series} (${dataPoints} points)`,
    {
      url: `https://api.stlouisfed.org/fred/series/observations?series_id=${series}`,
      method: 'GET',
      requestParams: { series_id: series, observation_start: startDate, observation_end: endDate },
      responseStatus: 200,
      responseSize: dataPoints,
      duration,
      cached: false,
    },
    'INFO',
    component
  )
}

/**
 * Log model evaluation metrics
 */
export function logModelEvaluation(
  modelType: string,
  metrics: Record<string, number>,
  trainingSamples: number,
  testSamples: number,
  component: string = 'Model'
): string {
  return auditLog.logModel(
    `Model evaluation: ${modelType}`,
    {
      modelType,
      trainingSamples,
      testSamples,
      metrics,
    },
    'INFO',
    component
  )
}
