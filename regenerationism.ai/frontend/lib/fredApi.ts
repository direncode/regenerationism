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

// FRED API base URL
const FRED_API_BASE = 'https://api.stlouisfed.org/fred'

/**
 * Fetch a single FRED series
 */
async function fetchFREDSeries(
  seriesId: string,
  apiKey: string,
  startDate: string,
  endDate: string
): Promise<FREDObservation[]> {
  const url = new URL(`${FRED_API_BASE}/series/observations`)
  url.searchParams.set('series_id', seriesId)
  url.searchParams.set('api_key', apiKey)
  url.searchParams.set('file_type', 'json')
  url.searchParams.set('observation_start', startDate)
  url.searchParams.set('observation_end', endDate)
  url.searchParams.set('frequency', 'm') // Monthly frequency

  const response = await fetch(url.toString())

  if (!response.ok) {
    throw new Error(`FRED API error for ${seriesId}: ${response.statusText}`)
  }

  const data: FREDSeriesResponse = await response.json()
  return data.observations
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

  for (let i = 0; i < seriesList.length; i++) {
    const [name, seriesId] = seriesList[i]
    onProgress?.(name, (i / seriesList.length) * 100)

    try {
      const data = await fetchFREDSeries(seriesId, apiKey, startDate, endDate)
      results.set(name, data)
    } catch (error) {
      console.error(`Failed to fetch ${seriesId}:`, error)
      results.set(name, [])
    }
  }

  onProgress?.('Complete', 100)
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

    // Drag: Combination of interest rates and inflation
    const inflationRate = calculateYoYChange(current.cpi, yearAgo.cpi)
    const realRate = current.fedFunds - inflationRate

    // Drag increases with higher real rates and yield curve inversion
    const yieldCurveDrag = current.yieldSpread !== null
      ? Math.max(0, -current.yieldSpread) // Negative spread = inversion = drag
      : 0

    const drag = Math.max(0, realRate) + yieldCurveDrag + inflationRate * 0.3

    rawComponents.push({
      date: current.date,
      thrust: investmentGrowth,
      efficiency,
      slack,
      drag,
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

    results.push({
      date: comp.date,
      thrust: comp.thrust,
      efficiency: comp.efficiency,
      slack: comp.slack,
      drag: comp.drag,
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
 * Validate FRED API key
 */
export async function validateFREDApiKey(apiKey: string): Promise<boolean> {
  try {
    const url = new URL(`${FRED_API_BASE}/series`)
    url.searchParams.set('series_id', 'GDP')
    url.searchParams.set('api_key', apiKey)
    url.searchParams.set('file_type', 'json')

    const response = await fetch(url.toString())
    return response.ok
  } catch {
    return false
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
  onProgress?.('Fetching FRED data...', 0)

  // Fetch all series
  const seriesData = await fetchAllFREDData(apiKey, startDate, endDate, (series, progress) => {
    onProgress?.(`Fetching ${series}...`, progress * 0.6)
  })

  onProgress?.('Processing data...', 60)

  // Merge series
  const mergedData = mergeSeriesData(seriesData)

  onProgress?.('Calculating NIV...', 80)

  // Calculate NIV
  let nivData = calculateNIVComponents(mergedData, params)

  // Mark recessions
  const recessionObs = seriesData.get('RECESSION') || []
  nivData = markRecessions(nivData, recessionObs)

  onProgress?.('Complete', 100)

  return nivData
}
