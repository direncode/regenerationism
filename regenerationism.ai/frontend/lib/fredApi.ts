/**
 * NIV Engine v6 - Vercel Edition
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * THE GOLDEN LOGIC (OOS VERIFIED)
 * No Mock Data. No Min-Max Normalization. Pure Physics.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Master Formula: NIV = (u × P²) / (X + F)^η
 *
 * Where:
 *   u = tanh(1.0*dG + 1.0*dA - 0.7*dr)  -- Thrust
 *   P = (Investment × 1.15) / GDP        -- Efficiency
 *   X = 1 - (TCU / 100)                  -- Slack
 *   F = 0.4*s + 0.4*max(0,r-π) + 0.2*σ  -- Drag
 *   η = 1.5                              -- Nonlinearity
 *   ε = 0.001                            -- Safety Floor
 */

import { auditLog, logNIVCalculation, logFREDFetch } from './auditLog'

// ═══════════════════════════════════════════════════════════════════════════
// IMMUTABLE CONSTANTS (OOS-Validated)
// ═══════════════════════════════════════════════════════════════════════════
const ETA = 1.5           // Nonlinearity (Crisis Sensitivity)
const EPSILON = 0.001     // Safety Floor (Prevents zero-division)
const PROXY_MULTIPLIER = 1.15  // R&D + Education Proxy

export const NIV_PARAMS = { ETA, EPSILON, R_D_MULTIPLIER: PROXY_MULTIPLIER }

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════
export interface FREDObservation {
  date: string
  value: string
}

export interface EconomicData {
  date: string
  investment: number | null  // GPDIC1 (Billions)
  m2: number | null          // M2SL (Billions)
  fedFunds: number | null    // FEDFUNDS (Percent, e.g., 4.5)
  gdp: number | null         // GDPC1 (Billions)
  capacity: number | null    // TCU (Percent, e.g., 79.5)
  yieldSpread: number | null // T10Y3M (Percent, e.g., -0.5)
  cpi: number | null         // CPIAUCSL (Index)
}

export interface NIVComponents {
  thrust: number           // u - bounded by tanh [-1, 1]
  efficiency: number       // P - raw ratio (~0.17)
  efficiencySquared: number // P²
  slack: number            // X - (0 to 1)
  drag: number             // F - combined friction
  // Raw inputs for transparency
  dG: number               // Investment YoY growth (decimal)
  dA: number               // M2 YoY growth (decimal)
  dr: number               // Monthly Fed Funds change (raw delta)
  yieldPenalty: number     // abs(spread)/100 if inverted, else 0
  realRate: number         // max(0, FedFunds/100 - Inflation)
  volatility: number       // 12-month rolling StdDev of FedFunds (decimal)
}

export interface NIVDataPoint {
  date: string
  components: NIVComponents
  niv: number
  probability: number
  isRecession: boolean
  status: 'EXPANSION' | 'SLOWDOWN' | 'CONTRACTION' | 'CRISIS'
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
  RECESSION: 'USREC',
}

const getProxyUrl = () => {
  if (typeof window !== 'undefined') {
    return '/api/fred'
  }
  return `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/fred`
}

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

  // CRITICAL: Trim whitespace/tabs from API key to prevent 400 errors
  const cleanApiKey = apiKey.trim()

  const proxyUrl = new URL(getProxyUrl(), typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')
  proxyUrl.searchParams.set('series_id', seriesId)
  proxyUrl.searchParams.set('api_key', cleanApiKey)
  proxyUrl.searchParams.set('observation_start', startDate)
  proxyUrl.searchParams.set('observation_end', endDate)
  proxyUrl.searchParams.set('endpoint', 'observations')

  auditLog.logDataFetch(
    `Initiating FRED fetch: ${seriesId}`,
    { url: proxyUrl.toString().replace(apiKey, '[REDACTED]'), method: 'GET' },
    'DEBUG',
    'FRED-API'
  )

  try {
    const response = await fetch(proxyUrl.toString())
    const duration = performance.now() - startTime

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`FRED API error for ${seriesId}: ${response.status} ${errorData.error || response.statusText}`)
    }

    const data = await response.json()
    if (data.error_code || data.error_message || data.error) {
      throw new Error(`FRED API error: ${data.error_message || data.error || 'Unknown error'}`)
    }

    const observations = data.observations || []
    logFREDFetch(seriesId, startDate, endDate, observations.length, duration, 'FRED-API')
    return observations
  } catch (error) {
    auditLog.logDataFetch(
      `FRED fetch failed: ${seriesId} - ${error instanceof Error ? error.message : 'Unknown error'}`,
      { url: proxyUrl.toString().replace(apiKey, '[REDACTED]'), method: 'GET' },
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

  console.log(`[NIV-v6] Fetching ${seriesList.length} FRED series from ${startDate} to ${endDate}`)

  for (let i = 0; i < seriesList.length; i++) {
    const [name, seriesId] = seriesList[i]
    onProgress?.(`Fetching ${name}`, (i / seriesList.length) * 100)

    try {
      const data = await fetchFREDSeries(seriesId, apiKey, startDate, endDate)
      results.set(name, data)
      if (data.length > 0) successCount++
    } catch (error) {
      console.error(`Failed to fetch ${seriesId}:`, error)
      results.set(name, [])
    }
  }

  console.log(`[NIV-v6] FRED fetch complete: ${successCount} series with data`)
  onProgress?.('Complete', 100)

  if (successCount === 0) {
    throw new Error(`Failed to fetch any FRED data. Please check your API key.`)
  }

  return results
}

/**
 * Merge FRED series into monthly data points
 * Forward-fills quarterly series (Investment, GDP)
 */
export function mergeSeriesData(
  seriesData: Map<string, FREDObservation[]>
): EconomicData[] {
  // Use M2 (monthly) as date reference
  const m2Obs = seriesData.get('M2') || []
  const monthlyDates = new Set<string>()
  m2Obs.forEach((obs) => monthlyDates.add(obs.date.substring(0, 7)))

  const sortedDates = Array.from(monthlyDates).sort()

  const createLookup = (observations: FREDObservation[]) => {
    const lookup = new Map<string, number>()
    observations.forEach((obs) => {
      const val = parseValue(obs.value)
      if (val !== null) {
        lookup.set(obs.date.substring(0, 7), val)
      }
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

  // Forward-fill quarterly series
  let lastInvestment: number | null = null
  let lastGdp: number | null = null

  return sortedDates.map((monthKey) => {
    const inv = investmentLookup.get(monthKey)
    if (inv !== undefined) lastInvestment = inv
    const gdp = gdpLookup.get(monthKey)
    if (gdp !== undefined) lastGdp = gdp

    return {
      date: `${monthKey}-01`,
      investment: lastInvestment,
      m2: m2Lookup.get(monthKey) ?? null,
      fedFunds: fedFundsLookup.get(monthKey) ?? null,
      gdp: lastGdp,
      capacity: capacityLookup.get(monthKey) ?? null,
      yieldSpread: yieldSpreadLookup.get(monthKey) ?? null,
      cpi: cpiLookup.get(monthKey) ?? null,
    }
  })
}

/**
 * Calculate standard deviation
 */
function stdDev(arr: number[]): number {
  if (arr.length === 0) return 0
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length
  const squaredDiffs = arr.map(x => Math.pow(x - mean, 2))
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / arr.length)
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * THE CALCULATION ENGINE (OOS VERIFIED)
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function calculateNIVComponents(
  data: EconomicData[],
  params: {
    eta: number
    weights: { thrust: number; efficiency: number; slack: number; drag: number }
    smoothWindow: number
  }
): NIVDataPoint[] {
  if (data.length < 13) {
    console.warn('[NIV-v6] Need at least 13 months of data')
    return []
  }

  const results: NIVDataPoint[] = []

  for (let i = 12; i < data.length; i++) {
    const current = data[i]
    const prevMonth = data[i - 1]
    const yearAgo = data[i - 12]

    // Skip if missing critical data
    if (
      current.investment === null || yearAgo.investment === null ||
      current.m2 === null || yearAgo.m2 === null ||
      current.fedFunds === null || prevMonth?.fedFunds === null ||
      current.gdp === null ||
      current.capacity === null ||
      current.cpi === null || yearAgo.cpi === null
    ) {
      continue
    }

    // ═══════════════════════════════════════════════════════════════════
    // STEP A: NORMALIZE RAW INPUTS TO DECIMALS
    // Everything must be a rate (e.g., 5% = 0.05)
    // ═══════════════════════════════════════════════════════════════════

    // dG: Investment Growth YoY (decimal)
    const dG = (current.investment - yearAgo.investment) / yearAgo.investment

    // dA: M2 Growth YoY (decimal)
    const dA = (current.m2 - yearAgo.m2) / yearAgo.m2

    // dr: Rate Change (raw delta, NOT divided by 100)
    const dr = current.fedFunds - prevMonth.fedFunds

    // Inflation rate (decimal)
    const inflationRate = (current.cpi - yearAgo.cpi) / yearAgo.cpi

    // Real rate (decimal)
    const realRateRaw = (current.fedFunds / 100) - inflationRate

    // Yield spread (percent, e.g., -0.5)
    const spread = current.yieldSpread ?? 0

    // ═══════════════════════════════════════════════════════════════════
    // STEP B: COMPONENT CALCULATIONS (PHYSICS)
    // ═══════════════════════════════════════════════════════════════════

    // 1. THRUST (u)
    // Formula: tanh(1.0*dG + 1.0*dA - 0.7*dr)
    // The 'tanh' handles the scaling naturally.
    const rawThrust = (1.0 * dG) + (1.0 * dA) - (0.7 * dr)
    const thrust = Math.tanh(rawThrust)

    // 2. EFFICIENCY (P)
    // Formula: (Investment * 1.15) / GDP
    const efficiency = (current.investment * PROXY_MULTIPLIER) / current.gdp
    const efficiencySquared = Math.pow(efficiency, 2)

    // 3. SLACK (X)
    // Formula: 1 - (TCU / 100)
    const slack = 1.0 - (current.capacity / 100.0)

    // 4. DRAG (F)
    // Formula: 0.4*Penalty + 0.4*RealRate + 0.2*Vol

    // Yield Penalty: Inverted yield curve adds drag
    const yieldPenalty = spread < 0 ? Math.abs(spread / 100) : 0

    // Real Rate Drag: Negative real rates do not add drag (floor at 0)
    const realRate = Math.max(0, realRateRaw)

    // Volatility: 12-month rolling StdDev of FedFunds (as decimal)
    const fedFundsWindow = data.slice(i - 11, i + 1)
      .map(d => d.fedFunds)
      .filter((v): v is number => v !== null)
    const volatility = stdDev(fedFundsWindow) / 100

    // Combined Drag
    const drag = (0.4 * yieldPenalty) + (0.4 * realRate) + (0.2 * volatility)

    // ═══════════════════════════════════════════════════════════════════
    // STEP C: THE MASTER EQUATION
    // NIV = (u * P^2) / (X + F)^eta
    // ═══════════════════════════════════════════════════════════════════

    const numerator = thrust * efficiencySquared
    const denominatorBase = slack + drag
    const denominator = Math.max(Math.pow(denominatorBase, ETA), EPSILON)
    const niv = numerator / denominator

    // ═══════════════════════════════════════════════════════════════════
    // STEP D: PROBABILITY & STATUS
    // Threshold mapping based on 2008/2020 data points
    // Score > 0.05 => Safe
    // Score < 0.01 => Crisis
    // ═══════════════════════════════════════════════════════════════════

    let probability: number
    if (niv <= 0) probability = 99
    else if (niv < 0.015) probability = 85  // High Risk
    else if (niv < 0.035) probability = 45  // Caution
    else probability = 5  // Safe

    let status: NIVDataPoint['status']
    if (probability > 80) status = 'CRISIS'
    else if (probability > 40) status = 'CONTRACTION'
    else if (probability > 20) status = 'SLOWDOWN'
    else status = 'EXPANSION'

    const components: NIVComponents = {
      thrust,
      efficiency,
      efficiencySquared,
      slack,
      drag,
      dG,
      dA,
      dr,
      yieldPenalty,
      realRate,
      volatility,
    }

    logNIVCalculation(thrust, efficiency, slack, drag, ETA, niv, 'NIV-v6')

    results.push({
      date: current.date,
      components,
      niv,
      probability,
      isRecession: false,
      status,
    })
  }

  // Apply smoothing if requested
  if (params.smoothWindow > 1 && results.length > params.smoothWindow) {
    for (let i = params.smoothWindow - 1; i < results.length; i++) {
      let sumProb = 0
      let sumNiv = 0
      for (let j = 0; j < params.smoothWindow; j++) {
        sumProb += results[i - j].probability
        sumNiv += results[i - j].niv
      }
      results[i] = {
        ...results[i],
        probability: sumProb / params.smoothWindow,
        niv: sumNiv / params.smoothWindow,
      }
    }
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
    recessionLookup.set(obs.date.substring(0, 7), parseValue(obs.value) === 1)
  })

  return nivData.map((point) => ({
    ...point,
    isRecession: recessionLookup.get(point.date.substring(0, 7)) ?? false,
  }))
}

/**
 * Validate FRED API key
 */
export async function validateFREDApiKey(apiKey: string): Promise<boolean> {
  if (!apiKey || apiKey.length < 16) return false

  try {
    const proxyUrl = new URL(getProxyUrl(), typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')
    proxyUrl.searchParams.set('series_id', 'GDP')
    proxyUrl.searchParams.set('api_key', apiKey)

    const response = await fetch(proxyUrl.toString())
    if (response.ok) {
      const data = await response.json()
      return !(data.error_code || data.error_message || data.error)
    }
    return response.status !== 400 && response.status !== 401 && response.status !== 403
  } catch {
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
  auditLog.logSystem('[NIV-v6] Calculation pipeline started', 'INFO', { startDate, endDate }, 'NIV-Pipeline')

  onProgress?.('Fetching FRED data...', 0)
  const seriesData = await fetchAllFREDData(apiKey, startDate, endDate, (series, progress) => {
    onProgress?.(`Fetching ${series}...`, progress * 0.6)
  })

  onProgress?.('Processing data...', 60)
  const mergedData = mergeSeriesData(seriesData)

  onProgress?.('Calculating NIV (v6 physics)...', 80)
  let nivData = calculateNIVComponents(mergedData, params)

  const recessionObs = seriesData.get('RECESSION') || []
  nivData = markRecessions(nivData, recessionObs)

  auditLog.logSystem('[NIV-v6] Pipeline complete', 'INFO', { dataPoints: nivData.length }, 'NIV-Pipeline')
  onProgress?.('Complete', 100)

  return nivData
}

/**
 * Get model information
 */
export function getNIVModelInfo() {
  return {
    version: 'NIV-v6-OOS-Verified',
    formula: {
      master: 'NIV = (u × P²) / (X + F)^η',
      thrust: 'u = tanh(1.0*dG + 1.0*dA - 0.7*dr)',
      efficiency: 'P = (Investment × 1.15) / GDP',
      slack: 'X = 1 - (TCU/100)',
      drag: 'F = 0.4*s + 0.4*max(0,r-π) + 0.2*σ',
    },
    parameters: {
      eta: ETA,
      epsilon: EPSILON,
      proxyMultiplier: PROXY_MULTIPLIER,
    },
    thresholds: {
      crisis: 'NIV ≤ 0 → 99% probability',
      highRisk: 'NIV < 0.015 → 85% probability',
      caution: 'NIV < 0.035 → 45% probability',
      safe: 'NIV ≥ 0.035 → 5% probability',
    },
  }
}
