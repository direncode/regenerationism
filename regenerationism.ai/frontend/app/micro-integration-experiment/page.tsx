'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  Sigma,
  Layers,
} from 'lucide-react'
import { checkServerApiKey } from '@/lib/fredApi'

// ═══════════════════════════════════════════════════════════════════════════
// MICROECONOMIC FACTORS - The Four Pillars
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
  employment: number | null      // PAYEMS
  participation: number | null   // CIVPART
  hours: number | null           // AWHNONAG
  // Materials
  ppi: number | null             // PPIACO
  industrialProd: number | null  // INDPRO
  // Machines
  investment: number | null      // GPDIC1
  capacity: number | null        // TCU
  durableGoods: number | null    // DGORDER
  // Entrepreneurial
  businessApps: number | null    // BABATOTALSAUS (Business Applications)
  sentiment: number | null       // UMCSENT
  // Reference
  gdp: number | null             // GDPC1
}

interface MicroComponents {
  men: number           // M_l - Labor efficiency
  materials: number     // M_m - Material productivity
  machines: number      // M_k - Capital efficiency
  entrepreneurial: number // E - Innovation/risk capital
  microP: number        // Combined micro-efficiency
  traditionalP: number  // Original P = (Inv × 1.15) / GDP
  ratio: number         // microP / traditionalP
}

interface MicroResult {
  date: string
  components: MicroComponents
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
      {
        fredId: 'PAYEMS',
        name: 'Total Nonfarm Payrolls',
        description: 'Employment level (thousands)',
        transformation: 'YoY growth rate',
        weight: 0.4,
      },
      {
        fredId: 'CIVPART',
        name: 'Labor Force Participation Rate',
        description: 'Percentage of working-age population in labor force',
        transformation: 'Level / 100',
        weight: 0.35,
      },
      {
        fredId: 'AWHNONAG',
        name: 'Average Weekly Hours',
        description: 'Hours worked in non-agricultural sector',
        transformation: 'Level / 40 (normalized to standard week)',
        weight: 0.25,
      },
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
      {
        fredId: 'INDPRO',
        name: 'Industrial Production Index',
        description: 'Real output of manufacturing, mining, utilities',
        transformation: 'Index / 100',
        weight: 0.6,
      },
      {
        fredId: 'PPIACO',
        name: 'Producer Price Index (Commodities)',
        description: 'Material input costs',
        transformation: '1 / (YoY growth + 1) - cost inflation penalty',
        weight: 0.4,
      },
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
      {
        fredId: 'TCU',
        name: 'Total Capacity Utilization',
        description: 'Percentage of industrial capacity in use',
        transformation: 'Level / 100',
        weight: 0.5,
      },
      {
        fredId: 'GPDIC1',
        name: 'Real Private Domestic Investment',
        description: 'Capital formation (billions)',
        transformation: 'YoY growth rate + 1',
        weight: 0.3,
      },
      {
        fredId: 'DGORDER',
        name: 'Durable Goods Orders',
        description: 'New orders for long-lasting goods',
        transformation: 'YoY growth rate + 1',
        weight: 0.2,
      },
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
      {
        fredId: 'BABATOTALSAUS',
        name: 'Business Applications',
        description: 'New business formation applications',
        transformation: 'YoY growth rate + 1',
        weight: 0.6,
      },
      {
        fredId: 'UMCSENT',
        name: 'Consumer Sentiment Index',
        description: 'University of Michigan confidence survey',
        transformation: 'Level / 100',
        weight: 0.4,
      },
    ],
  },
]

// FRED Series needed for micro factors
const MICRO_SERIES = {
  // Men (Labor)
  EMPLOYMENT: 'PAYEMS',
  PARTICIPATION: 'CIVPART',
  HOURS: 'AWHNONAG',
  // Materials
  PPI: 'PPIACO',
  INDUSTRIAL: 'INDPRO',
  // Machines
  INVESTMENT: 'GPDIC1',
  CAPACITY: 'TCU',
  DURABLE: 'DGORDER',
  // Entrepreneurial
  BUSINESS_APPS: 'BABATOTALSAUS',
  SENTIMENT: 'UMCSENT',
  // Reference
  GDP: 'GDPC1',
}

export default function MicroIntegrationPage() {
  const [isCalculating, setIsCalculating] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<MicroResult[]>([])
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

  const getProxyUrl = () => {
    if (typeof window !== 'undefined') {
      return '/api/fred'
    }
    return '/api/fred'
  }

  const fetchFREDSeries = async (
    seriesId: string,
    startDate: string,
    endDate: string
  ): Promise<FREDObservation[]> => {
    const proxyUrl = new URL(getProxyUrl(), window.location.origin)
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

  const calculateMicroComponents = useCallback(async () => {
    if (!hasServerKey) {
      setError('Server API key not configured')
      return
    }

    setIsCalculating(true)
    setError(null)
    setResults([])

    try {
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      // Fetch all series
      const seriesList = Object.entries(MICRO_SERIES)
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

      setLoadingStatus('Processing micro factors...')

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

      const employmentLookup = createLookup(seriesData.get('EMPLOYMENT') || [])
      const participationLookup = createLookup(seriesData.get('PARTICIPATION') || [])
      const hoursLookup = createLookup(seriesData.get('HOURS') || [])
      const ppiLookup = createLookup(seriesData.get('PPI') || [])
      const industrialLookup = createLookup(seriesData.get('INDUSTRIAL') || [])
      const investmentLookup = createLookup(seriesData.get('INVESTMENT') || [])
      const capacityLookup = createLookup(seriesData.get('CAPACITY') || [])
      const durableLookup = createLookup(seriesData.get('DURABLE') || [])
      const businessAppsLookup = createLookup(seriesData.get('BUSINESS_APPS') || [])
      const sentimentLookup = createLookup(seriesData.get('SENTIMENT') || [])
      const gdpLookup = createLookup(seriesData.get('GDP') || [])

      // Get all dates from employment (monthly)
      const allDates = Array.from(employmentLookup.keys()).sort()

      // Need 12 months for YoY calculations
      const calculatedResults: MicroResult[] = []

      // Forward-fill quarterly series
      let lastInvestment: number | null = null
      let lastGdp: number | null = null

      for (let i = 12; i < allDates.length; i++) {
        const monthKey = allDates[i]
        const yearAgoKey = allDates[i - 12]

        // Get current values
        const employment = employmentLookup.get(monthKey) ?? null
        const participation = participationLookup.get(monthKey) ?? null
        const hours = hoursLookup.get(monthKey) ?? null
        const ppi = ppiLookup.get(monthKey) ?? null
        const industrial = industrialLookup.get(monthKey) ?? null
        const capacity = capacityLookup.get(monthKey) ?? null
        const durable = durableLookup.get(monthKey) ?? null
        const businessApps = businessAppsLookup.get(monthKey) ?? null
        const sentiment = sentimentLookup.get(monthKey) ?? null

        // Forward-fill quarterly
        const inv = investmentLookup.get(monthKey)
        if (inv !== undefined) lastInvestment = inv
        const gdp = gdpLookup.get(monthKey)
        if (gdp !== undefined) lastGdp = gdp

        // Get year-ago values
        const employmentYA = employmentLookup.get(yearAgoKey) ?? null
        const ppiYA = ppiLookup.get(yearAgoKey) ?? null
        const industrialYA = industrialLookup.get(yearAgoKey) ?? null
        const investmentYA = investmentLookup.get(yearAgoKey) ?? lastInvestment
        const durableYA = durableLookup.get(yearAgoKey) ?? null
        const businessAppsYA = businessAppsLookup.get(yearAgoKey) ?? null

        // Skip if missing critical data
        if (
          employment === null || employmentYA === null ||
          participation === null || hours === null ||
          industrial === null || industrialYA === null ||
          capacity === null || lastInvestment === null || lastGdp === null
        ) {
          continue
        }

        const rawData: MicroData = {
          date: `${monthKey}-01`,
          employment,
          participation,
          hours,
          ppi,
          industrialProd: industrial,
          investment: lastInvestment,
          capacity,
          durableGoods: durable,
          businessApps,
          sentiment,
          gdp: lastGdp,
        }

        // ═══════════════════════════════════════════════════════════════════
        // CALCULATE MICRO COMPONENTS
        // ═══════════════════════════════════════════════════════════════════

        // 1. MEN (M_l): Labor Efficiency
        // Employment growth + participation + hours intensity
        const employmentGrowth = (employment - employmentYA) / employmentYA
        const participationRate = participation / 100
        const hoursIntensity = (hours ?? 34) / 40 // Normalize to 40-hour week

        // Weighted combination
        const men = (0.4 * (1 + employmentGrowth)) * (0.35 * participationRate + 0.65) * (0.25 * hoursIntensity + 0.75)

        // 2. MATERIALS (M_m): Resource Efficiency
        // Industrial output relative to material costs
        const industrialGrowth = (industrial - industrialYA) / industrialYA
        const ppiGrowth = ppi && ppiYA ? (ppi - ppiYA) / ppiYA : 0
        // Penalize high commodity inflation
        const materialCostPenalty = 1 / (1 + Math.max(0, ppiGrowth))
        const materials = (0.6 * (industrial / 100)) * (0.4 * materialCostPenalty + 0.6)

        // 3. MACHINES (M_k): Capital Efficiency
        // Capacity utilization × investment intensity
        const capacityUtil = capacity / 100
        const invGrowth = investmentYA ? (lastInvestment - investmentYA) / investmentYA : 0
        const durableGrowth = durable && durableYA ? (durable - durableYA) / durableYA : 0
        const machines = (0.5 * capacityUtil) * (0.3 * (1 + invGrowth) + 0.7) * (0.2 * (1 + durableGrowth) + 0.8)

        // 4. ENTREPRENEURIAL (E): Innovation Capital
        // Business formation × confidence
        const businessGrowth = businessApps && businessAppsYA
          ? (businessApps - businessAppsYA) / businessAppsYA
          : 0
        const confidenceLevel = (sentiment ?? 80) / 100
        const entrepreneurial = (0.6 * (1 + businessGrowth * 0.5) + 0.4) * (0.4 * confidenceLevel + 0.6)

        // ═══════════════════════════════════════════════════════════════════
        // MICRO-INTEGRATED P FUNCTION
        // P_micro = (M_l × M_m × M_k × E)^(1/4)
        // Geometric mean ensures all factors matter equally
        // ═══════════════════════════════════════════════════════════════════

        const microP = Math.pow(men * materials * machines * entrepreneurial, 0.25)

        // Traditional P for comparison
        const traditionalP = (lastInvestment * 1.15) / lastGdp

        const components: MicroComponents = {
          men,
          materials,
          machines,
          entrepreneurial,
          microP,
          traditionalP,
          ratio: microP / traditionalP,
        }

        calculatedResults.push({
          date: `${monthKey}-01`,
          components,
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

  return (
    <div className="min-h-screen bg-neutral-950 pt-20 pb-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
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
            Exploring how microeconomic fundamentals — <strong className="text-blue-400">Men</strong>,{' '}
            <strong className="text-amber-400">Materials</strong>,{' '}
            <strong className="text-emerald-400">Machines</strong>, and{' '}
            <strong className="text-purple-400">Entrepreneurial Capital</strong> —
            aggregate to produce macroeconomic outcomes.
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
                  <div
                    key={factor.id}
                    className={`p-4 bg-neutral-900 rounded-lg border-l-4 border-${factor.color}-500`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-${factor.color}-400`}>{factor.icon}</span>
                      <span className={`font-bold text-${factor.color}-400`}>{factor.name}</span>
                      <span className="text-neutral-500 font-mono text-sm">({factor.symbol})</span>
                    </div>
                    <p className="text-sm text-neutral-400">{factor.description}</p>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <p className="text-amber-200 text-sm">
                  <strong>Political Economy Insight:</strong> Politicians often sacrifice efficiency among
                  <strong className="text-blue-400"> Men</strong> (through unemployment benefits, early retirement,
                  labor protections that reduce mobility) to sustain their positions. This creates structural
                  inefficiency that the current aggregate P function does not capture.
                </p>
              </div>

              <p>
                The traditional NIV formula uses an aggregate efficiency measure:
              </p>
              <div className="font-mono text-emerald-400 text-lg p-3 bg-neutral-900 rounded">
                P = (Investment × 1.15) / GDP
              </div>
              <p className="text-neutral-500 text-sm">
                This treats capital as homogeneous. But real productivity depends on how well
                all four factors are utilized and coordinated.
              </p>
            </div>
          </div>
        </CollapsibleSection>

        {/* The Micro-Integrated Formula */}
        <CollapsibleSection
          title="The Micro-Integrated P Function"
          icon={<Sigma className="w-5 h-5" />}
          isExpanded={expandedSections.has('formula')}
          onToggle={() => toggleSection('formula')}
          color="accent"
        >
          <div className="space-y-6">
            {/* Master Micro Equation */}
            <div className="text-center p-6 bg-neutral-900 rounded-xl border border-accent-500/30">
              <div className="font-mono text-2xl md:text-3xl text-accent-400 mb-4">
                P<sub>micro</sub> = (M<sub>l</sub> × M<sub>m</sub> × M<sub>k</sub> × E)<sup>1/4</sup>
              </div>
              <p className="text-neutral-400 text-sm">
                Geometric mean ensures all factors contribute equally — weakness in any factor
                drags down the whole system.
              </p>
            </div>

            {/* Component Formulas */}
            <div className="grid md:grid-cols-2 gap-4">
              {MICRO_FACTORS.map((factor) => (
                <div
                  key={factor.id}
                  className={`p-4 bg-neutral-900 rounded-lg border-l-4`}
                  style={{ borderLeftColor: `var(--${factor.color}-500, #888)` }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-${factor.color}-400`}>{factor.icon}</span>
                    <span className="font-bold text-neutral-100">{factor.name}</span>
                    <span className="text-neutral-500 font-mono text-sm">({factor.symbol})</span>
                  </div>
                  <div className={`font-mono text-sm text-${factor.color}-400 mb-2 bg-neutral-800 p-2 rounded`}>
                    {factor.formula}
                  </div>
                  <p className="text-xs text-neutral-500">{factor.interpretation}</p>

                  <div className="mt-3 space-y-1">
                    <div className="text-xs text-neutral-500 font-semibold">FRED Proxies:</div>
                    {factor.proxies.map((proxy) => (
                      <div key={proxy.fredId} className="text-xs text-neutral-600 flex justify-between">
                        <span className="font-mono text-neutral-400">{proxy.fredId}</span>
                        <span>{proxy.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Integration with NIV */}
            <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <h4 className="font-bold text-purple-300 mb-2">Proposed NIV Modification</h4>
              <div className="font-mono text-purple-400 text-lg mb-2">
                NIV<sub>micro</sub> = (u<sub>t</sub> × P<sub>micro</sub><sup>2</sup>) / (X<sub>t</sub> + F<sub>t</sub>)<sup>η</sup>
              </div>
              <p className="text-sm text-purple-200">
                By substituting P<sub>micro</sub> for the traditional P, we capture inefficiencies
                in specific factors that aggregate measures miss.
              </p>
            </div>
          </div>
        </CollapsibleSection>

        {/* Calculate Button */}
        <button
          onClick={calculateMicroComponents}
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
              Calculate Micro Components with Live FRED Data
            </>
          )}
        </button>

        {/* Results */}
        {latestResult && (
          <>
            {/* Summary Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <h3 className="text-lg font-bold text-neutral-100 mb-4">
                Latest Results ({latestResult.date})
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <MicroFactorCard
                  name="Men"
                  symbol="M_l"
                  value={latestResult.components.men}
                  icon={<Users className="w-5 h-5" />}
                  color="blue"
                />
                <MicroFactorCard
                  name="Materials"
                  symbol="M_m"
                  value={latestResult.components.materials}
                  icon={<Package className="w-5 h-5" />}
                  color="amber"
                />
                <MicroFactorCard
                  name="Machines"
                  symbol="M_k"
                  value={latestResult.components.machines}
                  icon={<Cog className="w-5 h-5" />}
                  color="emerald"
                />
                <MicroFactorCard
                  name="Entrepreneurial"
                  symbol="E"
                  value={latestResult.components.entrepreneurial}
                  icon={<Lightbulb className="w-5 h-5" />}
                  color="purple"
                />
              </div>

              {/* P Comparison */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 bg-neutral-900 rounded-lg border border-accent-500/30 text-center">
                  <div className="text-3xl font-mono font-bold text-accent-400">
                    {latestResult.components.microP.toFixed(4)}
                  </div>
                  <div className="text-sm text-neutral-400 mt-1">P<sub>micro</sub></div>
                  <div className="text-xs text-neutral-500">Micro-integrated efficiency</div>
                </div>
                <div className="p-4 bg-neutral-900 rounded-lg border border-neutral-700 text-center">
                  <div className="text-3xl font-mono font-bold text-neutral-300">
                    {latestResult.components.traditionalP.toFixed(4)}
                  </div>
                  <div className="text-sm text-neutral-400 mt-1">P<sub>traditional</sub></div>
                  <div className="text-xs text-neutral-500">Original (Inv × 1.15) / GDP</div>
                </div>
                <div className="p-4 bg-neutral-900 rounded-lg border border-neutral-700 text-center">
                  <div className={`text-3xl font-mono font-bold ${
                    latestResult.components.ratio > 1 ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {latestResult.components.ratio.toFixed(3)}×
                  </div>
                  <div className="text-sm text-neutral-400 mt-1">Ratio</div>
                  <div className="text-xs text-neutral-500">
                    {latestResult.components.ratio > 1
                      ? 'Micro factors outperforming aggregate'
                      : 'Hidden inefficiencies in micro factors'}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Historical Chart Placeholder */}
            <CollapsibleSection
              title={`Historical Data (${results.length} months)`}
              icon={<TrendingUp className="w-5 h-5" />}
              isExpanded={expandedSections.has('history')}
              onToggle={() => toggleSection('history')}
              color="gray"
            >
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-neutral-400 border-b border-neutral-800">
                        <th className="text-left py-2 px-2">Date</th>
                        <th className="text-right py-2 px-2">M<sub>l</sub></th>
                        <th className="text-right py-2 px-2">M<sub>m</sub></th>
                        <th className="text-right py-2 px-2">M<sub>k</sub></th>
                        <th className="text-right py-2 px-2">E</th>
                        <th className="text-right py-2 px-2">P<sub>micro</sub></th>
                        <th className="text-right py-2 px-2">P<sub>trad</sub></th>
                        <th className="text-right py-2 px-2">Ratio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.slice(-24).reverse().map((result) => (
                        <tr key={result.date} className="border-b border-neutral-800/50 hover:bg-neutral-900">
                          <td className="py-2 px-2 font-mono text-neutral-300">{result.date.substring(0, 7)}</td>
                          <td className="py-2 px-2 font-mono text-right text-blue-400">{result.components.men.toFixed(3)}</td>
                          <td className="py-2 px-2 font-mono text-right text-amber-400">{result.components.materials.toFixed(3)}</td>
                          <td className="py-2 px-2 font-mono text-right text-emerald-400">{result.components.machines.toFixed(3)}</td>
                          <td className="py-2 px-2 font-mono text-right text-purple-400">{result.components.entrepreneurial.toFixed(3)}</td>
                          <td className="py-2 px-2 font-mono text-right text-accent-400">{result.components.microP.toFixed(4)}</td>
                          <td className="py-2 px-2 font-mono text-right text-neutral-400">{result.components.traditionalP.toFixed(4)}</td>
                          <td className={`py-2 px-2 font-mono text-right ${result.components.ratio > 1 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {result.components.ratio.toFixed(3)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-neutral-500 text-center">
                  Showing last 24 months. Full dataset contains {results.length} observations.
                </p>
              </div>
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
              <li>
                <strong className="text-neutral-100">Sector-specific micro factors:</strong> Different
                industries may have different factor sensitivities (tech vs. manufacturing).
              </li>
              <li>
                <strong className="text-neutral-100">Dynamic weights:</strong> Factor importance may
                shift during different phases of the business cycle.
              </li>
              <li>
                <strong className="text-neutral-100">International comparisons:</strong> How do micro
                factor compositions differ across economies?
              </li>
              <li>
                <strong className="text-neutral-100">Policy impact analysis:</strong> Which policies
                most effectively improve each micro factor?
              </li>
              <li>
                <strong className="text-neutral-100">Leading indicators:</strong> Do certain micro
                factors lead macro outcomes more than others?
              </li>
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

function CollapsibleSection({
  title,
  icon,
  isExpanded,
  onToggle,
  color,
  children,
}: {
  title: string
  icon: React.ReactNode
  isExpanded: boolean
  onToggle: () => void
  color: string
  children: React.ReactNode
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
    accent: 'text-accent-400',
    blue: 'text-blue-400',
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    red: 'text-red-400',
    purple: 'text-purple-400',
    gray: 'text-neutral-400',
  }

  return (
    <div className={`mb-4 border rounded-xl overflow-hidden ${colorClasses[color]}`}>
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition"
      >
        <div className="flex items-center gap-3">
          <span className={iconColors[color]}>{icon}</span>
          <span className="font-bold text-neutral-100">{title}</span>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-5 h-5 text-neutral-400" />
        ) : (
          <ChevronRight className="w-5 h-5 text-neutral-400" />
        )}
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 border-t border-neutral-800">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function MicroFactorCard({
  name,
  symbol,
  value,
  icon,
  color,
}: {
  name: string
  symbol: string
  value: number
  icon: React.ReactNode
  color: string
}) {
  const colorClasses: Record<string, string> = {
    blue: 'border-blue-500/30 text-blue-400',
    amber: 'border-amber-500/30 text-amber-400',
    emerald: 'border-emerald-500/30 text-emerald-400',
    purple: 'border-purple-500/30 text-purple-400',
  }

  return (
    <div className={`p-4 bg-neutral-900 rounded-lg border ${colorClasses[color].split(' ')[0]}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={colorClasses[color].split(' ')[1]}>{icon}</span>
        <span className="text-sm text-neutral-400">{name}</span>
      </div>
      <div className={`text-2xl font-mono font-bold ${colorClasses[color].split(' ')[1]}`}>
        {value.toFixed(3)}
      </div>
      <div className="text-xs text-neutral-500 font-mono">{symbol}</div>
    </div>
  )
}
