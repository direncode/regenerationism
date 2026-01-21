'use client'

import React, { useState, useMemo, useCallback } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  BarChart,
  Bar,
  Cell,
  ComposedChart,
  ReferenceLine,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from 'recharts'

// ============================================================================
// NIV REGENERATION THEORY TYPES
// ============================================================================

/**
 * NIV (National Impact Velocity) adapted for business-level regeneration analysis
 *
 * Core Formula: NIV = (Thrust × Efficiency²) / (Slack + Drag)^η
 *
 * Where:
 * - Thrust (T): Capital injection momentum, revenue growth impulse
 * - Efficiency (E): Capital productivity, asset utilization
 * - Slack (S): Economic headroom, liquidity buffer
 * - Drag (D): Systemic friction, debt burden, operational inefficiency
 * - η (eta): Non-linear scaling exponent (typically 1.5)
 *
 * Third-Order Projection:
 * - First-Order: NIVₜ = current regeneration velocity
 * - Second-Order: dNIV/dt = acceleration of regeneration
 * - Third-Order: Cₕ = NIV₀ × e^(rₕ×h) × (1 − ρₕ) = cumulative regenerated capital
 */

interface AccountingPeriod {
  period: string

  // Income Statement
  revenue: number
  costOfGoodsSold: number
  operatingExpenses: number
  interestExpense: number
  depreciation: number
  taxes: number

  // Balance Sheet - Assets
  cash: number
  accountsReceivable: number
  inventory: number
  fixedAssets: number

  // Balance Sheet - Liabilities & Equity
  accountsPayable: number
  shortTermDebt: number
  longTermDebt: number
  retainedEarnings: number
  equity: number

  // Cash Flow Items
  capitalExpenditure: number
  dividendsPaid: number
}

interface NIVComponents {
  // Core NIV Components with Provenance
  thrust: {
    value: number
    sources: { name: string; contribution: number; weight: number }[]
  }
  efficiency: {
    value: number
    sources: { name: string; contribution: number; weight: number }[]
  }
  slack: {
    value: number
    sources: { name: string; contribution: number; weight: number }[]
  }
  drag: {
    value: number
    sources: { name: string; contribution: number; weight: number }[]
  }

  // Computed NIV
  niv: number
  nivRaw: number // Before normalization

  // Regeneration Metrics
  regenerationRate: number
  capitalVelocity: number
  frictionCoefficient: number
}

interface ThirdOrderAnalysis {
  period: string

  // NIV Components
  components: NIVComponents

  // First-Order: Current State
  currentNIV: number

  // Second-Order: Dynamics
  nivAcceleration: number
  thrustMomentum: number
  dragTrend: number

  // Third-Order: Projections
  effectiveRate: number        // rₕ = α × avg(NIV) − β × avg(Drag)
  collapseProb: number         // ρₕ = logistic(γ × Drag − θ)
  cumulativeRegen: number      // Cₕ = NIV₀ × e^(rₕ×h) × (1 − ρₕ)
  confidenceLower: number
  confidenceUpper: number

  // Risk Assessment
  riskScore: number
  riskLevel: 'low' | 'moderate' | 'elevated' | 'high' | 'critical'
  riskFactors: { factor: string; severity: number; impact: string }[]
}

// ============================================================================
// NIV CALCULATION ENGINE
// ============================================================================

const NIV_PARAMS = {
  eta: 1.5,           // Non-linear scaling exponent
  alpha: 1.1,         // Efficiency multiplier for effective rate
  beta: 0.8,          // Drag penalty for effective rate
  gamma: 3.5,         // Drag sensitivity for collapse probability
  theta: 0.15,        // Tipping threshold
  horizonYears: 5,    // Projection horizon
}

function calculateNIVComponents(current: AccountingPeriod, prev: AccountingPeriod | null): NIVComponents {
  // ============================================================================
  // THRUST: Capital injection momentum, growth impulse
  // Sources: Revenue growth, Operating cash flow, Reinvestment rate
  // ============================================================================

  const revenueGrowth = prev && prev.revenue > 0
    ? (current.revenue - prev.revenue) / prev.revenue
    : 0

  const ebitda = current.revenue - current.costOfGoodsSold - current.operatingExpenses + current.depreciation
  const operatingCashFlow = ebitda - (current.accountsReceivable - (prev?.accountsReceivable || current.accountsReceivable))
                           - (current.inventory - (prev?.inventory || current.inventory))
                           + (current.accountsPayable - (prev?.accountsPayable || current.accountsPayable))
  const ocfToRevenue = current.revenue > 0 ? operatingCashFlow / current.revenue : 0

  const reinvestmentRate = ebitda > 0 ? current.capitalExpenditure / ebitda : 0

  const thrustSources = [
    { name: 'Revenue Growth', contribution: Math.max(0, revenueGrowth), weight: 0.4 },
    { name: 'Operating Cash Flow', contribution: Math.max(0, ocfToRevenue), weight: 0.35 },
    { name: 'Reinvestment Rate', contribution: Math.min(1, reinvestmentRate), weight: 0.25 }
  ]

  const thrustValue = thrustSources.reduce((sum, s) => sum + s.contribution * s.weight, 0)

  // ============================================================================
  // EFFICIENCY: Capital productivity, asset utilization
  // Sources: Asset turnover, ROA, Operating margin, Inventory turnover
  // ============================================================================

  const totalAssets = current.cash + current.accountsReceivable + current.inventory + current.fixedAssets
  const assetTurnover = totalAssets > 0 ? current.revenue / totalAssets : 0

  const netIncome = current.revenue - current.costOfGoodsSold - current.operatingExpenses
                   - current.interestExpense - current.depreciation - current.taxes
  const roa = totalAssets > 0 ? netIncome / totalAssets : 0

  const operatingMargin = current.revenue > 0
    ? (current.revenue - current.costOfGoodsSold - current.operatingExpenses) / current.revenue
    : 0

  const avgInventory = prev ? (current.inventory + prev.inventory) / 2 : current.inventory
  const inventoryTurnover = avgInventory > 0 ? current.costOfGoodsSold / avgInventory : 0

  const efficiencySources = [
    { name: 'Asset Turnover', contribution: Math.min(1, assetTurnover / 2), weight: 0.3 },
    { name: 'Return on Assets', contribution: Math.max(0, (roa + 0.1) / 0.3), weight: 0.3 },
    { name: 'Operating Margin', contribution: Math.max(0, (operatingMargin + 0.05) / 0.25), weight: 0.25 },
    { name: 'Inventory Turnover', contribution: Math.min(1, inventoryTurnover / 12), weight: 0.15 }
  ]

  const efficiencyValue = Math.min(1, efficiencySources.reduce((sum, s) => sum + Math.min(1, s.contribution) * s.weight, 0))

  // ============================================================================
  // SLACK: Economic headroom, liquidity buffer
  // Sources: Current ratio excess, Cash buffer, Credit availability
  // ============================================================================

  const currentAssets = current.cash + current.accountsReceivable + current.inventory
  const currentLiabilities = current.accountsPayable + current.shortTermDebt
  const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : 2
  const currentRatioExcess = Math.max(0, currentRatio - 1) / 2 // Excess above 1.0

  const cashToRevenue = current.revenue > 0 ? current.cash / (current.revenue / 12) : 0 // Months of cash
  const cashBuffer = Math.min(1, cashToRevenue / 6) // Normalize to 6 months

  const totalDebt = current.shortTermDebt + current.longTermDebt
  const debtCapacity = current.equity > 0 ? Math.max(0, 1 - totalDebt / (current.equity * 2)) : 0

  const slackSources = [
    { name: 'Current Ratio Buffer', contribution: Math.min(1, currentRatioExcess), weight: 0.35 },
    { name: 'Cash Runway', contribution: cashBuffer, weight: 0.4 },
    { name: 'Debt Capacity', contribution: debtCapacity, weight: 0.25 }
  ]

  const slackValue = slackSources.reduce((sum, s) => sum + s.contribution * s.weight, 0)

  // ============================================================================
  // DRAG: Systemic friction, debt burden, inefficiency
  // Sources: Debt service ratio, Interest burden, Operating inefficiency, Fixed cost leverage
  // ============================================================================

  const debtServiceRatio = ebitda > 0
    ? (current.interestExpense + current.shortTermDebt * 0.1) / ebitda
    : 1

  const interestCoverage = current.interestExpense > 0
    ? (current.revenue - current.costOfGoodsSold - current.operatingExpenses) / current.interestExpense
    : 10
  const interestBurden = Math.max(0, 1 - (interestCoverage - 1) / 9) // 1x = max burden, 10x+ = no burden

  const grossMargin = current.revenue > 0
    ? (current.revenue - current.costOfGoodsSold) / current.revenue
    : 0
  const operatingInefficiency = Math.max(0, 0.4 - grossMargin) / 0.4 // Below 40% = inefficient

  const fixedCostRatio = current.revenue > 0
    ? (current.depreciation + current.interestExpense) / current.revenue
    : 0
  const fixedCostLeverage = Math.min(1, fixedCostRatio / 0.15)

  const dragSources = [
    { name: 'Debt Service Burden', contribution: Math.min(1, debtServiceRatio), weight: 0.35 },
    { name: 'Interest Burden', contribution: interestBurden, weight: 0.25 },
    { name: 'Operating Inefficiency', contribution: operatingInefficiency, weight: 0.25 },
    { name: 'Fixed Cost Leverage', contribution: fixedCostLeverage, weight: 0.15 }
  ]

  const dragValue = dragSources.reduce((sum, s) => sum + s.contribution * s.weight, 0)

  // ============================================================================
  // NIV CALCULATION: NIV = (Thrust × Efficiency²) / (Slack + Drag)^η
  // ============================================================================

  const denominator = Math.pow(Math.max(0.1, slackValue + dragValue), NIV_PARAMS.eta)
  const nivRaw = (thrustValue * Math.pow(efficiencyValue, 2)) / denominator
  const niv = Math.min(1, Math.max(-1, nivRaw)) // Normalized to [-1, 1]

  // Derived regeneration metrics
  const regenerationRate = niv * efficiencyValue
  const capitalVelocity = thrustValue * (1 - dragValue)
  const frictionCoefficient = dragValue / Math.max(0.1, slackValue + efficiencyValue)

  return {
    thrust: { value: thrustValue, sources: thrustSources },
    efficiency: { value: efficiencyValue, sources: efficiencySources },
    slack: { value: slackValue, sources: slackSources },
    drag: { value: dragValue, sources: dragSources },
    niv,
    nivRaw,
    regenerationRate,
    capitalVelocity,
    frictionCoefficient
  }
}

function calculateThirdOrderAnalysis(
  periods: AccountingPeriod[],
  index: number
): ThirdOrderAnalysis {
  const current = periods[index]
  const prev = index > 0 ? periods[index - 1] : null
  const prevPrev = index > 1 ? periods[index - 2] : null

  const components = calculateNIVComponents(current, prev)
  const prevComponents = prev ? calculateNIVComponents(prev, prevPrev) : null

  // Second-Order: Acceleration
  const nivAcceleration = prevComponents ? components.niv - prevComponents.niv : 0
  const thrustMomentum = prevComponents ? components.thrust.value - prevComponents.thrust.value : 0
  const dragTrend = prevComponents ? components.drag.value - prevComponents.drag.value : 0

  // Calculate lookback averages for third-order
  const lookbackPeriods = Math.min(6, index + 1)
  let avgNIV = 0
  let avgDrag = 0

  for (let i = 0; i < lookbackPeriods; i++) {
    const p = periods[index - i]
    const pPrev = index - i > 0 ? periods[index - i - 1] : null
    const pComp = calculateNIVComponents(p, pPrev)
    avgNIV += pComp.niv
    avgDrag += pComp.drag.value
  }
  avgNIV /= lookbackPeriods
  avgDrag /= lookbackPeriods

  // Third-Order Calculations
  // rₕ = α × avg(NIV) − β × avg(Drag)
  const effectiveRate = NIV_PARAMS.alpha * avgNIV - NIV_PARAMS.beta * avgDrag

  // ρₕ = 1 / (1 + e^(-(γ × Drag − θ)))
  const collapseProb = 1 / (1 + Math.exp(-(NIV_PARAMS.gamma * avgDrag - NIV_PARAMS.theta)))

  // Cₕ = NIV₀ × e^(rₕ×h) × (1 − ρₕ)
  const cumulativeRegen = components.niv * Math.exp(effectiveRate * NIV_PARAMS.horizonYears) * (1 - collapseProb)

  // Confidence bounds (simplified Monte Carlo approximation)
  const volatility = Math.abs(nivAcceleration) + components.drag.value * 0.5
  const confidenceLower = cumulativeRegen * (1 - volatility * 1.5)
  const confidenceUpper = cumulativeRegen * (1 + volatility * 1.5)

  // Risk Assessment
  const riskScore = collapseProb * 50 + components.drag.value * 30 + (1 - components.efficiency.value) * 20

  let riskLevel: ThirdOrderAnalysis['riskLevel'] = 'low'
  if (riskScore >= 75) riskLevel = 'critical'
  else if (riskScore >= 55) riskLevel = 'high'
  else if (riskScore >= 40) riskLevel = 'elevated'
  else if (riskScore >= 25) riskLevel = 'moderate'

  const riskFactors: ThirdOrderAnalysis['riskFactors'] = []
  if (components.drag.value > 0.5) {
    riskFactors.push({ factor: 'High Systemic Drag', severity: components.drag.value, impact: 'Reduces regeneration velocity' })
  }
  if (collapseProb > 0.3) {
    riskFactors.push({ factor: 'Elevated Collapse Risk', severity: collapseProb, impact: 'Threatens capital continuity' })
  }
  if (components.thrust.value < 0.2) {
    riskFactors.push({ factor: 'Low Thrust Momentum', severity: 1 - components.thrust.value, impact: 'Insufficient growth impulse' })
  }
  if (components.slack.value < 0.2) {
    riskFactors.push({ factor: 'Limited Slack Buffer', severity: 1 - components.slack.value, impact: 'No headroom for shocks' })
  }

  return {
    period: current.period,
    components,
    currentNIV: components.niv,
    nivAcceleration,
    thrustMomentum,
    dragTrend,
    effectiveRate,
    collapseProb,
    cumulativeRegen,
    confidenceLower,
    confidenceUpper,
    riskScore,
    riskLevel,
    riskFactors
  }
}

// ============================================================================
// SAMPLE DATA GENERATOR
// ============================================================================

function generateSampleData(): AccountingPeriod[] {
  const periods: AccountingPeriod[] = []
  let baseRevenue = 120000
  let baseCash = 30000

  for (let i = 0; i < 12; i++) {
    const month = (i + 1).toString().padStart(2, '0')
    const period = `2024-${month}`

    const growthFactor = 1 + (Math.random() * 0.08 - 0.01)
    const seasonality = 1 + Math.sin((i / 12) * Math.PI * 2) * 0.12

    const revenue = Math.round(baseRevenue * growthFactor * seasonality)
    const cogs = Math.round(revenue * (0.52 + Math.random() * 0.08))
    const opex = Math.round(revenue * (0.18 + Math.random() * 0.04))
    const depreciation = Math.round(revenue * 0.03)
    const interest = 1800 + Math.round(Math.random() * 400)
    const pretaxIncome = revenue - cogs - opex - depreciation - interest
    const taxes = Math.max(0, Math.round(pretaxIncome * 0.22))

    const cash = Math.round(baseCash * (1 + Math.random() * 0.15 - 0.03))
    const ar = Math.round(revenue * 0.15 * (1 + Math.random() * 0.2 - 0.1))
    const inventory = Math.round(cogs * 0.08 * (1 + Math.random() * 0.15))
    const ap = Math.round(cogs * 0.06 * (1 + Math.random() * 0.15))

    const capex = Math.round(revenue * (0.04 + Math.random() * 0.02))
    const dividends = Math.round(Math.max(0, pretaxIncome - taxes) * 0.2)

    periods.push({
      period,
      revenue,
      costOfGoodsSold: cogs,
      operatingExpenses: opex,
      interestExpense: interest,
      depreciation,
      taxes,
      cash,
      accountsReceivable: ar,
      inventory,
      fixedAssets: 180000 + i * 2000,
      accountsPayable: ap,
      shortTermDebt: 25000,
      longTermDebt: 75000 - i * 500,
      retainedEarnings: 50000 + i * 3000,
      equity: 120000 + i * 3000,
      capitalExpenditure: capex,
      dividendsPaid: dividends
    })

    baseRevenue = revenue
    baseCash = cash
  }

  return periods
}

// ============================================================================
// FORMAT HELPERS
// ============================================================================

const formatCurrency = (n: number) => {
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`
  return `$${n.toLocaleString()}`
}

const formatPercent = (n: number) => `${(n * 100).toFixed(1)}%`
const formatNumber = (n: number, d = 4) => isNaN(n) || !isFinite(n) ? 'N/A' : n.toFixed(d)

const getRiskColor = (level: string) => {
  const colors: Record<string, string> = {
    low: 'text-emerald-400 bg-emerald-400/20',
    moderate: 'text-yellow-400 bg-yellow-400/20',
    elevated: 'text-orange-400 bg-orange-400/20',
    high: 'text-red-400 bg-red-400/20',
    critical: 'text-red-300 bg-red-500/30'
  }
  return colors[level] || 'text-gray-400 bg-gray-400/20'
}

const getComponentColor = (component: string) => {
  const colors: Record<string, string> = {
    thrust: '#22d3ee',    // cyan
    efficiency: '#a78bfa', // purple
    slack: '#34d399',      // emerald
    drag: '#f87171'        // red
  }
  return colors[component] || '#9ca3af'
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ThirdOrderAccountingPage() {
  const [accountingData, setAccountingData] = useState<AccountingPeriod[]>(generateSampleData)
  const [selectedPeriod, setSelectedPeriod] = useState(11)
  const [activeTab, setActiveTab] = useState<'overview' | 'components' | 'engine' | 'provenance'>('overview')
  const [editMode, setEditMode] = useState(false)

  // Compute all analyses
  const analyses = useMemo(() =>
    accountingData.map((_, i) => calculateThirdOrderAnalysis(accountingData, i)),
    [accountingData]
  )

  const currentAnalysis = analyses[selectedPeriod]
  const currentData = accountingData[selectedPeriod]

  const updateField = useCallback((field: keyof AccountingPeriod, value: number) => {
    setAccountingData(prev => {
      const updated = [...prev]
      updated[selectedPeriod] = { ...updated[selectedPeriod], [field]: value }
      return updated
    })
  }, [selectedPeriod])

  const resetData = () => {
    setAccountingData(generateSampleData())
    setSelectedPeriod(11)
  }

  // Radar chart data for NIV components
  const radarData = [
    { component: 'Thrust', value: currentAnalysis.components.thrust.value, fullMark: 1 },
    { component: 'Efficiency', value: currentAnalysis.components.efficiency.value, fullMark: 1 },
    { component: 'Slack', value: currentAnalysis.components.slack.value, fullMark: 1 },
    { component: '1-Drag', value: 1 - currentAnalysis.components.drag.value, fullMark: 1 }
  ]

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-950 via-neutral-950 to-purple-950 border-b border-neutral-800 py-6 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-white">Third-Order Regeneration Engine</h1>
            <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs font-bold rounded border border-cyan-500/30">NIV</span>
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs font-bold rounded border border-amber-500/30">BETA</span>
          </div>
          <p className="text-neutral-400 text-sm mb-3">
            Business-level NIV analysis with exponential compounding projections
          </p>
          <div className="font-mono text-xs text-neutral-500 bg-neutral-900/50 px-3 py-1.5 rounded inline-block">
            NIV = (T × E²) / (S + D)<sup>η</sup> → Cₕ = NIV₀ × e<sup>(rₕ×h)</sup> × (1 − ρₕ)
          </div>
        </div>
      </div>

      {/* Period Selector */}
      <div className="bg-neutral-900/50 border-b border-neutral-800 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <span className="text-sm text-neutral-500">Period:</span>
          <div className="flex gap-1 overflow-x-auto">
            {accountingData.map((p, i) => (
              <button
                key={p.period}
                onClick={() => setSelectedPeriod(i)}
                className={`px-3 py-1.5 text-xs rounded font-mono transition ${
                  selectedPeriod === i
                    ? 'bg-cyan-600 text-white'
                    : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                }`}
              >
                {p.period}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <button onClick={resetData} className="px-3 py-1.5 text-xs bg-neutral-800 text-neutral-400 rounded hover:bg-neutral-700">
            Reset
          </button>
          <button
            onClick={() => setEditMode(!editMode)}
            className={`px-3 py-1.5 text-xs rounded ${editMode ? 'bg-amber-600 text-white' : 'bg-neutral-800 text-neutral-300'}`}
          >
            {editMode ? 'Done' : 'Edit'}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-neutral-900/30 border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            {[
              { id: 'overview', label: 'NIV Overview', icon: '◉' },
              { id: 'components', label: 'Component Mapping', icon: '⬡' },
              { id: 'engine', label: 'Third-Order Engine', icon: '∞' },
              { id: 'provenance', label: 'Provenance & Data', icon: '⊞' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-5 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-cyan-500 text-cyan-400'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Tab: NIV Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Primary Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-gradient-to-br from-cyan-900/30 to-neutral-900 border border-cyan-500/30 rounded-xl p-4">
                <div className="text-xs text-cyan-400 mb-1 font-semibold">CURRENT NIV</div>
                <div className={`text-3xl font-bold ${currentAnalysis.currentNIV >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                  {formatNumber(currentAnalysis.currentNIV, 4)}
                </div>
                <div className="text-xs text-neutral-500 mt-1">Regeneration velocity</div>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                <div className="text-xs text-neutral-400 mb-1">NIV ACCELERATION</div>
                <div className={`text-2xl font-bold ${currentAnalysis.nivAcceleration >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {currentAnalysis.nivAcceleration >= 0 ? '+' : ''}{formatNumber(currentAnalysis.nivAcceleration, 4)}
                </div>
                <div className="text-xs text-neutral-500 mt-1">dNIV/dt</div>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                <div className="text-xs text-neutral-400 mb-1">EFFECTIVE RATE</div>
                <div className={`text-2xl font-bold ${currentAnalysis.effectiveRate >= 0 ? 'text-purple-400' : 'text-orange-400'}`}>
                  {formatNumber(currentAnalysis.effectiveRate, 3)}
                </div>
                <div className="text-xs text-neutral-500 mt-1">rₕ = α×NIV − β×Drag</div>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                <div className="text-xs text-neutral-400 mb-1">COLLAPSE PROB</div>
                <div className={`text-2xl font-bold ${currentAnalysis.collapseProb < 0.2 ? 'text-emerald-400' : currentAnalysis.collapseProb < 0.4 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {formatPercent(currentAnalysis.collapseProb)}
                </div>
                <div className="text-xs text-neutral-500 mt-1">ρₕ risk factor</div>
              </div>

              <div className="bg-gradient-to-br from-purple-900/30 to-neutral-900 border border-purple-500/30 rounded-xl p-4">
                <div className="text-xs text-purple-400 mb-1 font-semibold">CUMULATIVE Cₕ</div>
                <div className={`text-3xl font-bold ${currentAnalysis.cumulativeRegen >= 0 ? 'text-purple-400' : 'text-red-400'}`}>
                  {formatNumber(currentAnalysis.cumulativeRegen, 3)}
                </div>
                <div className="text-xs text-neutral-500 mt-1">{NIV_PARAMS.horizonYears}Y projection</div>
              </div>
            </div>

            {/* Component Radar & Risk */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                <h3 className="text-lg font-semibold text-white mb-4">NIV Component Balance</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#374151" />
                    <PolarAngleAxis dataKey="component" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 1]} tick={{ fill: '#6b7280', fontSize: 10 }} />
                    <Radar name="Current" dataKey="value" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.3} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-4 gap-2 mt-4 text-center">
                  {[
                    { key: 'thrust', label: 'Thrust', value: currentAnalysis.components.thrust.value },
                    { key: 'efficiency', label: 'Efficiency', value: currentAnalysis.components.efficiency.value },
                    { key: 'slack', label: 'Slack', value: currentAnalysis.components.slack.value },
                    { key: 'drag', label: 'Drag', value: currentAnalysis.components.drag.value }
                  ].map(c => (
                    <div key={c.key} className="bg-neutral-800/50 rounded-lg p-2">
                      <div className="text-lg font-bold" style={{ color: getComponentColor(c.key) }}>
                        {formatPercent(c.value)}
                      </div>
                      <div className="text-xs text-neutral-500">{c.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                <h3 className="text-lg font-semibold text-white mb-4">Risk Assessment</h3>
                <div className="flex items-center gap-4 mb-6">
                  <div className={`text-4xl font-bold px-4 py-2 rounded-xl ${getRiskColor(currentAnalysis.riskLevel)}`}>
                    {currentAnalysis.riskLevel.toUpperCase()}
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-neutral-200">{formatNumber(currentAnalysis.riskScore, 1)}%</div>
                    <div className="text-sm text-neutral-500">Composite Score</div>
                  </div>
                </div>

                {currentAnalysis.riskFactors.length > 0 ? (
                  <div className="space-y-3">
                    {currentAnalysis.riskFactors.map((rf, i) => (
                      <div key={i} className="bg-neutral-800/50 rounded-lg p-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-neutral-200">{rf.factor}</span>
                          <span className="text-xs text-red-400">{formatPercent(rf.severity)}</span>
                        </div>
                        <div className="text-xs text-neutral-500">{rf.impact}</div>
                        <div className="h-1.5 bg-neutral-700 rounded-full mt-2 overflow-hidden">
                          <div className="h-full bg-red-500" style={{ width: `${rf.severity * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-neutral-500 py-8">
                    <span className="text-3xl block mb-2">✓</span>
                    No significant risk factors detected
                  </div>
                )}
              </div>
            </div>

            {/* NIV Evolution Chart */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
              <h3 className="text-lg font-semibold text-white mb-4">NIV Regeneration Evolution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={analyses}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="period" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" stroke="#9ca3af" />
                  <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    formatter={(value: number, name: string) => [formatNumber(value, 4), name]}
                  />
                  <Legend />
                  <Area yAxisId="left" type="monotone" dataKey="cumulativeRegen" fill="#a78bfa" stroke="#a78bfa" fillOpacity={0.2} name="Cₕ Projection" />
                  <Line yAxisId="left" type="monotone" dataKey="currentNIV" stroke="#22d3ee" strokeWidth={2} dot={{ r: 3 }} name="NIV" />
                  <Line yAxisId="right" type="monotone" dataKey="collapseProb" stroke="#f87171" strokeWidth={2} strokeDasharray="5 5" name="Collapse ρ" />
                  <ReferenceLine yAxisId="left" y={0} stroke="#6b7280" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Tab: Component Mapping */}
        {activeTab === 'components' && (
          <div className="space-y-6">
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-cyan-300 mb-2">NIV Component Mapping</h3>
              <p className="text-sm text-neutral-400">
                Each NIV component is derived from specific accounting metrics. The formula
                <span className="font-mono text-cyan-400 mx-1">NIV = (T × E²) / (S + D)^η</span>
                compounds efficiency while balancing thrust against friction.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Thrust */}
              <div className="bg-neutral-900 border-2 border-cyan-500/30 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                    <span className="text-cyan-400 text-xl">↗</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-cyan-400">THRUST (T)</h3>
                    <p className="text-xs text-neutral-500">Capital injection momentum</p>
                  </div>
                  <div className="ml-auto text-2xl font-bold text-cyan-400">
                    {formatPercent(currentAnalysis.components.thrust.value)}
                  </div>
                </div>
                <div className="space-y-3">
                  {currentAnalysis.components.thrust.sources.map((s, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-neutral-400">{s.name}</span>
                        <span className="text-neutral-300">{formatPercent(s.contribution)} × {s.weight}</span>
                      </div>
                      <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-500" style={{ width: `${Math.min(100, s.contribution * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Efficiency */}
              <div className="bg-neutral-900 border-2 border-purple-500/30 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <span className="text-purple-400 text-xl">⚡</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-purple-400">EFFICIENCY (E)</h3>
                    <p className="text-xs text-neutral-500">Capital productivity (squared in NIV)</p>
                  </div>
                  <div className="ml-auto text-2xl font-bold text-purple-400">
                    {formatPercent(currentAnalysis.components.efficiency.value)}
                  </div>
                </div>
                <div className="space-y-3">
                  {currentAnalysis.components.efficiency.sources.map((s, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-neutral-400">{s.name}</span>
                        <span className="text-neutral-300">{formatPercent(s.contribution)} × {s.weight}</span>
                      </div>
                      <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500" style={{ width: `${Math.min(100, s.contribution * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Slack */}
              <div className="bg-neutral-900 border-2 border-emerald-500/30 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <span className="text-emerald-400 text-xl">◇</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-emerald-400">SLACK (S)</h3>
                    <p className="text-xs text-neutral-500">Economic headroom buffer</p>
                  </div>
                  <div className="ml-auto text-2xl font-bold text-emerald-400">
                    {formatPercent(currentAnalysis.components.slack.value)}
                  </div>
                </div>
                <div className="space-y-3">
                  {currentAnalysis.components.slack.sources.map((s, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-neutral-400">{s.name}</span>
                        <span className="text-neutral-300">{formatPercent(s.contribution)} × {s.weight}</span>
                      </div>
                      <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, s.contribution * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Drag */}
              <div className="bg-neutral-900 border-2 border-red-500/30 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <span className="text-red-400 text-xl">▼</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-red-400">DRAG (D)</h3>
                    <p className="text-xs text-neutral-500">Systemic friction & burden</p>
                  </div>
                  <div className="ml-auto text-2xl font-bold text-red-400">
                    {formatPercent(currentAnalysis.components.drag.value)}
                  </div>
                </div>
                <div className="space-y-3">
                  {currentAnalysis.components.drag.sources.map((s, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-neutral-400">{s.name}</span>
                        <span className="text-neutral-300">{formatPercent(s.contribution)} × {s.weight}</span>
                      </div>
                      <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500" style={{ width: `${Math.min(100, s.contribution * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Component Trends */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
              <h3 className="text-lg font-semibold text-white mb-4">Component Evolution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analyses}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="period" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#9ca3af" domain={[0, 1]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    formatter={(value: number) => formatPercent(value)}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="components.thrust.value" stroke="#22d3ee" strokeWidth={2} name="Thrust" dot={false} />
                  <Line type="monotone" dataKey="components.efficiency.value" stroke="#a78bfa" strokeWidth={2} name="Efficiency" dot={false} />
                  <Line type="monotone" dataKey="components.slack.value" stroke="#34d399" strokeWidth={2} name="Slack" dot={false} />
                  <Line type="monotone" dataKey="components.drag.value" stroke="#f87171" strokeWidth={2} name="Drag" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Tab: Third-Order Engine */}
        {activeTab === 'engine' && (
          <div className="space-y-6">
            {/* Formula Explanation */}
            <div className="bg-gradient-to-r from-purple-900/30 via-neutral-900 to-cyan-900/30 border border-neutral-700 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Third-Order Regeneration Engine</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-neutral-900/80 rounded-lg p-4">
                  <div className="text-cyan-400 font-semibold mb-2">First-Order</div>
                  <div className="font-mono text-lg text-white mb-2">NIVₜ</div>
                  <p className="text-xs text-neutral-400">Current regeneration velocity at time t. Represents instantaneous capital regeneration rate.</p>
                </div>

                <div className="bg-neutral-900/80 rounded-lg p-4">
                  <div className="text-purple-400 font-semibold mb-2">Second-Order</div>
                  <div className="font-mono text-lg text-white mb-2">dNIV/dt</div>
                  <p className="text-xs text-neutral-400">Acceleration of regeneration. Positive = improving momentum, Negative = decelerating.</p>
                </div>

                <div className="bg-neutral-900/80 rounded-lg p-4">
                  <div className="text-emerald-400 font-semibold mb-2">Third-Order</div>
                  <div className="font-mono text-lg text-white mb-2">Cₕ = NIV₀ × e<sup>rₕ×h</sup> × (1−ρₕ)</div>
                  <p className="text-xs text-neutral-400">Cumulative regenerated capital after horizon h years, risk-adjusted.</p>
                </div>
              </div>
            </div>

            {/* Engine Parameters */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                <div className="text-xs text-neutral-500 mb-1">η (eta)</div>
                <div className="text-2xl font-bold text-neutral-200">{NIV_PARAMS.eta}</div>
                <div className="text-xs text-neutral-600">Nonlinear exponent</div>
              </div>
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                <div className="text-xs text-neutral-500 mb-1">α (alpha)</div>
                <div className="text-2xl font-bold text-neutral-200">{NIV_PARAMS.alpha}</div>
                <div className="text-xs text-neutral-600">Efficiency multiplier</div>
              </div>
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                <div className="text-xs text-neutral-500 mb-1">β (beta)</div>
                <div className="text-2xl font-bold text-neutral-200">{NIV_PARAMS.beta}</div>
                <div className="text-xs text-neutral-600">Drag penalty</div>
              </div>
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                <div className="text-xs text-neutral-500 mb-1">γ / θ</div>
                <div className="text-2xl font-bold text-neutral-200">{NIV_PARAMS.gamma} / {NIV_PARAMS.theta}</div>
                <div className="text-xs text-neutral-600">Collapse sensitivity</div>
              </div>
            </div>

            {/* Projection Chart with Confidence */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
              <h3 className="text-lg font-semibold text-white mb-4">Cumulative Regeneration Projection (Cₕ)</h3>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={analyses}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="period" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    formatter={(value: number, name: string) => [formatNumber(value, 4), name]}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="confidenceUpper" stroke="none" fill="#a78bfa" fillOpacity={0.15} name="95% Upper" />
                  <Area type="monotone" dataKey="confidenceLower" stroke="none" fill="#a78bfa" fillOpacity={0.15} name="95% Lower" />
                  <Line type="monotone" dataKey="cumulativeRegen" stroke="#a78bfa" strokeWidth={3} dot={{ r: 4 }} name="Cₕ" />
                  <Line type="monotone" dataKey="effectiveRate" stroke="#22d3ee" strokeWidth={2} strokeDasharray="5 5" name="rₕ" />
                  <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Detailed Metrics Table */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
              <h3 className="text-lg font-semibold text-white mb-4">Third-Order Analysis History</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-700">
                      <th className="text-left py-2 px-2 text-neutral-400">Period</th>
                      <th className="text-right py-2 px-2 text-cyan-400">NIV</th>
                      <th className="text-right py-2 px-2 text-neutral-400">dNIV/dt</th>
                      <th className="text-right py-2 px-2 text-neutral-400">rₕ</th>
                      <th className="text-right py-2 px-2 text-neutral-400">ρₕ</th>
                      <th className="text-right py-2 px-2 text-purple-400">Cₕ</th>
                      <th className="text-right py-2 px-2 text-neutral-400">Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyses.map((a, i) => (
                      <tr key={a.period} className={`border-b border-neutral-800 ${i === selectedPeriod ? 'bg-cyan-500/10' : 'hover:bg-neutral-800/50'}`}>
                        <td className="py-2 px-2 font-mono text-neutral-300">{a.period}</td>
                        <td className={`py-2 px-2 text-right font-mono ${a.currentNIV >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                          {formatNumber(a.currentNIV, 4)}
                        </td>
                        <td className={`py-2 px-2 text-right font-mono ${a.nivAcceleration >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {a.nivAcceleration >= 0 ? '+' : ''}{formatNumber(a.nivAcceleration, 4)}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-neutral-300">{formatNumber(a.effectiveRate, 3)}</td>
                        <td className="py-2 px-2 text-right font-mono text-neutral-300">{formatPercent(a.collapseProb)}</td>
                        <td className={`py-2 px-2 text-right font-mono font-bold ${a.cumulativeRegen >= 0 ? 'text-purple-400' : 'text-red-400'}`}>
                          {formatNumber(a.cumulativeRegen, 3)}
                        </td>
                        <td className="py-2 px-2 text-right">
                          <span className={`px-2 py-0.5 rounded text-xs ${getRiskColor(a.riskLevel)}`}>{a.riskLevel}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Provenance & Data */}
        {activeTab === 'provenance' && (
          <div className="space-y-6">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-amber-300 mb-2">Data Provenance</h3>
              <p className="text-sm text-neutral-400">
                All NIV components are derived from standard accounting data. Edit values below to see real-time impact on regeneration metrics.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Income Statement */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                <h3 className="text-lg font-semibold text-white mb-4">Income Statement</h3>
                <div className="space-y-3">
                  {[
                    { key: 'revenue', label: 'Revenue', maps: 'Thrust, Efficiency' },
                    { key: 'costOfGoodsSold', label: 'Cost of Goods Sold', maps: 'Efficiency, Drag' },
                    { key: 'operatingExpenses', label: 'Operating Expenses', maps: 'Drag' },
                    { key: 'depreciation', label: 'Depreciation', maps: 'Drag' },
                    { key: 'interestExpense', label: 'Interest Expense', maps: 'Drag' },
                    { key: 'taxes', label: 'Taxes', maps: 'Efficiency' }
                  ].map(field => (
                    <div key={field.key} className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="text-sm text-neutral-300">{field.label}</div>
                        <div className="text-xs text-neutral-600">→ {field.maps}</div>
                      </div>
                      {editMode ? (
                        <input
                          type="number"
                          value={currentData[field.key as keyof AccountingPeriod] as number}
                          onChange={(e) => updateField(field.key as keyof AccountingPeriod, parseFloat(e.target.value) || 0)}
                          className="w-28 px-2 py-1 text-right font-mono text-sm bg-neutral-800 border border-neutral-700 rounded text-white"
                        />
                      ) : (
                        <span className="font-mono text-sm text-white">{formatCurrency(currentData[field.key as keyof AccountingPeriod] as number)}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Balance Sheet */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                <h3 className="text-lg font-semibold text-white mb-4">Balance Sheet</h3>
                <div className="space-y-3">
                  {[
                    { key: 'cash', label: 'Cash', maps: 'Slack' },
                    { key: 'accountsReceivable', label: 'Accounts Receivable', maps: 'Slack, Thrust' },
                    { key: 'inventory', label: 'Inventory', maps: 'Efficiency' },
                    { key: 'fixedAssets', label: 'Fixed Assets', maps: 'Efficiency' },
                    { key: 'accountsPayable', label: 'Accounts Payable', maps: 'Thrust' },
                    { key: 'shortTermDebt', label: 'Short-Term Debt', maps: 'Drag, Slack' },
                    { key: 'longTermDebt', label: 'Long-Term Debt', maps: 'Drag' },
                    { key: 'equity', label: 'Equity', maps: 'Slack, Drag' }
                  ].map(field => (
                    <div key={field.key} className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="text-sm text-neutral-300">{field.label}</div>
                        <div className="text-xs text-neutral-600">→ {field.maps}</div>
                      </div>
                      {editMode ? (
                        <input
                          type="number"
                          value={currentData[field.key as keyof AccountingPeriod] as number}
                          onChange={(e) => updateField(field.key as keyof AccountingPeriod, parseFloat(e.target.value) || 0)}
                          className="w-28 px-2 py-1 text-right font-mono text-sm bg-neutral-800 border border-neutral-700 rounded text-white"
                        />
                      ) : (
                        <span className="font-mono text-sm text-white">{formatCurrency(currentData[field.key as keyof AccountingPeriod] as number)}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Cash Flow */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
              <h3 className="text-lg font-semibold text-white mb-4">Cash Flow Items</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'capitalExpenditure', label: 'Capital Expenditure', maps: 'Thrust (Reinvestment)' },
                  { key: 'dividendsPaid', label: 'Dividends Paid', maps: 'Thrust (Payout)' }
                ].map(field => (
                  <div key={field.key} className="flex items-center justify-between gap-4 bg-neutral-800/50 rounded-lg p-3">
                    <div className="flex-1">
                      <div className="text-sm text-neutral-300">{field.label}</div>
                      <div className="text-xs text-neutral-600">→ {field.maps}</div>
                    </div>
                    {editMode ? (
                      <input
                        type="number"
                        value={currentData[field.key as keyof AccountingPeriod] as number}
                        onChange={(e) => updateField(field.key as keyof AccountingPeriod, parseFloat(e.target.value) || 0)}
                        className="w-28 px-2 py-1 text-right font-mono text-sm bg-neutral-800 border border-neutral-700 rounded text-white"
                      />
                    ) : (
                      <span className="font-mono text-sm text-white">{formatCurrency(currentData[field.key as keyof AccountingPeriod] as number)}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Derived Metrics */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
              <h3 className="text-lg font-semibold text-white mb-4">Derived Regeneration Metrics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-neutral-800/50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-cyan-400">{formatNumber(currentAnalysis.components.regenerationRate, 4)}</div>
                  <div className="text-xs text-neutral-500">Regeneration Rate</div>
                  <div className="text-xs text-neutral-600 mt-1">NIV × E</div>
                </div>
                <div className="bg-neutral-800/50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-400">{formatNumber(currentAnalysis.components.capitalVelocity, 4)}</div>
                  <div className="text-xs text-neutral-500">Capital Velocity</div>
                  <div className="text-xs text-neutral-600 mt-1">T × (1-D)</div>
                </div>
                <div className="bg-neutral-800/50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-orange-400">{formatNumber(currentAnalysis.components.frictionCoefficient, 4)}</div>
                  <div className="text-xs text-neutral-500">Friction Coefficient</div>
                  <div className="text-xs text-neutral-600 mt-1">D / (S+E)</div>
                </div>
                <div className="bg-neutral-800/50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-neutral-300">{formatNumber(currentAnalysis.components.nivRaw, 4)}</div>
                  <div className="text-xs text-neutral-500">Raw NIV</div>
                  <div className="text-xs text-neutral-600 mt-1">Pre-normalization</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
