'use client'

import { useState, useCallback, useEffect } from 'react'
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
  Gauge,
  Activity,
  Calculator,
} from 'lucide-react'
import { checkServerApiKey } from '@/lib/fredApi'

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS - NIV Engine Parameters
// ═══════════════════════════════════════════════════════════════════════════
const ETA = 1.5           // Nonlinearity (Crisis Sensitivity)
const EPSILON = 0.001     // Safety Floor (Prevents zero-division)
const PROXY_MULTIPLIER = 1.15  // R&D + Education Proxy

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
  // Men (Labor)
  employment: number | null
  participation: number | null
  hours: number | null
  // Materials
  ppi: number | null
  industrialProd: number | null
  // Machines
  investment: number | null
  capacity: number | null
  durableGoods: number | null
  // Entrepreneurial
  businessApps: number | null
  sentiment: number | null
  // Reference for NIV
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
  // Drag sub-components
  yieldPenalty: number
  realRate: number
  volatility: number
  // Raw inputs
  dG: number  // Investment growth
  dA: number  // M2 growth
  dr: number  // Rate change
}

interface FullResult {
  date: string
  micro: MicroComponents
  niv: NIVComponents
  // Computed NIV values
  nivMicro: number
  nivTraditional: number
  // Recession probabilities
  probMicro: number
  probTraditional: number
  // Status
  statusMicro: 'EXPANSION' | 'SLOWDOWN' | 'CONTRACTION' | 'CRISIS'
  statusTraditional: 'EXPANSION' | 'SLOWDOWN' | 'CONTRACTION' | 'CRISIS'
  rawData: MicroData
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
    interpretation: 'Measures labor utilization efficiency. High values indicate workforce operating near potential with strong participation and productive hours.',
    proxies: [
      { fredId: 'PAYEMS', name: 'Total Nonfarm Payrolls', description: 'Employment level (thousands)', transformation: 'YoY growth rate', weight: 0.4 },
      { fredId: 'CIVPART', name: 'Labor Force Participation Rate', description: 'Percentage of working-age population in labor force', transformation: 'Level / 100', weight: 0.35 },
      { fredId: 'AWHNONAG', name: 'Average Weekly Hours', description: 'Hours worked in non-agricultural sector', transformation: 'Level / 40 (normalized to standard week)', weight: 0.25 },
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
    interpretation: 'Measures how efficiently raw materials convert to output. Rising commodity costs without matching industrial output signals material inefficiency.',
    proxies: [
      { fredId: 'INDPRO', name: 'Industrial Production Index', description: 'Real output of manufacturing, mining, utilities', transformation: 'Index / 100', weight: 0.6 },
      { fredId: 'PPIACO', name: 'Producer Price Index (Commodities)', description: 'Material input costs', transformation: '1 / (YoY growth + 1) - cost inflation penalty', weight: 0.4 },
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
    interpretation: 'Measures how well existing capital stock is deployed and expanded. Low utilization with high investment suggests overcapacity.',
    proxies: [
      { fredId: 'TCU', name: 'Total Capacity Utilization', description: 'Percentage of industrial capacity in use', transformation: 'Level / 100', weight: 0.5 },
      { fredId: 'GPDIC1', name: 'Real Private Domestic Investment', description: 'Capital formation (billions)', transformation: 'YoY growth rate + 1', weight: 0.3 },
      { fredId: 'DGORDER', name: 'Durable Goods Orders', description: 'New orders for long-lasting goods', transformation: 'YoY growth rate + 1', weight: 0.2 },
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
    interpretation: 'Measures the willingness to take productive risks and form new enterprises. Politicians often sacrifice this factor to preserve stability.',
    proxies: [
      { fredId: 'BABATOTALSAUS', name: 'Business Applications', description: 'New business formation applications', transformation: 'YoY growth rate + 1', weight: 0.6 },
      { fredId: 'UMCSENT', name: 'Consumer Sentiment Index', description: 'University of Michigan confidence survey', transformation: 'Level / 100', weight: 0.4 },
    ],
  },
]

// All FRED Series needed
const ALL_SERIES = {
  // Micro factors - Men (Labor)
  EMPLOYMENT: 'PAYEMS',
  PARTICIPATION: 'CIVPART',
  HOURS: 'AWHNONAG',
  // Micro factors - Materials
  PPI: 'PPIACO',
  INDUSTRIAL: 'INDPRO',
  // Micro factors - Machines
  INVESTMENT: 'GPDIC1',
  CAPACITY: 'TCU',
  DURABLE: 'DGORDER',
  // Micro factors - Entrepreneurial
  BUSINESS_APPS: 'BABATOTALSAUS',
  SENTIMENT: 'UMCSENT',
  // NIV Components
  GDP: 'GDPC1',
  M2: 'M2SL',
  FED_FUNDS: 'FEDFUNDS',
  YIELD_SPREAD: 'T10Y3M',
  CPI: 'CPIAUCSL',
}

export default function MicroIntegrationPage() {
  const [isCalculating, setIsCalculating] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<FullResult[]>([])
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['theory', 'formula']))
  const [hasServerKey, setHasServerKey] = useState<boolean | null>(null)
  const [checkingServerKey, setCheckingServerKey] = useState(true)

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
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  const fetchFREDSeries = async (
    seriesId: string,
    startDate: string,
    endDate: string
  ): Promise<FREDObservation[]> => {
    const proxyUrl = new URL('/api/fred', window.location.origin)
    proxyUrl.searchParams.set('series_id', seriesId)
    proxyUrl.searchParams.set('observation_start', startDate)
    proxyUrl.searchParams.set('observation_end', endDate)
    proxyUrl.searchParams.set('endpoint', 'observations')

    const response = await fetch(proxyUrl.toString())
    if (!response.ok) {
      throw new Error(`Failed to fetch ${seriesId}`)
    }
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
    const squaredDiffs = arr.map(x => Math.pow(x - mean, 2))
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / arr.length)
  }

  const calculateStatus = (prob: number): 'EXPANSION' | 'SLOWDOWN' | 'CONTRACTION' | 'CRISIS' => {
    if (prob > 80) return 'CRISIS'
    if (prob > 40) return 'CONTRACTION'
    if (prob > 20) return 'SLOWDOWN'
    return 'EXPANSION'
  }

  const calculateProbability = (niv: number): number => {
    if (niv <= 0) return 99
    if (niv < 0.015) return 85
    if (niv < 0.035) return 45
    return 5
  }

  const calculateFullNIV = useCallback(async () => {
    if (!hasServerKey) {
      setError('Server API key not configured')
      return
    }

    setIsCalculating(true)
    setError(null)
    setResults([])

    try {
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      // Fetch all series
      const seriesList = Object.entries(ALL_SERIES)
      const seriesData = new Map<string, FREDObservation[]>()

      for (let i = 0; i < seriesList.length; i++) {
        const [name, seriesId] = seriesList[i]
        setLoadingStatus(`Fetching ${name} (${i + 1}/${seriesList.length})...`)
        try {
          const data = await fetchFREDSeries(seriesId, startDate, endDate)
          seriesData.set(name, data)
        } catch {
          console.warn(`Failed to fetch ${seriesId}`)
          seriesData.set(name, [])
        }
      }

      setLoadingStatus('Processing data and calculating NIV...')

      // Create monthly lookups
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

      // Get all dates from M2 (monthly, most complete)
      const allDates = Array.from(lookups.m2.keys()).sort()

      const calculatedResults: FullResult[] = []

      // Forward-fill quarterly series
      let lastInvestment: number | null = null
      let lastGdp: number | null = null

      // Store fedFunds for volatility calculation
      const fedFundsHistory: number[] = []

      for (let i = 12; i < allDates.length; i++) {
        const monthKey = allDates[i]
        const yearAgoKey = allDates[i - 12]
        const prevMonthKey = allDates[i - 1]

        // Get current values
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

        // Forward-fill quarterly
        const inv = lookups.investment.get(monthKey)
        if (inv !== undefined) lastInvestment = inv
        const gdp = lookups.gdp.get(monthKey)
        if (gdp !== undefined) lastGdp = gdp

        // Track fedFunds for volatility
        if (fedFunds !== null) {
          fedFundsHistory.push(fedFunds)
          if (fedFundsHistory.length > 12) fedFundsHistory.shift()
        }

        // Get year-ago and prev-month values
        const employmentYA = lookups.employment.get(yearAgoKey) ?? null
        const ppiYA = lookups.ppi.get(yearAgoKey) ?? null
        const industrialYA = lookups.industrial.get(yearAgoKey) ?? null
        const investmentYA = lookups.investment.get(yearAgoKey) ?? null
        const durableYA = lookups.durable.get(yearAgoKey) ?? null
        const businessAppsYA = lookups.businessApps.get(yearAgoKey) ?? null
        const m2YA = lookups.m2.get(yearAgoKey) ?? null
        const cpiYA = lookups.cpi.get(yearAgoKey) ?? null
        const fedFundsPrev = lookups.fedFunds.get(prevMonthKey) ?? null

        // Skip if missing critical data
        if (
          employment === null || employmentYA === null ||
          participation === null || hours === null ||
          industrial === null || industrialYA === null ||
          capacity === null || lastInvestment === null || lastGdp === null ||
          m2 === null || m2YA === null || fedFunds === null ||
          cpi === null || cpiYA === null
        ) {
          continue
        }

        const rawData: MicroData = {
          date: `${monthKey}-01`,
          employment, participation, hours, ppi,
          industrialProd: industrial,
          investment: lastInvestment, capacity, durableGoods: durable,
          businessApps, sentiment, gdp: lastGdp,
          m2, fedFunds, yieldSpread, cpi,
        }

        // ═══════════════════════════════════════════════════════════════════
        // MICRO COMPONENTS CALCULATION
        // ═══════════════════════════════════════════════════════════════════

        // 1. MEN (M_l): Labor Efficiency
        const employmentGrowth = (employment - employmentYA) / employmentYA
        const participationRate = participation / 100
        const hoursIntensity = (hours ?? 34) / 40
        const men = (0.4 * (1 + employmentGrowth)) * (0.35 * participationRate + 0.65) * (0.25 * hoursIntensity + 0.75)

        // 2. MATERIALS (M_m): Resource Efficiency
        const ppiGrowth = ppi && ppiYA ? (ppi - ppiYA) / ppiYA : 0
        const materialCostPenalty = 1 / (1 + Math.max(0, ppiGrowth))
        const materials = (0.6 * (industrial / 100)) * (0.4 * materialCostPenalty + 0.6)

        // 3. MACHINES (M_k): Capital Efficiency
        const capacityUtil = capacity / 100
        const invGrowth = investmentYA ? (lastInvestment - investmentYA) / investmentYA : 0
        const durableGrowth = durable && durableYA ? (durable - durableYA) / durableYA : 0
        const machines = (0.5 * capacityUtil) * (0.3 * (1 + invGrowth) + 0.7) * (0.2 * (1 + durableGrowth) + 0.8)

        // 4. ENTREPRENEURIAL (E): Innovation Capital
        const businessGrowth = businessApps && businessAppsYA ? (businessApps - businessAppsYA) / businessAppsYA : 0
        const confidenceLevel = (sentiment ?? 80) / 100
        const entrepreneurial = (0.6 * (1 + businessGrowth * 0.5) + 0.4) * (0.4 * confidenceLevel + 0.6)

        // P values
        const microP = Math.pow(Math.max(0.001, men * materials * machines * entrepreneurial), 0.25)
        const traditionalP = (lastInvestment * PROXY_MULTIPLIER) / lastGdp

        // ═══════════════════════════════════════════════════════════════════
        // NIV COMPONENTS CALCULATION
        // ═══════════════════════════════════════════════════════════════════

        // THRUST (u) = tanh(1.0*dG + 1.0*dA - 0.7*dr)
        const dG = invGrowth
        const dA = (m2 - m2YA) / m2YA
        const dr = fedFundsPrev !== null ? fedFunds - fedFundsPrev : 0
        const rawThrust = (1.0 * dG) + (1.0 * dA) - (0.7 * dr)
        const thrust = Math.tanh(rawThrust)

        // SLACK (X) = 1 - (TCU / 100)
        const slack = 1.0 - (capacity / 100.0)

        // DRAG (F) = 0.4*s + 0.4*max(0, r-π) + 0.2*σ
        const yieldPenalty = (yieldSpread ?? 0) < 0 ? Math.abs((yieldSpread ?? 0) / 100) : 0
        const inflationRate = (cpi - cpiYA) / cpiYA
        const realRateRaw = (fedFunds / 100) - inflationRate
        const realRate = Math.max(0, realRateRaw)
        const volatility = stdDev(fedFundsHistory) / 100
        const drag = (0.4 * yieldPenalty) + (0.4 * realRate) + (0.2 * volatility)

        // ═══════════════════════════════════════════════════════════════════
        // COMPUTE NIV WITH BOTH P VALUES
        // NIV = (u × P²) / (X + F)^η
        // ═══════════════════════════════════════════════════════════════════

        const microPSquared = Math.pow(microP, 2)
        const traditionalPSquared = Math.pow(traditionalP, 2)

        const numeratorMicro = thrust * microPSquared
        const numeratorTraditional = thrust * traditionalPSquared

        const denominatorBase = slack + drag
        const safeBase = Math.max(denominatorBase, EPSILON)
        const denominator = Math.pow(safeBase, ETA)

        const nivMicro = numeratorMicro / denominator
        const nivTraditional = numeratorTraditional / denominator

        // Probabilities
        const probMicro = calculateProbability(nivMicro)
        const probTraditional = calculateProbability(nivTraditional)

        calculatedResults.push({
          date: `${monthKey}-01`,
          micro: { men, materials, machines, entrepreneurial, microP, traditionalP },
          niv: { thrust, slack, drag, yieldPenalty, realRate, volatility, dG, dA, dr },
          nivMicro,
          nivTraditional,
          probMicro,
          probTraditional,
          statusMicro: calculateStatus(probMicro),
          statusTraditional: calculateStatus(probTraditional),
          rawData,
        })
      }

      setResults(calculatedResults)
      setLoadingStatus('')
    } catch (err) {
      console.error('Calculation error:', err)
      setError(err instanceof Error ? err.message : 'Calculation failed')
    } finally {
      setIsCalculating(false)
    }
  }, [hasServerKey])

  const latestResult = results[results.length - 1]

  // Chart data
  const chartData = results.map(r => ({
    date: r.date.substring(0, 7),
    nivMicro: r.nivMicro,
    nivTraditional: r.nivTraditional,
    probMicro: r.probMicro,
    probTraditional: r.probTraditional,
    men: r.micro.men,
    materials: r.micro.materials,
    machines: r.micro.machines,
    entrepreneurial: r.micro.entrepreneurial,
    microP: r.micro.microP,
    traditionalP: r.micro.traditionalP,
    thrust: r.niv.thrust,
    slack: r.niv.slack,
    drag: r.niv.drag,
  }))

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
            Full NIV computation comparing <strong className="text-accent-400">P<sub>micro</sub></strong> (microeconomic factors)
            vs <strong className="text-neutral-300">P<sub>traditional</sub></strong> (aggregate investment/GDP).
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

        {/* Theoretical Foundation */}
        <CollapsibleSection
          title="Theoretical Foundation"
          icon={<Info className="w-5 h-5" />}
          isExpanded={expandedSections.has('theory')}
          onToggle={() => toggleSection('theory')}
          color="gray"
        >
          <div className="prose prose-invert max-w-none">
            <div className="space-y-4 text-neutral-300">
              <p>
                <strong className="text-neutral-100">Is macroeconomics a result of microeconomics, or the reverse?</strong>
              </p>
              <p>
                This experiment proposes that macroeconomic phenomena emerge from the interaction of
                four fundamental microeconomic resources. Societies rise and fall based on finding
                equilibrium between these factors:
              </p>

              <div className="grid md:grid-cols-2 gap-4 my-6">
                {MICRO_FACTORS.map((factor) => (
                  <FactorCard key={factor.id} factor={factor} />
                ))}
              </div>

              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <p className="text-amber-200 text-sm">
                  <strong>Political Economy Insight:</strong> Politicians often sacrifice efficiency among
                  <strong className="text-blue-400"> Men</strong> (through unemployment benefits, early retirement,
                  labor protections that reduce mobility) to sustain their positions. This creates structural
                  inefficiency that the aggregate P function does not capture.
                </p>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* The Complete Formula */}
        <CollapsibleSection
          title="Complete NIV Formula with Micro P"
          icon={<Calculator className="w-5 h-5" />}
          isExpanded={expandedSections.has('formula')}
          onToggle={() => toggleSection('formula')}
          color="accent"
        >
          <div className="space-y-6">
            {/* Master Equation */}
            <div className="text-center p-6 bg-neutral-900 rounded-xl border border-accent-500/30">
              <div className="font-mono text-2xl md:text-3xl text-accent-400 mb-4">
                NIV<sub>t</sub> = (u<sub>t</sub> × P<sub>t</sub><sup>2</sup>) / (X<sub>t</sub> + F<sub>t</sub>)<sup>η</sup>
              </div>
              <p className="text-neutral-400 text-sm mb-4">
                Where <span className="text-accent-400">P</span> can be either <span className="text-accent-400">P<sub>micro</sub></span> or <span className="text-neutral-300">P<sub>traditional</sub></span>
              </p>
            </div>

            {/* Side by side P formulas */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-accent-500/10 rounded-lg border border-accent-500/30">
                <h4 className="font-bold text-accent-400 mb-2">Micro-Integrated P</h4>
                <div className="font-mono text-accent-300 mb-2">
                  P<sub>micro</sub> = (M<sub>l</sub> × M<sub>m</sub> × M<sub>k</sub> × E)<sup>1/4</sup>
                </div>
                <p className="text-xs text-accent-200/60">
                  Geometric mean of four fundamental factors ensures balanced contribution.
                </p>
              </div>
              <div className="p-4 bg-neutral-800 rounded-lg border border-neutral-700">
                <h4 className="font-bold text-neutral-300 mb-2">Traditional P</h4>
                <div className="font-mono text-neutral-400 mb-2">
                  P<sub>traditional</sub> = (Investment × 1.15) / GDP
                </div>
                <p className="text-xs text-neutral-500">
                  Aggregate capital productivity with R&D proxy multiplier.
                </p>
              </div>
            </div>

            {/* Other Components */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-500/10 rounded-lg border-l-4 border-blue-500">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-blue-400" />
                  <span className="font-bold text-blue-400">Thrust (u)</span>
                </div>
                <div className="font-mono text-blue-300 text-sm">
                  u = tanh(ΔG + ΔA − 0.7Δr)
                </div>
                <p className="text-xs text-blue-200/60 mt-1">Policy impulse: investment + M2 − rate hikes</p>
              </div>
              <div className="p-4 bg-yellow-500/10 rounded-lg border-l-4 border-yellow-500">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-yellow-400" />
                  <span className="font-bold text-yellow-400">Slack (X)</span>
                </div>
                <div className="font-mono text-yellow-300 text-sm">
                  X = 1 − (TCU / 100)
                </div>
                <p className="text-xs text-yellow-200/60 mt-1">Economic headroom before overheating</p>
              </div>
              <div className="p-4 bg-red-500/10 rounded-lg border-l-4 border-red-500">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-4 h-4 text-red-400" />
                  <span className="font-bold text-red-400">Drag (F)</span>
                </div>
                <div className="font-mono text-red-300 text-sm">
                  F = 0.4s + 0.4(r−π) + 0.2σ
                </div>
                <p className="text-xs text-red-200/60 mt-1">Yield penalty + real rates + volatility</p>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Calculate Button */}
        <button
          onClick={calculateFullNIV}
          disabled={isCalculating || checkingServerKey || !hasServerKey}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 text-white font-bold rounded-xl transition disabled:opacity-50 my-8"
        >
          {checkingServerKey ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Initializing...
            </>
          ) : isCalculating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {loadingStatus || 'Calculating...'}
            </>
          ) : !hasServerKey ? (
            <>
              <AlertTriangle className="w-5 h-5" />
              Server API Key Required
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              Calculate Full NIV with Live FRED Data
            </>
          )}
        </button>

        {/* Results */}
        {latestResult && (
          <>
            {/* Main Comparison Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <h3 className="text-lg font-bold text-neutral-100 mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-accent-400" />
                Latest Results ({latestResult.date})
              </h3>

              {/* Side-by-side NIV comparison */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <NIVResultCard
                  title="NIV with Micro P"
                  niv={latestResult.nivMicro}
                  probability={latestResult.probMicro}
                  status={latestResult.statusMicro}
                  pValue={latestResult.micro.microP}
                  pLabel="P_micro"
                  color="accent"
                  isHighlighted={true}
                />
                <NIVResultCard
                  title="NIV with Traditional P"
                  niv={latestResult.nivTraditional}
                  probability={latestResult.probTraditional}
                  status={latestResult.statusTraditional}
                  pValue={latestResult.micro.traditionalP}
                  pLabel="P_traditional"
                  color="neutral"
                  isHighlighted={false}
                />
              </div>

              {/* Divergence indicator */}
              <DivergenceCard
                nivMicro={latestResult.nivMicro}
                nivTraditional={latestResult.nivTraditional}
                probMicro={latestResult.probMicro}
                probTraditional={latestResult.probTraditional}
              />
            </motion.div>

            {/* Micro Factor Breakdown */}
            <CollapsibleSection
              title="Micro Factor Breakdown"
              icon={<Layers className="w-5 h-5" />}
              isExpanded={expandedSections.has('micro')}
              onToggle={() => toggleSection('micro')}
              color="purple"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <MicroFactorCard name="Men" symbol="M_l" value={latestResult.micro.men} icon={<Users className="w-5 h-5" />} color="blue" />
                <MicroFactorCard name="Materials" symbol="M_m" value={latestResult.micro.materials} icon={<Package className="w-5 h-5" />} color="amber" />
                <MicroFactorCard name="Machines" symbol="M_k" value={latestResult.micro.machines} icon={<Cog className="w-5 h-5" />} color="emerald" />
                <MicroFactorCard name="Entrepreneurial" symbol="E" value={latestResult.micro.entrepreneurial} icon={<Lightbulb className="w-5 h-5" />} color="purple" />
              </div>

              {/* Micro factors chart */}
              <div className="h-64 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData.slice(-36)}>
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
            </CollapsibleSection>

            {/* NIV Components */}
            <CollapsibleSection
              title="NIV Components (u, X, F)"
              icon={<Zap className="w-5 h-5" />}
              isExpanded={expandedSections.has('nivcomp')}
              onToggle={() => toggleSection('nivcomp')}
              color="blue"
            >
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <ComponentCard
                  name="Thrust"
                  symbol="u"
                  value={latestResult.niv.thrust}
                  icon={<Zap className="w-5 h-5" />}
                  color="blue"
                  details={[
                    { label: 'ΔG (Inv growth)', value: latestResult.niv.dG },
                    { label: 'ΔA (M2 growth)', value: latestResult.niv.dA },
                    { label: 'Δr (Rate change)', value: latestResult.niv.dr },
                  ]}
                />
                <ComponentCard
                  name="Slack"
                  symbol="X"
                  value={latestResult.niv.slack}
                  icon={<BarChart3 className="w-5 h-5" />}
                  color="yellow"
                  details={[
                    { label: 'Capacity Util', value: latestResult.rawData.capacity ? (latestResult.rawData.capacity / 100) : 0 },
                  ]}
                />
                <ComponentCard
                  name="Drag"
                  symbol="F"
                  value={latestResult.niv.drag}
                  icon={<TrendingDown className="w-5 h-5" />}
                  color="red"
                  details={[
                    { label: 'Yield Penalty', value: latestResult.niv.yieldPenalty },
                    { label: 'Real Rate', value: latestResult.niv.realRate },
                    { label: 'Volatility', value: latestResult.niv.volatility },
                  ]}
                />
              </div>

              {/* Components chart */}
              <div className="h-64 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData.slice(-36)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="date" stroke="#666" tick={{ fill: '#999', fontSize: 10 }} />
                    <YAxis stroke="#666" tick={{ fill: '#999', fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                    <Legend />
                    <ReferenceLine y={0} stroke="#666" />
                    <Line type="monotone" dataKey="thrust" stroke="#3b82f6" name="Thrust (u)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="slack" stroke="#eab308" name="Slack (X)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="drag" stroke="#ef4444" name="Drag (F)" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CollapsibleSection>

            {/* NIV Comparison Chart */}
            <CollapsibleSection
              title="NIV Comparison: Micro vs Traditional"
              icon={<TrendingUp className="w-5 h-5" />}
              isExpanded={expandedSections.has('chart')}
              onToggle={() => toggleSection('chart')}
              color="accent"
            >
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="date" stroke="#666" tick={{ fill: '#999', fontSize: 10 }} interval={Math.floor(chartData.length / 12)} />
                    <YAxis stroke="#666" tick={{ fill: '#999', fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                    <Legend />
                    <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="5 5" />
                    <ReferenceLine y={0.015} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Warning', fill: '#f59e0b', fontSize: 10 }} />
                    <ReferenceLine y={0.035} stroke="#22c55e" strokeDasharray="3 3" label={{ value: 'Normal', fill: '#22c55e', fontSize: 10 }} />
                    <Area type="monotone" dataKey="nivMicro" fill="#7c3aed" fillOpacity={0.2} stroke="none" />
                    <Line type="monotone" dataKey="nivMicro" stroke="#7c3aed" name="NIV (Micro P)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="nivTraditional" stroke="#6b7280" name="NIV (Traditional P)" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CollapsibleSection>

            {/* Probability Comparison */}
            <CollapsibleSection
              title="Recession Probability Comparison"
              icon={<Gauge className="w-5 h-5" />}
              isExpanded={expandedSections.has('prob')}
              onToggle={() => toggleSection('prob')}
              color="red"
            >
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="date" stroke="#666" tick={{ fill: '#999', fontSize: 10 }} interval={Math.floor(chartData.length / 12)} />
                    <YAxis stroke="#666" tick={{ fill: '#999', fontSize: 10 }} domain={[0, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                    <Legend />
                    <ReferenceLine y={40} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Elevated', fill: '#f59e0b', fontSize: 10 }} />
                    <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Critical', fill: '#ef4444', fontSize: 10 }} />
                    <Area type="monotone" dataKey="probMicro" fill="#ef4444" fillOpacity={0.2} stroke="none" />
                    <Line type="monotone" dataKey="probMicro" stroke="#ef4444" name="P(Recession) Micro" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="probTraditional" stroke="#6b7280" name="P(Recession) Traditional" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CollapsibleSection>

            {/* Historical Data Table */}
            <CollapsibleSection
              title={`Historical Data (${results.length} months)`}
              icon={<BarChart3 className="w-5 h-5" />}
              isExpanded={expandedSections.has('history')}
              onToggle={() => toggleSection('history')}
              color="gray"
            >
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
                      <th className="text-right py-2 px-2">Prob<sub>μ</sub></th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.slice(-24).reverse().map((result) => (
                      <tr key={result.date} className="border-b border-neutral-800/50 hover:bg-neutral-900">
                        <td className="py-2 px-2 font-mono text-neutral-300">{result.date.substring(0, 7)}</td>
                        <td className="py-2 px-2 font-mono text-right text-blue-400">{result.micro.men.toFixed(3)}</td>
                        <td className="py-2 px-2 font-mono text-right text-amber-400">{result.micro.materials.toFixed(3)}</td>
                        <td className="py-2 px-2 font-mono text-right text-emerald-400">{result.micro.machines.toFixed(3)}</td>
                        <td className="py-2 px-2 font-mono text-right text-purple-400">{result.micro.entrepreneurial.toFixed(3)}</td>
                        <td className="py-2 px-2 font-mono text-right text-accent-400">{result.micro.microP.toFixed(4)}</td>
                        <td className="py-2 px-2 font-mono text-right text-neutral-400">{result.micro.traditionalP.toFixed(4)}</td>
                        <td className={`py-2 px-2 font-mono text-right ${result.niv.thrust >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{result.niv.thrust.toFixed(3)}</td>
                        <td className="py-2 px-2 font-mono text-right text-yellow-400">{result.niv.slack.toFixed(3)}</td>
                        <td className="py-2 px-2 font-mono text-right text-red-400">{result.niv.drag.toFixed(4)}</td>
                        <td className={`py-2 px-2 font-mono text-right font-bold ${result.nivMicro >= 0.035 ? 'text-emerald-400' : result.nivMicro >= 0.015 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {result.nivMicro.toFixed(4)}
                        </td>
                        <td className="py-2 px-2 font-mono text-right text-neutral-400">{result.nivTraditional.toFixed(4)}</td>
                        <td className={`py-2 px-2 font-mono text-right ${result.probMicro < 40 ? 'text-emerald-400' : result.probMicro < 80 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {result.probMicro.toFixed(0)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-neutral-500 text-center mt-4">
                Showing last 24 months. Full dataset contains {results.length} observations.
              </p>
            </CollapsibleSection>
          </>
        )}

        {/* Future Directions */}
        <CollapsibleSection
          title="Future Research Directions"
          icon={<ArrowRight className="w-5 h-5" />}
          isExpanded={expandedSections.has('future')}
          onToggle={() => toggleSection('future')}
          color="gray"
        >
          <div className="prose prose-invert max-w-none">
            <ul className="space-y-2 text-neutral-300 text-sm">
              <li><strong className="text-neutral-100">Sector-specific micro factors:</strong> Different industries may have different factor sensitivities.</li>
              <li><strong className="text-neutral-100">Dynamic weights:</strong> Factor importance may shift during different phases of the business cycle.</li>
              <li><strong className="text-neutral-100">International comparisons:</strong> How do micro factor compositions differ across economies?</li>
              <li><strong className="text-neutral-100">Policy impact analysis:</strong> Which policies most effectively improve each micro factor?</li>
              <li><strong className="text-neutral-100">Leading indicators:</strong> Do certain micro factors lead macro outcomes more than others?</li>
              <li><strong className="text-neutral-100">Divergence signals:</strong> When NIV<sub>micro</sub> diverges significantly from NIV<sub>traditional</sub>, what does it predict?</li>
            </ul>
          </div>
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
    accent: 'border-accent-500/30 bg-accent-500/5',
    blue: 'border-blue-500/30 bg-blue-500/5',
    green: 'border-green-500/30 bg-green-500/5',
    yellow: 'border-yellow-500/30 bg-yellow-500/5',
    red: 'border-red-500/30 bg-red-500/5',
    purple: 'border-purple-500/30 bg-purple-500/5',
    gray: 'border-neutral-700 bg-neutral-900',
  }
  const iconColors: Record<string, string> = {
    accent: 'text-accent-400', blue: 'text-blue-400', green: 'text-green-400',
    yellow: 'text-yellow-400', red: 'text-red-400', purple: 'text-purple-400', gray: 'text-neutral-400',
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
      <p className="text-sm text-neutral-400">{factor.description}</p>
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

function ComponentCard({ name, symbol, value, icon, color, details }: {
  name: string; symbol: string; value: number; icon: React.ReactNode; color: string; details: { label: string; value: number }[]
}) {
  const colorClasses: Record<string, string> = {
    blue: 'border-blue-500/30 text-blue-400 bg-blue-500/5',
    yellow: 'border-yellow-500/30 text-yellow-400 bg-yellow-500/5',
    red: 'border-red-500/30 text-red-400 bg-red-500/5',
  }

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <span>{icon}</span>
        <span className="font-bold">{name}</span>
        <span className="text-neutral-500 font-mono text-sm">({symbol})</span>
      </div>
      <div className="text-3xl font-mono font-bold mb-2">{value.toFixed(4)}</div>
      <div className="space-y-1">
        {details.map((d) => (
          <div key={d.label} className="flex justify-between text-xs">
            <span className="text-neutral-500">{d.label}</span>
            <span className="font-mono">{d.value.toFixed(4)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function NIVResultCard({ title, niv, probability, status, pValue, pLabel, color, isHighlighted }: {
  title: string; niv: number; probability: number; status: string; pValue: number; pLabel: string; color: string; isHighlighted: boolean
}) {
  const statusColors: Record<string, string> = {
    EXPANSION: 'text-emerald-400 bg-emerald-500/20',
    SLOWDOWN: 'text-yellow-400 bg-yellow-500/20',
    CONTRACTION: 'text-orange-400 bg-orange-500/20',
    CRISIS: 'text-red-400 bg-red-500/20',
  }

  return (
    <div className={`p-6 rounded-xl border ${isHighlighted ? 'border-accent-500/50 bg-accent-500/5' : 'border-neutral-700 bg-neutral-900'}`}>
      <h4 className={`text-lg font-bold mb-4 ${isHighlighted ? 'text-accent-400' : 'text-neutral-300'}`}>{title}</h4>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-xs text-neutral-500 mb-1">NIV Score</div>
          <div className={`text-3xl font-mono font-bold ${niv >= 0.035 ? 'text-emerald-400' : niv >= 0.015 ? 'text-yellow-400' : 'text-red-400'}`}>
            {niv.toFixed(4)}
          </div>
        </div>
        <div>
          <div className="text-xs text-neutral-500 mb-1">P(Recession)</div>
          <div className={`text-3xl font-mono font-bold ${probability < 40 ? 'text-emerald-400' : probability < 80 ? 'text-yellow-400' : 'text-red-400'}`}>
            {probability.toFixed(0)}%
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-neutral-500">{pLabel}</div>
          <div className="font-mono text-sm">{pValue.toFixed(4)}</div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColors[status]}`}>
          {status}
        </span>
      </div>
    </div>
  )
}

function DivergenceCard({ nivMicro, nivTraditional, probMicro, probTraditional }: {
  nivMicro: number; nivTraditional: number; probMicro: number; probTraditional: number
}) {
  const nivDiff = nivMicro - nivTraditional
  const nivDiffPct = ((nivMicro - nivTraditional) / Math.abs(nivTraditional)) * 100
  const probDiff = probMicro - probTraditional

  const isSignificantDivergence = Math.abs(nivDiffPct) > 20 || Math.abs(probDiff) > 15

  return (
    <div className={`p-4 rounded-xl border ${isSignificantDivergence ? 'border-amber-500/50 bg-amber-500/10' : 'border-neutral-700 bg-neutral-900'}`}>
      <div className="flex items-center gap-2 mb-3">
        {isSignificantDivergence ? (
          <AlertTriangle className="w-5 h-5 text-amber-400" />
        ) : (
          <Activity className="w-5 h-5 text-neutral-400" />
        )}
        <span className={`font-bold ${isSignificantDivergence ? 'text-amber-400' : 'text-neutral-300'}`}>
          Model Divergence Analysis
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-xs text-neutral-500 mb-1">NIV Difference</div>
          <div className={`text-xl font-mono font-bold ${nivDiff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {nivDiff >= 0 ? '+' : ''}{nivDiff.toFixed(4)}
          </div>
          <div className="text-xs text-neutral-500">
            ({nivDiffPct >= 0 ? '+' : ''}{nivDiffPct.toFixed(1)}%)
          </div>
        </div>
        <div>
          <div className="text-xs text-neutral-500 mb-1">Probability Diff</div>
          <div className={`text-xl font-mono font-bold ${probDiff <= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {probDiff >= 0 ? '+' : ''}{probDiff.toFixed(0)}%
          </div>
        </div>
        <div>
          <div className="text-xs text-neutral-500 mb-1">Interpretation</div>
          <div className={`text-sm ${isSignificantDivergence ? 'text-amber-300' : 'text-neutral-400'}`}>
            {nivDiff > 0
              ? 'Micro factors more optimistic'
              : nivDiff < 0
                ? 'Hidden micro inefficiencies'
                : 'Models agree'}
          </div>
        </div>
      </div>

      {isSignificantDivergence && (
        <p className="text-xs text-amber-200/70 mt-3">
          Significant divergence detected. This may indicate that aggregate measures are missing
          important microeconomic dynamics.
        </p>
      )}
    </div>
  )
}
