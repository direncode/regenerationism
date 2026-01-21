'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
  Brush,
  AreaChart,
} from 'recharts'
import {
  Play,
  Loader2,
  Users,
  Package,
  Cog,
  Lightbulb,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  Info,
  TrendingUp,
  TrendingDown,
  Sigma,
  Layers,
  Zap,
  BarChart3,
  Activity,
  Calculator,
  FlaskConical,
  Download,
  Calendar,
} from 'lucide-react'
import { checkServerApiKey } from '@/lib/fredApi'

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS - NIV Engine Parameters
// ═══════════════════════════════════════════════════════════════════════════
const ETA = 1.5
const EPSILON = 0.001
const PROXY_MULTIPLIER = 1.15

// NBER Recession Dates for OOS Testing
const RECESSIONS = [
  { start: '1980-01-01', end: '1980-07-01' },
  { start: '1981-07-01', end: '1982-11-01' },
  { start: '1990-07-01', end: '1991-03-01' },
  { start: '2001-03-01', end: '2001-11-01' },
  { start: '2007-12-01', end: '2009-06-01' },
  { start: '2020-02-01', end: '2020-04-01' },
]

// ═══════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

interface MicroFactor {
  id: string
  name: string
  symbol: string
  description: string
  proxies: ProxyVariable[]
  icon: React.ReactNode
  color: string
  formula: string
  interpretation: string
}

interface ProxyVariable {
  fredId: string
  name: string
  description: string
  transformation: string
  weight: number
}

interface FREDObservation {
  date: string
  value: string
}

interface MicroData {
  date: string
  employment: number | null
  participation: number | null
  hours: number | null
  ppi: number | null
  industrialProd: number | null
  investment: number | null
  capacity: number | null
  durableGoods: number | null
  businessApps: number | null
  sentiment: number | null
  gdp: number | null
  m2: number | null
  fedFunds: number | null
  yieldSpread: number | null
  cpi: number | null
}

interface MicroComponents {
  men: number
  materials: number
  machines: number
  entrepreneurial: number
  microP: number
  traditionalP: number
}

interface NIVComponents {
  thrust: number
  slack: number
  drag: number
  yieldPenalty: number
  realRate: number
  volatility: number
  dG: number
  dA: number
  dr: number
}

interface FullResult {
  date: string
  micro: MicroComponents
  niv: NIVComponents
  nivMicro: number
  nivTraditional: number
  isRecession: boolean
  rawData: MicroData
}

interface OOSResult {
  aucMicro: number
  aucTraditional: number
  winner: 'micro' | 'traditional' | 'tie'
  testSamples: number
  trainSamples: number
  recessionsCaptured: number
  totalRecessions: number
}

// The Four Fundamental Factors
const MICRO_FACTORS: MicroFactor[] = [
  {
    id: 'men',
    name: 'Men (Labor)',
    symbol: 'M_l',
    description: 'Human capital efficiency - the foundation of all economic activity',
    icon: <Users className="w-5 h-5" />,
    color: 'blue',
    formula: 'M_l = (Employment_growth × Participation × Hours_intensity)',
    interpretation: 'Measures labor utilization efficiency.',
    proxies: [
      { fredId: 'PAYEMS', name: 'Total Nonfarm Payrolls', description: 'Employment level', transformation: 'YoY growth rate', weight: 0.4 },
      { fredId: 'CIVPART', name: 'Labor Force Participation Rate', description: 'Working-age population in labor force', transformation: 'Level / 100', weight: 0.35 },
      { fredId: 'AWHNONAG', name: 'Average Weekly Hours', description: 'Hours worked', transformation: 'Level / 40', weight: 0.25 },
    ],
  },
  {
    id: 'materials',
    name: 'Materials',
    symbol: 'M_m',
    description: 'Raw inputs and resource efficiency - the physical substrate of production',
    icon: <Package className="w-5 h-5" />,
    color: 'amber',
    formula: 'M_m = (Industrial_output / Material_costs)',
    interpretation: 'Measures material conversion efficiency.',
    proxies: [
      { fredId: 'INDPRO', name: 'Industrial Production Index', description: 'Real output', transformation: 'Index / 100', weight: 0.6 },
      { fredId: 'PPIACO', name: 'Producer Price Index', description: 'Material costs', transformation: '1 / (YoY + 1)', weight: 0.4 },
    ],
  },
  {
    id: 'machines',
    name: 'Machines',
    symbol: 'M_k',
    description: 'Physical capital productivity - the multiplicative power of tools',
    icon: <Cog className="w-5 h-5" />,
    color: 'emerald',
    formula: 'M_k = (Capacity_utilization × Investment_intensity)',
    interpretation: 'Measures capital stock deployment.',
    proxies: [
      { fredId: 'TCU', name: 'Total Capacity Utilization', description: 'Industrial capacity in use', transformation: 'Level / 100', weight: 0.5 },
      { fredId: 'GPDIC1', name: 'Real Private Investment', description: 'Capital formation', transformation: 'YoY + 1', weight: 0.3 },
      { fredId: 'DGORDER', name: 'Durable Goods Orders', description: 'Long-lasting goods orders', transformation: 'YoY + 1', weight: 0.2 },
    ],
  },
  {
    id: 'entrepreneurial',
    name: 'Entrepreneurial Capital',
    symbol: 'E',
    description: 'Innovation and risk-taking capacity - the organizing intelligence',
    icon: <Lightbulb className="w-5 h-5" />,
    color: 'purple',
    formula: 'E = (Business_formation × Consumer_confidence)',
    interpretation: 'Measures willingness to take productive risks.',
    proxies: [
      { fredId: 'BABATOTALSAUS', name: 'Business Applications', description: 'New business formation', transformation: 'YoY + 1', weight: 0.6 },
      { fredId: 'UMCSENT', name: 'Consumer Sentiment', description: 'Confidence survey', transformation: 'Level / 100', weight: 0.4 },
    ],
  },
]

// All FRED Series needed
const ALL_SERIES = {
  EMPLOYMENT: 'PAYEMS', PARTICIPATION: 'CIVPART', HOURS: 'AWHNONAG',
  PPI: 'PPIACO', INDUSTRIAL: 'INDPRO',
  INVESTMENT: 'GPDIC1', CAPACITY: 'TCU', DURABLE: 'DGORDER',
  BUSINESS_APPS: 'BABATOTALSAUS', SENTIMENT: 'UMCSENT',
  GDP: 'GDPC1', M2: 'M2SL', FED_FUNDS: 'FEDFUNDS', YIELD_SPREAD: 'T10Y3M', CPI: 'CPIAUCSL',
}

// ═══════════════════════════════════════════════════════════════════════════
// OOS TESTING UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

function isInRecession(date: string): boolean {
  const d = new Date(date)
  return RECESSIONS.some(r => d >= new Date(r.start) && d <= new Date(r.end))
}

function calculateAUC(actuals: number[], predictions: number[]): number {
  const pairs = actuals.map((a, i) => ({ actual: a, pred: predictions[i] }))
  pairs.sort((a, b) => b.pred - a.pred)

  let tp = 0, fp = 0
  const totalPos = actuals.filter(a => a === 1).length
  const totalNeg = actuals.length - totalPos

  if (totalPos === 0 || totalNeg === 0) return 0.5

  const points: Array<{ tpr: number; fpr: number }> = [{ tpr: 0, fpr: 0 }]

  for (const pair of pairs) {
    if (pair.actual === 1) tp++
    else fp++
    points.push({ tpr: tp / totalPos, fpr: fp / totalNeg })
  }

  let auc = 0
  for (let i = 1; i < points.length; i++) {
    auc += (points[i].fpr - points[i - 1].fpr) * (points[i].tpr + points[i - 1].tpr) / 2
  }

  return auc
}

function rollingMean(data: number[], window: number): number[] {
  return data.map((_, i) => {
    if (i < window - 1) return NaN
    const slice = data.slice(i - window + 1, i + 1)
    return slice.reduce((a, b) => a + b, 0) / window
  })
}

export default function MicroIntegrationPage() {
  const [isCalculating, setIsCalculating] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<FullResult[]>([])
  const [oosResult, setOosResult] = useState<OOSResult | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['formula']))
  const [hasServerKey, setHasServerKey] = useState<boolean | null>(null)
  const [checkingServerKey, setCheckingServerKey] = useState(true)
  const [brushRange, setBrushRange] = useState<{ startIndex?: number; endIndex?: number }>({})

  useEffect(() => {
    const checkServer = async () => {
      setCheckingServerKey(true)
      const hasKey = await checkServerApiKey()
      setHasServerKey(hasKey)
      setCheckingServerKey(false)
    }
    checkServer()
  }, [])

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) newExpanded.delete(section)
    else newExpanded.add(section)
    setExpandedSections(newExpanded)
  }

  const fetchFREDSeries = async (seriesId: string, startDate: string, endDate: string): Promise<FREDObservation[]> => {
    const proxyUrl = new URL('/api/fred', window.location.origin)
    proxyUrl.searchParams.set('series_id', seriesId)
    proxyUrl.searchParams.set('observation_start', startDate)
    proxyUrl.searchParams.set('observation_end', endDate)
    proxyUrl.searchParams.set('endpoint', 'observations')
    const response = await fetch(proxyUrl.toString())
    if (!response.ok) throw new Error(`Failed to fetch ${seriesId}`)
    const data = await response.json()
    return data.observations || []
  }

  const parseValue = (value: string): number | null => {
    if (value === '.' || value === '') return null
    const parsed = parseFloat(value)
    return isNaN(parsed) ? null : parsed
  }

  const stdDev = (arr: number[]): number => {
    if (arr.length === 0) return 0
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length
    return Math.sqrt(arr.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / arr.length)
  }

  const runOOSTest = useCallback((data: FullResult[]): OOSResult => {
    const smoothWindow = 12
    const predictionLag = 12

    // Smooth NIV values
    const nivMicroValues = data.map(d => d.nivMicro)
    const nivTradValues = data.map(d => d.nivTraditional)
    const smoothedMicro = rollingMean(nivMicroValues, smoothWindow)
    const smoothedTrad = rollingMean(nivTradValues, smoothWindow)

    // Create targets (recession 12 months ahead)
    const targets = data.map((_, i) => {
      if (i + predictionLag < data.length) {
        return data[i + predictionLag].isRecession ? 1 : 0
      }
      return NaN
    })

    // Filter valid data
    const validIndices = data.map((_, i) =>
      !isNaN(smoothedMicro[i]) && !isNaN(smoothedTrad[i]) && !isNaN(targets[i])
    )

    const validData = data.filter((_, i) => validIndices[i])
    const validMicro = smoothedMicro.filter((_, i) => validIndices[i])
    const validTrad = smoothedTrad.filter((_, i) => validIndices[i])
    const validTargets = targets.filter((_, i) => validIndices[i])

    if (validData.length < 50) {
      return { aucMicro: 0.5, aucTraditional: 0.5, winner: 'tie', testSamples: 0, trainSamples: 0, recessionsCaptured: 0, totalRecessions: 0 }
    }

    // For AUC: lower NIV = higher recession risk, so invert
    const predsMicro = validMicro.map(v => -v)
    const predsTrad = validTrad.map(v => -v)

    const aucMicro = calculateAUC(validTargets, predsMicro)
    const aucTraditional = calculateAUC(validTargets, predsTrad)

    const recessionsCaptured = validTargets.filter(t => t === 1).length
    const totalRecessions = RECESSIONS.length

    let winner: 'micro' | 'traditional' | 'tie' = 'tie'
    if (Math.abs(aucMicro - aucTraditional) > 0.01) {
      winner = aucMicro > aucTraditional ? 'micro' : 'traditional'
    }

    return {
      aucMicro,
      aucTraditional,
      winner,
      testSamples: validData.length,
      trainSamples: Math.floor(validData.length * 0.2),
      recessionsCaptured,
      totalRecessions,
    }
  }, [])

  const calculateFullNIV = useCallback(async () => {
    if (!hasServerKey) {
      setError('Server API key not configured')
      return
    }

    setIsCalculating(true)
    setError(null)
    setResults([])
    setOosResult(null)

    try {
      const endDate = new Date().toISOString().split('T')[0]
      // Fetch 60 years for comprehensive OOS testing
      const startDate = '1965-01-01'

      const seriesList = Object.entries(ALL_SERIES)
      const seriesData = new Map<string, FREDObservation[]>()

      for (let i = 0; i < seriesList.length; i++) {
        const [name, seriesId] = seriesList[i]
        setLoadingStatus(`Fetching ${name} (${i + 1}/${seriesList.length})...`)
        try {
          const data = await fetchFREDSeries(seriesId, startDate, endDate)
          seriesData.set(name, data)
        } catch {
          seriesData.set(name, [])
        }
      }

      setLoadingStatus('Processing data...')

      const createLookup = (observations: FREDObservation[]) => {
        const lookup = new Map<string, number>()
        observations.forEach((obs) => {
          const val = parseValue(obs.value)
          if (val !== null) lookup.set(obs.date.substring(0, 7), val)
        })
        return lookup
      }

      const lookups = {
        employment: createLookup(seriesData.get('EMPLOYMENT') || []),
        participation: createLookup(seriesData.get('PARTICIPATION') || []),
        hours: createLookup(seriesData.get('HOURS') || []),
        ppi: createLookup(seriesData.get('PPI') || []),
        industrial: createLookup(seriesData.get('INDUSTRIAL') || []),
        investment: createLookup(seriesData.get('INVESTMENT') || []),
        capacity: createLookup(seriesData.get('CAPACITY') || []),
        durable: createLookup(seriesData.get('DURABLE') || []),
        businessApps: createLookup(seriesData.get('BUSINESS_APPS') || []),
        sentiment: createLookup(seriesData.get('SENTIMENT') || []),
        gdp: createLookup(seriesData.get('GDP') || []),
        m2: createLookup(seriesData.get('M2') || []),
        fedFunds: createLookup(seriesData.get('FED_FUNDS') || []),
        yieldSpread: createLookup(seriesData.get('YIELD_SPREAD') || []),
        cpi: createLookup(seriesData.get('CPI') || []),
      }

      const allDates = Array.from(lookups.m2.keys()).sort()
      const calculatedResults: FullResult[] = []
      let lastInvestment: number | null = null
      let lastGdp: number | null = null
      const fedFundsHistory: number[] = []

      setLoadingStatus('Calculating NIV values...')

      for (let i = 12; i < allDates.length; i++) {
        const monthKey = allDates[i]
        const yearAgoKey = allDates[i - 12]
        const prevMonthKey = allDates[i - 1]

        const employment = lookups.employment.get(monthKey) ?? null
        const participation = lookups.participation.get(monthKey) ?? null
        const hours = lookups.hours.get(monthKey) ?? null
        const ppi = lookups.ppi.get(monthKey) ?? null
        const industrial = lookups.industrial.get(monthKey) ?? null
        const capacity = lookups.capacity.get(monthKey) ?? null
        const durable = lookups.durable.get(monthKey) ?? null
        const businessApps = lookups.businessApps.get(monthKey) ?? null
        const sentiment = lookups.sentiment.get(monthKey) ?? null
        const m2 = lookups.m2.get(monthKey) ?? null
        const fedFunds = lookups.fedFunds.get(monthKey) ?? null
        const yieldSpread = lookups.yieldSpread.get(monthKey) ?? null
        const cpi = lookups.cpi.get(monthKey) ?? null

        const inv = lookups.investment.get(monthKey)
        if (inv !== undefined) lastInvestment = inv
        const gdp = lookups.gdp.get(monthKey)
        if (gdp !== undefined) lastGdp = gdp

        if (fedFunds !== null) {
          fedFundsHistory.push(fedFunds)
          if (fedFundsHistory.length > 12) fedFundsHistory.shift()
        }

        const employmentYA = lookups.employment.get(yearAgoKey) ?? null
        const ppiYA = lookups.ppi.get(yearAgoKey) ?? null
        const industrialYA = lookups.industrial.get(yearAgoKey) ?? null
        const investmentYA = lookups.investment.get(yearAgoKey) ?? null
        const durableYA = lookups.durable.get(yearAgoKey) ?? null
        const businessAppsYA = lookups.businessApps.get(yearAgoKey) ?? null
        const m2YA = lookups.m2.get(yearAgoKey) ?? null
        const cpiYA = lookups.cpi.get(yearAgoKey) ?? null
        const fedFundsPrev = lookups.fedFunds.get(prevMonthKey) ?? null

        if (
          employment === null || employmentYA === null ||
          participation === null || hours === null ||
          industrial === null || industrialYA === null ||
          capacity === null || lastInvestment === null || lastGdp === null ||
          m2 === null || m2YA === null || fedFunds === null ||
          cpi === null || cpiYA === null
        ) continue

        const rawData: MicroData = {
          date: `${monthKey}-01`, employment, participation, hours, ppi,
          industrialProd: industrial, investment: lastInvestment, capacity,
          durableGoods: durable, businessApps, sentiment, gdp: lastGdp,
          m2, fedFunds, yieldSpread, cpi,
        }

        // MICRO COMPONENTS
        const employmentGrowth = (employment - employmentYA) / employmentYA
        const participationRate = participation / 100
        const hoursIntensity = (hours ?? 34) / 40
        const men = (0.4 * (1 + employmentGrowth)) * (0.35 * participationRate + 0.65) * (0.25 * hoursIntensity + 0.75)

        const ppiGrowth = ppi && ppiYA ? (ppi - ppiYA) / ppiYA : 0
        const materialCostPenalty = 1 / (1 + Math.max(0, ppiGrowth))
        const materials = (0.6 * (industrial / 100)) * (0.4 * materialCostPenalty + 0.6)

        const capacityUtil = capacity / 100
        const invGrowth = investmentYA ? (lastInvestment - investmentYA) / investmentYA : 0
        const durableGrowth = durable && durableYA ? (durable - durableYA) / durableYA : 0
        const machines = (0.5 * capacityUtil) * (0.3 * (1 + invGrowth) + 0.7) * (0.2 * (1 + durableGrowth) + 0.8)

        const businessGrowth = businessApps && businessAppsYA ? (businessApps - businessAppsYA) / businessAppsYA : 0
        const confidenceLevel = (sentiment ?? 80) / 100
        const entrepreneurial = (0.6 * (1 + businessGrowth * 0.5) + 0.4) * (0.4 * confidenceLevel + 0.6)

        const microP = Math.pow(Math.max(0.001, men * materials * machines * entrepreneurial), 0.25)
        const traditionalP = (lastInvestment * PROXY_MULTIPLIER) / lastGdp

        // NIV COMPONENTS
        const dG = invGrowth
        const dA = (m2 - m2YA) / m2YA
        const dr = fedFundsPrev !== null ? fedFunds - fedFundsPrev : 0
        const thrust = Math.tanh((1.0 * dG) + (1.0 * dA) - (0.7 * dr))
        const slack = 1.0 - (capacity / 100.0)

        const yieldPenalty = (yieldSpread ?? 0) < 0 ? Math.abs((yieldSpread ?? 0) / 100) : 0
        const inflationRate = (cpi - cpiYA) / cpiYA
        const realRate = Math.max(0, (fedFunds / 100) - inflationRate)
        const volatility = stdDev(fedFundsHistory) / 100
        const drag = (0.4 * yieldPenalty) + (0.4 * realRate) + (0.2 * volatility)

        // COMPUTE NIV
        const safeBase = Math.max(slack + drag, EPSILON)
        const denominator = Math.pow(safeBase, ETA)
        const nivMicro = (thrust * Math.pow(microP, 2)) / denominator
        const nivTraditional = (thrust * Math.pow(traditionalP, 2)) / denominator

        calculatedResults.push({
          date: `${monthKey}-01`,
          micro: { men, materials, machines, entrepreneurial, microP, traditionalP },
          niv: { thrust, slack, drag, yieldPenalty, realRate, volatility, dG, dA, dr },
          nivMicro,
          nivTraditional,
          isRecession: isInRecession(`${monthKey}-01`),
          rawData,
        })
      }

      setResults(calculatedResults)

      // Run OOS test
      setLoadingStatus('Running OOS tests...')
      const oos = runOOSTest(calculatedResults)
      setOosResult(oos)

      setLoadingStatus('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Calculation failed')
    } finally {
      setIsCalculating(false)
    }
  }, [hasServerKey, runOOSTest])

  const latestResult = results[results.length - 1]

  // Chart data with brush filtering
  const chartData = useMemo(() => results.map(r => ({
    date: r.date.substring(0, 7),
    nivMicro: r.nivMicro,
    nivTraditional: r.nivTraditional,
    men: r.micro.men,
    materials: r.micro.materials,
    machines: r.micro.machines,
    entrepreneurial: r.micro.entrepreneurial,
    microP: r.micro.microP,
    traditionalP: r.micro.traditionalP,
    thrust: r.niv.thrust,
    slack: r.niv.slack,
    drag: r.niv.drag,
    isRecession: r.isRecession ? 0.1 : 0,
  })), [results])

  const filteredData = useMemo(() => {
    if (brushRange.startIndex !== undefined && brushRange.endIndex !== undefined) {
      return chartData.slice(brushRange.startIndex, brushRange.endIndex + 1)
    }
    return chartData
  }, [chartData, brushRange])

  const exportCSV = useCallback(() => {
    if (results.length === 0) return
    const headers = ['Date', 'M_l', 'M_m', 'M_k', 'E', 'P_micro', 'P_trad', 'u', 'X', 'F', 'NIV_micro', 'NIV_trad', 'Recession']
    const rows = results.map(r => [
      r.date, r.micro.men.toFixed(4), r.micro.materials.toFixed(4), r.micro.machines.toFixed(4),
      r.micro.entrepreneurial.toFixed(4), r.micro.microP.toFixed(4), r.micro.traditionalP.toFixed(4),
      r.niv.thrust.toFixed(4), r.niv.slack.toFixed(4), r.niv.drag.toFixed(4),
      r.nivMicro.toFixed(4), r.nivTraditional.toFixed(4), r.isRecession ? '1' : '0'
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'micro_niv_data.csv'
    a.click()
  }, [results])

  return (
    <div className="min-h-screen bg-neutral-950 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 mb-4">
            <Layers className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-purple-300">Experimental</span>
          </div>
          <h1 className="text-3xl font-bold text-neutral-100 flex items-center gap-3">
            <Sigma className="w-8 h-8 text-accent-400" />
            Micro Integration Experiment
          </h1>
          <p className="text-neutral-400 mt-2 max-w-3xl">
            Full NIV computation comparing <strong className="text-accent-400">P<sub>micro</sub></strong> vs <strong className="text-neutral-300">P<sub>traditional</sub></strong> with out-of-sample testing.
          </p>
        </div>

        {/* Error Banner */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <span className="text-red-200">{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Formula Section */}
        <CollapsibleSection title="Complete NIV Formula" icon={<Calculator className="w-5 h-5" />}
          isExpanded={expandedSections.has('formula')} onToggle={() => toggleSection('formula')} color="accent">
          <div className="space-y-6">
            <div className="text-center p-6 bg-neutral-900 rounded-xl border border-accent-500/30">
              <div className="font-mono text-2xl md:text-3xl text-accent-400 mb-4">
                NIV<sub>t</sub> = (u<sub>t</sub> × P<sub>t</sub><sup>2</sup>) / (X<sub>t</sub> + F<sub>t</sub>)<sup>η</sup>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-accent-500/10 rounded-lg border border-accent-500/30">
                <h4 className="font-bold text-accent-400 mb-2">Micro-Integrated P</h4>
                <div className="font-mono text-accent-300">P<sub>micro</sub> = (M<sub>l</sub> × M<sub>m</sub> × M<sub>k</sub> × E)<sup>1/4</sup></div>
              </div>
              <div className="p-4 bg-neutral-800 rounded-lg border border-neutral-700">
                <h4 className="font-bold text-neutral-300 mb-2">Traditional P</h4>
                <div className="font-mono text-neutral-400">P<sub>traditional</sub> = (Investment × 1.15) / GDP</div>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-500/10 rounded-lg border-l-4 border-blue-500">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-blue-400" />
                  <span className="font-bold text-blue-400">Thrust (u)</span>
                </div>
                <div className="font-mono text-blue-300 text-sm">u = tanh(ΔG + ΔA − 0.7Δr)</div>
              </div>
              <div className="p-4 bg-yellow-500/10 rounded-lg border-l-4 border-yellow-500">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-yellow-400" />
                  <span className="font-bold text-yellow-400">Slack (X)</span>
                </div>
                <div className="font-mono text-yellow-300 text-sm">X = 1 − (TCU / 100)</div>
              </div>
              <div className="p-4 bg-red-500/10 rounded-lg border-l-4 border-red-500">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-4 h-4 text-red-400" />
                  <span className="font-bold text-red-400">Drag (F)</span>
                </div>
                <div className="font-mono text-red-300 text-sm">F = 0.4s + 0.4(r−π) + 0.2σ</div>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Micro Factors */}
        <CollapsibleSection title="Four Fundamental Factors" icon={<Info className="w-5 h-5" />}
          isExpanded={expandedSections.has('factors')} onToggle={() => toggleSection('factors')} color="purple">
          <div className="grid md:grid-cols-2 gap-4">
            {MICRO_FACTORS.map((factor) => <FactorCard key={factor.id} factor={factor} />)}
          </div>
        </CollapsibleSection>

        {/* Calculate Button */}
        <button onClick={calculateFullNIV} disabled={isCalculating || checkingServerKey || !hasServerKey}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 text-white font-bold rounded-xl transition disabled:opacity-50 my-8">
          {checkingServerKey ? (<><Loader2 className="w-5 h-5 animate-spin" />Initializing...</>) :
           isCalculating ? (<><Loader2 className="w-5 h-5 animate-spin" />{loadingStatus || 'Calculating...'}</>) :
           !hasServerKey ? (<><AlertTriangle className="w-5 h-5" />Server API Key Required</>) :
           (<><Play className="w-5 h-5" />Calculate Full NIV with 60 Years of FRED Data</>)}
        </button>

        {/* Results */}
        {latestResult && (
          <>
            {/* OOS Test Results */}
            {oosResult && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                <h3 className="text-lg font-bold text-neutral-100 mb-4 flex items-center gap-2">
                  <FlaskConical className="w-5 h-5 text-emerald-400" />
                  Out-of-Sample Test Results
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className={`p-6 rounded-xl border ${oosResult.winner === 'micro' ? 'border-accent-500/50 bg-accent-500/10' : 'border-neutral-700 bg-neutral-900'}`}>
                    <div className="text-sm text-neutral-400 mb-1">AUC (Micro P)</div>
                    <div className={`text-4xl font-mono font-bold ${oosResult.winner === 'micro' ? 'text-accent-400' : 'text-neutral-300'}`}>
                      {oosResult.aucMicro.toFixed(3)}
                    </div>
                    {oosResult.winner === 'micro' && <div className="text-xs text-accent-400 mt-2">WINNER</div>}
                  </div>
                  <div className={`p-6 rounded-xl border ${oosResult.winner === 'traditional' ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-neutral-700 bg-neutral-900'}`}>
                    <div className="text-sm text-neutral-400 mb-1">AUC (Traditional P)</div>
                    <div className={`text-4xl font-mono font-bold ${oosResult.winner === 'traditional' ? 'text-emerald-400' : 'text-neutral-300'}`}>
                      {oosResult.aucTraditional.toFixed(3)}
                    </div>
                    {oosResult.winner === 'traditional' && <div className="text-xs text-emerald-400 mt-2">WINNER</div>}
                  </div>
                  <div className="p-6 rounded-xl border border-neutral-700 bg-neutral-900">
                    <div className="text-sm text-neutral-400 mb-1">Advantage</div>
                    <div className={`text-4xl font-mono font-bold ${oosResult.aucMicro > oosResult.aucTraditional ? 'text-accent-400' : 'text-emerald-400'}`}>
                      {oosResult.aucMicro > oosResult.aucTraditional ? '+' : ''}{((oosResult.aucMicro - oosResult.aucTraditional) * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-neutral-500 mt-2">{oosResult.testSamples} samples tested</div>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-neutral-900 rounded-lg border border-neutral-700">
                  <div className="text-sm text-neutral-400">
                    <strong className="text-neutral-200">Interpretation:</strong> AUC (Area Under ROC Curve) measures how well each NIV variant predicts
                    recessions 12 months ahead. Values above 0.5 indicate predictive power, with 1.0 being perfect prediction.
                    {oosResult.recessionsCaptured > 0 && (
                      <span className="ml-1">Test includes {oosResult.recessionsCaptured} recession periods.</span>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Latest Values */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-accent-400" />
                  Latest Values ({latestResult.date})
                </h3>
                <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm text-neutral-300 transition">
                  <Download className="w-4 h-4" />Export CSV
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <MicroFactorCard name="Men" symbol="M_l" value={latestResult.micro.men} icon={<Users className="w-5 h-5" />} color="blue" />
                <MicroFactorCard name="Materials" symbol="M_m" value={latestResult.micro.materials} icon={<Package className="w-5 h-5" />} color="amber" />
                <MicroFactorCard name="Machines" symbol="M_k" value={latestResult.micro.machines} icon={<Cog className="w-5 h-5" />} color="emerald" />
                <MicroFactorCard name="Entrepreneurial" symbol="E" value={latestResult.micro.entrepreneurial} icon={<Lightbulb className="w-5 h-5" />} color="purple" />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <NIVCard title="NIV (Micro P)" value={latestResult.nivMicro} pValue={latestResult.micro.microP} pLabel="P_micro" isHighlighted />
                <NIVCard title="NIV (Traditional P)" value={latestResult.nivTraditional} pValue={latestResult.micro.traditionalP} pLabel="P_trad" isHighlighted={false} />
              </div>
            </motion.div>

            {/* Explorer Chart */}
            <CollapsibleSection title={`Historical Explorer (${results.length} months)`} icon={<Calendar className="w-5 h-5" />}
              isExpanded={expandedSections.has('explorer')} onToggle={() => toggleSection('explorer')} color="blue">
              <div className="space-y-6">
                {/* Main NIV Chart with Brush */}
                <div>
                  <h4 className="text-sm font-semibold text-neutral-300 mb-2">NIV Comparison (drag to select range)</h4>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartData} onMouseUp={(e) => {
                        if (e && e.activeLabel) setBrushRange({})
                      }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="date" stroke="#666" tick={{ fill: '#999', fontSize: 10 }} interval={Math.floor(chartData.length / 10)} />
                        <YAxis stroke="#666" tick={{ fill: '#999', fontSize: 10 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                        <Legend />
                        <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="5 5" />
                        {/* Recession bands */}
                        <Area type="step" dataKey="isRecession" fill="#ef4444" fillOpacity={0.3} stroke="none" name="Recession" />
                        <Line type="monotone" dataKey="nivMicro" stroke="#7c3aed" name="NIV (Micro)" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="nivTraditional" stroke="#6b7280" name="NIV (Traditional)" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                        <Brush dataKey="date" height={30} stroke="#7c3aed" fill="#1a1a1a"
                          onChange={(range) => setBrushRange(range as { startIndex?: number; endIndex?: number })} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Filtered Micro Factors */}
                <div>
                  <h4 className="text-sm font-semibold text-neutral-300 mb-2">Micro Factors (Selected Range: {filteredData.length} months)</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={filteredData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="date" stroke="#666" tick={{ fill: '#999', fontSize: 10 }} />
                        <YAxis stroke="#666" tick={{ fill: '#999', fontSize: 10 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                        <Legend />
                        <Line type="monotone" dataKey="men" stroke="#3b82f6" name="Men (M_l)" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="materials" stroke="#f59e0b" name="Materials (M_m)" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="machines" stroke="#10b981" name="Machines (M_k)" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="entrepreneurial" stroke="#a855f7" name="Entrepreneurial (E)" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* NIV Components */}
                <div>
                  <h4 className="text-sm font-semibold text-neutral-300 mb-2">NIV Components</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={filteredData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="date" stroke="#666" tick={{ fill: '#999', fontSize: 10 }} />
                        <YAxis stroke="#666" tick={{ fill: '#999', fontSize: 10 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                        <Legend />
                        <ReferenceLine y={0} stroke="#666" />
                        <Area type="monotone" dataKey="thrust" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} name="Thrust (u)" />
                        <Area type="monotone" dataKey="slack" stroke="#eab308" fill="#eab308" fillOpacity={0.2} name="Slack (X)" />
                        <Area type="monotone" dataKey="drag" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} name="Drag (F)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            {/* Data Table */}
            <CollapsibleSection title="Data Table" icon={<BarChart3 className="w-5 h-5" />}
              isExpanded={expandedSections.has('table')} onToggle={() => toggleSection('table')} color="gray">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-neutral-400 border-b border-neutral-800">
                      <th className="text-left py-2 px-2">Date</th>
                      <th className="text-right py-2 px-2">M<sub>l</sub></th>
                      <th className="text-right py-2 px-2">M<sub>m</sub></th>
                      <th className="text-right py-2 px-2">M<sub>k</sub></th>
                      <th className="text-right py-2 px-2">E</th>
                      <th className="text-right py-2 px-2">P<sub>μ</sub></th>
                      <th className="text-right py-2 px-2">P<sub>t</sub></th>
                      <th className="text-right py-2 px-2">u</th>
                      <th className="text-right py-2 px-2">X</th>
                      <th className="text-right py-2 px-2">F</th>
                      <th className="text-right py-2 px-2 text-accent-400">NIV<sub>μ</sub></th>
                      <th className="text-right py-2 px-2">NIV<sub>t</sub></th>
                      <th className="text-right py-2 px-2">Rec</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.slice(-36).reverse().map((r) => (
                      <tr key={r.date} className={`border-b border-neutral-800/50 hover:bg-neutral-900 ${r.isRecession ? 'bg-red-500/10' : ''}`}>
                        <td className="py-2 px-2 font-mono text-neutral-300">{r.date.substring(0, 7)}</td>
                        <td className="py-2 px-2 font-mono text-right text-blue-400">{r.micro.men.toFixed(3)}</td>
                        <td className="py-2 px-2 font-mono text-right text-amber-400">{r.micro.materials.toFixed(3)}</td>
                        <td className="py-2 px-2 font-mono text-right text-emerald-400">{r.micro.machines.toFixed(3)}</td>
                        <td className="py-2 px-2 font-mono text-right text-purple-400">{r.micro.entrepreneurial.toFixed(3)}</td>
                        <td className="py-2 px-2 font-mono text-right text-accent-400">{r.micro.microP.toFixed(4)}</td>
                        <td className="py-2 px-2 font-mono text-right text-neutral-400">{r.micro.traditionalP.toFixed(4)}</td>
                        <td className={`py-2 px-2 font-mono text-right ${r.niv.thrust >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{r.niv.thrust.toFixed(3)}</td>
                        <td className="py-2 px-2 font-mono text-right text-yellow-400">{r.niv.slack.toFixed(3)}</td>
                        <td className="py-2 px-2 font-mono text-right text-red-400">{r.niv.drag.toFixed(4)}</td>
                        <td className={`py-2 px-2 font-mono text-right font-bold ${r.nivMicro >= 0.035 ? 'text-emerald-400' : r.nivMicro >= 0.015 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {r.nivMicro.toFixed(4)}
                        </td>
                        <td className="py-2 px-2 font-mono text-right text-neutral-400">{r.nivTraditional.toFixed(4)}</td>
                        <td className="py-2 px-2 font-mono text-right">{r.isRecession ? <span className="text-red-400">●</span> : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-neutral-500 text-center mt-4">Showing last 36 months. Full dataset: {results.length} observations.</p>
            </CollapsibleSection>
          </>
        )}

        {/* Future Directions */}
        <CollapsibleSection title="Future Research" icon={<ArrowRight className="w-5 h-5" />}
          isExpanded={expandedSections.has('future')} onToggle={() => toggleSection('future')} color="gray">
          <ul className="space-y-2 text-neutral-300 text-sm">
            <li><strong className="text-neutral-100">Sector-specific factors:</strong> Different industries may have different factor sensitivities.</li>
            <li><strong className="text-neutral-100">Dynamic weights:</strong> Factor importance may shift during business cycles.</li>
            <li><strong className="text-neutral-100">International comparisons:</strong> How do micro factor compositions differ across economies?</li>
            <li><strong className="text-neutral-100">Leading indicators:</strong> Do certain micro factors lead macro outcomes more than others?</li>
          </ul>
        </CollapsibleSection>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function CollapsibleSection({ title, icon, isExpanded, onToggle, color, children }: {
  title: string; icon: React.ReactNode; isExpanded: boolean; onToggle: () => void; color: string; children: React.ReactNode
}) {
  const colorClasses: Record<string, string> = {
    accent: 'border-accent-500/30 bg-accent-500/5', blue: 'border-blue-500/30 bg-blue-500/5',
    purple: 'border-purple-500/30 bg-purple-500/5', gray: 'border-neutral-700 bg-neutral-900',
  }
  const iconColors: Record<string, string> = {
    accent: 'text-accent-400', blue: 'text-blue-400', purple: 'text-purple-400', gray: 'text-neutral-400',
  }
  return (
    <div className={`mb-4 border rounded-xl overflow-hidden ${colorClasses[color]}`}>
      <button onClick={onToggle} className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition">
        <div className="flex items-center gap-3">
          <span className={iconColors[color]}>{icon}</span>
          <span className="font-bold text-neutral-100">{title}</span>
        </div>
        {isExpanded ? <ChevronDown className="w-5 h-5 text-neutral-400" /> : <ChevronRight className="w-5 h-5 text-neutral-400" />}
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="p-4 border-t border-neutral-800">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function FactorCard({ factor }: { factor: MicroFactor }) {
  const borderColors: Record<string, string> = { blue: 'border-blue-500', amber: 'border-amber-500', emerald: 'border-emerald-500', purple: 'border-purple-500' }
  const textColors: Record<string, string> = { blue: 'text-blue-400', amber: 'text-amber-400', emerald: 'text-emerald-400', purple: 'text-purple-400' }
  return (
    <div className={`p-4 bg-neutral-900 rounded-lg border-l-4 ${borderColors[factor.color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={textColors[factor.color]}>{factor.icon}</span>
        <span className={`font-bold ${textColors[factor.color]}`}>{factor.name}</span>
        <span className="text-neutral-500 font-mono text-sm">({factor.symbol})</span>
      </div>
      <p className="text-sm text-neutral-400 mb-2">{factor.description}</p>
      <div className="text-xs text-neutral-500">
        {factor.proxies.map(p => <span key={p.fredId} className="mr-2 font-mono">{p.fredId}</span>)}
      </div>
    </div>
  )
}

function MicroFactorCard({ name, symbol, value, icon, color }: { name: string; symbol: string; value: number; icon: React.ReactNode; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: 'border-blue-500/30 text-blue-400', amber: 'border-amber-500/30 text-amber-400',
    emerald: 'border-emerald-500/30 text-emerald-400', purple: 'border-purple-500/30 text-purple-400',
  }
  return (
    <div className={`p-4 bg-neutral-900 rounded-lg border ${colorClasses[color].split(' ')[0]}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={colorClasses[color].split(' ')[1]}>{icon}</span>
        <span className="text-sm text-neutral-400">{name}</span>
      </div>
      <div className={`text-2xl font-mono font-bold ${colorClasses[color].split(' ')[1]}`}>{value.toFixed(3)}</div>
      <div className="text-xs text-neutral-500 font-mono">{symbol}</div>
    </div>
  )
}

function NIVCard({ title, value, pValue, pLabel, isHighlighted }: { title: string; value: number; pValue: number; pLabel: string; isHighlighted: boolean }) {
  return (
    <div className={`p-6 rounded-xl border ${isHighlighted ? 'border-accent-500/50 bg-accent-500/5' : 'border-neutral-700 bg-neutral-900'}`}>
      <h4 className={`text-lg font-bold mb-4 ${isHighlighted ? 'text-accent-400' : 'text-neutral-300'}`}>{title}</h4>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-neutral-500 mb-1">NIV Score</div>
          <div className={`text-3xl font-mono font-bold ${value >= 0.035 ? 'text-emerald-400' : value >= 0.015 ? 'text-yellow-400' : 'text-red-400'}`}>
            {value.toFixed(4)}
          </div>
        </div>
        <div>
          <div className="text-xs text-neutral-500 mb-1">{pLabel}</div>
          <div className="text-2xl font-mono text-neutral-300">{pValue.toFixed(4)}</div>
        </div>
      </div>
    </div>
  )
}
