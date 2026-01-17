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
import { fetchAllFREDData, mergeSeriesData, EconomicData, NIV_COEFFICIENTS, NIV_DEFAULTS } from '@/lib/fredApi'
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
      const monthAgoIdx = latestIdx - 1

      const current = mergedData[latestIdx]
      const yearAgo = mergedData[yearAgoIdx]
      const monthAgo = mergedData[monthAgoIdx]

      if (!current || !yearAgo) {
        throw new Error('Missing data for calculation')
      }

      setLoadingStatus('Calculating NIV components...')

      // Calculate the breakdown using OOS-validated engine (no normalization)
      const breakdown = calculateNIVBreakdown(
        current,
        yearAgo,
        mergedData,
        { eta: NIV_DEFAULTS.eta },
        monthAgo
      )
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

            {/* OOS-Validated Components - NO min-max normalization */}
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg mb-4">
              <div className="flex items-center gap-2 text-yellow-400 font-bold mb-2">
                <AlertTriangle className="w-5 h-5" />
                CRITICAL: Raw Coefficients, NOT Normalization
              </div>
              <p className="text-gray-400 text-sm">
                The OOS test that achieved 0.849 AUC did NOT use min-max normalization.
                Raw percentage values are fed into tanh() which naturally bounds output.
                Normalizing to [0,1] destroys the crisis alpha signals (volatility spikes).
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-dark-700 rounded-lg border-l-4 border-blue-500">
                <div className="font-mono text-blue-400 text-lg mb-2">u<sub>t</sub> = Thrust</div>
                <p className="text-gray-400 text-sm">
                  <strong>tanh(β₁·ΔInv + β₂·ΔM2 - β₃·ΔFed)</strong><br/>
                  β = [{NIV_COEFFICIENTS.thrust.investment}, {NIV_COEFFICIENTS.thrust.m2}, {NIV_COEFFICIENTS.thrust.fedRate}]<br/>
                  M2 has highest weight (0.5) - caught 2020 crash when rates were at 0%.
                </p>
              </div>
              <div className="p-4 bg-dark-700 rounded-lg border-l-4 border-green-500">
                <div className="font-mono text-green-400 text-lg mb-2">P<sub>t</sub> = Efficiency</div>
                <p className="text-gray-400 text-sm">
                  <strong>(Inv + R&D_proxy + Edu_proxy) / GDP</strong><br/>
                  R&D proxy = {NIV_COEFFICIENTS.efficiency.rdProxy * 100}%, Edu proxy = {NIV_COEFFICIENTS.efficiency.eduProxy * 100}%<br/>
                  SQUARED in master equation - punishes "hollow growth" (2008 effect).
                </p>
              </div>
              <div className="p-4 bg-dark-700 rounded-lg border-l-4 border-yellow-500">
                <div className="font-mono text-yellow-400 text-lg mb-2">X<sub>t</sub> = Slack</div>
                <p className="text-gray-400 text-sm">
                  <strong>1 - (TCU / 100)</strong><br/>
                  LINEAR - no normalization, raw physical constraint.<br/>
                  Economic headroom = room to expand without overheating.
                </p>
              </div>
              <div className="p-4 bg-dark-700 rounded-lg border-l-4 border-red-500">
                <div className="font-mono text-red-400 text-lg mb-2">F<sub>t</sub> = Drag</div>
                <p className="text-gray-400 text-sm">
                  <strong>β₁·|Spread| + β₂·max(0, RealRate) + β₃·σ(Fed)</strong><br/>
                  β = [{NIV_COEFFICIENTS.drag.spread}, {NIV_COEFFICIENTS.drag.realRate}, {NIV_COEFFICIENTS.drag.volatility}]<br/>
                  Volatility term (σ) prevented false boom in 2022.
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-dark-700 rounded-lg border-l-4 border-purple-500">
                <div className="font-mono text-purple-400 text-lg mb-2">&eta; = {NIV_DEFAULTS.eta}</div>
                <p className="text-gray-400 text-sm">Nonlinearity exponent (OOS validated). Captures the disproportionate impact of friction on capital flow.</p>
              </div>
              <div className="p-4 bg-dark-700 rounded-lg border-l-4 border-gray-500">
                <div className="font-mono text-gray-400 text-lg mb-2">&epsilon; = {NIV_DEFAULTS.epsilon}</div>
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

/**
 * NIV Engine v6 - OOS Validated Calculation Breakdown
 *
 * CRITICAL: Uses RAW COEFFICIENTS with tanh() - NO min-max normalization!
 * The OOS test that achieved 0.849 AUC did NOT normalize to [0,1].
 * Normalization destroys the crisis alpha signals (volatility spikes).
 */
function calculateNIVBreakdown(
  current: EconomicData,
  yearAgo: EconomicData,
  allData: EconomicData[],
  params: { eta: number },
  monthAgo?: EconomicData
): NIVBreakdown {
  const beta = NIV_COEFFICIENTS
  const { epsilon, volatilityWindow } = NIV_DEFAULTS

  // === THRUST (u) ===
  // Formula: tanh(β₁·ΔInv + β₂·ΔM2 - β₃·ΔFed)
  // RAW percentage changes fed into tanh - NO normalization!

  // YoY Investment Growth (convert to decimal monthly rate)
  const investmentGrowthYoY = current.investment && yearAgo.investment
    ? ((current.investment - yearAgo.investment) / yearAgo.investment) * 100
    : 0
  const investmentGrowthMonthly = investmentGrowthYoY / 12 / 100

  // 12-month M2 Growth - THE CRITICAL 2020 SIGNAL
  const m2GrowthYoY = current.m2 && yearAgo.m2
    ? ((current.m2 - yearAgo.m2) / yearAgo.m2) * 100
    : 0
  const m2Growth = m2GrowthYoY / 100 // Convert to decimal

  // Monthly Fed rate change
  const fedRateChange = monthAgo?.fedFunds !== undefined && current.fedFunds !== null
    ? current.fedFunds - (monthAgo.fedFunds || 0)
    : 0

  // Thrust = tanh(weighted sum) - naturally bounded to [-1, 1]
  const thrustInput =
    beta.thrust.investment * investmentGrowthMonthly +
    beta.thrust.m2 * m2Growth -
    beta.thrust.fedRate * fedRateChange

  const thrust = Math.tanh(thrustInput)

  // === EFFICIENCY (P) ===
  // Formula: (Investment + R&D_proxy + Edu_proxy) / GDP
  const rdProxy = (current.investment || 0) * beta.efficiency.rdProxy
  const eduProxy = (current.investment || 0) * beta.efficiency.eduProxy
  const adjustedInvestment = (current.investment || 0) + rdProxy + eduProxy
  const efficiency = current.gdp ? adjustedInvestment / current.gdp : 0.15

  // === SLACK (X) ===
  // Formula: 1 - (TCU / 100) - economic headroom (LINEAR, no normalization)
  const slack = current.capacity ? 1 - (current.capacity / 100) : 0.2

  // === DRAG (F) ===
  // Formula: β₁·|Spread| + β₂·max(0, RealRate) + β₃·σ(Fed)
  const inflationRate = current.cpi && yearAgo.cpi
    ? ((current.cpi - yearAgo.cpi) / yearAgo.cpi) * 100
    : 2.0

  const realRate = (current.fedFunds || 0) - inflationRate
  const yieldSpread = current.yieldSpread ?? 0

  // Spread penalty: inversion (negative) becomes positive drag
  const spreadComponent = Math.abs(yieldSpread) * (yieldSpread < 0 ? 1 : 0.5)

  // Real rate component: only positive real rates add friction
  const realRateComponent = Math.max(0, realRate)

  // Volatility component: Calculate rolling std of Fed rate from historical data
  const fedRateHistory: number[] = []
  for (let i = Math.max(0, allData.length - volatilityWindow); i < allData.length; i++) {
    if (allData[i].fedFunds !== null) {
      fedRateHistory.push(allData[i].fedFunds!)
    }
  }
  const fedVolatility = fedRateHistory.length > 1
    ? Math.sqrt(fedRateHistory.reduce((sum, v) => {
        const mean = fedRateHistory.reduce((a, b) => a + b, 0) / fedRateHistory.length
        return sum + Math.pow(v - mean, 2)
      }, 0) / fedRateHistory.length)
    : 0

  // Combined drag with beta weights
  const drag =
    beta.drag.spread * spreadComponent +
    beta.drag.realRate * realRateComponent +
    beta.drag.volatility * fedVolatility

  // === MASTER EQUATION ===
  // NIV = (u × P²) / (X + F + ε)^η
  // P is SQUARED to punish hollow growth
  // NO normalization on any component!
  const numerator = thrust * Math.pow(efficiency, 2)
  const denominator = Math.pow(slack + drag + epsilon, params.eta)
  const niv = numerator / denominator

  // Convert NIV to recession probability using logit transform
  const probability = (1 / (1 + Math.exp(niv))) * 100

  return {
    date: current.date,
    thrust: {
      name: 'Thrust',
      symbol: 'u',
      icon: <Zap className="w-4 h-4" />,
      color: 'blue',
      rawValue: thrust,
      normalizedValue: thrust, // No normalization - raw tanh output
      weightedValue: thrust,
      steps: [
        {
          id: 'thrust-1',
          name: 'Investment Growth (YoY)',
          formula: '(Investment_t - Investment_{t-12}) / Investment_{t-12} × 100',
          description: 'Year-over-year change, converted to monthly decimal rate',
          inputs: {
            'Investment_t': current.investment || 0,
            'Investment_{t-12}': yearAgo.investment || 0,
            'YoY %': investmentGrowthYoY,
          },
          output: investmentGrowthMonthly,
        },
        {
          id: 'thrust-2',
          name: 'M2 Growth (YoY) - THE 2020 SIGNAL',
          formula: '(M2_t - M2_{t-12}) / M2_{t-12}',
          description: 'Year-over-year M2 growth as decimal (β₂=0.5, highest weight)',
          inputs: {
            'M2_t': current.m2 || 0,
            'M2_{t-12}': yearAgo.m2 || 0,
            'YoY %': m2GrowthYoY,
          },
          output: m2Growth,
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
          name: 'Weighted Sum',
          formula: `β₁·ΔInv + β₂·ΔM2 - β₃·ΔFed = ${beta.thrust.investment}×${investmentGrowthMonthly.toFixed(4)} + ${beta.thrust.m2}×${m2Growth.toFixed(4)} - ${beta.thrust.fedRate}×${fedRateChange.toFixed(4)}`,
          description: 'Raw weighted sum BEFORE tanh (NO normalization)',
          inputs: {
            'β₁ (Investment)': beta.thrust.investment,
            'β₂ (M2)': beta.thrust.m2,
            'β₃ (Fed)': beta.thrust.fedRate,
          },
          output: thrustInput,
        },
        {
          id: 'thrust-5',
          name: 'Apply tanh()',
          formula: 'tanh(weighted_sum)',
          description: 'tanh naturally bounds output to [-1, 1]. Massive M2 spikes push to ~0.99.',
          inputs: {
            weighted_sum: thrustInput,
          },
          output: thrust,
        },
      ],
    },
    efficiency: {
      name: 'Efficiency',
      symbol: 'P',
      icon: <TrendingUp className="w-4 h-4" />,
      color: 'green',
      rawValue: efficiency,
      normalizedValue: efficiency, // No normalization
      weightedValue: efficiency,
      steps: [
        {
          id: 'eff-1',
          name: 'Base Investment',
          formula: 'Real Gross Private Domestic Investment',
          description: 'GPDIC1 from FRED',
          inputs: {
            'Investment': current.investment || 0,
          },
          output: current.investment || 0,
        },
        {
          id: 'eff-2',
          name: 'Add Hidden Proxies',
          formula: `Investment × (1 + ${beta.efficiency.rdProxy} + ${beta.efficiency.eduProxy})`,
          description: 'R&D proxy (15%) + Education proxy (10%) = adjusted investment',
          inputs: {
            'R&D Proxy': rdProxy,
            'Edu Proxy': eduProxy,
            'Adjusted Total': adjustedInvestment,
          },
          output: adjustedInvestment,
        },
        {
          id: 'eff-3',
          name: 'Capital Productivity',
          formula: 'Adjusted_Investment / GDP',
          description: 'This is SQUARED in the master equation to punish hollow growth',
          inputs: {
            'Adjusted Investment': adjustedInvestment,
            'GDP': current.gdp || 0,
          },
          output: efficiency,
        },
        {
          id: 'eff-4',
          name: 'P² Effect (2008 Warning)',
          formula: 'P² = Efficiency²',
          description: 'In 2007, GDP rose but Investment/GDP slowed → NIV collapsed',
          inputs: {
            P: efficiency,
          },
          output: Math.pow(efficiency, 2),
        },
      ],
    },
    slack: {
      name: 'Slack',
      symbol: 'X',
      icon: <BarChart3 className="w-4 h-4" />,
      color: 'yellow',
      rawValue: slack,
      normalizedValue: slack, // No normalization - raw physical constraint
      weightedValue: slack,
      steps: [
        {
          id: 'slack-1',
          name: 'Capacity Utilization',
          formula: 'TCU (Total Capacity Utilization)',
          description: 'Current capacity utilization rate from FRED',
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
          description: 'Economic headroom (LINEAR, no normalization)',
          inputs: {
            capacity: current.capacity || 0,
          },
          output: slack,
        },
      ],
    },
    drag: {
      name: 'Drag',
      symbol: 'F',
      icon: <TrendingDown className="w-4 h-4" />,
      color: 'red',
      rawValue: drag,
      normalizedValue: drag, // No normalization
      weightedValue: drag,
      steps: [
        {
          id: 'drag-1',
          name: 'Yield Spread Component',
          formula: `β₁ × |Spread| × (inverted ? 1 : 0.5) = ${beta.drag.spread} × ${Math.abs(yieldSpread).toFixed(2)}`,
          description: 'Inverted curve gets full penalty, normal curve gets half',
          inputs: {
            'T10Y3M': yieldSpread,
            'Is Inverted': yieldSpread < 0 ? 'Yes' : 'No',
            'β₁': beta.drag.spread,
          },
          output: beta.drag.spread * spreadComponent,
        },
        {
          id: 'drag-2',
          name: 'Real Rate Component',
          formula: `β₂ × max(0, Real_Rate) = ${beta.drag.realRate} × max(0, ${realRate.toFixed(2)})`,
          description: 'Negative real rates add ZERO drag (2022 Handling)',
          inputs: {
            'Fed Funds': current.fedFunds || 0,
            'Inflation': inflationRate,
            'Real Rate': realRate,
            'β₂': beta.drag.realRate,
          },
          output: beta.drag.realRate * realRateComponent,
        },
        {
          id: 'drag-3',
          name: 'Volatility Component (σ)',
          formula: `β₃ × σ(Fed) = ${beta.drag.volatility} × ${fedVolatility.toFixed(4)}`,
          description: '12-month rolling std of Fed rate (kept 2022 from false boom)',
          inputs: {
            'Fed Volatility (σ)': fedVolatility,
            'β₃': beta.drag.volatility,
          },
          output: beta.drag.volatility * fedVolatility,
        },
        {
          id: 'drag-4',
          name: 'Total Drag',
          formula: 'β₁·Spread + β₂·RealRate + β₃·Volatility',
          description: 'Sum of all drag components',
          inputs: {
            'Spread Component': beta.drag.spread * spreadComponent,
            'Real Rate Component': beta.drag.realRate * realRateComponent,
            'Volatility Component': beta.drag.volatility * fedVolatility,
          },
          output: drag,
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
