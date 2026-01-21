/**
 * @regenerationism/third-order-sdk
 *
 * Third-Order Accounting SDK for NIV economic analysis.
 * Provides both local computation and API client for regenerationism.ai.
 *
 * Third-Order Accounting is a forward-looking meta-layer that applies
 * exponential compounding and risk-adjusted growth forecasting on top
 * of the NIV (National Impact Velocity) time-series.
 *
 * Mathematical Foundation:
 * - First-order:  NIVₜ = current regeneration velocity
 * - Second-order: dNIV/dt = acceleration/deceleration
 * - Third-order:  Cₕ = NIV₀ × e^(rₕ×h) × (1 − ρₕ)
 *
 * @packageDocumentation
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * A single data point in the NIV time series
 */
export interface NIVDataPoint {
  /** Date in ISO format (YYYY-MM-DD) */
  date: string
  /** National Impact Velocity value */
  niv: number
  /** Policy/liquidity impulse driving acceleration */
  thrust: number
  /** Capital productivity (investment productivity relative to GDP) */
  efficiency: number
  /** Unused economic headroom (1 - capacity utilization) */
  slack: number
  /** Systemic friction (yield curve penalty + real rates + volatility) */
  drag: number
  /** Optional: whether this period is a recession */
  isRecession?: boolean
}

/**
 * Parameters for third-order computation
 */
export interface ThirdOrderParams {
  /** Efficiency multiplier for compounding rate (default: 1.1) */
  alpha: number
  /** Friction penalty for compounding rate (default: 0.8) */
  beta: number
  /** Drag sensitivity for collapse probability (default: 3.5) */
  gamma: number
  /** Tipping threshold for collapse probability (default: 0.15) */
  theta: number
  /** Lookback window in months (default: 6) */
  lookbackMonths: number
  /** Forecast horizon in years (default: 5) */
  horizonYears: number
  /** Number of Monte Carlo iterations (default: 1000) */
  iterations: number
  /** Volatility multiplier for stochastic shocks (default: 1.0) */
  volatilityMultiplier: number
}

/**
 * Result of third-order computation
 */
export interface ThirdOrderResult {
  /** Current NIV velocity (first-order) */
  currentNIV: number
  /** Average NIV over lookback window */
  avgNIV: number
  /** dNIV/dt acceleration (second-order) */
  acceleration: number
  /** Direction of acceleration */
  accelerationTrend: 'accelerating' | 'decelerating' | 'stable'
  /** Effective compounding rate rₕ */
  effectiveRate: number
  /** Collapse probability ρₕ (0-1) */
  collapseProb: number
  /** Cumulative regeneration Cₕ (third-order) */
  cumulativeRegeneration: number
  /** Risk classification */
  riskLevel: 'low' | 'moderate' | 'elevated' | 'high' | 'critical'
  /** Monte Carlo confidence bands */
  confidenceBands: {
    lower5: number
    lower25: number
    median: number
    upper75: number
    upper95: number
  }
  /** Average drag over lookback window */
  avgDrag: number
  /** NIV volatility (standard deviation) */
  volatility: number
}

/**
 * Forecast path at a specific horizon
 */
export interface ForecastPath {
  /** Years from now */
  horizon: number
  /** Projected date */
  date: string
  /** Median projection */
  median: number
  /** 5th percentile (pessimistic) */
  lower5: number
  /** 95th percentile (optimistic) */
  upper95: number
  /** 25th percentile */
  lower25: number
  /** 75th percentile */
  upper75: number
  /** Collapse probability at this horizon */
  collapseProb: number
  /** Risk level at this horizon */
  riskLevel: string
}

/**
 * Risk heatmap cell
 */
export interface RiskHeatmapCell {
  horizonYear: number
  thrustLevel: number
  dragLevel: number
  cumulativeRegen: number
  collapseProb: number
  color: string
}

/**
 * Scenario definition for what-if analysis
 */
export interface ScenarioInput {
  /** Scenario name */
  name: string
  /** Scenario description */
  description: string
  /** Thrust shock as percentage change */
  thrustShock: number
  /** Drag shock as percentage change */
  dragShock: number
  /** Efficiency shock as percentage change */
  efficiencyShock: number
  /** Duration of shock in months */
  duration: number
}

/**
 * Result of scenario analysis
 */
export interface ScenarioResult {
  scenario: ScenarioInput
  baseline: ForecastPath[]
  shocked: ForecastPath[]
  /** Percentage change in final Cₕ */
  impactDelta: number
  /** Change in collapse probability */
  riskDelta: number
}

/**
 * API response structure
 */
export interface ThirdOrderAPIResponse {
  success: boolean
  result: ThirdOrderResult
  forecastPaths?: ForecastPath[]
  heatmap?: RiskHeatmapCell[]
  scenarioResults?: ScenarioResult[]
  meta: {
    dataPoints: number
    computedAt: string
    paramsUsed: ThirdOrderParams
    version: string
    computeTimeMs?: number
    requestId?: string
  }
}

// ============================================================================
// DEFAULT PARAMETERS
// ============================================================================

/**
 * Default parameters calibrated to historical economic data
 */
export const DEFAULT_PARAMS: ThirdOrderParams = {
  alpha: 1.1,
  beta: 0.8,
  gamma: 3.5,
  theta: 0.15,
  lookbackMonths: 6,
  horizonYears: 5,
  iterations: 1000,
  volatilityMultiplier: 1.0
}

/**
 * Preset scenarios for common economic situations
 */
export const PRESET_SCENARIOS: ScenarioInput[] = [
  {
    name: 'Fiscal Stimulus',
    description: '+10% government spending impulse for 12 months',
    thrustShock: 15,
    dragShock: -5,
    efficiencyShock: 0,
    duration: 12
  },
  {
    name: 'Monetary Tightening',
    description: 'Fed raises rates aggressively, +20% drag',
    thrustShock: -10,
    dragShock: 25,
    efficiencyShock: -5,
    duration: 18
  },
  {
    name: 'Productivity Boom',
    description: 'AI/Tech breakthrough increases efficiency +15%',
    thrustShock: 5,
    dragShock: -10,
    efficiencyShock: 15,
    duration: 24
  },
  {
    name: 'Supply Chain Crisis',
    description: 'Global disruption: drag +30%, efficiency -10%',
    thrustShock: -5,
    dragShock: 30,
    efficiencyShock: -10,
    duration: 12
  },
  {
    name: 'Stagflation',
    description: 'High inflation + low growth: drag +20%, thrust -15%',
    thrustShock: -15,
    dragShock: 20,
    efficiencyShock: -5,
    duration: 24
  },
  {
    name: 'Financial Crisis',
    description: '2008-style collapse: all metrics deteriorate',
    thrustShock: -25,
    dragShock: 40,
    efficiencyShock: -20,
    duration: 18
  },
  {
    name: 'Labor Liberation',
    description: 'Full employment policy: thrust +20%, drag -15%',
    thrustShock: 20,
    dragShock: -15,
    efficiencyShock: 5,
    duration: 24
  }
]

// ============================================================================
// CORE COMPUTATION FUNCTIONS
// ============================================================================

/**
 * Logistic function for collapse probability
 * Maps accumulated drag to probability space [0, 1]
 *
 * @param avgDrag - Average drag over lookback window
 * @param gamma - Drag sensitivity parameter
 * @param theta - Tipping threshold parameter
 * @returns Collapse probability between 0 and 1
 */
export function logisticCollapse(avgDrag: number, gamma: number, theta: number): number {
  const x = gamma * avgDrag - theta
  return 1 / (1 + Math.exp(-x))
}

/**
 * Compute effective compounding rate
 * rₕ = α × (avg NIV) − β × (avg Drag)
 *
 * @param avgNIV - Average NIV over lookback window
 * @param avgDrag - Average drag over lookback window
 * @param alpha - Efficiency multiplier
 * @param beta - Friction penalty
 * @returns Effective compounding rate
 */
export function computeEffectiveRate(
  avgNIV: number,
  avgDrag: number,
  alpha: number,
  beta: number
): number {
  return alpha * avgNIV - beta * avgDrag
}

/**
 * Compute cumulative regeneration at horizon h
 * Cₕ = NIV₀ × e^(rₕ×h) × (1 − ρₕ)
 *
 * @param niv0 - Baseline NIV velocity
 * @param effectiveRate - Compounding rate rₕ
 * @param horizonYears - Forecast horizon in years
 * @param collapseProb - Collapse probability ρₕ
 * @returns Cumulative regenerated capital
 */
export function computeCumulativeRegeneration(
  niv0: number,
  effectiveRate: number,
  horizonYears: number,
  collapseProb: number
): number {
  const exponentialGrowth = niv0 * Math.exp(effectiveRate * horizonYears)
  const riskAdjusted = exponentialGrowth * (1 - collapseProb)
  return riskAdjusted
}

/**
 * Compute second-order acceleration (dNIV/dt)
 * Uses finite difference on recent data points
 *
 * @param nivSeries - Array of NIV values
 * @returns Acceleration value
 */
export function computeAcceleration(nivSeries: number[]): number {
  if (nivSeries.length < 3) return 0

  const recent = nivSeries.slice(-3)
  const v1 = recent[1] - recent[0]
  const v2 = recent[2] - recent[1]
  return v2 - v1
}

/**
 * Determine acceleration trend
 *
 * @param acceleration - Computed acceleration value
 * @param threshold - Threshold for stability (default: 0.001)
 * @returns Trend classification
 */
export function getAccelerationTrend(
  acceleration: number,
  threshold: number = 0.001
): 'accelerating' | 'decelerating' | 'stable' {
  if (acceleration > threshold) return 'accelerating'
  if (acceleration < -threshold) return 'decelerating'
  return 'stable'
}

/**
 * Map collapse probability to risk level
 *
 * @param collapseProb - Collapse probability (0-1)
 * @returns Risk level classification
 */
export function getRiskLevel(
  collapseProb: number
): 'low' | 'moderate' | 'elevated' | 'high' | 'critical' {
  if (collapseProb < 0.1) return 'low'
  if (collapseProb < 0.25) return 'moderate'
  if (collapseProb < 0.5) return 'elevated'
  if (collapseProb < 0.75) return 'high'
  return 'critical'
}

/**
 * Get color for risk visualization
 *
 * @param collapseProb - Collapse probability
 * @param cumulativeRegen - Cumulative regeneration value
 * @returns Hex color string
 */
export function getRiskColor(collapseProb: number, cumulativeRegen: number): string {
  if (collapseProb >= 0.75 || cumulativeRegen < 0) return '#dc2626'
  if (collapseProb >= 0.5) return '#f97316'
  if (collapseProb >= 0.25) return '#eab308'
  if (cumulativeRegen > 0.1) return '#22c55e'
  return '#84cc16'
}

// ============================================================================
// MONTE CARLO SIMULATION
// ============================================================================

/**
 * Box-Muller transform for generating normal random numbers
 */
function randomNormal(mean: number = 0, stdDev: number = 1): number {
  const u1 = Math.random()
  const u2 = Math.random()
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  return mean + z * stdDev
}

/**
 * Run Monte Carlo simulation for third-order forecasting
 *
 * @param data - NIV time series data
 * @param params - Computation parameters
 * @returns Array of simulated paths
 */
export function runMonteCarloSimulation(
  data: NIVDataPoint[],
  params: ThirdOrderParams
): { pathId: number; finalValue: number; isCollapse: boolean }[] {
  const { alpha, beta, gamma, theta, lookbackMonths, horizonYears, iterations, volatilityMultiplier } = params

  const recentData = data.slice(-lookbackMonths)
  const nivSeries = recentData.map(d => d.niv)
  const dragSeries = recentData.map(d => d.drag)

  const avgNIV = nivSeries.reduce((a, b) => a + b, 0) / nivSeries.length
  const avgDrag = dragSeries.reduce((a, b) => a + b, 0) / dragSeries.length

  const nivStdDev = Math.sqrt(
    nivSeries.reduce((sum, v) => sum + Math.pow(v - avgNIV, 2), 0) / nivSeries.length
  )
  const dragStdDev = Math.sqrt(
    dragSeries.reduce((sum, v) => sum + Math.pow(v - avgDrag, 2), 0) / dragSeries.length
  )

  const paths: { pathId: number; finalValue: number; isCollapse: boolean }[] = []
  const stepsPerYear = 12
  const totalSteps = horizonYears * stepsPerYear

  for (let i = 0; i < iterations; i++) {
    let currentNIV = avgNIV
    let currentDrag = avgDrag
    let isCollapse = false

    for (let t = 0; t < totalSteps; t++) {
      const nivShock = randomNormal(0, nivStdDev * volatilityMultiplier * 0.1)
      const dragShock = randomNormal(0, dragStdDev * volatilityMultiplier * 0.1)

      currentNIV = Math.max(-0.5, currentNIV + nivShock)
      currentDrag = Math.max(0, currentDrag + dragShock)

      const collapseProb = logisticCollapse(currentDrag, gamma, theta)
      if (Math.random() < collapseProb / totalSteps) {
        isCollapse = true
        currentNIV *= 0.3
      }
    }

    const effectiveRate = computeEffectiveRate(currentNIV, currentDrag, alpha, beta)
    const collapseProb = logisticCollapse(currentDrag, gamma, theta)
    const finalValue = computeCumulativeRegeneration(
      avgNIV,
      effectiveRate,
      horizonYears,
      isCollapse ? 0.8 : collapseProb
    )

    paths.push({ pathId: i, finalValue, isCollapse })
  }

  return paths
}

/**
 * Compute confidence bands from Monte Carlo results
 *
 * @param paths - Array of simulated paths
 * @returns Confidence band object
 */
export function computeConfidenceBands(
  paths: { finalValue: number }[]
): ThirdOrderResult['confidenceBands'] {
  const finalValues = paths.map(p => p.finalValue).sort((a, b) => a - b)
  const n = finalValues.length

  return {
    lower5: finalValues[Math.floor(n * 0.05)],
    lower25: finalValues[Math.floor(n * 0.25)],
    median: finalValues[Math.floor(n * 0.5)],
    upper75: finalValues[Math.floor(n * 0.75)],
    upper95: finalValues[Math.floor(n * 0.95)]
  }
}

// ============================================================================
// MAIN COMPUTATION FUNCTION
// ============================================================================

/**
 * Compute full third-order analysis from NIV time series
 *
 * @param data - NIV time series data
 * @param params - Computation parameters (uses defaults if not specified)
 * @returns Complete third-order result
 *
 * @example
 * ```typescript
 * import { computeThirdOrder, DEFAULT_PARAMS } from '@regenerationism/third-order-sdk'
 *
 * const data = [
 *   { date: '2024-01-01', niv: 0.045, thrust: 0.15, efficiency: 0.08, slack: 0.23, drag: 0.12 },
 *   // ... more data points
 * ]
 *
 * const result = computeThirdOrder(data, DEFAULT_PARAMS)
 * console.log(`Risk Level: ${result.riskLevel}`)
 * console.log(`Cumulative Regeneration: ${result.cumulativeRegeneration}`)
 * ```
 */
export function computeThirdOrder(
  data: NIVDataPoint[],
  params: ThirdOrderParams = DEFAULT_PARAMS
): ThirdOrderResult {
  const { alpha, beta, gamma, theta, lookbackMonths, horizonYears } = params

  if (data.length < lookbackMonths) {
    throw new Error(`Insufficient data: need at least ${lookbackMonths} months, got ${data.length}`)
  }

  const recentData = data.slice(-lookbackMonths)
  const nivSeries = recentData.map(d => d.niv)
  const dragSeries = recentData.map(d => d.drag)

  const currentNIV = nivSeries[nivSeries.length - 1]
  const avgNIV = nivSeries.reduce((a, b) => a + b, 0) / nivSeries.length
  const avgDrag = dragSeries.reduce((a, b) => a + b, 0) / dragSeries.length

  const fullNIVSeries = data.map(d => d.niv)
  const acceleration = computeAcceleration(fullNIVSeries)
  const accelerationTrend = getAccelerationTrend(acceleration)

  const effectiveRate = computeEffectiveRate(avgNIV, avgDrag, alpha, beta)
  const collapseProb = logisticCollapse(avgDrag, gamma, theta)
  const cumulativeRegeneration = computeCumulativeRegeneration(
    avgNIV,
    effectiveRate,
    horizonYears,
    collapseProb
  )

  const nivMean = avgNIV
  const nivVariance = nivSeries.reduce((sum, v) => sum + Math.pow(v - nivMean, 2), 0) / nivSeries.length
  const volatility = Math.sqrt(nivVariance)

  const mcResults = runMonteCarloSimulation(data, params)
  const confidenceBands = computeConfidenceBands(mcResults)

  return {
    currentNIV,
    avgNIV,
    acceleration,
    accelerationTrend,
    effectiveRate,
    collapseProb,
    cumulativeRegeneration,
    riskLevel: getRiskLevel(collapseProb),
    confidenceBands,
    avgDrag,
    volatility
  }
}

// ============================================================================
// FORECAST GENERATION
// ============================================================================

/**
 * Generate forecast paths at multiple horizons
 *
 * @param data - NIV time series data
 * @param params - Computation parameters
 * @param horizonSteps - Array of horizon years to compute (default: [1, 2, 3, 4, 5, 7, 10])
 * @returns Array of forecast paths
 */
export function generateForecastPaths(
  data: NIVDataPoint[],
  params: ThirdOrderParams = DEFAULT_PARAMS,
  horizonSteps: number[] = [1, 2, 3, 4, 5, 7, 10]
): ForecastPath[] {
  const paths: ForecastPath[] = []
  const baseDate = new Date(data[data.length - 1].date)

  for (const horizon of horizonSteps) {
    const modifiedParams = { ...params, horizonYears: horizon }
    const mcResults = runMonteCarloSimulation(data, modifiedParams)
    const bands = computeConfidenceBands(mcResults)

    const collapseCount = mcResults.filter(p => p.isCollapse).length
    const collapseProb = collapseCount / mcResults.length

    const forecastDate = new Date(baseDate)
    forecastDate.setFullYear(forecastDate.getFullYear() + horizon)

    paths.push({
      horizon,
      date: forecastDate.toISOString().slice(0, 10),
      median: bands.median,
      lower5: bands.lower5,
      upper95: bands.upper95,
      lower25: bands.lower25,
      upper75: bands.upper75,
      collapseProb,
      riskLevel: getRiskLevel(collapseProb)
    })
  }

  return paths
}

// ============================================================================
// API CLIENT
// ============================================================================

/**
 * Configuration for the API client
 */
export interface APIClientConfig {
  /** Base URL for the API (default: https://regenerationism.ai) */
  baseUrl?: string
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number
  /** Custom headers to include with requests */
  headers?: Record<string, string>
}

/**
 * API request options
 */
export interface APIRequestOptions {
  data: NIVDataPoint[]
  params?: Partial<ThirdOrderParams>
  scenarios?: ScenarioInput[]
  includeHeatmap?: boolean
  includeForecastPaths?: boolean
}

/**
 * Third-Order API Client
 *
 * Provides a convenient interface for calling the regenerationism.ai API.
 *
 * @example
 * ```typescript
 * import { ThirdOrderClient } from '@regenerationism/third-order-sdk'
 *
 * const client = new ThirdOrderClient()
 *
 * const result = await client.compute({
 *   data: nivDataPoints,
 *   params: { horizonYears: 10 },
 *   includeForecastPaths: true
 * })
 *
 * console.log(result.result.riskLevel)
 * ```
 */
export class ThirdOrderClient {
  private baseUrl: string
  private timeout: number
  private headers: Record<string, string>

  constructor(config: APIClientConfig = {}) {
    this.baseUrl = config.baseUrl || 'https://regenerationism.ai'
    this.timeout = config.timeout || 30000
    this.headers = {
      'Content-Type': 'application/json',
      ...config.headers
    }
  }

  /**
   * Get API information and default parameters
   */
  async getInfo(): Promise<{
    name: string
    version: string
    defaultParams: ThirdOrderParams
    presetScenarios: { name: string; description: string }[]
  }> {
    const response = await this.fetch(`${this.baseUrl}/api/third-order`, {
      method: 'GET'
    })
    return response
  }

  /**
   * Compute third-order analysis
   *
   * @param options - Request options including data and parameters
   * @returns Full API response with results
   */
  async compute(options: APIRequestOptions): Promise<ThirdOrderAPIResponse> {
    const response = await this.fetch(`${this.baseUrl}/api/third-order`, {
      method: 'POST',
      body: JSON.stringify({
        data: options.data,
        params: options.params,
        scenarios: options.scenarios,
        includeHeatmap: options.includeHeatmap ?? false,
        includeForecastPaths: options.includeForecastPaths ?? true
      })
    })
    return response
  }

  /**
   * Compute with preset scenario
   *
   * @param data - NIV time series data
   * @param scenarioName - Name of preset scenario
   * @param params - Optional parameter overrides
   */
  async computeWithScenario(
    data: NIVDataPoint[],
    scenarioName: string,
    params?: Partial<ThirdOrderParams>
  ): Promise<ThirdOrderAPIResponse> {
    const scenario = PRESET_SCENARIOS.find(s => s.name === scenarioName)
    if (!scenario) {
      throw new Error(`Unknown scenario: ${scenarioName}. Available: ${PRESET_SCENARIOS.map(s => s.name).join(', ')}`)
    }

    return this.compute({
      data,
      params,
      scenarios: [scenario],
      includeForecastPaths: true
    })
  }

  private async fetch(url: string, options: RequestInit): Promise<any> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url, {
        ...options,
        headers: this.headers,
        signal: controller.signal
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(error.error || `API error: ${response.status}`)
      }

      return response.json()
    } finally {
      clearTimeout(timeoutId)
    }
  }
}

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

/**
 * Quick analysis function for simple use cases
 *
 * @param data - NIV time series data
 * @param horizonYears - Forecast horizon (default: 5)
 * @returns Simplified result object
 *
 * @example
 * ```typescript
 * import { quickAnalysis } from '@regenerationism/third-order-sdk'
 *
 * const { riskLevel, cumulativeRegeneration, collapseProb } = quickAnalysis(data, 5)
 * ```
 */
export function quickAnalysis(
  data: NIVDataPoint[],
  horizonYears: number = 5
): {
  riskLevel: string
  cumulativeRegeneration: number
  collapseProb: number
  confidenceRange: [number, number]
} {
  const params = { ...DEFAULT_PARAMS, horizonYears }
  const result = computeThirdOrder(data, params)

  return {
    riskLevel: result.riskLevel,
    cumulativeRegeneration: result.cumulativeRegeneration,
    collapseProb: result.collapseProb,
    confidenceRange: [result.confidenceBands.lower5, result.confidenceBands.upper95]
  }
}

/**
 * Validate NIV data point structure
 *
 * @param point - Data point to validate
 * @returns Validation result
 */
export function validateDataPoint(point: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (typeof point !== 'object' || point === null) {
    return { valid: false, errors: ['Data point must be an object'] }
  }

  const p = point as Record<string, unknown>
  const required = ['date', 'niv', 'thrust', 'efficiency', 'slack', 'drag']

  for (const field of required) {
    if (!(field in p)) {
      errors.push(`Missing required field: ${field}`)
    } else if (field === 'date') {
      if (typeof p[field] !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(p[field] as string)) {
        errors.push(`Invalid date format: expected YYYY-MM-DD`)
      }
    } else {
      if (typeof p[field] !== 'number' || isNaN(p[field] as number)) {
        errors.push(`${field} must be a number`)
      }
    }
  }

  return { valid: errors.length === 0, errors }
}

// Default export for convenience
export default {
  computeThirdOrder,
  generateForecastPaths,
  runMonteCarloSimulation,
  computeConfidenceBands,
  quickAnalysis,
  validateDataPoint,
  ThirdOrderClient,
  DEFAULT_PARAMS,
  PRESET_SCENARIOS
}
