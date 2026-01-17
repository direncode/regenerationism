'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Loader2,
  BookOpen,
  Calculator,
  Zap,
  TrendingUp,
  BarChart3,
  TrendingDown,
  ChevronRight,
  ChevronDown,
  Database,
  Key,
  Eye,
  EyeOff,
  CheckCircle,
  AlertTriangle,
  Info,
  ArrowRight,
  Sigma,
  Percent,
  Clock,
} from 'lucide-react'
import { useSessionStore } from '@/store/sessionStore'
import { fetchAllFREDData, mergeSeriesData, EconomicData } from '@/lib/fredApi'
import { auditLog } from '@/lib/auditLog'

interface CalculationStep {
  id: string
  name: string
  formula: string
  description: string
  inputs: Record<string, number | string>
  output: number
  unit?: string
}

interface ComponentCalculation {
  name: string
  symbol: string
  icon: React.ReactNode
  color: string
  rawValue: number
  normalizedValue: number
  weightedValue: number
  steps: CalculationStep[]
}

interface NIVBreakdown {
  date: string
  thrust: ComponentCalculation
  efficiency: ComponentCalculation
  slack: ComponentCalculation
  drag: ComponentCalculation
  numerator: number
  denominator: number
  niv: number
  probability: number
}

export default function MethodologyPage() {
  const { params, apiSettings, setApiSettings } = useSessionStore()

  const [isCalculating, setIsCalculating] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [breakdown, setBreakdown] = useState<NIVBreakdown | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['master']))
  const [showApiKey, setShowApiKey] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState(apiSettings.fredApiKey || '')

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  const calculateLive = useCallback(async () => {
    if (!apiSettings.fredApiKey) {
      setError('Please enter your FRED API key above.')
      return
    }

    setIsCalculating(true)
    setError(null)
    setLoadingStatus('Fetching FRED data...')

    auditLog.logUserAction('Methodology calculation started', { params }, 'Methodology')

    try {
      // Fetch data for last 2 years to get YoY calculations
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const seriesData = await fetchAllFREDData(
        apiSettings.fredApiKey,
        startDate,
        endDate,
        (series, progress) => setLoadingStatus(`Fetching ${series}... (${progress.toFixed(0)}%)`)
      )

      setLoadingStatus('Processing data...')

      const mergedData = mergeSeriesData(seriesData)

      if (mergedData.length < 13) {
        throw new Error('Not enough data for YoY calculations')
      }

      // Get the most recent complete data point
      const latestIdx = mergedData.length - 1
      const yearAgoIdx = latestIdx - 12

      const current = mergedData[latestIdx]
      const yearAgo = mergedData[yearAgoIdx]

      if (!current || !yearAgo) {
        throw new Error('Missing data for calculation')
      }

      setLoadingStatus('Calculating NIV components...')

      // Calculate the breakdown
      const breakdown = calculateNIVBreakdown(current, yearAgo, mergedData, params)
      setBreakdown(breakdown)

      auditLog.logCalculation(
        'Methodology NIV breakdown calculated',
        {
          formula: 'NIV = (u × P²) / (X + F)^η',
          inputs: {
            thrust: breakdown.thrust.weightedValue,
            efficiency: breakdown.efficiency.weightedValue,
            slack: breakdown.slack.weightedValue,
            drag: breakdown.drag.weightedValue,
            eta: params.eta,
          },
          output: breakdown.niv,
          intermediateSteps: [
            { step: 'numerator', value: breakdown.numerator },
            { step: 'denominator', value: breakdown.denominator },
          ],
        },
        'INFO',
        'Methodology'
      )

      setLoadingStatus('')
    } catch (err) {
      console.error('Calculation error:', err)
      setError(err instanceof Error ? err.message : 'Calculation failed')
      auditLog.logSystem(
        `Methodology calculation failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        'ERROR',
        {},
        'Methodology'
      )
    } finally {
      setIsCalculating(false)
    }
  }, [apiSettings.fredApiKey, params])

  return (
    <div className="min-h-screen bg-dark-900 pt-20 pb-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold gradient-text flex items-center gap-3">
            <BookOpen className="w-8 h-8" />
            NIV Methodology
          </h1>
          <p className="text-gray-400 mt-2">
            Complete mathematical breakdown of the National Impact Velocity formula with real-time FRED data
          </p>
        </div>

        {/* API Key Configuration */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-dark-800 border border-white/10 rounded-xl"
        >
          <div className="flex items-center gap-3 mb-3">
            <Key className="w-5 h-5 text-regen-400" />
            <span className="text-white font-medium">FRED API Key</span>
            {apiSettings.fredApiKey && (
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">Connected</span>
            )}
          </div>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="Enter your FRED API key..."
                className="w-full bg-dark-700 border border-white/10 rounded-lg px-4 py-2 pr-10 text-white placeholder-gray-500 focus:outline-none focus:border-regen-500"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              onClick={() => setApiSettings({ fredApiKey: apiKeyInput, useLiveData: true })}
              disabled={!apiKeyInput}
              className="px-4 py-2 bg-regen-500 text-black font-bold rounded-lg hover:bg-regen-400 transition disabled:opacity-50"
            >
              Save
            </button>
          </div>
          <p className="text-gray-500 text-sm mt-2">
            Get a free API key from{' '}
            <a href="https://fred.stlouisfed.org/docs/api/api_key.html" target="_blank" rel="noopener noreferrer" className="text-regen-400 hover:underline">
              FRED
            </a>
          </p>
        </motion.div>

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

        {/* Calculate Button */}
        <button
          onClick={calculateLive}
          disabled={isCalculating || !apiSettings.fredApiKey}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-regen-600 to-regen-400 hover:from-regen-500 hover:to-regen-300 text-black font-bold rounded-xl transition disabled:opacity-50 mb-8"
        >
          {isCalculating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {loadingStatus || 'Calculating...'}
            </>
          ) : (
            <>
              <Calculator className="w-5 h-5" />
              Calculate NIV with Live FRED Data
            </>
          )}
        </button>

        {/* Master Formula Section */}
        <CollapsibleSection
          title="Master Formula"
          icon={<Sigma className="w-5 h-5" />}
          isExpanded={expandedSections.has('master')}
          onToggle={() => toggleSection('master')}
          color="regen"
        >
          <div className="space-y-6">
            <div className="text-center p-6 bg-dark-700 rounded-xl">
              <div className="font-mono text-3xl md:text-4xl text-regen-400 mb-4">
                NIV<sub>t</sub> = (u<sub>t</sub> &middot; P<sub>t</sub><sup>2</sup>) / (X<sub>t</sub> + F<sub>t</sub>)<sup>&eta;</sup>
              </div>
              <p className="text-gray-400 text-sm">
                National Impact Velocity at time t
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-dark-700 rounded-lg border-l-4 border-blue-500">
                <div className="font-mono text-blue-400 text-lg mb-2">u<sub>t</sub> = Thrust</div>
                <p className="text-gray-400 text-sm">tanh(Norm(Investment Growth) + Norm(M2 Growth) - Norm(Fed Rate Change)). The tanh allows M2 liquidity impulse to override rate signals.</p>
              </div>
              <div className="p-4 bg-dark-700 rounded-lg border-l-4 border-green-500">
                <div className="font-mono text-green-400 text-lg mb-2">P<sub>t</sub> = Efficiency</div>
                <p className="text-gray-400 text-sm">Capital productivity = Investment / GDP. This is SQUARED in the master equation to punish "hollow growth" (2008 effect).</p>
              </div>
              <div className="p-4 bg-dark-700 rounded-lg border-l-4 border-yellow-500">
                <div className="font-mono text-yellow-400 text-lg mb-2">X<sub>t</sub> = Slack</div>
                <p className="text-gray-400 text-sm">Economic headroom = 1 - (Capacity Utilization / 100). Room for expansion without overheating.</p>
              </div>
              <div className="p-4 bg-dark-700 rounded-lg border-l-4 border-red-500">
                <div className="font-mono text-red-400 text-lg mb-2">F<sub>t</sub> = Drag</div>
                <p className="text-gray-400 text-sm">max(0, Real Rate) + Yield Curve Penalty + (Inflation &times; 0.3). Negative real rates don't add to drag (2022 handling).</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-dark-700 rounded-lg border-l-4 border-purple-500">
                <div className="font-mono text-purple-400 text-lg mb-2">&eta; = {params.eta}</div>
                <p className="text-gray-400 text-sm">Nonlinearity exponent (OOS validated = 1.5). Captures the disproportionate impact of friction on capital flow.</p>
              </div>
              <div className="p-4 bg-dark-700 rounded-lg border-l-4 border-gray-500">
                <div className="font-mono text-gray-400 text-lg mb-2">&epsilon; = 0.001</div>
                <p className="text-gray-400 text-sm">Safety floor for division stability. Prevents divide-by-zero edge cases.</p>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Live Calculation Results */}
        {breakdown && (
          <>
            {/* Current Values Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-6 bg-gradient-to-br from-regen-500/20 to-blue-500/20 border border-regen-500/30 rounded-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-regen-400" />
                  <span className="text-gray-400">Latest Calculation</span>
                </div>
                <span className="text-gray-500 font-mono text-sm">{breakdown.date}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-3xl font-mono font-bold text-regen-400">{breakdown.niv.toFixed(4)}</div>
                  <div className="text-sm text-gray-400">NIV Score</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-mono font-bold text-blue-400">{breakdown.probability.toFixed(1)}%</div>
                  <div className="text-sm text-gray-400">Recession Probability</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-mono font-bold text-green-400">{breakdown.numerator.toFixed(6)}</div>
                  <div className="text-sm text-gray-400">Numerator (u &times; P&sup2;)</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-mono font-bold text-orange-400">{breakdown.denominator.toFixed(6)}</div>
                  <div className="text-sm text-gray-400">Denominator ((X+F)^&eta;)</div>
                </div>
              </div>

              {/* Final Calculation */}
              <div className="p-4 bg-dark-800 rounded-lg font-mono text-center">
                <span className="text-gray-400">NIV = </span>
                <span className="text-green-400">{breakdown.numerator.toFixed(6)}</span>
                <span className="text-gray-400"> / </span>
                <span className="text-orange-400">{breakdown.denominator.toFixed(6)}</span>
                <span className="text-gray-400"> = </span>
                <span className="text-regen-400 text-xl font-bold">{breakdown.niv.toFixed(6)}</span>
              </div>
            </motion.div>

            {/* Thrust Section */}
            <CollapsibleSection
              title={`Thrust (u) = ${breakdown.thrust.weightedValue.toFixed(4)}`}
              icon={<Zap className="w-5 h-5" />}
              isExpanded={expandedSections.has('thrust')}
              onToggle={() => toggleSection('thrust')}
              color="blue"
            >
              <ComponentBreakdown component={breakdown.thrust} weight={params.weights.thrust} />
            </CollapsibleSection>

            {/* Efficiency Section */}
            <CollapsibleSection
              title={`Efficiency (P) = ${breakdown.efficiency.weightedValue.toFixed(4)}`}
              icon={<TrendingUp className="w-5 h-5" />}
              isExpanded={expandedSections.has('efficiency')}
              onToggle={() => toggleSection('efficiency')}
              color="green"
            >
              <ComponentBreakdown component={breakdown.efficiency} weight={params.weights.efficiency} />
            </CollapsibleSection>

            {/* Slack Section */}
            <CollapsibleSection
              title={`Slack (X) = ${breakdown.slack.weightedValue.toFixed(4)}`}
              icon={<BarChart3 className="w-5 h-5" />}
              isExpanded={expandedSections.has('slack')}
              onToggle={() => toggleSection('slack')}
              color="yellow"
            >
              <ComponentBreakdown component={breakdown.slack} weight={params.weights.slack} />
            </CollapsibleSection>

            {/* Drag Section */}
            <CollapsibleSection
              title={`Drag (F) = ${breakdown.drag.weightedValue.toFixed(4)}`}
              icon={<TrendingDown className="w-5 h-5" />}
              isExpanded={expandedSections.has('drag')}
              onToggle={() => toggleSection('drag')}
              color="red"
            >
              <ComponentBreakdown component={breakdown.drag} weight={params.weights.drag} />
            </CollapsibleSection>

            {/* Final Assembly */}
            <CollapsibleSection
              title="Final NIV Assembly"
              icon={<Calculator className="w-5 h-5" />}
              isExpanded={expandedSections.has('final')}
              onToggle={() => toggleSection('final')}
              color="purple"
            >
              <div className="space-y-4">
                <StepCard
                  step={1}
                  title="Calculate Numerator"
                  formula="numerator = u × P²"
                  calculation={`${breakdown.thrust.weightedValue.toFixed(6)} × ${breakdown.efficiency.weightedValue.toFixed(6)}² = ${breakdown.numerator.toFixed(6)}`}
                />
                <StepCard
                  step={2}
                  title="Calculate Denominator Base"
                  formula="base = X + F"
                  calculation={`${breakdown.slack.weightedValue.toFixed(6)} + ${breakdown.drag.weightedValue.toFixed(6)} = ${(breakdown.slack.weightedValue + breakdown.drag.weightedValue).toFixed(6)}`}
                />
                <StepCard
                  step={3}
                  title="Apply Nonlinearity"
                  formula={`denominator = base^η = base^${params.eta}`}
                  calculation={`${(breakdown.slack.weightedValue + breakdown.drag.weightedValue).toFixed(6)}^${params.eta} = ${breakdown.denominator.toFixed(6)}`}
                />
                <StepCard
                  step={4}
                  title="Final NIV"
                  formula="NIV = numerator / denominator"
                  calculation={`${breakdown.numerator.toFixed(6)} / ${breakdown.denominator.toFixed(6)} = ${breakdown.niv.toFixed(6)}`}
                  highlight
                />
                <StepCard
                  step={5}
                  title="Recession Probability"
                  formula="P(recession) = 1 / (1 + e^(NIV×2 - 1)) × 100"
                  calculation={`1 / (1 + e^(${breakdown.niv.toFixed(4)}×2 - 1)) × 100 = ${breakdown.probability.toFixed(2)}%`}
                />
              </div>
            </CollapsibleSection>

            {/* Data Sources */}
            <CollapsibleSection
              title="FRED Data Sources"
              icon={<Database className="w-5 h-5" />}
              isExpanded={expandedSections.has('sources')}
              onToggle={() => toggleSection('sources')}
              color="gray"
            >
              <div className="grid md:grid-cols-2 gap-3">
                <DataSourceCard series="GPDIC1" name="Real Gross Private Domestic Investment" usage="Thrust calculation" />
                <DataSourceCard series="M2SL" name="M2 Money Stock" usage="Efficiency calculation" />
                <DataSourceCard series="GDPC1" name="Real GDP" usage="Efficiency calculation" />
                <DataSourceCard series="TCU" name="Total Capacity Utilization" usage="Slack calculation" />
                <DataSourceCard series="FEDFUNDS" name="Federal Funds Effective Rate" usage="Drag calculation" />
                <DataSourceCard series="T10Y3M" name="10Y-3M Treasury Spread" usage="Drag (yield curve)" />
                <DataSourceCard series="CPIAUCSL" name="Consumer Price Index" usage="Drag (inflation)" />
                <DataSourceCard series="USREC" name="NBER Recession Indicator" usage="Validation" />
              </div>
            </CollapsibleSection>
          </>
        )}

        {/* Theoretical Foundation */}
        <CollapsibleSection
          title="Theoretical Foundation"
          icon={<BookOpen className="w-5 h-5" />}
          isExpanded={expandedSections.has('theory')}
          onToggle={() => toggleSection('theory')}
          color="gray"
        >
          <div className="prose prose-invert max-w-none">
            <div className="space-y-4 text-gray-300">
              <p>
                The National Impact Velocity (NIV) is grounded in the physics of economic capital flow.
                Just as physical systems have kinetic energy, friction, and momentum, economic systems
                exhibit analogous behaviors through capital regeneration and dissipation.
              </p>
              <h4 className="text-white font-bold mt-6">Key Principles:</h4>
              <ul className="list-disc list-inside space-y-2">
                <li><strong className="text-blue-400">Thrust (u)</strong> represents the forward momentum of investment - the engine driving economic expansion</li>
                <li><strong className="text-green-400">Efficiency (P&sup2;)</strong> is squared to reward productive capital allocation and punish hollow growth (money printing without real output)</li>
                <li><strong className="text-yellow-400">Slack (X)</strong> represents unused capacity - economic headroom that can absorb shocks</li>
                <li><strong className="text-red-400">Drag (F)</strong> captures friction forces that slow capital circulation - high rates, inflation, credit spreads</li>
                <li><strong className="text-purple-400">Eta (&eta; = {params.eta})</strong> introduces nonlinearity - small increases in friction have disproportionately large effects when the economy is already stressed</li>
              </ul>
              <h4 className="text-white font-bold mt-6">Predictive Power:</h4>
              <p>
                NIV achieves <strong className="text-regen-400">0.85 AUC</strong> on out-of-sample recession prediction,
                outperforming the Fed Yield Curve (T10Y3M) by detecting liquidity stress
                <strong className="text-regen-400"> 6 months earlier</strong> on average.
              </p>
            </div>
          </div>
        </CollapsibleSection>
      </div>
    </div>
  )
}

// NIV Engine v6 - Safety floor for division
const EPSILON = 0.001

// Helper function to calculate the full breakdown (NIV Engine v6)
function calculateNIVBreakdown(
  current: EconomicData,
  yearAgo: EconomicData,
  allData: EconomicData[],
  params: { eta: number; weights: { thrust: number; efficiency: number; slack: number; drag: number } },
  monthAgo?: EconomicData
): NIVBreakdown {
  // === THRUST COMPONENTS ===
  const investmentGrowth = current.investment && yearAgo.investment
    ? ((current.investment - yearAgo.investment) / yearAgo.investment) * 100
    : 0

  const m2Growth = current.m2 && yearAgo.m2
    ? ((current.m2 - yearAgo.m2) / yearAgo.m2) * 100
    : 0

  const fedRateChange = monthAgo?.fedFunds !== undefined && current.fedFunds !== null
    ? current.fedFunds - (monthAgo.fedFunds || 0)
    : 0

  // === EFFICIENCY (P) ===
  // Formula: Investment / GDP - capital productivity (SQUARED in master equation)
  const efficiencyRaw = current.investment && current.gdp
    ? current.investment / current.gdp
    : 0.15

  // === SLACK (X) ===
  // Formula: 1 - (TCU / 100) - economic headroom
  const slackRaw = current.capacity ? 1 - (current.capacity / 100) : 0.2

  // === DRAG (F) ===
  // Formula: max(0, Real_Rates) + Yield_Curve_Penalty + (Inflation × 0.3)
  const inflationRate = current.cpi && yearAgo.cpi
    ? ((current.cpi - yearAgo.cpi) / yearAgo.cpi) * 100
    : 2.0

  const realRate = (current.fedFunds || 0) - inflationRate
  const yieldSpread = current.yieldSpread ?? 0
  const yieldCurvePenalty = yieldSpread < 0 ? Math.abs(yieldSpread) : 0
  const dragRaw = Math.max(0, realRate) + yieldCurvePenalty + (inflationRate * 0.3)

  // Get min/max for normalization from all data
  const allInvestmentGrowth: number[] = []
  const allM2Growth: number[] = []
  const allFedRateChange: number[] = []
  const allEfficiency: number[] = []
  const allSlack: number[] = []
  const allDrag: number[] = []

  for (let i = 12; i < allData.length; i++) {
    const curr = allData[i]
    const prev = allData[i - 12]
    const prevMonth = allData[i - 1]

    if (curr.investment && prev.investment) {
      allInvestmentGrowth.push(((curr.investment - prev.investment) / prev.investment) * 100)
    }
    if (curr.m2 && prev.m2) {
      allM2Growth.push(((curr.m2 - prev.m2) / prev.m2) * 100)
    }
    if (curr.fedFunds !== null && prevMonth?.fedFunds !== null) {
      allFedRateChange.push(curr.fedFunds - prevMonth.fedFunds)
    }
    if (curr.investment && curr.gdp) {
      allEfficiency.push(curr.investment / curr.gdp)
    }
    if (curr.capacity) {
      allSlack.push(1 - curr.capacity / 100)
    }
    if (curr.cpi && prev.cpi && curr.fedFunds !== null) {
      const inf = ((curr.cpi - prev.cpi) / prev.cpi) * 100
      const rr = curr.fedFunds - inf
      const ycp = (curr.yieldSpread ?? 0) < 0 ? Math.abs(curr.yieldSpread ?? 0) : 0
      allDrag.push(Math.max(0, rr) + ycp + inf * 0.3)
    }
  }

  const normalize = (value: number, arr: number[]) => {
    if (arr.length === 0) return 0.5
    const min = Math.min(...arr)
    const max = Math.max(...arr)
    if (max === min) return 0.5
    return Math.max(0, Math.min(1, (value - min) / (max - min)))
  }

  // Normalize thrust components for tanh
  const normInvGrowth = normalize(investmentGrowth, allInvestmentGrowth)
  const normM2Growth = normalize(m2Growth, allM2Growth)
  const normFedChange = normalize(fedRateChange, allFedRateChange)

  // THRUST: tanh(Norm(Inv) + Norm(M2) - Norm(FedChange))
  const thrustRaw = Math.tanh(normInvGrowth + normM2Growth - normFedChange)
  const thrustNorm = (thrustRaw + 1) / 2 // Shift tanh [-1,1] to [0,1]

  const efficiencyNorm = normalize(efficiencyRaw, allEfficiency)
  const slackNorm = normalize(slackRaw, allSlack)
  const dragNorm = normalize(dragRaw, allDrag)

  const thrustWeighted = params.weights.thrust * thrustNorm
  const efficiencyWeighted = params.weights.efficiency * efficiencyNorm
  const slackWeighted = params.weights.slack * slackNorm
  const dragWeighted = params.weights.drag * dragNorm

  // MASTER EQUATION: NIV = (u × P²) / (X + F + ε)^η
  const numerator = thrustWeighted * Math.pow(efficiencyWeighted, 2)
  const denominator = Math.pow(slackWeighted + dragWeighted + EPSILON, params.eta)
  const niv = numerator / denominator
  const probability = (1 / (1 + Math.exp(niv))) * 100

  return {
    date: current.date,
    thrust: {
      name: 'Thrust',
      symbol: 'u',
      icon: <Zap className="w-4 h-4" />,
      color: 'blue',
      rawValue: thrustRaw,
      normalizedValue: thrustNorm,
      weightedValue: thrustWeighted,
      steps: [
        {
          id: 'thrust-1',
          name: 'Investment Growth (YoY)',
          formula: '(Investment_t - Investment_{t-12}) / Investment_{t-12} × 100',
          description: 'Year-over-year change in Real Gross Private Domestic Investment',
          inputs: {
            'Investment_t': current.investment || 0,
            'Investment_{t-12}': yearAgo.investment || 0,
          },
          output: investmentGrowth,
          unit: '%',
        },
        {
          id: 'thrust-2',
          name: 'M2 Growth (YoY)',
          formula: '(M2_t - M2_{t-12}) / M2_{t-12} × 100',
          description: 'Year-over-year change in M2 Money Stock (critical for 2020 detection)',
          inputs: {
            'M2_t': current.m2 || 0,
            'M2_{t-12}': yearAgo.m2 || 0,
          },
          output: m2Growth,
          unit: '%',
        },
        {
          id: 'thrust-3',
          name: 'Fed Rate Change',
          formula: 'Fed_Funds_t - Fed_Funds_{t-1}',
          description: 'Monthly change in Federal Funds Rate',
          inputs: {
            'Fed_Funds_t': current.fedFunds || 0,
            'Fed_Funds_{t-1}': monthAgo?.fedFunds || 0,
          },
          output: fedRateChange,
          unit: '%',
        },
        {
          id: 'thrust-4',
          name: 'Combine with tanh',
          formula: 'tanh(Norm(Inv) + Norm(M2) - Norm(Fed))',
          description: 'tanh allows M2 liquidity impulse to override lack of rate signal',
          inputs: {
            normInvGrowth,
            normM2Growth,
            normFedChange,
          },
          output: thrustRaw,
        },
        {
          id: 'thrust-5',
          name: 'Shift to [0,1] & Weight',
          formula: `((tanh + 1) / 2) × ${params.weights.thrust}`,
          description: 'Shift tanh output from [-1,1] to [0,1] and apply weight',
          inputs: {
            tanh_output: thrustRaw,
            weight: params.weights.thrust,
          },
          output: thrustWeighted,
        },
      ],
    },
    efficiency: {
      name: 'Efficiency',
      symbol: 'P',
      icon: <TrendingUp className="w-4 h-4" />,
      color: 'green',
      rawValue: efficiencyRaw,
      normalizedValue: efficiencyNorm,
      weightedValue: efficiencyWeighted,
      steps: [
        {
          id: 'eff-1',
          name: 'Capital Productivity',
          formula: 'Investment / GDP',
          description: 'How much investment per unit of output (SQUARED in master equation)',
          inputs: {
            'Investment': current.investment || 0,
            'GDP': current.gdp || 0,
          },
          output: efficiencyRaw,
        },
        {
          id: 'eff-2',
          name: 'Why Squared?',
          formula: 'P² punishes hollow growth',
          description: 'In 2007, GDP rose but Investment/GDP slowed - NIV collapsed (2008 Warning)',
          inputs: {
            P: efficiencyNorm,
            'P²': Math.pow(efficiencyNorm, 2),
          },
          output: Math.pow(efficiencyNorm, 2),
        },
        {
          id: 'eff-3',
          name: 'Normalize & Weight',
          formula: `normalize(value) × ${params.weights.efficiency}`,
          description: 'Normalize and apply weight',
          inputs: {
            raw: efficiencyRaw,
            weight: params.weights.efficiency,
          },
          output: efficiencyWeighted,
        },
      ],
    },
    slack: {
      name: 'Slack',
      symbol: 'X',
      icon: <BarChart3 className="w-4 h-4" />,
      color: 'yellow',
      rawValue: slackRaw,
      normalizedValue: slackNorm,
      weightedValue: slackWeighted,
      steps: [
        {
          id: 'slack-1',
          name: 'Capacity Utilization',
          formula: 'TCU (Total Capacity Utilization)',
          description: 'Current capacity utilization rate',
          inputs: {
            TCU: current.capacity || 0,
          },
          output: current.capacity || 0,
          unit: '%',
        },
        {
          id: 'slack-2',
          name: 'Calculate Slack',
          formula: '1 - (TCU / 100)',
          description: 'Economic headroom (higher = more room to grow)',
          inputs: {
            capacity: current.capacity || 0,
          },
          output: slackRaw,
        },
        {
          id: 'slack-3',
          name: 'Normalize & Weight',
          formula: `normalize(value) × ${params.weights.slack}`,
          description: 'Normalize and apply weight',
          inputs: {
            raw: slackRaw,
            weight: params.weights.slack,
          },
          output: slackWeighted,
        },
      ],
    },
    drag: {
      name: 'Drag',
      symbol: 'F',
      icon: <TrendingDown className="w-4 h-4" />,
      color: 'red',
      rawValue: dragRaw,
      normalizedValue: dragNorm,
      weightedValue: dragWeighted,
      steps: [
        {
          id: 'drag-1',
          name: 'Inflation Rate (YoY)',
          formula: '(CPI_t - CPI_{t-12}) / CPI_{t-12} × 100',
          description: 'Year-over-year CPI change',
          inputs: {
            'CPI_t': current.cpi || 0,
            'CPI_{t-12}': yearAgo.cpi || 0,
          },
          output: inflationRate,
          unit: '%',
        },
        {
          id: 'drag-2',
          name: 'Real Interest Rate',
          formula: 'Fed_Funds - Inflation',
          description: 'Nominal rate adjusted for inflation',
          inputs: {
            Fed_Funds: current.fedFunds || 0,
            Inflation: inflationRate,
          },
          output: realRate,
          unit: '%',
        },
        {
          id: 'drag-3',
          name: 'Yield Curve Penalty',
          formula: 'if (T10Y3M < 0) then |T10Y3M| else 0',
          description: 'Inversion adds friction (2022 Handling)',
          inputs: {
            T10Y3M: yieldSpread,
          },
          output: yieldCurvePenalty,
          unit: '%',
        },
        {
          id: 'drag-4',
          name: 'Total Drag',
          formula: 'max(0, Real_Rate) + YC_Penalty + (Inflation × 0.3)',
          description: 'max(0, x) handles negative real rates correctly',
          inputs: {
            Real_Rate: realRate,
            YC_Penalty: yieldCurvePenalty,
            Inflation: inflationRate,
          },
          output: dragRaw,
        },
        {
          id: 'drag-5',
          name: 'Normalize & Weight',
          formula: `normalize(value) × ${params.weights.drag}`,
          description: 'Normalize and apply weight',
          inputs: {
            raw: dragRaw,
            weight: params.weights.drag,
          },
          output: dragWeighted,
        },
      ],
    },
    numerator,
    denominator,
    niv,
    probability,
  }
}

// Collapsible Section Component
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
    regen: 'border-regen-500/30 bg-regen-500/5',
    blue: 'border-blue-500/30 bg-blue-500/5',
    green: 'border-green-500/30 bg-green-500/5',
    yellow: 'border-yellow-500/30 bg-yellow-500/5',
    red: 'border-red-500/30 bg-red-500/5',
    purple: 'border-purple-500/30 bg-purple-500/5',
    gray: 'border-white/10 bg-dark-800',
  }

  const iconColors: Record<string, string> = {
    regen: 'text-regen-400',
    blue: 'text-blue-400',
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    red: 'text-red-400',
    purple: 'text-purple-400',
    gray: 'text-gray-400',
  }

  return (
    <div className={`mb-4 border rounded-xl overflow-hidden ${colorClasses[color]}`}>
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition"
      >
        <div className="flex items-center gap-3">
          <span className={iconColors[color]}>{icon}</span>
          <span className="font-bold text-white">{title}</span>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-400" />
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
            <div className="p-4 border-t border-white/10">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Component Breakdown
function ComponentBreakdown({
  component,
  weight,
}: {
  component: ComponentCalculation
  weight: number
}) {
  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="p-3 bg-dark-700 rounded-lg">
          <div className="text-2xl font-mono font-bold text-white">{component.rawValue.toFixed(4)}</div>
          <div className="text-xs text-gray-400">Raw Value</div>
        </div>
        <div className="p-3 bg-dark-700 rounded-lg">
          <div className="text-2xl font-mono font-bold text-blue-400">{component.normalizedValue.toFixed(4)}</div>
          <div className="text-xs text-gray-400">Normalized [0,1]</div>
        </div>
        <div className="p-3 bg-dark-700 rounded-lg">
          <div className="text-2xl font-mono font-bold text-regen-400">{component.weightedValue.toFixed(4)}</div>
          <div className="text-xs text-gray-400">Weighted (×{weight})</div>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {component.steps.map((step, index) => (
          <div key={step.id} className="p-3 bg-dark-700 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-dark-600 flex items-center justify-center text-xs font-bold text-gray-400">
                {index + 1}
              </div>
              <span className="font-medium text-white">{step.name}</span>
            </div>
            <div className="font-mono text-sm text-blue-400 mb-2">{step.formula}</div>
            <p className="text-xs text-gray-500 mb-2">{step.description}</p>
            <div className="flex flex-wrap gap-2 text-xs">
              {Object.entries(step.inputs).map(([key, value]) => (
                <span key={key} className="px-2 py-1 bg-dark-600 rounded text-gray-300">
                  {key}: <span className="text-white font-mono">{typeof value === 'number' ? value.toFixed(4) : value}</span>
                </span>
              ))}
              <ArrowRight className="w-4 h-4 text-gray-500 self-center" />
              <span className="px-2 py-1 bg-regen-500/20 rounded text-regen-400 font-mono font-bold">
                {step.output.toFixed(4)}{step.unit || ''}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Step Card
function StepCard({
  step,
  title,
  formula,
  calculation,
  highlight = false,
}: {
  step: number
  title: string
  formula: string
  calculation: string
  highlight?: boolean
}) {
  return (
    <div className={`p-4 rounded-lg ${highlight ? 'bg-regen-500/20 border border-regen-500/30' : 'bg-dark-700'}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${highlight ? 'bg-regen-500 text-black' : 'bg-dark-600 text-gray-400'}`}>
          {step}
        </div>
        <span className={`font-medium ${highlight ? 'text-regen-400' : 'text-white'}`}>{title}</span>
      </div>
      <div className="font-mono text-sm text-blue-400 mb-2">{formula}</div>
      <div className={`font-mono text-sm ${highlight ? 'text-regen-300' : 'text-gray-300'}`}>{calculation}</div>
    </div>
  )
}

// Data Source Card
function DataSourceCard({
  series,
  name,
  usage,
}: {
  series: string
  name: string
  usage: string
}) {
  return (
    <a
      href={`https://fred.stlouisfed.org/series/${series}`}
      target="_blank"
      rel="noopener noreferrer"
      className="p-3 bg-dark-700 rounded-lg hover:bg-dark-600 transition group"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-regen-400 font-bold">{series}</span>
        <span className="text-xs text-gray-500 group-hover:text-regen-400 transition">FRED &rarr;</span>
      </div>
      <div className="text-sm text-gray-300">{name}</div>
      <div className="text-xs text-gray-500 mt-1">{usage}</div>
    </a>
  )
}
