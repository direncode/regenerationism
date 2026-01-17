/**
 * FRED API Service - Direct browser calls to Federal Reserve Economic Data
 *
 * Series used for NIV calculation:
 * - GPDIC1: Real Gross Private Domestic Investment (Thrust - Investment)
 * - M2SL: M2 Money Stock (Efficiency - Liquidity)
 * - FEDFUNDS: Federal Funds Effective Rate (Drag - Interest Rate)
 * - GDPC1: Real GDP (for normalization)
 * - TCU: Total Capacity Utilization (Slack)
 * - T10Y3M: 10-Year Treasury Constant Maturity Minus 3-Month Treasury (Yield Spread - Leading indicator)
 * - CPIAUCSL: Consumer Price Index (Drag - Inflation)
 */

import { auditLog, logNIVCalculation, logFREDFetch } from './auditLog'

export interface FREDObservation {
  date: string
  value: string
}

export interface FREDSeriesResponse {
  observations: FREDObservation[]
}

export interface EconomicData {
  date: string
  investment: number | null  // GPDIC1
  m2: number | null          // M2SL
  fedFunds: number | null    // FEDFUNDS
  gdp: number | null         // GDPC1
  capacity: number | null    // TCU
  yieldSpread: number | null // T10Y3M
  cpi: number | null         // CPIAUCSL
}

export interface NIVDataPoint {
  date: string
  thrust: number
  efficiency: number
  slack: number
  drag: number
  yieldSpread: number   // Raw T10Y3M value for OOS tests
  inflationRate: number // YoY CPI change
  realRate: number      // Fed Funds - Inflation
  niv: number
  probability: number
  isRecession: boolean
}

// FRED series IDs
const SERIES = {
  INVESTMENT: 'GPDIC1',
  M2: 'M2SL',
  FED_FUNDS: 'FEDFUNDS',
  GDP: 'GDPC1',
  CAPACITY: 'TCU',
  YIELD_SPREAD: 'T10Y3M',
  CPI: 'CPIAUCSL',
  // NBER recession indicator for validation
  RECESSION: 'USREC',
}

// Use our proxy API route to bypass CORS
// The proxy runs on the same origin, so no CORS issues
const getProxyUrl = () => {
  // In browser, use relative URL
  if (typeof window !== 'undefined') {
    return '/api/fred'
  }
  // On server, use full URL
  return `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/fred`
}

// Direct FRED API (for server-side only, not used in browser)
const FRED_API_BASE = 'https://api.stlouisfed.org/fred'

/**
 * Fetch a single FRED series via our proxy
 */
async function fetchFREDSeries(
  seriesId: string,
  apiKey: string,
  startDate: string,
  endDate: string
): Promise<FREDObservation[]> {
  const startTime = performance.now()

  // Use our proxy to bypass CORS
  const proxyUrl = new URL(getProxyUrl(), typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')
  proxyUrl.searchParams.set('series_id', seriesId)
  proxyUrl.searchParams.set('api_key', apiKey)
  proxyUrl.searchParams.set('observation_start', startDate)
  proxyUrl.searchParams.set('observation_end', endDate)
  proxyUrl.searchParams.set('endpoint', 'observations')

  auditLog.logDataFetch(
    `Initiating FRED fetch: ${seriesId}`,
    {
      url: proxyUrl.toString().replace(apiKey, '[REDACTED]'),
      method: 'GET',
      requestParams: { series_id: seriesId, observation_start: startDate, observation_end: endDate },
    },
    'DEBUG',
    'FRED-API'
  )

  try {
    const response = await fetch(proxyUrl.toString())
    const duration = performance.now() - startTime

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      auditLog.logDataFetch(
        `FRED API error: ${seriesId} - ${response.status}`,
        {
          url: proxyUrl.toString().replace(apiKey, '[REDACTED]'),
          method: 'GET',
          responseStatus: response.status,
          duration,
        },
        'ERROR',
        'FRED-API'
      )
      throw new Error(`FRED API error for ${seriesId}: ${response.status} ${errorData.error || response.statusText}`)
    }

    const data = await response.json()

    // Handle FRED API error responses
    if (data.error_code || data.error_message || data.error) {
      auditLog.logDataFetch(
        `FRED API returned error: ${data.error_message || data.error}`,
        {
          url: proxyUrl.toString().replace(apiKey, '[REDACTED]'),
          method: 'GET',
          responseStatus: response.status,
          duration,
        },
        'ERROR',
        'FRED-API'
      )
      throw new Error(`FRED API error: ${data.error_message || data.error || 'Unknown error'}`)
    }

    const observations = data.observations || []

    // Log successful fetch
    logFREDFetch(seriesId, startDate, endDate, observations.length, duration, 'FRED-API')

    return observations
  } catch (error) {
    const duration = performance.now() - startTime
    auditLog.logDataFetch(
      `FRED fetch failed: ${seriesId} - ${error instanceof Error ? error.message : 'Unknown error'}`,
      {
        url: proxyUrl.toString().replace(apiKey, '[REDACTED]'),
        method: 'GET',
        duration,
      },
      'ERROR',
      'FRED-API'
    )
    throw error
  }
}

/**
 * Parse FRED observation value (handles "." for missing data)
 */
function parseValue(value: string): number | null {
  if (value === '.' || value === '') return null
  const parsed = parseFloat(value)
  return isNaN(parsed) ? null : parsed
}

/**
 * Fetch all required FRED series for NIV calculation
 */
export async function fetchAllFREDData(
  apiKey: string,
  startDate: string,
  endDate: string,
  onProgress?: (series: string, progress: number) => void
): Promise<Map<string, FREDObservation[]>> {
  const seriesList = Object.entries(SERIES)
  const results = new Map<string, FREDObservation[]>()
  let successCount = 0
  let errorCount = 0

  console.log(`Fetching ${seriesList.length} FRED series from ${startDate} to ${endDate}`)

  for (let i = 0; i < seriesList.length; i++) {
    const [name, seriesId] = seriesList[i]
    onProgress?.(`Fetching ${name}`, (i / seriesList.length) * 100)

    try {
      const data = await fetchFREDSeries(seriesId, apiKey, startDate, endDate)
      results.set(name, data)
      if (data.length > 0) {
        successCount++
      }
    } catch (error) {
      console.error(`Failed to fetch ${seriesId}:`, error)
      results.set(name, [])
      errorCount++
    }
  }

  console.log(`FRED fetch complete: ${successCount} series with data, ${errorCount} errors`)
  onProgress?.('Complete', 100)

  // If we got zero data, throw an error
  if (successCount === 0) {
    throw new Error(`Failed to fetch any FRED data. Please check your API key and try again.`)
  }

  return results
}

/**
 * Merge multiple FRED series into unified monthly data points
 */
export function mergeSeriesData(
  seriesData: Map<string, FREDObservation[]>
): EconomicData[] {
  // Get all unique dates
  const allDates = new Set<string>()
  seriesData.forEach((observations) => {
    observations.forEach((obs) => {
      // Convert to YYYY-MM format for monthly grouping
      const monthKey = obs.date.substring(0, 7)
      allDates.add(monthKey)
    })
  })

  // Sort dates
  const sortedDates = Array.from(allDates).sort()

  // Create lookup maps for each series (by month)
  const createLookup = (observations: FREDObservation[]) => {
    const lookup = new Map<string, number | null>()
    observations.forEach((obs) => {
      const monthKey = obs.date.substring(0, 7)
      lookup.set(monthKey, parseValue(obs.value))
    })
    return lookup
  }

  const investmentLookup = createLookup(seriesData.get('INVESTMENT') || [])
  const m2Lookup = createLookup(seriesData.get('M2') || [])
  const fedFundsLookup = createLookup(seriesData.get('FED_FUNDS') || [])
  const gdpLookup = createLookup(seriesData.get('GDP') || [])
  const capacityLookup = createLookup(seriesData.get('CAPACITY') || [])
  const yieldSpreadLookup = createLookup(seriesData.get('YIELD_SPREAD') || [])
  const cpiLookup = createLookup(seriesData.get('CPI') || [])

  // Merge into unified data points
  return sortedDates.map((monthKey) => ({
    date: `${monthKey}-01`,
    investment: investmentLookup.get(monthKey) ?? null,
    m2: m2Lookup.get(monthKey) ?? null,
    fedFunds: fedFundsLookup.get(monthKey) ?? null,
    gdp: gdpLookup.get(monthKey) ?? null,
    capacity: capacityLookup.get(monthKey) ?? null,
    yieldSpread: yieldSpreadLookup.get(monthKey) ?? null,
    cpi: cpiLookup.get(monthKey) ?? null,
  }))
}

/**
 * Calculate year-over-year percent change
 */
function calculateYoYChange(current: number, previous: number): number {
  if (previous === 0) return 0
  return ((current - previous) / previous) * 100
}

/**
 * Normalize a value to 0-1 range using min-max scaling
 */
function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0.5
  return Math.max(0, Math.min(1, (value - min) / (max - min)))
}

/**
 * Calculate NIV components from economic data
 */
export function calculateNIVComponents(
  data: EconomicData[],
  params: {
    eta: number
    weights: { thrust: number; efficiency: number; slack: number; drag: number }
    smoothWindow: number
  }
): NIVDataPoint[] {
  // Need at least 13 months for YoY calculations
  if (data.length < 13) {
    return []
  }

  const results: NIVDataPoint[] = []

  // Calculate raw components with YoY changes
  const rawComponents: Array<{
    date: string
    thrust: number
    efficiency: number
    slack: number
    drag: number
    yieldSpread: number
    inflationRate: number
    realRate: number
  }> = []

  for (let i = 12; i < data.length; i++) {
    const current = data[i]
    const yearAgo = data[i - 12]

    // Skip if missing critical data
    if (
      current.investment === null ||
      yearAgo.investment === null ||
      current.m2 === null ||
      yearAgo.m2 === null ||
      current.capacity === null ||
      current.fedFunds === null ||
      current.cpi === null ||
      yearAgo.cpi === null
    ) {
      continue
    }

    // Thrust: Investment growth rate (positive = expansionary)
    const investmentGrowth = calculateYoYChange(current.investment, yearAgo.investment)

    // Efficiency: M2 velocity proxy (M2 growth relative to GDP growth)
    const m2Growth = calculateYoYChange(current.m2, yearAgo.m2)
    const gdpGrowth = current.gdp && yearAgo.gdp
      ? calculateYoYChange(current.gdp, yearAgo.gdp)
      : 2.0 // Default assumption

    // Efficiency = how effectively money translates to growth
    const efficiency = gdpGrowth - m2Growth * 0.5 // Adjusted velocity proxy

    // Slack: Capacity utilization gap (100 - actual = slack)
    const slack = 100 - current.capacity

    // Calculate inflation and real rate for reference
    const inflationRate = calculateYoYChange(current.cpi, yearAgo.cpi)
    const realRate = current.fedFunds - inflationRate

    // Yield spread (T10Y3M) - this IS the drag component
    // Negative spread = yield curve inversion = higher drag/friction
    // This aligns with OOS tests which use yieldSpread directly for Fed comparison
    const yieldSpread = current.yieldSpread ?? 0

    // Drag = negative of yield spread (inverted curve = positive drag)
    // When yield curve inverts (negative spread), drag increases
    const drag = -yieldSpread

    rawComponents.push({
      date: current.date,
      thrust: investmentGrowth,
      efficiency,
      slack,
      drag,
      yieldSpread,
      inflationRate,
      realRate,
    })
  }

  if (rawComponents.length === 0) return []

  // Calculate min/max for normalization
  const thrustValues = rawComponents.map((c) => c.thrust)
  const efficiencyValues = rawComponents.map((c) => c.efficiency)
  const slackValues = rawComponents.map((c) => c.slack)
  const dragValues = rawComponents.map((c) => c.drag)

  const thrustMin = Math.min(...thrustValues)
  const thrustMax = Math.max(...thrustValues)
  const efficiencyMin = Math.min(...efficiencyValues)
  const efficiencyMax = Math.max(...efficiencyValues)
  const slackMin = Math.min(...slackValues)
  const slackMax = Math.max(...slackValues)
  const dragMin = Math.min(...dragValues)
  const dragMax = Math.max(...dragValues)

  // Calculate NIV for each point
  for (const comp of rawComponents) {
    // Normalize to 0-1 range
    const normThrust = normalize(comp.thrust, thrustMin, thrustMax)
    const normEfficiency = normalize(comp.efficiency, efficiencyMin, efficiencyMax)
    const normSlack = normalize(comp.slack, slackMin, slackMax)
    const normDrag = normalize(comp.drag, dragMin, dragMax)

    // Apply weights
    const { weights, eta } = params
    const weightedThrust = weights.thrust * normThrust
    const weightedEfficiency = weights.efficiency * normEfficiency
    const weightedSlack = weights.slack * normSlack
    const weightedDrag = weights.drag * normDrag

    // NIV Formula: (Thrust × Efficiency²) / (Slack + Drag)^η
    const numerator = weightedThrust * Math.pow(weightedEfficiency, 2)
    const denominator = Math.pow(weightedSlack + weightedDrag + 0.01, eta) // 0.01 to avoid div by zero

    const niv = numerator / denominator

    // Convert NIV to recession probability (inverse relationship)
    // Lower NIV = higher recession probability
    // This is a simplified sigmoid transformation
    const probability = 1 / (1 + Math.exp(niv * 2 - 1)) * 100

    // Log detailed calculation for this data point
    logNIVCalculation(
      weightedThrust,
      weightedEfficiency,
      weightedSlack,
      weightedDrag,
      eta,
      niv,
      'NIV-Calculator'
    )

    results.push({
      date: comp.date,
      thrust: comp.thrust,
      efficiency: comp.efficiency,
      slack: comp.slack,
      drag: comp.drag,
      yieldSpread: comp.yieldSpread,
      inflationRate: comp.inflationRate,
      realRate: comp.realRate,
      niv,
      probability,
      isRecession: false, // Will be filled from USREC data
    })
  }

  // Apply smoothing if window > 1
  if (params.smoothWindow > 1 && results.length > params.smoothWindow) {
    const smoothed = [...results]
    for (let i = params.smoothWindow - 1; i < results.length; i++) {
      let sum = 0
      for (let j = 0; j < params.smoothWindow; j++) {
        sum += results[i - j].probability
      }
      smoothed[i].probability = sum / params.smoothWindow
    }
    return smoothed
  }

  return results
}

/**
 * Mark recession periods from USREC data
 */
export function markRecessions(
  nivData: NIVDataPoint[],
  recessionData: FREDObservation[]
): NIVDataPoint[] {
  const recessionLookup = new Map<string, boolean>()
  recessionData.forEach((obs) => {
    const monthKey = obs.date.substring(0, 7)
    recessionLookup.set(monthKey, parseValue(obs.value) === 1)
  })

  return nivData.map((point) => ({
    ...point,
    isRecession: recessionLookup.get(point.date.substring(0, 7)) ?? false,
  }))
}

/**
 * Validate FRED API key using our proxy
 */
export async function validateFREDApiKey(apiKey: string): Promise<boolean> {
  // Basic format validation - FRED API keys are 32 character alphanumeric strings
  if (!apiKey || apiKey.length < 16) {
    return false
  }

  try {
    // Use our proxy to validate (fetch series metadata)
    const proxyUrl = new URL(getProxyUrl(), typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')
    proxyUrl.searchParams.set('series_id', 'GDP')
    proxyUrl.searchParams.set('api_key', apiKey)
    // Don't set endpoint - this will use /series for metadata validation

    const response = await fetch(proxyUrl.toString())

    // If we get a response, check if it's valid
    if (response.ok) {
      const data = await response.json()
      // Check if FRED returned an error in the response body
      if (data.error_code || data.error_message || data.error) {
        console.log('FRED validation returned error:', data)
        return false
      }
      return true
    }

    // Check for specific error codes
    if (response.status === 400 || response.status === 401 || response.status === 403) {
      return false
    }

    // For other errors, assume valid and let actual fetch verify
    return true
  } catch (error) {
    // Network error - assume valid, will be verified on actual use
    console.log('FRED validation request failed, assuming valid:', error)
    return true
  }
}

/**
 * Full NIV calculation pipeline
 */
export async function calculateNIVFromFRED(
  apiKey: string,
  startDate: string,
  endDate: string,
  params: {
    eta: number
    weights: { thrust: number; efficiency: number; slack: number; drag: number }
    smoothWindow: number
  },
  onProgress?: (status: string, progress: number) => void
): Promise<NIVDataPoint[]> {
  const pipelineStartTime = performance.now()

  auditLog.logSystem(
    'NIV calculation pipeline started',
    'INFO',
    {
      startDate,
      endDate,
      params: {
        eta: params.eta,
        weights: params.weights,
        smoothWindow: params.smoothWindow,
      },
    },
    'NIV-Pipeline'
  )

  onProgress?.('Fetching FRED data...', 0)

  // Fetch all series
  const seriesData = await fetchAllFREDData(apiKey, startDate, endDate, (series, progress) => {
    onProgress?.(`Fetching ${series}...`, progress * 0.6)
  })

  auditLog.logSystem(
    'FRED data fetch complete',
    'INFO',
    {
      seriesCount: seriesData.size,
      series: Array.from(seriesData.keys()),
    },
    'NIV-Pipeline'
  )

  onProgress?.('Processing data...', 60)

  // Merge series
  const mergedData = mergeSeriesData(seriesData)

  auditLog.logCalculation(
    'Data series merged',
    {
      formula: 'merge(GPDIC1, M2SL, FEDFUNDS, GDPC1, TCU, T10Y3M, CPIAUCSL)',
      inputs: {
        seriesCount: seriesData.size,
      },
      output: mergedData.length,
    },
    'INFO',
    'NIV-Pipeline'
  )

  onProgress?.('Calculating NIV...', 80)

  // Calculate NIV
  let nivData = calculateNIVComponents(mergedData, params)

  // Mark recessions
  const recessionObs = seriesData.get('RECESSION') || []
  nivData = markRecessions(nivData, recessionObs)

  const pipelineDuration = performance.now() - pipelineStartTime

  auditLog.logSystem(
    'NIV calculation pipeline complete',
    'INFO',
    {
      dataPoints: nivData.length,
      dateRange: nivData.length > 0 ? {
        first: nivData[0].date,
        last: nivData[nivData.length - 1].date,
      } : null,
      duration: `${pipelineDuration.toFixed(2)}ms`,
      recessionPeriods: nivData.filter(d => d.isRecession).length,
    },
    'NIV-Pipeline'
  )

  onProgress?.('Complete', 100)

  return nivData
}
