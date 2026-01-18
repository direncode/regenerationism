'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sliders,
  Play,
  Loader2,
  RotateCcw,
  Download,
  BarChart3,
  TrendingUp,
  Zap,
  TrendingDown,
  Info,
  AlertTriangle,
  Settings2,
  LineChart,
  Shuffle,
  Target,
  GitCompare,
  ChevronDown,
  ChevronUp,
  Gauge,
  Activity,
} from 'lucide-react'
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend,
  BarChart,
  Cell,
  AreaChart,
  Area,
} from 'recharts'
import { useSessionStore } from '@/store/sessionStore'
import { fetchAllFREDData, mergeSeriesData, EconomicData, checkServerApiKey } from '@/lib/fredApi'
import { auditLog } from '@/lib/auditLog'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface CustomWeights {
  // Thrust weights
  w_G: number      // Investment growth weight (default 1.0)
  w_A: number      // M2 growth weight (default 1.0)
  w_r: number      // Rate change weight (default 0.7)
  // Efficiency
  mult: number     // R&D/Education multiplier (default 1.15)
  // Drag weights
  w_s: number      // Yield inversion penalty (default 0.4)
  w_real: number   // Real rate weight (default 0.4)
  w_vol: number    // Volatility weight (default 0.2)
  // Nonlinearity
  eta: number      // Exponent (default 1.5)
}

interface CustomNIVResult {
  date: string
  niv: number
  thrust: number
  efficiency: number
  efficiencySquared: number
  slack: number
  drag: number
  numerator: number
  denominator: number
  // Raw inputs
  dG: number
  dA: number
  dr: number
  yieldPenalty: number
  realRate: number
  volatility: number
}

interface MonteCarloResult {
  mean: number
  median: number
  stdDev: number
  p5: number
  p95: number
  min: number
  max: number
  probCrisis: number      // NIV <= 0
  probContraction: number // NIV < 0.015
  probSlowdown: number    // NIV < 0.035
  distribution: number[]
}

interface SensitivityResult {
  param: string
  label: string
  lowImpact: number
  highImpact: number
  avgImpact: number
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT WEIGHTS
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_WEIGHTS: CustomWeights = {
  w_G: 1.0,
  w_A: 1.0,
  w_r: 0.7,
  mult: 1.15,
  w_s: 0.4,
  w_real: 0.4,
  w_vol: 0.2,
  eta: 1.5,
}

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOM NIV CALCULATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════

function calculateCustomNIV(
  data: EconomicData[],
  weights: CustomWeights
): CustomNIVResult[] {
  if (data.length < 13) return []

  const results: CustomNIVResult[] = []
  const EPSILON = 0.001

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

    // STEP A: Calculate raw inputs as decimals
    const dG = (current.investment - yearAgo.investment) / yearAgo.investment
    const dA = (current.m2 - yearAgo.m2) / yearAgo.m2
    const dr = current.fedFunds - prevMonth.fedFunds
    const inflationRate = (current.cpi - yearAgo.cpi) / yearAgo.cpi
    const spread = current.yieldSpread ?? 0

    // STEP B: Component calculations with custom weights

    // 1. THRUST with custom weights
    const rawThrust = (weights.w_G * dG) + (weights.w_A * dA) - (weights.w_r * dr)
    const thrust = Math.tanh(rawThrust)

    // 2. EFFICIENCY with custom multiplier
    const efficiency = (current.investment * weights.mult) / current.gdp
    const efficiencySquared = Math.pow(efficiency, 2)

    // 3. SLACK (no custom weights - linear by design)
    const slack = 1.0 - (current.capacity / 100.0)

    // 4. DRAG with custom weights
    const yieldPenalty = spread < 0 ? Math.abs(spread / 100) : 0
    const realRateRaw = (current.fedFunds / 100) - inflationRate
    const realRate = Math.max(0, realRateRaw)

    const fedFundsWindow = data.slice(i - 11, i + 1)
      .map(d => d.fedFunds)
      .filter((v): v is number => v !== null)
    const volatilityRaw = fedFundsWindow.length > 0
      ? Math.sqrt(fedFundsWindow.reduce((sum, v) => {
          const mean = fedFundsWindow.reduce((a, b) => a + b, 0) / fedFundsWindow.length
          return sum + Math.pow(v - mean, 2)
        }, 0) / fedFundsWindow.length)
      : 0
    const volatility = volatilityRaw / 100

    const drag = (weights.w_s * yieldPenalty) + (weights.w_real * realRate) + (weights.w_vol * volatility)

    // STEP C: Master equation with custom eta
    const numerator = thrust * efficiencySquared
    const denominatorBase = slack + drag
    const denominator = Math.max(Math.pow(denominatorBase, weights.eta), EPSILON)
    const niv = numerator / denominator

    results.push({
      date: current.date,
      niv,
      thrust,
      efficiency,
      efficiencySquared,
      slack,
      drag,
      numerator,
      denominator,
      dG,
      dA,
      dr,
      yieldPenalty,
      realRate,
      volatility,
    })
  }

  return results
}

// ═══════════════════════════════════════════════════════════════════════════
// MONTE CARLO SIMULATION
// ═══════════════════════════════════════════════════════════════════════════

function runMonteCarloSimulation(
  data: EconomicData[],
  baseWeights: CustomWeights,
  iterations: number,
  inputPerturbation: number,
  weightPerturbation: number
): MonteCarloResult {
  const nivResults: number[] = []

  for (let i = 0; i < iterations; i++) {
    // Perturb weights
    const perturbedWeights: CustomWeights = {
      w_G: baseWeights.w_G * (1 + (Math.random() - 0.5) * 2 * weightPerturbation),
      w_A: baseWeights.w_A * (1 + (Math.random() - 0.5) * 2 * weightPerturbation),
      w_r: baseWeights.w_r * (1 + (Math.random() - 0.5) * 2 * weightPerturbation),
      mult: baseWeights.mult * (1 + (Math.random() - 0.5) * 2 * weightPerturbation),
      w_s: baseWeights.w_s * (1 + (Math.random() - 0.5) * 2 * weightPerturbation),
      w_real: baseWeights.w_real * (1 + (Math.random() - 0.5) * 2 * weightPerturbation),
      w_vol: baseWeights.w_vol * (1 + (Math.random() - 0.5) * 2 * weightPerturbation),
      eta: baseWeights.eta * (1 + (Math.random() - 0.5) * 2 * weightPerturbation),
    }

    // Perturb input data
    const perturbedData = data.map(d => ({
      ...d,
      investment: d.investment ? d.investment * (1 + (Math.random() - 0.5) * 2 * inputPerturbation) : null,
      m2: d.m2 ? d.m2 * (1 + (Math.random() - 0.5) * 2 * inputPerturbation) : null,
      fedFunds: d.fedFunds !== null ? d.fedFunds * (1 + (Math.random() - 0.5) * 2 * inputPerturbation) : null,
      gdp: d.gdp ? d.gdp * (1 + (Math.random() - 0.5) * 2 * inputPerturbation) : null,
      capacity: d.capacity !== null ? d.capacity * (1 + (Math.random() - 0.5) * 2 * inputPerturbation * 0.1) : null, // Less perturbation for capacity
    }))

    const results = calculateCustomNIV(perturbedData, perturbedWeights)
    if (results.length > 0) {
      // Use the latest NIV value
      nivResults.push(results[results.length - 1].niv)
    }
  }

  if (nivResults.length === 0) {
    return {
      mean: 0,
      median: 0,
      stdDev: 0,
      p5: 0,
      p95: 0,
      min: 0,
      max: 0,
      probCrisis: 0,
      probContraction: 0,
      probSlowdown: 0,
      distribution: [],
    }
  }

  // Sort for percentiles
  const sorted = [...nivResults].sort((a, b) => a - b)
  const mean = nivResults.reduce((a, b) => a + b, 0) / nivResults.length
  const variance = nivResults.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / nivResults.length

  return {
    mean,
    median: sorted[Math.floor(sorted.length / 2)],
    stdDev: Math.sqrt(variance),
    p5: sorted[Math.floor(sorted.length * 0.05)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    min: sorted[0],
    max: sorted[sorted.length - 1],
    probCrisis: nivResults.filter(n => n <= 0).length / nivResults.length * 100,
    probContraction: nivResults.filter(n => n < 0.015).length / nivResults.length * 100,
    probSlowdown: nivResults.filter(n => n < 0.035).length / nivResults.length * 100,
    distribution: nivResults,
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SENSITIVITY ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

function runSensitivityAnalysis(
  data: EconomicData[],
  baseWeights: CustomWeights,
  perturbationPercent: number = 0.2
): SensitivityResult[] {
  const baseResults = calculateCustomNIV(data, baseWeights)
  if (baseResults.length === 0) return []

  const baseNIV = baseResults[baseResults.length - 1].niv

  const paramLabels: Record<keyof CustomWeights, string> = {
    w_G: 'Investment Growth Weight (w_G)',
    w_A: 'M2 Growth Weight (w_A)',
    w_r: 'Rate Change Weight (w_r)',
    mult: 'R&D Multiplier (mult)',
    w_s: 'Yield Penalty Weight (w_s)',
    w_real: 'Real Rate Weight (w_real)',
    w_vol: 'Volatility Weight (w_vol)',
    eta: 'Nonlinearity (η)',
  }

  const sensitivities: SensitivityResult[] = []

  for (const param of Object.keys(baseWeights) as (keyof CustomWeights)[]) {
    const impacts: number[] = []

    for (const delta of [-perturbationPercent, perturbationPercent]) {
      const perturbedWeights = { ...baseWeights }
      perturbedWeights[param] *= (1 + delta)

      const perturbedResults = calculateCustomNIV(data, perturbedWeights)
      if (perturbedResults.length > 0) {
        const perturbedNIV = perturbedResults[perturbedResults.length - 1].niv
        const impactPercent = ((perturbedNIV - baseNIV) / Math.abs(baseNIV)) * 100
        impacts.push(impactPercent)
      }
    }

    if (impacts.length === 2) {
      sensitivities.push({
        param,
        label: paramLabels[param],
        lowImpact: impacts[0],
        highImpact: impacts[1],
        avgImpact: (Math.abs(impacts[0]) + Math.abs(impacts[1])) / 2,
      })
    }
  }

  // Sort by average impact (most sensitive first)
  return sensitivities.sort((a, b) => b.avgImpact - a.avgImpact)
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

type TabType = 'adjust' | 'montecarlo' | 'sensitivity' | 'compare'

export default function CustomModelPage() {
  // State
  const [activeTab, setActiveTab] = useState<TabType>('adjust')
  const [isLoading, setIsLoading] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [hasServerKey, setHasServerKey] = useState<boolean | null>(null)
  const [checkingServerKey, setCheckingServerKey] = useState(true)

  // Data state
  const [rawData, setRawData] = useState<EconomicData[] | null>(null)
  const [customWeights, setCustomWeights] = useState<CustomWeights>(DEFAULT_WEIGHTS)
  const [originalResults, setOriginalResults] = useState<CustomNIVResult[] | null>(null)
  const [adjustedResults, setAdjustedResults] = useState<CustomNIVResult[] | null>(null)

  // Monte Carlo state
  const [mcIterations, setMcIterations] = useState(1000)
  const [mcInputPerturbation, setMcInputPerturbation] = useState(0.1)
  const [mcWeightPerturbation, setMcWeightPerturbation] = useState(0.05)
  const [mcResults, setMcResults] = useState<MonteCarloResult | null>(null)
  const [mcRunning, setMcRunning] = useState(false)

  // Sensitivity state
  const [sensitivityPerturbation, setSensitivityPerturbation] = useState(0.2)
  const [sensitivityResults, setSensitivityResults] = useState<SensitivityResult[] | null>(null)

  const { apiSettings } = useSessionStore()

  // Check server API key on mount
  useEffect(() => {
    const checkServer = async () => {
      setCheckingServerKey(true)
      const hasKey = await checkServerApiKey()
      setHasServerKey(hasKey)
      setCheckingServerKey(false)
    }
    checkServer()
  }, [])

  const canCalculate = hasServerKey || (apiSettings.fredApiKey && apiSettings.useLiveData)

  // Load FRED data
  const loadData = useCallback(async () => {
    if (!canCalculate) {
      setError('Unable to load data - no API key available.')
      return
    }

    setIsLoading(true)
    setError(null)
    setLoadingStatus('Fetching FRED data...')

    try {
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const apiKeyToUse = hasServerKey ? '' : apiSettings.fredApiKey

      const seriesData = await fetchAllFREDData(
        apiKeyToUse,
        startDate,
        endDate,
        (series, progress) => setLoadingStatus(`Fetching ${series}... (${progress.toFixed(0)}%)`)
      )

      setLoadingStatus('Processing data...')
      const mergedData = mergeSeriesData(seriesData)

      if (mergedData.length < 13) {
        throw new Error('Not enough data for YoY calculations')
      }

      setRawData(mergedData)

      // Calculate with default weights
      const defaultResults = calculateCustomNIV(mergedData, DEFAULT_WEIGHTS)
      setOriginalResults(defaultResults)
      setAdjustedResults(defaultResults)

      auditLog.logUserAction('Custom Model: Data loaded', { dataPoints: mergedData.length }, 'CustomModel')
    } catch (err) {
      console.error('Data loading error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setIsLoading(false)
      setLoadingStatus('')
    }
  }, [canCalculate, hasServerKey, apiSettings.fredApiKey])

  // Recalculate NIV when weights change
  useEffect(() => {
    if (rawData) {
      const results = calculateCustomNIV(rawData, customWeights)
      setAdjustedResults(results)
    }
  }, [rawData, customWeights])

  // Reset weights to defaults
  const resetWeights = useCallback(() => {
    setCustomWeights(DEFAULT_WEIGHTS)
  }, [])

  // Run Monte Carlo
  const runMonteCarlo = useCallback(async () => {
    if (!rawData) return

    setMcRunning(true)
    setMcResults(null)

    // Use setTimeout to allow UI to update
    setTimeout(() => {
      const results = runMonteCarloSimulation(
        rawData,
        customWeights,
        mcIterations,
        mcInputPerturbation,
        mcWeightPerturbation
      )
      setMcResults(results)
      setMcRunning(false)
      auditLog.logUserAction('Custom Model: Monte Carlo complete', { iterations: mcIterations }, 'CustomModel')
    }, 100)
  }, [rawData, customWeights, mcIterations, mcInputPerturbation, mcWeightPerturbation])

  // Run Sensitivity Analysis
  const runSensitivity = useCallback(() => {
    if (!rawData) return

    const results = runSensitivityAnalysis(rawData, customWeights, sensitivityPerturbation)
    setSensitivityResults(results)
    auditLog.logUserAction('Custom Model: Sensitivity analysis complete', {}, 'CustomModel')
  }, [rawData, customWeights, sensitivityPerturbation])

  // Export results as CSV
  const exportCSV = useCallback(() => {
    if (!adjustedResults) return

    const headers = ['Date', 'NIV', 'Thrust', 'Efficiency', 'Efficiency²', 'Slack', 'Drag', 'dG', 'dA', 'dr']
    const rows = adjustedResults.map(r => [
      r.date,
      r.niv.toFixed(6),
      r.thrust.toFixed(6),
      r.efficiency.toFixed(6),
      r.efficiencySquared.toFixed(6),
      r.slack.toFixed(6),
      r.drag.toFixed(6),
      r.dG.toFixed(6),
      r.dA.toFixed(6),
      r.dr.toFixed(6),
    ])

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `niv-custom-model-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [adjustedResults])

  // Calculate impact comparison
  const impactComparison = useMemo(() => {
    if (!originalResults || !adjustedResults || originalResults.length === 0 || adjustedResults.length === 0) {
      return null
    }

    const origLatest = originalResults[originalResults.length - 1]
    const adjLatest = adjustedResults[adjustedResults.length - 1]

    return {
      originalNIV: origLatest.niv,
      adjustedNIV: adjLatest.niv,
      change: adjLatest.niv - origLatest.niv,
      changePercent: ((adjLatest.niv - origLatest.niv) / Math.abs(origLatest.niv)) * 100,
      components: {
        thrust: { original: origLatest.thrust, adjusted: adjLatest.thrust },
        efficiency: { original: origLatest.efficiencySquared, adjusted: adjLatest.efficiencySquared },
        slack: { original: origLatest.slack, adjusted: adjLatest.slack },
        drag: { original: origLatest.drag, adjusted: adjLatest.drag },
      },
    }
  }, [originalResults, adjustedResults])

  // Tabs
  const tabs = [
    { id: 'adjust' as TabType, label: 'Adjust & Compute', icon: <Sliders size={16} /> },
    { id: 'montecarlo' as TabType, label: 'Monte Carlo', icon: <Shuffle size={16} /> },
    { id: 'sensitivity' as TabType, label: 'Sensitivity', icon: <Target size={16} /> },
    { id: 'compare' as TabType, label: 'Compare', icon: <GitCompare size={16} /> },
  ]

  return (
    <div className="min-h-screen bg-dark-900 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold gradient-text flex items-center gap-3">
            <Settings2 className="w-8 h-8" />
            Custom Model: Tune NIV Weights
          </h1>
          <p className="text-gray-400 mt-2">
            Adjust formula weights, run Monte Carlo simulations, and perform sensitivity analysis
          </p>
        </div>

        {/* Error Banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center gap-3"
            >
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <span className="text-red-200">{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Load Data Button */}
        {!rawData && (
          <button
            onClick={loadData}
            disabled={isLoading || checkingServerKey || !canCalculate}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-regen-600 to-regen-400 hover:from-regen-500 hover:to-regen-300 text-black font-bold rounded-xl transition disabled:opacity-50 mb-8"
          >
            {checkingServerKey ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Initializing...
              </>
            ) : isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {loadingStatus || 'Loading...'}
              </>
            ) : !canCalculate ? (
              <>
                <AlertTriangle className="w-5 h-5" />
                No API Key Available
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Load FRED Data & Start Customizing
              </>
            )}
          </button>
        )}

        {/* Main Content */}
        {rawData && (
          <>
            {/* Tab Navigation */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-regen-500 text-black font-bold'
                      : 'bg-dark-700 text-gray-400 hover:text-white hover:bg-dark-600'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              {activeTab === 'adjust' && (
                <motion.div
                  key="adjust"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <AdjustTab
                    customWeights={customWeights}
                    setCustomWeights={setCustomWeights}
                    resetWeights={resetWeights}
                    adjustedResults={adjustedResults}
                    impactComparison={impactComparison}
                    exportCSV={exportCSV}
                  />
                </motion.div>
              )}

              {activeTab === 'montecarlo' && (
                <motion.div
                  key="montecarlo"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <MonteCarloTab
                    iterations={mcIterations}
                    setIterations={setMcIterations}
                    inputPerturbation={mcInputPerturbation}
                    setInputPerturbation={setMcInputPerturbation}
                    weightPerturbation={mcWeightPerturbation}
                    setWeightPerturbation={setMcWeightPerturbation}
                    results={mcResults}
                    running={mcRunning}
                    onRun={runMonteCarlo}
                    customWeights={customWeights}
                  />
                </motion.div>
              )}

              {activeTab === 'sensitivity' && (
                <motion.div
                  key="sensitivity"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <SensitivityTab
                    perturbation={sensitivityPerturbation}
                    setPerturbation={setSensitivityPerturbation}
                    results={sensitivityResults}
                    onRun={runSensitivity}
                    customWeights={customWeights}
                  />
                </motion.div>
              )}

              {activeTab === 'compare' && (
                <motion.div
                  key="compare"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <CompareTab
                    originalResults={originalResults}
                    adjustedResults={adjustedResults}
                    customWeights={customWeights}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// ADJUST TAB COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface AdjustTabProps {
  customWeights: CustomWeights
  setCustomWeights: (weights: CustomWeights) => void
  resetWeights: () => void
  adjustedResults: CustomNIVResult[] | null
  impactComparison: {
    originalNIV: number
    adjustedNIV: number
    change: number
    changePercent: number
    components: {
      thrust: { original: number; adjusted: number }
      efficiency: { original: number; adjusted: number }
      slack: { original: number; adjusted: number }
      drag: { original: number; adjusted: number }
    }
  } | null
  exportCSV: () => void
}

function AdjustTab({
  customWeights,
  setCustomWeights,
  resetWeights,
  adjustedResults,
  impactComparison,
  exportCSV,
}: AdjustTabProps) {
  const updateWeight = (key: keyof CustomWeights, value: number) => {
    setCustomWeights({ ...customWeights, [key]: value })
  }

  const latestResult = adjustedResults && adjustedResults.length > 0
    ? adjustedResults[adjustedResults.length - 1]
    : null

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Weight Controls */}
      <div className="lg:col-span-1 space-y-4">
        {/* Thrust Weights */}
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-white">Thrust Weights</h3>
          </div>
          <div className="space-y-4">
            <WeightSlider
              label="w_G (Investment Growth)"
              value={customWeights.w_G}
              min={0.5}
              max={1.5}
              step={0.05}
              onChange={(v) => updateWeight('w_G', v)}
              tooltip="Higher values amplify investment growth signal"
              color="blue"
            />
            <WeightSlider
              label="w_A (M2 Growth)"
              value={customWeights.w_A}
              min={0.5}
              max={1.5}
              step={0.05}
              onChange={(v) => updateWeight('w_A', v)}
              tooltip="Higher values boost liquidity sensitivity"
              color="blue"
            />
            <WeightSlider
              label="w_r (Rate Change)"
              value={customWeights.w_r}
              min={0.3}
              max={1.0}
              step={0.05}
              onChange={(v) => updateWeight('w_r', v)}
              tooltip="Higher values amplify rate-hike drag"
              color="blue"
            />
          </div>
        </div>

        {/* Efficiency */}
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-green-400" />
            <h3 className="font-bold text-white">Efficiency</h3>
          </div>
          <WeightSlider
            label="R&D Multiplier"
            value={customWeights.mult}
            min={1.0}
            max={1.5}
            step={0.05}
            onChange={(v) => updateWeight('mult', v)}
            tooltip="Quality uplift factor for investment efficiency"
            color="green"
          />
        </div>

        {/* Drag Weights */}
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="w-5 h-5 text-red-400" />
            <h3 className="font-bold text-white">Drag Weights</h3>
          </div>
          <div className="space-y-4">
            <WeightSlider
              label="w_s (Yield Inversion)"
              value={customWeights.w_s}
              min={0.1}
              max={0.6}
              step={0.05}
              onChange={(v) => updateWeight('w_s', v)}
              tooltip="Penalty for inverted yield curve"
              color="red"
            />
            <WeightSlider
              label="w_real (Real Rate)"
              value={customWeights.w_real}
              min={0.1}
              max={0.6}
              step={0.05}
              onChange={(v) => updateWeight('w_real', v)}
              tooltip="Drag from positive real interest rates"
              color="red"
            />
            <WeightSlider
              label="w_vol (Volatility)"
              value={customWeights.w_vol}
              min={0.1}
              max={0.4}
              step={0.05}
              onChange={(v) => updateWeight('w_vol', v)}
              tooltip="Drag from rate volatility"
              color="red"
            />
          </div>
        </div>

        {/* Nonlinearity */}
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-white">Nonlinearity</h3>
          </div>
          <WeightSlider
            label="η (Eta)"
            value={customWeights.eta}
            min={1.0}
            max={2.5}
            step={0.1}
            onChange={(v) => updateWeight('eta', v)}
            tooltip="Exponent on denominator - higher = more crisis sensitivity"
            color="purple"
          />
          <div className="mt-3 flex gap-2">
            {[1.0, 1.5, 2.0, 2.5].map((preset) => (
              <button
                key={preset}
                onClick={() => updateWeight('eta', preset)}
                className={`px-3 py-1 text-xs rounded-lg transition ${
                  customWeights.eta === preset
                    ? 'bg-purple-500 text-white font-bold'
                    : 'bg-dark-600 text-gray-400 hover:text-white'
                }`}
              >
                η={preset}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={resetWeights}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-dark-600 hover:bg-dark-500 text-gray-300 rounded-xl transition"
          >
            <RotateCcw size={18} />
            Reset
          </button>
          <button
            onClick={exportCSV}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-regen-500 hover:bg-regen-400 text-black font-bold rounded-xl transition"
          >
            <Download size={18} />
            Export
          </button>
        </div>
      </div>

      {/* Results Display */}
      <div className="lg:col-span-2 space-y-6">
        {/* Current NIV Score */}
        {latestResult && (
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white text-lg">Current NIV Score</h3>
              <span className="text-gray-500 font-mono text-sm">{latestResult.date}</span>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-dark-700 rounded-xl">
                <div className={`text-4xl font-mono font-bold ${
                  latestResult.niv > 0.035 ? 'text-green-400' :
                  latestResult.niv > 0.015 ? 'text-yellow-400' :
                  latestResult.niv > 0 ? 'text-orange-400' : 'text-red-400'
                }`}>
                  {latestResult.niv.toFixed(4)}
                </div>
                <div className="text-sm text-gray-400 mt-1">Adjusted NIV</div>
              </div>

              {impactComparison && (
                <>
                  <div className="text-center p-4 bg-dark-700 rounded-xl">
                    <div className="text-4xl font-mono font-bold text-gray-400">
                      {impactComparison.originalNIV.toFixed(4)}
                    </div>
                    <div className="text-sm text-gray-400 mt-1">Original NIV</div>
                  </div>

                  <div className="text-center p-4 bg-dark-700 rounded-xl">
                    <div className={`text-4xl font-mono font-bold ${
                      impactComparison.change > 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {impactComparison.change > 0 ? '+' : ''}{impactComparison.changePercent.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-400 mt-1">Change</div>
                  </div>
                </>
              )}
            </div>

            {/* Formula Preview */}
            <div className="p-4 bg-dark-800 rounded-lg font-mono text-sm mb-4">
              <span className="text-gray-400">NIV = </span>
              <span className="text-blue-400">tanh({customWeights.w_G.toFixed(2)}·ΔG + {customWeights.w_A.toFixed(2)}·ΔA - {customWeights.w_r.toFixed(2)}·Δr)</span>
              <span className="text-gray-400"> × </span>
              <span className="text-green-400">((I×{customWeights.mult.toFixed(2)})/GDP)²</span>
              <span className="text-gray-400"> / </span>
              <span className="text-yellow-400">(X + </span>
              <span className="text-red-400">{customWeights.w_s.toFixed(2)}s + {customWeights.w_real.toFixed(2)}r + {customWeights.w_vol.toFixed(2)}σ</span>
              <span className="text-yellow-400">)</span>
              <sup className="text-purple-400">{customWeights.eta.toFixed(1)}</sup>
            </div>

            {/* Component Breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <ComponentCard
                label="Thrust (u)"
                value={latestResult.thrust}
                original={impactComparison?.components.thrust.original}
                color="blue"
              />
              <ComponentCard
                label="Efficiency (P²)"
                value={latestResult.efficiencySquared}
                original={impactComparison?.components.efficiency.original}
                color="green"
              />
              <ComponentCard
                label="Slack (X)"
                value={latestResult.slack}
                original={impactComparison?.components.slack.original}
                color="yellow"
              />
              <ComponentCard
                label="Drag (F)"
                value={latestResult.drag}
                original={impactComparison?.components.drag.original}
                color="red"
              />
            </div>
          </div>
        )}

        {/* Time Series Chart */}
        {adjustedResults && adjustedResults.length > 0 && (
          <div className="glass-card rounded-xl p-6">
            <h3 className="font-bold text-white text-lg mb-4">NIV Time Series (Adjusted)</h3>
            <div className="h-80">
              <ResponsiveContainer>
                <ComposedChart data={adjustedResults.slice(-36)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#888', fontSize: 10 }}
                    tickFormatter={(v) => v.substring(0, 7)}
                  />
                  <YAxis tick={{ fill: '#888', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333' }}
                    labelFormatter={(v) => `Date: ${v}`}
                  />
                  <ReferenceLine y={0} stroke="#ff4444" strokeDasharray="5 5" />
                  <ReferenceLine y={0.035} stroke="#44ff44" strokeDasharray="5 5" />
                  <Line
                    type="monotone"
                    dataKey="niv"
                    stroke="#00d4aa"
                    strokeWidth={2}
                    dot={false}
                    name="NIV"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MONTE CARLO TAB COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface MonteCarloTabProps {
  iterations: number
  setIterations: (n: number) => void
  inputPerturbation: number
  setInputPerturbation: (n: number) => void
  weightPerturbation: number
  setWeightPerturbation: (n: number) => void
  results: MonteCarloResult | null
  running: boolean
  onRun: () => void
  customWeights: CustomWeights
}

function MonteCarloTab({
  iterations,
  setIterations,
  inputPerturbation,
  setInputPerturbation,
  weightPerturbation,
  setWeightPerturbation,
  results,
  running,
  onRun,
  customWeights,
}: MonteCarloTabProps) {
  // Create histogram data
  const histogramData = useMemo(() => {
    if (!results || results.distribution.length === 0) return []

    const bins = 30
    const min = results.min
    const max = results.max
    const binWidth = (max - min) / bins

    const histogram: { bin: string; count: number; midpoint: number }[] = []

    for (let i = 0; i < bins; i++) {
      const binStart = min + i * binWidth
      const binEnd = binStart + binWidth
      const count = results.distribution.filter(v => v >= binStart && v < binEnd).length

      histogram.push({
        bin: binStart.toFixed(3),
        count,
        midpoint: binStart + binWidth / 2,
      })
    }

    return histogram
  }, [results])

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Controls */}
      <div className="space-y-4">
        <div className="glass-card rounded-xl p-4">
          <h3 className="font-bold text-white mb-4 flex items-center gap-2">
            <Shuffle className="w-5 h-5 text-regen-400" />
            Simulation Settings
          </h3>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Iterations</label>
              <div className="flex gap-2">
                {[100, 1000, 5000, 10000].map(n => (
                  <button
                    key={n}
                    onClick={() => setIterations(n)}
                    className={`flex-1 px-2 py-2 text-xs rounded-lg transition ${
                      iterations === n
                        ? 'bg-regen-500 text-black font-bold'
                        : 'bg-dark-600 text-gray-400 hover:text-white'
                    }`}
                  >
                    {n.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            <WeightSlider
              label="Input Perturbation"
              value={inputPerturbation}
              min={0.05}
              max={0.20}
              step={0.01}
              onChange={setInputPerturbation}
              tooltip="Standard deviation for input data noise"
              color="regen"
              formatValue={(v) => `±${(v * 100).toFixed(0)}%`}
            />

            <WeightSlider
              label="Weight Perturbation"
              value={weightPerturbation}
              min={0.02}
              max={0.15}
              step={0.01}
              onChange={setWeightPerturbation}
              tooltip="Standard deviation for weight noise"
              color="regen"
              formatValue={(v) => `±${(v * 100).toFixed(0)}%`}
            />
          </div>

          <button
            onClick={onRun}
            disabled={running}
            className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-regen-500 hover:bg-regen-400 text-black font-bold rounded-xl transition disabled:opacity-50"
          >
            {running ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Running {iterations.toLocaleString()} iterations...
              </>
            ) : (
              <>
                <Play size={18} />
                Run Monte Carlo
              </>
            )}
          </button>
        </div>

        {/* Current Weights Display */}
        <div className="glass-card rounded-xl p-4">
          <h4 className="text-sm font-bold text-gray-400 mb-3">Current Base Weights</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-dark-700 rounded">
              <span className="text-gray-500">w_G:</span> <span className="text-white font-mono">{customWeights.w_G.toFixed(2)}</span>
            </div>
            <div className="p-2 bg-dark-700 rounded">
              <span className="text-gray-500">w_A:</span> <span className="text-white font-mono">{customWeights.w_A.toFixed(2)}</span>
            </div>
            <div className="p-2 bg-dark-700 rounded">
              <span className="text-gray-500">w_r:</span> <span className="text-white font-mono">{customWeights.w_r.toFixed(2)}</span>
            </div>
            <div className="p-2 bg-dark-700 rounded">
              <span className="text-gray-500">mult:</span> <span className="text-white font-mono">{customWeights.mult.toFixed(2)}</span>
            </div>
            <div className="p-2 bg-dark-700 rounded">
              <span className="text-gray-500">w_s:</span> <span className="text-white font-mono">{customWeights.w_s.toFixed(2)}</span>
            </div>
            <div className="p-2 bg-dark-700 rounded">
              <span className="text-gray-500">w_real:</span> <span className="text-white font-mono">{customWeights.w_real.toFixed(2)}</span>
            </div>
            <div className="p-2 bg-dark-700 rounded">
              <span className="text-gray-500">w_vol:</span> <span className="text-white font-mono">{customWeights.w_vol.toFixed(2)}</span>
            </div>
            <div className="p-2 bg-dark-700 rounded">
              <span className="text-gray-500">η:</span> <span className="text-white font-mono">{customWeights.eta.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="lg:col-span-2 space-y-6">
        {results && (
          <>
            {/* Summary Stats */}
            <div className="glass-card rounded-xl p-6">
              <h3 className="font-bold text-white text-lg mb-4">Simulation Results</h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-3 bg-dark-700 rounded-xl">
                  <div className="text-2xl font-mono font-bold text-regen-400">{results.mean.toFixed(4)}</div>
                  <div className="text-xs text-gray-400">Mean NIV</div>
                </div>
                <div className="text-center p-3 bg-dark-700 rounded-xl">
                  <div className="text-2xl font-mono font-bold text-blue-400">{results.median.toFixed(4)}</div>
                  <div className="text-xs text-gray-400">Median NIV</div>
                </div>
                <div className="text-center p-3 bg-dark-700 rounded-xl">
                  <div className="text-2xl font-mono font-bold text-purple-400">{results.stdDev.toFixed(4)}</div>
                  <div className="text-xs text-gray-400">Std Dev</div>
                </div>
                <div className="text-center p-3 bg-dark-700 rounded-xl">
                  <div className="text-2xl font-mono font-bold text-yellow-400">
                    [{results.p5.toFixed(3)}, {results.p95.toFixed(3)}]
                  </div>
                  <div className="text-xs text-gray-400">95% CI</div>
                </div>
              </div>

              {/* Risk Probabilities */}
              <div className="grid grid-cols-3 gap-4">
                <div className={`p-4 rounded-xl ${results.probCrisis > 10 ? 'bg-red-500/20 border border-red-500/30' : 'bg-dark-700'}`}>
                  <div className={`text-3xl font-bold ${results.probCrisis > 10 ? 'text-red-400' : 'text-gray-400'}`}>
                    {results.probCrisis.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-400">Crisis Risk (NIV ≤ 0)</div>
                </div>
                <div className={`p-4 rounded-xl ${results.probContraction > 30 ? 'bg-orange-500/20 border border-orange-500/30' : 'bg-dark-700'}`}>
                  <div className={`text-3xl font-bold ${results.probContraction > 30 ? 'text-orange-400' : 'text-gray-400'}`}>
                    {results.probContraction.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-400">Contraction (NIV &lt; 0.015)</div>
                </div>
                <div className={`p-4 rounded-xl ${results.probSlowdown > 50 ? 'bg-yellow-500/20 border border-yellow-500/30' : 'bg-dark-700'}`}>
                  <div className={`text-3xl font-bold ${results.probSlowdown > 50 ? 'text-yellow-400' : 'text-gray-400'}`}>
                    {results.probSlowdown.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-400">Slowdown (NIV &lt; 0.035)</div>
                </div>
              </div>
            </div>

            {/* Histogram */}
            <div className="glass-card rounded-xl p-6">
              <h3 className="font-bold text-white text-lg mb-4">NIV Distribution</h3>
              <div className="h-64">
                <ResponsiveContainer>
                  <BarChart data={histogramData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis
                      dataKey="bin"
                      tick={{ fill: '#888', fontSize: 9 }}
                      interval={4}
                    />
                    <YAxis tick={{ fill: '#888', fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333' }}
                      formatter={(value: number) => [value, 'Count']}
                    />
                    <Bar dataKey="count" fill="#00d4aa" radius={[2, 2, 0, 0]}>
                      {histogramData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.midpoint <= 0 ? '#ef4444' : entry.midpoint < 0.035 ? '#eab308' : '#00d4aa'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded" />
                  <span className="text-gray-400">Crisis (NIV ≤ 0)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded" />
                  <span className="text-gray-400">At Risk (0 &lt; NIV &lt; 0.035)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-regen-500 rounded" />
                  <span className="text-gray-400">Healthy (NIV ≥ 0.035)</span>
                </div>
              </div>
            </div>
          </>
        )}

        {!results && !running && (
          <div className="glass-card rounded-xl p-12 text-center">
            <Shuffle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-400 mb-2">No Simulation Results</h3>
            <p className="text-gray-500">Configure settings and run Monte Carlo simulation</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SENSITIVITY TAB COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface SensitivityTabProps {
  perturbation: number
  setPerturbation: (n: number) => void
  results: SensitivityResult[] | null
  onRun: () => void
  customWeights: CustomWeights
}

function SensitivityTab({
  perturbation,
  setPerturbation,
  results,
  onRun,
  customWeights,
}: SensitivityTabProps) {
  // Format data for tornado chart
  const tornadoData = useMemo(() => {
    if (!results) return []
    return results.map(r => ({
      name: r.param,
      label: r.label,
      low: r.lowImpact,
      high: r.highImpact,
      absRange: Math.abs(r.highImpact) + Math.abs(r.lowImpact),
    }))
  }, [results])

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Controls */}
      <div className="space-y-4">
        <div className="glass-card rounded-xl p-4">
          <h3 className="font-bold text-white mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-regen-400" />
            Analysis Settings
          </h3>

          <WeightSlider
            label="Perturbation"
            value={perturbation}
            min={0.1}
            max={0.3}
            step={0.05}
            onChange={setPerturbation}
            tooltip="How much to vary each weight (±%)"
            color="regen"
            formatValue={(v) => `±${(v * 100).toFixed(0)}%`}
          />

          <button
            onClick={onRun}
            className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-regen-500 hover:bg-regen-400 text-black font-bold rounded-xl transition"
          >
            <Play size={18} />
            Run Sensitivity Analysis
          </button>
        </div>

        {/* Interpretation Guide */}
        <div className="glass-card rounded-xl p-4">
          <h4 className="text-sm font-bold text-gray-400 mb-3">Interpretation</h4>
          <div className="space-y-2 text-xs text-gray-500">
            <p>• <span className="text-white">Wider bars</span> = more sensitive parameter</p>
            <p>• <span className="text-red-400">Red</span> = NIV decreases when param increases</p>
            <p>• <span className="text-green-400">Green</span> = NIV increases when param increases</p>
            <p>• Parameters sorted by total impact</p>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="lg:col-span-2 space-y-6">
        {results && results.length > 0 && (
          <>
            {/* Tornado Chart */}
            <div className="glass-card rounded-xl p-6">
              <h3 className="font-bold text-white text-lg mb-4">Tornado Plot - Parameter Sensitivity</h3>
              <div className="h-96">
                <ResponsiveContainer>
                  <BarChart
                    data={tornadoData}
                    layout="vertical"
                    margin={{ left: 150, right: 30 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis
                      type="number"
                      tick={{ fill: '#888', fontSize: 10 }}
                      tickFormatter={(v) => `${v > 0 ? '+' : ''}${v.toFixed(0)}%`}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fill: '#888', fontSize: 11 }}
                      width={100}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333' }}
                      formatter={(value: number, name: string) => [
                        `${value > 0 ? '+' : ''}${value.toFixed(2)}%`,
                        name === 'low' ? `-${(perturbation * 100).toFixed(0)}%` : `+${(perturbation * 100).toFixed(0)}%`
                      ]}
                    />
                    <ReferenceLine x={0} stroke="#666" />
                    <Bar dataKey="low" fill="#ef4444" radius={[4, 0, 0, 4]} name="Decrease" />
                    <Bar dataKey="high" fill="#22c55e" radius={[0, 4, 4, 0]} name="Increase" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Sensitivity Table */}
            <div className="glass-card rounded-xl p-6">
              <h3 className="font-bold text-white text-lg mb-4">Sensitivity Rankings</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-2 text-gray-400">Rank</th>
                      <th className="text-left py-2 text-gray-400">Parameter</th>
                      <th className="text-right py-2 text-gray-400">-{(perturbation * 100).toFixed(0)}%</th>
                      <th className="text-right py-2 text-gray-400">+{(perturbation * 100).toFixed(0)}%</th>
                      <th className="text-right py-2 text-gray-400">Avg Impact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => (
                      <tr key={r.param} className="border-b border-white/5">
                        <td className="py-2 text-gray-500">{i + 1}</td>
                        <td className="py-2 text-white">{r.label}</td>
                        <td className={`py-2 text-right font-mono ${r.lowImpact < 0 ? 'text-red-400' : 'text-green-400'}`}>
                          {r.lowImpact > 0 ? '+' : ''}{r.lowImpact.toFixed(2)}%
                        </td>
                        <td className={`py-2 text-right font-mono ${r.highImpact < 0 ? 'text-red-400' : 'text-green-400'}`}>
                          {r.highImpact > 0 ? '+' : ''}{r.highImpact.toFixed(2)}%
                        </td>
                        <td className="py-2 text-right font-mono text-regen-400 font-bold">
                          {r.avgImpact.toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {!results && (
          <div className="glass-card rounded-xl p-12 text-center">
            <Target className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-400 mb-2">No Analysis Results</h3>
            <p className="text-gray-500">Click &quot;Run Sensitivity Analysis&quot; to analyze parameter impacts</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPARE TAB COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface CompareTabProps {
  originalResults: CustomNIVResult[] | null
  adjustedResults: CustomNIVResult[] | null
  customWeights: CustomWeights
}

function CompareTab({ originalResults, adjustedResults, customWeights }: CompareTabProps) {
  // Combine data for comparison chart
  const comparisonData = useMemo(() => {
    if (!originalResults || !adjustedResults) return []

    const combined: { date: string; original: number; adjusted: number; diff: number }[] = []

    // Create lookup for original results
    const originalMap = new Map(originalResults.map(r => [r.date, r.niv]))

    adjustedResults.forEach(adj => {
      const orig = originalMap.get(adj.date)
      if (orig !== undefined) {
        combined.push({
          date: adj.date,
          original: orig,
          adjusted: adj.niv,
          diff: adj.niv - orig,
        })
      }
    })

    return combined.slice(-36) // Last 3 years
  }, [originalResults, adjustedResults])

  const latestOriginal = originalResults && originalResults.length > 0
    ? originalResults[originalResults.length - 1]
    : null

  const latestAdjusted = adjustedResults && adjustedResults.length > 0
    ? adjustedResults[adjustedResults.length - 1]
    : null

  return (
    <div className="space-y-6">
      {/* Weight Comparison */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="font-bold text-white text-lg mb-4 flex items-center gap-2">
          <GitCompare className="w-5 h-5 text-regen-400" />
          Weight Comparison: Default vs Custom
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2 text-gray-400">Parameter</th>
                <th className="text-center py-2 text-gray-400">Default</th>
                <th className="text-center py-2 text-gray-400">Custom</th>
                <th className="text-center py-2 text-gray-400">Change</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(DEFAULT_WEIGHTS).map((key) => {
                const k = key as keyof CustomWeights
                const defaultVal = DEFAULT_WEIGHTS[k]
                const customVal = customWeights[k]
                const diff = customVal - defaultVal
                const diffPercent = (diff / defaultVal) * 100

                return (
                  <tr key={key} className="border-b border-white/5">
                    <td className="py-2 text-white">{key}</td>
                    <td className="py-2 text-center font-mono text-gray-400">{defaultVal.toFixed(2)}</td>
                    <td className="py-2 text-center font-mono text-regen-400">{customVal.toFixed(2)}</td>
                    <td className={`py-2 text-center font-mono ${
                      diff === 0 ? 'text-gray-500' : diff > 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {diff === 0 ? '—' : `${diff > 0 ? '+' : ''}${diffPercent.toFixed(1)}%`}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* NIV Comparison */}
      {latestOriginal && latestAdjusted && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="glass-card rounded-xl p-6">
            <h4 className="text-sm text-gray-400 mb-2">Default Weights NIV</h4>
            <div className="text-4xl font-mono font-bold text-gray-400">{latestOriginal.niv.toFixed(4)}</div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-dark-700 rounded">
                <span className="text-gray-500">Thrust:</span> <span className="text-white font-mono">{latestOriginal.thrust.toFixed(4)}</span>
              </div>
              <div className="p-2 bg-dark-700 rounded">
                <span className="text-gray-500">P²:</span> <span className="text-white font-mono">{latestOriginal.efficiencySquared.toFixed(4)}</span>
              </div>
              <div className="p-2 bg-dark-700 rounded">
                <span className="text-gray-500">Slack:</span> <span className="text-white font-mono">{latestOriginal.slack.toFixed(4)}</span>
              </div>
              <div className="p-2 bg-dark-700 rounded">
                <span className="text-gray-500">Drag:</span> <span className="text-white font-mono">{latestOriginal.drag.toFixed(4)}</span>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-6 border-2 border-regen-500/30">
            <h4 className="text-sm text-regen-400 mb-2">Custom Weights NIV</h4>
            <div className={`text-4xl font-mono font-bold ${
              latestAdjusted.niv > latestOriginal.niv ? 'text-green-400' : 'text-red-400'
            }`}>
              {latestAdjusted.niv.toFixed(4)}
              <span className="text-lg ml-2">
                ({latestAdjusted.niv > latestOriginal.niv ? '+' : ''}
                {((latestAdjusted.niv - latestOriginal.niv) / Math.abs(latestOriginal.niv) * 100).toFixed(1)}%)
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-dark-700 rounded">
                <span className="text-gray-500">Thrust:</span> <span className="text-regen-400 font-mono">{latestAdjusted.thrust.toFixed(4)}</span>
              </div>
              <div className="p-2 bg-dark-700 rounded">
                <span className="text-gray-500">P²:</span> <span className="text-regen-400 font-mono">{latestAdjusted.efficiencySquared.toFixed(4)}</span>
              </div>
              <div className="p-2 bg-dark-700 rounded">
                <span className="text-gray-500">Slack:</span> <span className="text-regen-400 font-mono">{latestAdjusted.slack.toFixed(4)}</span>
              </div>
              <div className="p-2 bg-dark-700 rounded">
                <span className="text-gray-500">Drag:</span> <span className="text-regen-400 font-mono">{latestAdjusted.drag.toFixed(4)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Time Series Comparison */}
      {comparisonData.length > 0 && (
        <div className="glass-card rounded-xl p-6">
          <h3 className="font-bold text-white text-lg mb-4">NIV Over Time: Default vs Custom</h3>
          <div className="h-80">
            <ResponsiveContainer>
              <ComposedChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#888', fontSize: 10 }}
                  tickFormatter={(v) => v.substring(0, 7)}
                />
                <YAxis tick={{ fill: '#888', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333' }}
                  labelFormatter={(v) => `Date: ${v}`}
                />
                <Legend />
                <ReferenceLine y={0} stroke="#ff4444" strokeDasharray="5 5" />
                <Line
                  type="monotone"
                  dataKey="original"
                  stroke="#666"
                  strokeWidth={2}
                  dot={false}
                  name="Default Weights"
                />
                <Line
                  type="monotone"
                  dataKey="adjusted"
                  stroke="#00d4aa"
                  strokeWidth={2}
                  dot={false}
                  name="Custom Weights"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Difference Chart */}
      {comparisonData.length > 0 && (
        <div className="glass-card rounded-xl p-6">
          <h3 className="font-bold text-white text-lg mb-4">Difference (Custom - Default)</h3>
          <div className="h-48">
            <ResponsiveContainer>
              <AreaChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#888', fontSize: 10 }}
                  tickFormatter={(v) => v.substring(0, 7)}
                />
                <YAxis tick={{ fill: '#888', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333' }}
                  formatter={(value: number) => [value.toFixed(4), 'Difference']}
                />
                <ReferenceLine y={0} stroke="#666" />
                <Area
                  type="monotone"
                  dataKey="diff"
                  stroke="#00d4aa"
                  fill="#00d4aa"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

interface WeightSliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  tooltip: string
  color?: string
  formatValue?: (value: number) => string
}

function WeightSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  tooltip,
  color = 'regen',
  formatValue,
}: WeightSliderProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const percentage = ((value - min) / (max - min)) * 100

  const colorClasses: Record<string, { bg: string; fill: string }> = {
    regen: { bg: 'from-regen-600 to-regen-400', fill: 'bg-regen-500' },
    blue: { bg: 'from-blue-600 to-blue-400', fill: 'bg-blue-500' },
    green: { bg: 'from-green-600 to-green-400', fill: 'bg-green-500' },
    red: { bg: 'from-red-600 to-red-400', fill: 'bg-red-500' },
    purple: { bg: 'from-purple-600 to-purple-400', fill: 'bg-purple-500' },
  }

  const colors = colorClasses[color] || colorClasses.regen

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-200">{label}</span>
          <button
            className="text-gray-500 hover:text-gray-300 transition"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <Info size={12} />
          </button>
        </div>
        <span className="text-sm font-mono text-regen-400">
          {formatValue ? formatValue(value) : value.toFixed(2)}
        </span>
      </div>

      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-xs text-gray-400 bg-dark-700 rounded px-2 py-1 mb-2"
          >
            {tooltip}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative">
        <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
          <motion.div
            className={`h-full bg-gradient-to-r ${colors.bg}`}
            style={{ width: `${percentage}%` }}
            initial={false}
            animate={{ width: `${percentage}%` }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <motion.div
          className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 ${colors.fill} rounded-full shadow-lg border border-white/20`}
          style={{ left: `calc(${percentage}% - 6px)` }}
        />
      </div>

      <div className="flex justify-between text-xs text-gray-500">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}

interface ComponentCardProps {
  label: string
  value: number
  original?: number
  color: string
}

function ComponentCard({ label, value, original, color }: ComponentCardProps) {
  const colorClasses: Record<string, string> = {
    blue: 'text-blue-400 border-blue-500/30',
    green: 'text-green-400 border-green-500/30',
    yellow: 'text-yellow-400 border-yellow-500/30',
    red: 'text-red-400 border-red-500/30',
  }

  const diff = original !== undefined ? value - original : 0
  const diffPercent = original !== undefined && original !== 0 ? (diff / Math.abs(original)) * 100 : 0

  return (
    <div className={`p-3 bg-dark-700 rounded-lg border ${colorClasses[color]}`}>
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className={`text-lg font-mono font-bold ${colorClasses[color].split(' ')[0]}`}>
        {value.toFixed(4)}
      </div>
      {original !== undefined && diff !== 0 && (
        <div className={`text-xs mt-1 ${diff > 0 ? 'text-green-400' : 'text-red-400'}`}>
          {diff > 0 ? '+' : ''}{diffPercent.toFixed(1)}%
        </div>
      )}
    </div>
  )
}
