/**
 * Third-Order Accounting Engine for NIV
 *
 * Implements the three-layer forward-looking framework:
 * - First-order:  NIVₜ = current regeneration velocity
 * - Second-order: dNIV/dt = acceleration/deceleration
 * - Third-order:  Cₕ = NIV₀ · e^(rₕ·h) · (1 − ρₕ) = projected cumulative regeneration
 *
 * Mathematical Foundation:
 * Cₕ = NIV₀ · e^(rₕ·h) · (1 − ρₕ)
 *
 * Where:
 *   Cₕ = cumulative regenerated capital after horizon h (years)
 *   NIV₀ = current/average recent NIV velocity (baseline momentum)
 *   rₕ = α · (avg NIV over window) − β · (avg Drag)
 *   ρₕ = logistic(γ · (avg Drag) − θ) = collapse probability
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface NIVDataPoint {
  date: string
  niv: number
  thrust: number
  efficiency: number
  slack: number
  drag: number
  isRecession?: boolean
}

export interface ThirdOrderParams {
  // Compounding rate parameters
  alpha: number          // Efficiency multiplier (1.0-1.2)
  beta: number           // Friction penalty (0.6-1.0)

  // Risk parameters
  gamma: number          // Drag sensitivity (higher = more conservative)
  theta: number          // Tipping threshold (calibrated to ~0.5 at crisis peaks)

  // Time parameters
  lookbackMonths: number // Window for averaging (3-12 months)
  horizonYears: number   // Forecast horizon (1-10 years)

  // Monte Carlo parameters
  iterations: number     // Number of simulation paths
  volatilityMultiplier: number // Scales stochastic shocks
}

export interface ThirdOrderResult {
  // First-order (velocity)
  currentNIV: number
  avgNIV: number

  // Second-order (acceleration)
  acceleration: number      // dNIV/dt
  accelerationTrend: 'accelerating' | 'decelerating' | 'stable'

  // Third-order (compounding + risk)
  effectiveRate: number     // rₕ
  collapseProb: number      // ρₕ (0-1)
  cumulativeRegeneration: number  // Cₕ

  // Risk metrics
  riskLevel: 'low' | 'moderate' | 'elevated' | 'high' | 'critical'
  confidenceBands: {
    lower5: number
    lower25: number
    median: number
    upper75: number
    upper95: number
  }

  // Diagnostic
  avgDrag: number
  volatility: number
}

export interface ForecastPath {
  horizon: number         // Years
  date: string
  median: number
  lower5: number
  upper95: number
  lower25: number
  upper75: number
  collapseProb: number
  riskLevel: string
}

export interface MonteCarloPath {
  pathId: number
  values: number[]        // Value at each time step
  finalValue: number
  isCollapse: boolean     // Did this path collapse?
}

export interface ScenarioInput {
  name: string
  description: string
  thrustShock: number     // % change to thrust
  dragShock: number       // % change to drag
  efficiencyShock: number // % change to efficiency
  duration: number        // Months the shock persists
}

export interface ScenarioResult {
  scenario: ScenarioInput
  baseline: ForecastPath[]
  shocked: ForecastPath[]
  impactDelta: number     // % change in final Cₕ
  riskDelta: number       // Change in collapse probability
}

export interface RiskHeatmapCell {
  horizonYear: number
  thrustLevel: number     // -2 to +2 (standard deviations from mean)
  dragLevel: number       // -2 to +2
  cumulativeRegen: number
  collapseProb: number
  color: string           // Hex color for heatmap
}

// ============================================================================
// DEFAULT PARAMETERS (calibrated to historical data)
// ============================================================================

export const DEFAULT_THIRD_ORDER_PARAMS: ThirdOrderParams = {
  alpha: 1.1,              // Slight efficiency boost for sustained growth
  beta: 0.8,               // Moderate friction penalty
  gamma: 3.5,              // Sensitive to drag accumulation
  theta: 0.15,             // Tipping threshold (calibrated to 2008, 2020 peaks)
  lookbackMonths: 6,       // 6-month averaging window
  horizonYears: 5,         // 5-year default forecast
  iterations: 1000,        // Monte Carlo paths
  volatilityMultiplier: 1.0
}

// ============================================================================
// CORE COMPUTATION FUNCTIONS
// ============================================================================

/**
 * Logistic function for collapse probability
 * Maps drag to probability space [0, 1]
 */
export function logisticCollapse(avgDrag: number, gamma: number, theta: number): number {
  const x = gamma * avgDrag - theta
  return 1 / (1 + Math.exp(-x))
}

/**
 * Compute effective compounding rate
 * rₕ = α · (avg NIV) − β · (avg Drag)
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
 * Cₕ = NIV₀ · e^(rₕ·h) · (1 − ρₕ)
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
 * Uses simple finite difference on recent data
 */
export function computeAcceleration(nivSeries: number[]): number {
  if (nivSeries.length < 3) return 0

  const n = nivSeries.length
  // Use last 3 points for acceleration estimate
  const recent = nivSeries.slice(-3)
  const v1 = recent[1] - recent[0]  // First velocity
  const v2 = recent[2] - recent[1]  // Second velocity
  const acceleration = v2 - v1      // Change in velocity

  return acceleration
}

/**
 * Determine acceleration trend
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
 */
export function getRiskLevel(collapseProb: number): 'low' | 'moderate' | 'elevated' | 'high' | 'critical' {
  if (collapseProb < 0.1) return 'low'
  if (collapseProb < 0.25) return 'moderate'
  if (collapseProb < 0.5) return 'elevated'
  if (collapseProb < 0.75) return 'high'
  return 'critical'
}

/**
 * Get risk color for heatmap
 */
export function getRiskColor(collapseProb: number, cumulativeRegen: number): string {
  // Green (safe) to Red (danger) gradient
  if (collapseProb >= 0.75 || cumulativeRegen < 0) return '#dc2626' // Red
  if (collapseProb >= 0.5) return '#f97316'  // Orange
  if (collapseProb >= 0.25) return '#eab308' // Yellow
  if (cumulativeRegen > 0.1) return '#22c55e' // Green
  return '#84cc16' // Light green
}

// ============================================================================
// MAIN THIRD-ORDER COMPUTATION
// ============================================================================

/**
 * Compute full third-order analysis from NIV time series
 */
export function computeThirdOrder(
  data: NIVDataPoint[],
  params: ThirdOrderParams = DEFAULT_THIRD_ORDER_PARAMS
): ThirdOrderResult {
  const { alpha, beta, gamma, theta, lookbackMonths, horizonYears } = params

  if (data.length < lookbackMonths) {
    throw new Error(`Insufficient data: need at least ${lookbackMonths} months`)
  }

  // Get recent window
  const recentData = data.slice(-lookbackMonths)
  const nivSeries = recentData.map(d => d.niv)
  const dragSeries = recentData.map(d => d.drag)

  // First-order: current and average NIV
  const currentNIV = nivSeries[nivSeries.length - 1]
  const avgNIV = nivSeries.reduce((a, b) => a + b, 0) / nivSeries.length
  const avgDrag = dragSeries.reduce((a, b) => a + b, 0) / dragSeries.length

  // Second-order: acceleration
  const fullNIVSeries = data.map(d => d.niv)
  const acceleration = computeAcceleration(fullNIVSeries)
  const accelerationTrend = getAccelerationTrend(acceleration)

  // Third-order: compounding + risk
  const effectiveRate = computeEffectiveRate(avgNIV, avgDrag, alpha, beta)
  const collapseProb = logisticCollapse(avgDrag, gamma, theta)
  const cumulativeRegeneration = computeCumulativeRegeneration(
    avgNIV,
    effectiveRate,
    horizonYears,
    collapseProb
  )

  // Volatility (standard deviation of recent NIV)
  const nivMean = avgNIV
  const nivVariance = nivSeries.reduce((sum, v) => sum + Math.pow(v - nivMean, 2), 0) / nivSeries.length
  const volatility = Math.sqrt(nivVariance)

  // Monte Carlo for confidence bands
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
// MONTE CARLO SIMULATION
// ============================================================================

/**
 * Box-Muller transform for normal random numbers
 */
function randomNormal(mean: number = 0, stdDev: number = 1): number {
  const u1 = Math.random()
  const u2 = Math.random()
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  return mean + z * stdDev
}

/**
 * Run Monte Carlo simulation for third-order forecasting
 */
export function runMonteCarloSimulation(
  data: NIVDataPoint[],
  params: ThirdOrderParams
): MonteCarloPath[] {
  const { alpha, beta, gamma, theta, lookbackMonths, horizonYears, iterations, volatilityMultiplier } = params

  const recentData = data.slice(-lookbackMonths)
  const nivSeries = recentData.map(d => d.niv)
  const dragSeries = recentData.map(d => d.drag)

  const avgNIV = nivSeries.reduce((a, b) => a + b, 0) / nivSeries.length
  const avgDrag = dragSeries.reduce((a, b) => a + b, 0) / dragSeries.length

  // Historical volatility
  const nivMean = avgNIV
  const nivStdDev = Math.sqrt(
    nivSeries.reduce((sum, v) => sum + Math.pow(v - nivMean, 2), 0) / nivSeries.length
  )
  const dragStdDev = Math.sqrt(
    dragSeries.reduce((sum, v) => sum + Math.pow(v - avgDrag, 2), 0) / dragSeries.length
  )

  const paths: MonteCarloPath[] = []
  const stepsPerYear = 12 // Monthly steps
  const totalSteps = horizonYears * stepsPerYear

  for (let i = 0; i < iterations; i++) {
    const values: number[] = []
    let currentNIV = avgNIV
    let currentDrag = avgDrag
    let isCollapse = false

    for (let t = 0; t < totalSteps; t++) {
      // Add stochastic shocks
      const nivShock = randomNormal(0, nivStdDev * volatilityMultiplier * 0.1)
      const dragShock = randomNormal(0, dragStdDev * volatilityMultiplier * 0.1)

      currentNIV = Math.max(-0.5, currentNIV + nivShock)
      currentDrag = Math.max(0, currentDrag + dragShock)

      // Compute cumulative regeneration at this step
      const effectiveRate = computeEffectiveRate(currentNIV, currentDrag, alpha, beta)
      const horizonAtStep = (t + 1) / stepsPerYear
      const collapseProb = logisticCollapse(currentDrag, gamma, theta)

      // Check for collapse event
      if (Math.random() < collapseProb / totalSteps) {
        isCollapse = true
        // After collapse, regeneration drops significantly
        currentNIV *= 0.3
      }

      const cumRegen = computeCumulativeRegeneration(
        avgNIV,
        effectiveRate,
        horizonAtStep,
        isCollapse ? 0.8 : collapseProb
      )

      values.push(cumRegen)
    }

    paths.push({
      pathId: i,
      values,
      finalValue: values[values.length - 1],
      isCollapse
    })
  }

  return paths
}

/**
 * Compute confidence bands from Monte Carlo results
 */
export function computeConfidenceBands(paths: MonteCarloPath[]): ThirdOrderResult['confidenceBands'] {
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

/**
 * Generate forecast path with confidence bands at multiple horizons
 */
export function generateForecastPaths(
  data: NIVDataPoint[],
  params: ThirdOrderParams,
  horizonSteps: number[] = [1, 2, 3, 4, 5, 7, 10]
): ForecastPath[] {
  const paths: ForecastPath[] = []
  const baseDate = new Date(data[data.length - 1].date)

  for (const horizon of horizonSteps) {
    const modifiedParams = { ...params, horizonYears: horizon }
    const mcResults = runMonteCarloSimulation(data, modifiedParams)
    const bands = computeConfidenceBands(mcResults)

    // Collapse probability at this horizon
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
// SCENARIO ANALYSIS
// ============================================================================

/**
 * Apply scenario shocks to data and compute impact
 */
export function runScenarioAnalysis(
  data: NIVDataPoint[],
  scenario: ScenarioInput,
  params: ThirdOrderParams
): ScenarioResult {
  // Baseline forecast
  const baseline = generateForecastPaths(data, params)

  // Apply shocks to create modified data
  const shockedData = data.map((d, i) => {
    const isInShockPeriod = i >= data.length - scenario.duration
    if (!isInShockPeriod) return d

    return {
      ...d,
      thrust: d.thrust * (1 + scenario.thrustShock / 100),
      drag: d.drag * (1 + scenario.dragShock / 100),
      efficiency: d.efficiency * (1 + scenario.efficiencyShock / 100),
      // Recalculate NIV with shocks
      niv: calculateShockedNIV(d, scenario)
    }
  })

  // Shocked forecast
  const shocked = generateForecastPaths(shockedData, params)

  // Compare final values
  const baselineFinal = baseline[baseline.length - 1]
  const shockedFinal = shocked[shocked.length - 1]

  const impactDelta = ((shockedFinal.median - baselineFinal.median) / Math.abs(baselineFinal.median)) * 100
  const riskDelta = shockedFinal.collapseProb - baselineFinal.collapseProb

  return {
    scenario,
    baseline,
    shocked,
    impactDelta,
    riskDelta
  }
}

/**
 * Helper to recalculate NIV with scenario shocks
 */
function calculateShockedNIV(d: NIVDataPoint, scenario: ScenarioInput): number {
  const thrust = d.thrust * (1 + scenario.thrustShock / 100)
  const efficiency = d.efficiency * (1 + scenario.efficiencyShock / 100)
  const drag = d.drag * (1 + scenario.dragShock / 100)
  const slack = d.slack

  // NIV = (u × P²) / (X + F)^η with η=1.5
  const eta = 1.5
  const denominator = Math.pow(slack + drag, eta)
  return denominator > 0 ? (thrust * efficiency * efficiency) / denominator : 0
}

// ============================================================================
// RISK HEATMAP GENERATION
// ============================================================================

/**
 * Generate risk heatmap data for visualization
 */
export function generateRiskHeatmap(
  data: NIVDataPoint[],
  params: ThirdOrderParams,
  thrustRange: number[] = [-2, -1, 0, 1, 2],
  dragRange: number[] = [-2, -1, 0, 1, 2]
): RiskHeatmapCell[] {
  const cells: RiskHeatmapCell[] = []
  const horizons = [1, 2, 3, 5, 10]

  const recentData = data.slice(-params.lookbackMonths)
  const avgThrust = recentData.reduce((a, d) => a + d.thrust, 0) / recentData.length
  const avgDrag = recentData.reduce((a, d) => a + d.drag, 0) / recentData.length
  const avgNIV = recentData.reduce((a, d) => a + d.niv, 0) / recentData.length

  // Calculate standard deviations
  const thrustStd = Math.sqrt(
    recentData.reduce((sum, d) => sum + Math.pow(d.thrust - avgThrust, 2), 0) / recentData.length
  ) || 0.1
  const dragStd = Math.sqrt(
    recentData.reduce((sum, d) => sum + Math.pow(d.drag - avgDrag, 2), 0) / recentData.length
  ) || 0.05

  for (const horizon of horizons) {
    for (const thrustLevel of thrustRange) {
      for (const dragLevel of dragRange) {
        // Apply standard deviation shifts
        const shiftedThrust = avgThrust + thrustLevel * thrustStd
        const shiftedDrag = Math.max(0.001, avgDrag + dragLevel * dragStd)

        // Recalculate with shifted values
        const effectiveRate = computeEffectiveRate(avgNIV, shiftedDrag, params.alpha, params.beta)
        const collapseProb = logisticCollapse(shiftedDrag, params.gamma, params.theta)
        const cumRegen = computeCumulativeRegeneration(avgNIV, effectiveRate, horizon, collapseProb)

        cells.push({
          horizonYear: horizon,
          thrustLevel,
          dragLevel,
          cumulativeRegen: cumRegen,
          collapseProb,
          color: getRiskColor(collapseProb, cumRegen)
        })
      }
    }
  }

  return cells
}

// ============================================================================
// PRESET SCENARIOS
// ============================================================================

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
    name: 'Green Transition',
    description: 'Infrastructure investment: thrust +10%, short-term drag +5%',
    thrustShock: 10,
    dragShock: 5,
    efficiencyShock: 8,
    duration: 36
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
// API-FRIENDLY WRAPPERS
// ============================================================================

export interface ThirdOrderAPIRequest {
  data: NIVDataPoint[]
  params?: Partial<ThirdOrderParams>
  scenarios?: ScenarioInput[]
  includeHeatmap?: boolean
  includeForecastPaths?: boolean
}

export interface ThirdOrderAPIResponse {
  result: ThirdOrderResult
  forecastPaths?: ForecastPath[]
  heatmap?: RiskHeatmapCell[]
  scenarioResults?: ScenarioResult[]
  meta: {
    dataPoints: number
    computedAt: string
    paramsUsed: ThirdOrderParams
    version: string
  }
}

/**
 * Main API entry point for third-order computation
 * This is the function external software should call
 */
export function computeThirdOrderAPI(request: ThirdOrderAPIRequest): ThirdOrderAPIResponse {
  const params = { ...DEFAULT_THIRD_ORDER_PARAMS, ...request.params }

  // Core computation
  const result = computeThirdOrder(request.data, params)

  // Optional forecast paths
  const forecastPaths = request.includeForecastPaths
    ? generateForecastPaths(request.data, params)
    : undefined

  // Optional heatmap
  const heatmap = request.includeHeatmap
    ? generateRiskHeatmap(request.data, params)
    : undefined

  // Optional scenario analysis
  const scenarioResults = request.scenarios
    ? request.scenarios.map(s => runScenarioAnalysis(request.data, s, params))
    : undefined

  return {
    result,
    forecastPaths,
    heatmap,
    scenarioResults,
    meta: {
      dataPoints: request.data.length,
      computedAt: new Date().toISOString(),
      paramsUsed: params,
      version: '1.0.0'
    }
  }
}

// ============================================================================
// UTILITY EXPORTS FOR EXTERNAL SDK
// ============================================================================

export const ThirdOrderUtils = {
  logisticCollapse,
  computeEffectiveRate,
  computeCumulativeRegeneration,
  computeAcceleration,
  getAccelerationTrend,
  getRiskLevel,
  getRiskColor,
  computeConfidenceBands
}

export const ThirdOrderPresets = {
  DEFAULT_PARAMS: DEFAULT_THIRD_ORDER_PARAMS,
  SCENARIOS: PRESET_SCENARIOS
}
