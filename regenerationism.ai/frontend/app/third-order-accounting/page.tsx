'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
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
  PolarRadiusAxis,
  Treemap
} from 'recharts'

// ============================================================================
// NIV REGENERATION THEORY - THIRD-ORDER ACCOUNTING
// ============================================================================

/**
 * Third-Order Accounting Framework
 *
 * Traditional accounting captures historical transactions (first-order).
 * Third-order accounting projects cumulative capital regeneration capacity
 * using the NIV framework to reveal true enterprise value creation potential.
 *
 * Core Formula: NIV = (Thrust × Efficiency²) / (Slack + Drag)^η
 * Projection:   Cₕ = NIV₀ × e^(rₕ×h) × (1 − ρₕ)
 *
 * This reveals what traditional accounting cannot:
 * - Forward-looking regeneration capacity
 * - Risk-adjusted capital continuity
 * - Compounding value creation potential
 */

interface AccountingPeriod {
  period: string
  revenue: number
  costOfGoodsSold: number
  operatingExpenses: number
  interestExpense: number
  depreciation: number
  taxes: number
  cash: number
  accountsReceivable: number
  inventory: number
  fixedAssets: number
  accountsPayable: number
  shortTermDebt: number
  longTermDebt: number
  retainedEarnings: number
  equity: number
  capitalExpenditure: number
  dividendsPaid: number
}

interface NIVComponents {
  thrust: { value: number; sources: { name: string; contribution: number; weight: number }[] }
  efficiency: { value: number; sources: { name: string; contribution: number; weight: number }[] }
  slack: { value: number; sources: { name: string; contribution: number; weight: number }[] }
  drag: { value: number; sources: { name: string; contribution: number; weight: number }[] }
  niv: number
  nivRaw: number
  regenerationRate: number
  capitalVelocity: number
  frictionCoefficient: number
}

interface ThirdOrderAnalysis {
  period: string
  components: NIVComponents
  currentNIV: number
  nivAcceleration: number
  thrustMomentum: number
  dragTrend: number
  effectiveRate: number
  collapseProb: number
  cumulativeRegen: number
  confidenceLower: number
  confidenceUpper: number
  riskScore: number
  riskLevel: 'low' | 'moderate' | 'elevated' | 'high' | 'critical'
  riskFactors: { factor: string; severity: number; impact: string }[]
}

interface SP500Company {
  symbol: string
  name: string
  sector: string
  marketCap: number
  // Income Statement
  revenue?: number
  costOfRevenue?: number
  operatingExpenses?: number
  interestExpense?: number
  depreciationAndAmortization?: number
  incomeTaxExpense?: number
  netIncome?: number
  // Balance Sheet
  cashAndEquivalents?: number
  accountsReceivable?: number
  inventory?: number
  totalCurrentAssets?: number
  propertyPlantEquipment?: number
  totalAssets?: number
  accountsPayable?: number
  shortTermDebt?: number
  totalCurrentLiabilities?: number
  longTermDebt?: number
  totalLiabilities?: number
  totalEquity?: number
  // Cash Flow
  operatingCashFlow?: number
  capitalExpenditure?: number
  freeCashFlow?: number
  // NIV
  nivComponents?: { thrust: number; efficiency: number; slack: number; drag: number; niv: number }
}

interface DecisionNode {
  id: string
  type: 'root' | 'decision' | 'action' | 'outcome'
  label: string
  description: string
  metric?: string
  currentValue?: number
  targetValue?: number
  impact: number
  probability: number
  timeframe: string
  children?: DecisionNode[]
}

interface ActionPlan {
  id: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  category: 'thrust' | 'efficiency' | 'slack' | 'drag'
  title: string
  description: string
  rationale: string
  expectedImpact: { nivDelta: number; chDelta: number; riskReduction: number }
  implementation: { steps: string[]; resources: string[]; metrics: string[] }
  timeframe: string
  dependencies: string[]
}

interface AIAnalysis {
  currentState: { niv: number; effectiveRate: number; collapseProb: number; cumulativeRegen: number; riskLevel: string }
  optimizedState: { niv: number; effectiveRate: number; collapseProb: number; cumulativeRegen: number; riskLevel: string }
  decisionTree: DecisionNode
  actionPlans: ActionPlan[]
  insights: string[]
}

// ============================================================================
// NIV CALCULATION ENGINE
// ============================================================================

const NIV_PARAMS = { eta: 1.5, alpha: 1.1, beta: 0.8, gamma: 3.5, theta: 0.15, horizonYears: 5 }

function calculateNIVComponents(current: AccountingPeriod, prev: AccountingPeriod | null): NIVComponents {
  const revenueGrowth = prev && prev.revenue > 0 ? (current.revenue - prev.revenue) / prev.revenue : 0
  const ebitda = current.revenue - current.costOfGoodsSold - current.operatingExpenses + current.depreciation
  const ocf = ebitda - (current.accountsReceivable - (prev?.accountsReceivable || current.accountsReceivable))
            - (current.inventory - (prev?.inventory || current.inventory))
            + (current.accountsPayable - (prev?.accountsPayable || current.accountsPayable))
  const ocfToRevenue = current.revenue > 0 ? ocf / current.revenue : 0
  const reinvestmentRate = ebitda > 0 ? current.capitalExpenditure / ebitda : 0

  const thrustSources = [
    { name: 'Revenue Growth', contribution: Math.max(0, revenueGrowth), weight: 0.4 },
    { name: 'Operating Cash Flow', contribution: Math.max(0, ocfToRevenue), weight: 0.35 },
    { name: 'Reinvestment Rate', contribution: Math.min(1, reinvestmentRate), weight: 0.25 }
  ]
  const thrustValue = thrustSources.reduce((sum, s) => sum + s.contribution * s.weight, 0)

  const totalAssets = current.cash + current.accountsReceivable + current.inventory + current.fixedAssets
  const assetTurnover = totalAssets > 0 ? current.revenue / totalAssets : 0
  const netIncome = current.revenue - current.costOfGoodsSold - current.operatingExpenses - current.interestExpense - current.depreciation - current.taxes
  const roa = totalAssets > 0 ? netIncome / totalAssets : 0
  const operatingMargin = current.revenue > 0 ? (current.revenue - current.costOfGoodsSold - current.operatingExpenses) / current.revenue : 0
  const avgInventory = prev ? (current.inventory + prev.inventory) / 2 : current.inventory
  const inventoryTurnover = avgInventory > 0 ? current.costOfGoodsSold / avgInventory : 0

  const efficiencySources = [
    { name: 'Asset Turnover', contribution: Math.min(1, assetTurnover / 2), weight: 0.3 },
    { name: 'Return on Assets', contribution: Math.max(0, (roa + 0.1) / 0.3), weight: 0.3 },
    { name: 'Operating Margin', contribution: Math.max(0, (operatingMargin + 0.05) / 0.25), weight: 0.25 },
    { name: 'Inventory Turnover', contribution: Math.min(1, inventoryTurnover / 12), weight: 0.15 }
  ]
  const efficiencyValue = Math.min(1, efficiencySources.reduce((sum, s) => sum + Math.min(1, s.contribution) * s.weight, 0))

  const currentAssets = current.cash + current.accountsReceivable + current.inventory
  const currentLiabilities = current.accountsPayable + current.shortTermDebt
  const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : 2
  const cashToRevenue = current.revenue > 0 ? current.cash / (current.revenue / 12) : 0
  const cashBuffer = Math.min(1, cashToRevenue / 6)
  const totalDebt = current.shortTermDebt + current.longTermDebt
  const debtCapacity = current.equity > 0 ? Math.max(0, 1 - totalDebt / (current.equity * 2)) : 0

  const slackSources = [
    { name: 'Current Ratio Buffer', contribution: Math.min(1, Math.max(0, currentRatio - 1) / 2), weight: 0.35 },
    { name: 'Cash Runway', contribution: cashBuffer, weight: 0.4 },
    { name: 'Debt Capacity', contribution: debtCapacity, weight: 0.25 }
  ]
  const slackValue = slackSources.reduce((sum, s) => sum + s.contribution * s.weight, 0)

  const debtServiceRatio = ebitda > 0 ? (current.interestExpense + current.shortTermDebt * 0.1) / ebitda : 1
  const interestCoverage = current.interestExpense > 0 ? (current.revenue - current.costOfGoodsSold - current.operatingExpenses) / current.interestExpense : 10
  const interestBurden = Math.max(0, 1 - (interestCoverage - 1) / 9)
  const grossMargin = current.revenue > 0 ? (current.revenue - current.costOfGoodsSold) / current.revenue : 0
  const operatingInefficiency = Math.max(0, 0.4 - grossMargin) / 0.4
  const fixedCostRatio = current.revenue > 0 ? (current.depreciation + current.interestExpense) / current.revenue : 0
  const fixedCostLeverage = Math.min(1, fixedCostRatio / 0.15)

  const dragSources = [
    { name: 'Debt Service Burden', contribution: Math.min(1, debtServiceRatio), weight: 0.35 },
    { name: 'Interest Burden', contribution: interestBurden, weight: 0.25 },
    { name: 'Operating Inefficiency', contribution: operatingInefficiency, weight: 0.25 },
    { name: 'Fixed Cost Leverage', contribution: fixedCostLeverage, weight: 0.15 }
  ]
  const dragValue = dragSources.reduce((sum, s) => sum + s.contribution * s.weight, 0)

  const denominator = Math.pow(Math.max(0.1, slackValue + dragValue), NIV_PARAMS.eta)
  const nivRaw = (thrustValue * Math.pow(efficiencyValue, 2)) / denominator
  const niv = Math.min(1, Math.max(-1, nivRaw))

  return {
    thrust: { value: thrustValue, sources: thrustSources },
    efficiency: { value: efficiencyValue, sources: efficiencySources },
    slack: { value: slackValue, sources: slackSources },
    drag: { value: dragValue, sources: dragSources },
    niv, nivRaw,
    regenerationRate: niv * efficiencyValue,
    capitalVelocity: thrustValue * (1 - dragValue),
    frictionCoefficient: dragValue / Math.max(0.1, slackValue + efficiencyValue)
  }
}

function calculateThirdOrderAnalysis(periods: AccountingPeriod[], index: number): ThirdOrderAnalysis {
  const current = periods[index]
  const prev = index > 0 ? periods[index - 1] : null
  const prevPrev = index > 1 ? periods[index - 2] : null

  const components = calculateNIVComponents(current, prev)
  const prevComponents = prev ? calculateNIVComponents(prev, prevPrev) : null

  const nivAcceleration = prevComponents ? components.niv - prevComponents.niv : 0
  const thrustMomentum = prevComponents ? components.thrust.value - prevComponents.thrust.value : 0
  const dragTrend = prevComponents ? components.drag.value - prevComponents.drag.value : 0

  const lookbackPeriods = Math.min(6, index + 1)
  let avgNIV = 0, avgDrag = 0
  for (let i = 0; i < lookbackPeriods; i++) {
    const p = periods[index - i]
    const pPrev = index - i > 0 ? periods[index - i - 1] : null
    const pComp = calculateNIVComponents(p, pPrev)
    avgNIV += pComp.niv
    avgDrag += pComp.drag.value
  }
  avgNIV /= lookbackPeriods
  avgDrag /= lookbackPeriods

  const effectiveRate = NIV_PARAMS.alpha * avgNIV - NIV_PARAMS.beta * avgDrag
  const collapseProb = 1 / (1 + Math.exp(-(NIV_PARAMS.gamma * avgDrag - NIV_PARAMS.theta)))
  const cumulativeRegen = components.niv * Math.exp(effectiveRate * NIV_PARAMS.horizonYears) * (1 - collapseProb)
  const volatility = Math.abs(nivAcceleration) + components.drag.value * 0.5
  const confidenceLower = cumulativeRegen * (1 - volatility * 1.5)
  const confidenceUpper = cumulativeRegen * (1 + volatility * 1.5)
  const riskScore = collapseProb * 50 + components.drag.value * 30 + (1 - components.efficiency.value) * 20

  let riskLevel: ThirdOrderAnalysis['riskLevel'] = 'low'
  if (riskScore >= 75) riskLevel = 'critical'
  else if (riskScore >= 55) riskLevel = 'high'
  else if (riskScore >= 40) riskLevel = 'elevated'
  else if (riskScore >= 25) riskLevel = 'moderate'

  const riskFactors: ThirdOrderAnalysis['riskFactors'] = []
  if (components.drag.value > 0.5) riskFactors.push({ factor: 'High Systemic Drag', severity: components.drag.value, impact: 'Reduces regeneration velocity' })
  if (collapseProb > 0.3) riskFactors.push({ factor: 'Elevated Collapse Risk', severity: collapseProb, impact: 'Threatens capital continuity' })
  if (components.thrust.value < 0.2) riskFactors.push({ factor: 'Low Thrust Momentum', severity: 1 - components.thrust.value, impact: 'Insufficient growth impulse' })
  if (components.slack.value < 0.2) riskFactors.push({ factor: 'Limited Slack Buffer', severity: 1 - components.slack.value, impact: 'No headroom for shocks' })

  return {
    period: current.period, components, currentNIV: components.niv, nivAcceleration, thrustMomentum, dragTrend,
    effectiveRate, collapseProb, cumulativeRegen, confidenceLower, confidenceUpper, riskScore, riskLevel, riskFactors
  }
}

// ============================================================================
// SAMPLE DATA
// ============================================================================

function generateSampleData(): AccountingPeriod[] {
  const periods: AccountingPeriod[] = []
  let baseRevenue = 120000, baseCash = 30000

  for (let i = 0; i < 12; i++) {
    const month = (i + 1).toString().padStart(2, '0')
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

    periods.push({
      period: `2024-${month}`, revenue, costOfGoodsSold: cogs, operatingExpenses: opex,
      interestExpense: interest, depreciation, taxes, cash,
      accountsReceivable: Math.round(revenue * 0.15 * (1 + Math.random() * 0.2 - 0.1)),
      inventory: Math.round(cogs * 0.08 * (1 + Math.random() * 0.15)),
      fixedAssets: 180000 + i * 2000,
      accountsPayable: Math.round(cogs * 0.06 * (1 + Math.random() * 0.15)),
      shortTermDebt: 25000, longTermDebt: 75000 - i * 500,
      retainedEarnings: 50000 + i * 3000, equity: 120000 + i * 3000,
      capitalExpenditure: Math.round(revenue * (0.04 + Math.random() * 0.02)),
      dividendsPaid: Math.round(Math.max(0, pretaxIncome - taxes) * 0.2)
    })
    baseRevenue = revenue
    baseCash = cash
  }
  return periods
}

// ============================================================================
// FORMAT HELPERS - GAAP/IFRS COMPLIANT
// ============================================================================

/**
 * Accounting-standard currency formatting
 * - Uses parentheses for negative numbers (standard accounting convention)
 * - Consistent decimal places
 * - Proper thousands separators
 */
const formatCurrency = (n: number | null | undefined, showCents = false) => {
  if (n == null || isNaN(n)) return '$--'
  const abs = Math.abs(n)
  const formatted = showCents
    ? abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : abs >= 1e12 ? `${(abs / 1e12).toFixed(1)}T`
    : abs >= 1e9 ? `${(abs / 1e9).toFixed(1)}B`
    : abs >= 1e6 ? `${(abs / 1e6).toFixed(1)}M`
    : abs >= 1e3 ? `${(abs / 1e3).toFixed(1)}K`
    : abs.toLocaleString('en-US')
  return n < 0 ? `($${formatted})` : `$${formatted}`
}

/**
 * Accounting-standard currency for financial statements
 * Shows full numbers with thousands separators, parentheses for negatives
 */
const formatStatementCurrency = (n: number | null | undefined) => {
  if (n == null || isNaN(n)) return '--'
  const abs = Math.abs(n)
  const formatted = abs.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  return n < 0 ? `(${formatted})` : formatted
}

const formatPercent = (n: number | null | undefined, decimals = 1) => {
  if (n == null || isNaN(n)) return '--%'
  const value = n * 100
  return value < 0 ? `(${Math.abs(value).toFixed(decimals)}%)` : `${value.toFixed(decimals)}%`
}

const formatNumber = (n: number | null | undefined, d = 4) => {
  if (n == null || isNaN(n) || !isFinite(n)) return 'N/A'
  return n.toFixed(d)
}

const formatRatio = (n: number | null | undefined) => {
  if (n == null || isNaN(n) || !isFinite(n)) return '--'
  return n.toFixed(2) + 'x'
}

/**
 * Standard financial statement date formatting
 */
const formatStatementDate = (period: string, type: 'balance' | 'income' | 'cash' = 'income') => {
  const [year, month] = period.split('-')
  const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December']
  const monthName = monthNames[parseInt(month)] || month

  if (type === 'balance') {
    return `As of ${monthName} ${parseInt(month) === 12 ? '31' : '30'}, ${year}`
  }
  return `For the Period Ended ${monthName} ${parseInt(month) === 12 ? '31' : '30'}, ${year}`
}

/**
 * Calculate comprehensive financial ratios per GAAP standards
 */
const calculateFinancialRatios = (data: AccountingPeriod) => {
  const totalAssets = data.cash + data.accountsReceivable + data.inventory + data.fixedAssets
  const currentAssets = data.cash + data.accountsReceivable + data.inventory
  const currentLiabilities = data.accountsPayable + data.shortTermDebt
  const totalLiabilities = currentLiabilities + data.longTermDebt
  const grossProfit = data.revenue - data.costOfGoodsSold
  const operatingIncome = grossProfit - data.operatingExpenses
  const ebit = operatingIncome
  const ebitda = ebit + data.depreciation
  const netIncome = ebit - data.interestExpense - data.taxes

  return {
    // Liquidity Ratios
    currentRatio: currentLiabilities > 0 ? currentAssets / currentLiabilities : null,
    quickRatio: currentLiabilities > 0 ? (data.cash + data.accountsReceivable) / currentLiabilities : null,
    cashRatio: currentLiabilities > 0 ? data.cash / currentLiabilities : null,
    workingCapital: currentAssets - currentLiabilities,

    // Profitability Ratios
    grossMargin: data.revenue > 0 ? grossProfit / data.revenue : null,
    operatingMargin: data.revenue > 0 ? operatingIncome / data.revenue : null,
    netMargin: data.revenue > 0 ? netIncome / data.revenue : null,
    returnOnAssets: totalAssets > 0 ? netIncome / totalAssets : null,
    returnOnEquity: data.equity > 0 ? netIncome / data.equity : null,

    // Leverage Ratios
    debtToEquity: data.equity > 0 ? totalLiabilities / data.equity : null,
    debtToAssets: totalAssets > 0 ? totalLiabilities / totalAssets : null,
    interestCoverage: data.interestExpense > 0 ? ebit / data.interestExpense : null,

    // Activity Ratios
    assetTurnover: totalAssets > 0 ? data.revenue / totalAssets : null,
    inventoryTurnover: data.inventory > 0 ? data.costOfGoodsSold / data.inventory : null,
    receivablesTurnover: data.accountsReceivable > 0 ? data.revenue / data.accountsReceivable : null,
    daysReceivables: data.accountsReceivable > 0 ? (data.accountsReceivable / data.revenue) * 365 : null,
    daysInventory: data.inventory > 0 ? (data.inventory / data.costOfGoodsSold) * 365 : null,

    // Computed Values
    grossProfit,
    operatingIncome,
    ebit,
    ebitda,
    netIncome,
    totalAssets,
    currentAssets,
    currentLiabilities,
    totalLiabilities
  }
}

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
  const colors: Record<string, string> = { thrust: '#22d3ee', efficiency: '#a78bfa', slack: '#34d399', drag: '#f87171' }
  return colors[component] || '#9ca3af'
}

const getPriorityColor = (priority: string) => {
  const colors: Record<string, string> = {
    critical: 'border-red-500 bg-red-500/10',
    high: 'border-orange-500 bg-orange-500/10',
    medium: 'border-yellow-500 bg-yellow-500/10',
    low: 'border-neutral-500 bg-neutral-500/10'
  }
  return colors[priority] || ''
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ThirdOrderAccountingPage() {
  const [accountingData, setAccountingData] = useState<AccountingPeriod[]>(generateSampleData)
  const [selectedPeriod, setSelectedPeriod] = useState(11)
  const [activeTab, setActiveTab] = useState<'overview' | 'statements' | 'components' | 'engine' | 'sp500' | 'ai-engine' | 'provenance'>('overview')
  const [editMode, setEditMode] = useState(false)

  // S&P 500 State
  const [sp500Data, setSp500Data] = useState<SP500Company[]>([])
  const [sp500Loading, setSp500Loading] = useState(false)
  const [sp500Error, setSp500Error] = useState<string | null>(null)

  // AI Engine State
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

  // Provenance State - links accounting data to S&P 500 company
  const [provenanceCompany, setProvenanceCompany] = useState<string | null>(null)

  const analyses = useMemo(() => accountingData.map((_, i) => calculateThirdOrderAnalysis(accountingData, i)), [accountingData])
  const currentAnalysis = analyses[selectedPeriod]
  const currentData = accountingData[selectedPeriod]

  const updateField = useCallback((field: keyof AccountingPeriod, value: number) => {
    setAccountingData(prev => {
      const updated = [...prev]
      updated[selectedPeriod] = { ...updated[selectedPeriod], [field]: value }
      return updated
    })
  }, [selectedPeriod])

  const resetData = () => { setAccountingData(generateSampleData()); setSelectedPeriod(11) }

  // Fetch S&P 500 data
  const fetchSP500 = async () => {
    setSp500Loading(true)
    setSp500Error(null)
    try {
      const res = await fetch('/api/sp500?mode=demo')
      const data = await res.json()
      if (data.success) {
        setSp500Data(data.companies)
      } else {
        setSp500Error(data.error || 'Failed to fetch data')
      }
    } catch {
      setSp500Error('Network error')
    }
    setSp500Loading(false)
  }

  // Fetch AI Analysis - uses provenance company if selected
  const fetchAIAnalysis = async (companySymbol?: string | null) => {
    setAiLoading(true)
    try {
      // Use provenance company data if available
      const company = companySymbol ? sp500Data.find(c => c.symbol === companySymbol) : null
      const nivData = company?.nivComponents ? {
        thrust: company.nivComponents.thrust,
        efficiency: company.nivComponents.efficiency,
        slack: company.nivComponents.slack,
        drag: company.nivComponents.drag,
        companySymbol: company.symbol,
        companyName: company.name,
        sector: company.sector,
        marketCap: company.marketCap
      } : {
        thrust: currentAnalysis.components.thrust.value,
        efficiency: currentAnalysis.components.efficiency.value,
        slack: currentAnalysis.components.slack.value,
        drag: currentAnalysis.components.drag.value
      }

      const res = await fetch('/api/ai-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nivData)
      })
      const data = await res.json()
      if (data.success) {
        setAiAnalysis(data.analysis)
      }
    } catch (e) {
      console.error('AI Analysis error:', e)
    }
    setAiLoading(false)
  }

  useEffect(() => {
    if ((activeTab === 'sp500' || activeTab === 'provenance') && sp500Data.length === 0) fetchSP500()
    if (activeTab === 'ai-engine' && !aiAnalysis) fetchAIAnalysis(provenanceCompany)
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'ai-engine') fetchAIAnalysis(provenanceCompany)
  }, [selectedPeriod, provenanceCompany])

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
            <h1 className="text-2xl font-bold text-white">Third-Order Accounting</h1>
            <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs font-bold rounded border border-cyan-500/30">NIV</span>
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs font-bold rounded border border-amber-500/30">BETA</span>
          </div>
          <p className="text-neutral-400 text-sm mb-3">
            Beyond traditional accounting: Forward-looking capital regeneration analysis
          </p>
          <div className="font-mono text-xs text-neutral-500 bg-neutral-900/50 px-3 py-1.5 rounded inline-block">
            NIV = (T x E^2) / (S + D)^n | Ch = NIV0 x e^(rh x h) x (1 - ph)
          </div>
        </div>
      </div>

      {/* Period Selector */}
      <div className="bg-neutral-900/50 border-b border-neutral-800 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <span className="text-sm text-neutral-500">Period:</span>
          <div className="flex gap-1 overflow-x-auto">
            {accountingData.map((p, i) => (
              <button key={p.period} onClick={() => setSelectedPeriod(i)}
                className={`px-3 py-1.5 text-xs rounded font-mono transition ${selectedPeriod === i ? 'bg-cyan-600 text-white' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`}>
                {p.period}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <button onClick={resetData} className="px-3 py-1.5 text-xs bg-neutral-800 text-neutral-400 rounded hover:bg-neutral-700">Reset</button>
          <button onClick={() => setEditMode(!editMode)} className={`px-3 py-1.5 text-xs rounded ${editMode ? 'bg-amber-600 text-white' : 'bg-neutral-800 text-neutral-300'}`}>
            {editMode ? 'Done' : 'Edit'}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-neutral-900/30 border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto">
            {[
              { id: 'overview', label: 'NIV Overview' },
              { id: 'statements', label: 'Financial Statements' },
              { id: 'components', label: 'Component Mapping' },
              { id: 'engine', label: 'Third-Order Engine' },
              { id: 'sp500', label: 'S&P 500 Analysis' },
              { id: 'ai-engine', label: 'AI Decision Engine' },
              { id: 'provenance', label: 'Data Provenance' }
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-5 py-3 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-b-2 border-cyan-500 text-cyan-400' : 'text-neutral-500 hover:text-neutral-300'}`}>
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
            {/* Value Proposition */}
            <div className="bg-gradient-to-r from-cyan-900/20 to-purple-900/20 border border-neutral-700 rounded-xl p-5">
              <h3 className="text-lg font-bold text-white mb-3">The True Value of Third-Order Accounting</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="bg-neutral-900/50 rounded-lg p-4">
                  <div className="text-cyan-400 font-semibold mb-2">Traditional Accounting</div>
                  <p className="text-neutral-400">Records historical transactions. Backward-looking. Tells you what happened.</p>
                </div>
                <div className="bg-neutral-900/50 rounded-lg p-4">
                  <div className="text-purple-400 font-semibold mb-2">Third-Order Accounting</div>
                  <p className="text-neutral-400">Projects regeneration capacity. Forward-looking. Reveals future value creation potential.</p>
                </div>
                <div className="bg-neutral-900/50 rounded-lg p-4">
                  <div className="text-emerald-400 font-semibold mb-2">Key Insight</div>
                  <p className="text-neutral-400">Ch (cumulative regeneration) captures what book value cannot: risk-adjusted compounding capacity.</p>
                </div>
              </div>
            </div>

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
                <div className="text-xs text-neutral-500 mt-1">rh = a x NIV - b x Drag</div>
              </div>
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                <div className="text-xs text-neutral-400 mb-1">COLLAPSE PROB</div>
                <div className={`text-2xl font-bold ${currentAnalysis.collapseProb < 0.2 ? 'text-emerald-400' : currentAnalysis.collapseProb < 0.4 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {formatPercent(currentAnalysis.collapseProb)}
                </div>
                <div className="text-xs text-neutral-500 mt-1">ph risk factor</div>
              </div>
              <div className="bg-gradient-to-br from-purple-900/30 to-neutral-900 border border-purple-500/30 rounded-xl p-4">
                <div className="text-xs text-purple-400 mb-1 font-semibold">CUMULATIVE Ch</div>
                <div className={`text-3xl font-bold ${currentAnalysis.cumulativeRegen >= 0 ? 'text-purple-400' : 'text-red-400'}`}>
                  {formatNumber(currentAnalysis.cumulativeRegen, 3)}
                </div>
                <div className="text-xs text-neutral-500 mt-1">{NIV_PARAMS.horizonYears}Y projection</div>
              </div>
            </div>

            {/* Radar & Risk */}
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
                      <div className="text-lg font-bold" style={{ color: getComponentColor(c.key) }}>{formatPercent(c.value)}</div>
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
                  <div className="text-center text-neutral-500 py-8">No significant risk factors detected</div>
                )}
              </div>
            </div>

            {/* Evolution Chart */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
              <h3 className="text-lg font-semibold text-white mb-4">NIV Regeneration Evolution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={analyses}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="period" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" stroke="#9ca3af" />
                  <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} formatter={(value: number, name: string) => [formatNumber(value, 4), name]} />
                  <Legend />
                  <Area yAxisId="left" type="monotone" dataKey="cumulativeRegen" fill="#a78bfa" stroke="#a78bfa" fillOpacity={0.2} name="Ch Projection" />
                  <Line yAxisId="left" type="monotone" dataKey="currentNIV" stroke="#22d3ee" strokeWidth={2} dot={{ r: 3 }} name="NIV" />
                  <Line yAxisId="right" type="monotone" dataKey="collapseProb" stroke="#f87171" strokeWidth={2} strokeDasharray="5 5" name="Collapse p" />
                  <ReferenceLine yAxisId="left" y={0} stroke="#6b7280" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Tab: Financial Statements - GAAP/IFRS Compliant */}
        {activeTab === 'statements' && (() => {
          const ratios = calculateFinancialRatios(currentData)
          const prevData = selectedPeriod > 0 ? accountingData[selectedPeriod - 1] : null
          const prevRatios = prevData ? calculateFinancialRatios(prevData) : null

          return (
            <div className="space-y-6">
              {/* Professional Header */}
              <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white">Consolidated Financial Statements</h2>
                    <p className="text-sm text-neutral-400 mt-1">Prepared in accordance with Generally Accepted Accounting Principles (GAAP)</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/30">
                      UNAUDITED
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-neutral-800/50 rounded-lg p-3">
                    <div className="text-neutral-500 text-xs">Reporting Entity</div>
                    <div className="text-white font-medium">Sample Business Entity</div>
                  </div>
                  <div className="bg-neutral-800/50 rounded-lg p-3">
                    <div className="text-neutral-500 text-xs">Reporting Period</div>
                    <div className="text-white font-medium">{currentData.period}</div>
                  </div>
                  <div className="bg-neutral-800/50 rounded-lg p-3">
                    <div className="text-neutral-500 text-xs">Currency</div>
                    <div className="text-white font-medium">United States Dollars (USD)</div>
                  </div>
                </div>
              </div>

              {/* Income Statement - Multi-Step Format (GAAP Standard) */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                <div className="bg-neutral-800 px-6 py-4 border-b border-neutral-700">
                  <h3 className="text-lg font-bold text-white">Statement of Operations</h3>
                  <p className="text-sm text-neutral-400">{formatStatementDate(currentData.period, 'income')}</p>
                  <p className="text-xs text-neutral-500 mt-1">(In United States Dollars)</p>
                </div>
                <div className="p-6">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-neutral-500 text-xs uppercase">
                        <th className="text-left py-2">Description</th>
                        <th className="text-right py-2 w-32">Current Period</th>
                        {prevData && <th className="text-right py-2 w-32">Prior Period</th>}
                        {prevData && <th className="text-right py-2 w-24">Change %</th>}
                        <th className="text-right py-2 w-20">Note</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono">
                      {/* Revenue Section */}
                      <tr className="border-t border-neutral-800">
                        <td className="py-2 text-white font-semibold">Revenue</td>
                        <td className="py-2 text-right text-white">{formatStatementCurrency(currentData.revenue)}</td>
                        {prevData && <td className="py-2 text-right text-neutral-400">{formatStatementCurrency(prevData.revenue)}</td>}
                        {prevData && <td className={`py-2 text-right ${currentData.revenue >= prevData.revenue ? 'text-emerald-400' : 'text-red-400'}`}>
                          {formatPercent((currentData.revenue - prevData.revenue) / prevData.revenue)}
                        </td>}
                        <td className="py-2 text-right text-neutral-600">1</td>
                      </tr>
                      <tr>
                        <td className="py-2 pl-4 text-neutral-400">Cost of Goods Sold</td>
                        <td className="py-2 text-right text-neutral-300">({formatStatementCurrency(currentData.costOfGoodsSold).replace(/[()]/g, '')})</td>
                        {prevData && <td className="py-2 text-right text-neutral-500">({formatStatementCurrency(prevData.costOfGoodsSold).replace(/[()]/g, '')})</td>}
                        {prevData && <td className="py-2 text-right text-neutral-500">--</td>}
                        <td className="py-2 text-right text-neutral-600">2</td>
                      </tr>
                      <tr className="border-t border-neutral-700 bg-neutral-800/30">
                        <td className="py-2 text-white font-semibold">Gross Profit</td>
                        <td className="py-2 text-right text-white font-semibold">{formatStatementCurrency(ratios.grossProfit)}</td>
                        {prevData && prevRatios && <td className="py-2 text-right text-neutral-400">{formatStatementCurrency(prevRatios.grossProfit)}</td>}
                        {prevData && prevRatios && <td className={`py-2 text-right ${ratios.grossProfit >= prevRatios.grossProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                          {formatPercent((ratios.grossProfit - prevRatios.grossProfit) / Math.abs(prevRatios.grossProfit || 1))}
                        </td>}
                        <td className="py-2 text-right text-neutral-600"></td>
                      </tr>
                      <tr>
                        <td className="py-2 pl-4 text-neutral-400">Operating Expenses</td>
                        <td className="py-2 text-right text-neutral-300">({formatStatementCurrency(currentData.operatingExpenses).replace(/[()]/g, '')})</td>
                        {prevData && <td className="py-2 text-right text-neutral-500">({formatStatementCurrency(prevData.operatingExpenses).replace(/[()]/g, '')})</td>}
                        {prevData && <td className="py-2 text-right text-neutral-500">--</td>}
                        <td className="py-2 text-right text-neutral-600">3</td>
                      </tr>
                      <tr>
                        <td className="py-2 pl-4 text-neutral-400">Depreciation & Amortization</td>
                        <td className="py-2 text-right text-neutral-300">({formatStatementCurrency(currentData.depreciation).replace(/[()]/g, '')})</td>
                        {prevData && <td className="py-2 text-right text-neutral-500">({formatStatementCurrency(prevData.depreciation).replace(/[()]/g, '')})</td>}
                        {prevData && <td className="py-2 text-right text-neutral-500">--</td>}
                        <td className="py-2 text-right text-neutral-600">4</td>
                      </tr>
                      <tr className="border-t border-neutral-700 bg-neutral-800/30">
                        <td className="py-2 text-white font-semibold">Operating Income (EBIT)</td>
                        <td className="py-2 text-right text-white font-semibold">{formatStatementCurrency(ratios.operatingIncome)}</td>
                        {prevData && prevRatios && <td className="py-2 text-right text-neutral-400">{formatStatementCurrency(prevRatios.operatingIncome)}</td>}
                        {prevData && prevRatios && <td className={`py-2 text-right ${ratios.operatingIncome >= prevRatios.operatingIncome ? 'text-emerald-400' : 'text-red-400'}`}>
                          {formatPercent((ratios.operatingIncome - prevRatios.operatingIncome) / Math.abs(prevRatios.operatingIncome || 1))}
                        </td>}
                        <td className="py-2 text-right text-neutral-600"></td>
                      </tr>
                      <tr>
                        <td className="py-2 pl-4 text-neutral-400">Interest Expense</td>
                        <td className="py-2 text-right text-neutral-300">({formatStatementCurrency(currentData.interestExpense).replace(/[()]/g, '')})</td>
                        {prevData && <td className="py-2 text-right text-neutral-500">({formatStatementCurrency(prevData.interestExpense).replace(/[()]/g, '')})</td>}
                        {prevData && <td className="py-2 text-right text-neutral-500">--</td>}
                        <td className="py-2 text-right text-neutral-600">5</td>
                      </tr>
                      <tr className="border-t border-neutral-700">
                        <td className="py-2 text-white">Income Before Taxes</td>
                        <td className="py-2 text-right text-white">{formatStatementCurrency(ratios.operatingIncome - currentData.interestExpense)}</td>
                        {prevData && prevRatios && <td className="py-2 text-right text-neutral-400">{formatStatementCurrency(prevRatios.operatingIncome - prevData.interestExpense)}</td>}
                        {prevData && <td className="py-2 text-right text-neutral-500">--</td>}
                        <td className="py-2 text-right text-neutral-600"></td>
                      </tr>
                      <tr>
                        <td className="py-2 pl-4 text-neutral-400">Income Tax Expense</td>
                        <td className="py-2 text-right text-neutral-300">({formatStatementCurrency(currentData.taxes).replace(/[()]/g, '')})</td>
                        {prevData && <td className="py-2 text-right text-neutral-500">({formatStatementCurrency(prevData.taxes).replace(/[()]/g, '')})</td>}
                        {prevData && <td className="py-2 text-right text-neutral-500">--</td>}
                        <td className="py-2 text-right text-neutral-600">6</td>
                      </tr>
                      <tr className="border-t-2 border-neutral-600 bg-cyan-900/20">
                        <td className="py-3 text-cyan-400 font-bold">Net Income</td>
                        <td className="py-3 text-right text-cyan-400 font-bold text-lg">{formatStatementCurrency(ratios.netIncome)}</td>
                        {prevData && prevRatios && <td className="py-3 text-right text-cyan-400/70">{formatStatementCurrency(prevRatios.netIncome)}</td>}
                        {prevData && prevRatios && <td className={`py-3 text-right font-bold ${ratios.netIncome >= prevRatios.netIncome ? 'text-emerald-400' : 'text-red-400'}`}>
                          {formatPercent((ratios.netIncome - prevRatios.netIncome) / Math.abs(prevRatios.netIncome || 1))}
                        </td>}
                        <td className="py-3 text-right text-neutral-600"></td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="mt-4 pt-4 border-t border-neutral-800 grid grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-xs text-neutral-500">Gross Margin</div>
                      <div className="text-lg font-bold text-white">{formatPercent(ratios.grossMargin)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-neutral-500">Operating Margin</div>
                      <div className="text-lg font-bold text-white">{formatPercent(ratios.operatingMargin)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-neutral-500">Net Margin</div>
                      <div className="text-lg font-bold text-white">{formatPercent(ratios.netMargin)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-neutral-500">EBITDA</div>
                      <div className="text-lg font-bold text-white">{formatCurrency(ratios.ebitda)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Balance Sheet - Classified Format (GAAP Standard) */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                <div className="bg-neutral-800 px-6 py-4 border-b border-neutral-700">
                  <h3 className="text-lg font-bold text-white">Statement of Financial Position</h3>
                  <p className="text-sm text-neutral-400">{formatStatementDate(currentData.period, 'balance')}</p>
                  <p className="text-xs text-neutral-500 mt-1">(In United States Dollars)</p>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Assets */}
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase tracking-wide mb-4 border-b border-neutral-700 pb-2">Assets</h4>
                      <table className="w-full text-sm font-mono">
                        <tbody>
                          <tr><td colSpan={2} className="py-2 text-neutral-400 font-semibold">Current Assets:</td></tr>
                          <tr>
                            <td className="py-1 pl-4 text-neutral-300">Cash and Cash Equivalents</td>
                            <td className="py-1 text-right text-white">{formatStatementCurrency(currentData.cash)}</td>
                          </tr>
                          <tr>
                            <td className="py-1 pl-4 text-neutral-300">Accounts Receivable, net</td>
                            <td className="py-1 text-right text-white">{formatStatementCurrency(currentData.accountsReceivable)}</td>
                          </tr>
                          <tr>
                            <td className="py-1 pl-4 text-neutral-300">Inventory</td>
                            <td className="py-1 text-right text-white">{formatStatementCurrency(currentData.inventory)}</td>
                          </tr>
                          <tr className="border-t border-neutral-800">
                            <td className="py-2 pl-4 text-white font-semibold">Total Current Assets</td>
                            <td className="py-2 text-right text-white font-semibold">{formatStatementCurrency(ratios.currentAssets)}</td>
                          </tr>
                          <tr><td colSpan={2} className="py-2 text-neutral-400 font-semibold">Non-Current Assets:</td></tr>
                          <tr>
                            <td className="py-1 pl-4 text-neutral-300">Property, Plant & Equipment, net</td>
                            <td className="py-1 text-right text-white">{formatStatementCurrency(currentData.fixedAssets)}</td>
                          </tr>
                          <tr className="border-t-2 border-neutral-600 bg-emerald-900/20">
                            <td className="py-3 text-emerald-400 font-bold">Total Assets</td>
                            <td className="py-3 text-right text-emerald-400 font-bold text-lg">{formatStatementCurrency(ratios.totalAssets)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Liabilities & Equity */}
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase tracking-wide mb-4 border-b border-neutral-700 pb-2">Liabilities & Stockholders Equity</h4>
                      <table className="w-full text-sm font-mono">
                        <tbody>
                          <tr><td colSpan={2} className="py-2 text-neutral-400 font-semibold">Current Liabilities:</td></tr>
                          <tr>
                            <td className="py-1 pl-4 text-neutral-300">Accounts Payable</td>
                            <td className="py-1 text-right text-white">{formatStatementCurrency(currentData.accountsPayable)}</td>
                          </tr>
                          <tr>
                            <td className="py-1 pl-4 text-neutral-300">Short-Term Debt</td>
                            <td className="py-1 text-right text-white">{formatStatementCurrency(currentData.shortTermDebt)}</td>
                          </tr>
                          <tr className="border-t border-neutral-800">
                            <td className="py-2 pl-4 text-white font-semibold">Total Current Liabilities</td>
                            <td className="py-2 text-right text-white font-semibold">{formatStatementCurrency(ratios.currentLiabilities)}</td>
                          </tr>
                          <tr><td colSpan={2} className="py-2 text-neutral-400 font-semibold">Non-Current Liabilities:</td></tr>
                          <tr>
                            <td className="py-1 pl-4 text-neutral-300">Long-Term Debt</td>
                            <td className="py-1 text-right text-white">{formatStatementCurrency(currentData.longTermDebt)}</td>
                          </tr>
                          <tr className="border-t border-neutral-800">
                            <td className="py-2 text-white font-semibold">Total Liabilities</td>
                            <td className="py-2 text-right text-white font-semibold">{formatStatementCurrency(ratios.totalLiabilities)}</td>
                          </tr>
                          <tr><td colSpan={2} className="py-2 text-neutral-400 font-semibold">Stockholders Equity:</td></tr>
                          <tr>
                            <td className="py-1 pl-4 text-neutral-300">Retained Earnings</td>
                            <td className="py-1 text-right text-white">{formatStatementCurrency(currentData.retainedEarnings)}</td>
                          </tr>
                          <tr>
                            <td className="py-1 pl-4 text-neutral-300">Common Equity</td>
                            <td className="py-1 text-right text-white">{formatStatementCurrency(currentData.equity - currentData.retainedEarnings)}</td>
                          </tr>
                          <tr className="border-t border-neutral-800">
                            <td className="py-2 pl-4 text-white font-semibold">Total Equity</td>
                            <td className="py-2 text-right text-white font-semibold">{formatStatementCurrency(currentData.equity)}</td>
                          </tr>
                          <tr className="border-t-2 border-neutral-600 bg-emerald-900/20">
                            <td className="py-3 text-emerald-400 font-bold">Total Liabilities & Equity</td>
                            <td className="py-3 text-right text-emerald-400 font-bold text-lg">{formatStatementCurrency(ratios.totalLiabilities + currentData.equity)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                  {/* Balance Check */}
                  <div className={`mt-4 p-3 rounded-lg text-center text-sm ${Math.abs(ratios.totalAssets - (ratios.totalLiabilities + currentData.equity)) < 1 ? 'bg-emerald-900/20 text-emerald-400' : 'bg-red-900/20 text-red-400'}`}>
                    {Math.abs(ratios.totalAssets - (ratios.totalLiabilities + currentData.equity)) < 1
                      ? 'Balance Sheet is in balance (Assets = Liabilities + Equity)'
                      : `Warning: Balance sheet out of balance by ${formatCurrency(ratios.totalAssets - (ratios.totalLiabilities + currentData.equity))}`}
                  </div>
                </div>
              </div>

              {/* Financial Ratios - Comprehensive Analysis */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                <div className="bg-neutral-800 px-6 py-4 border-b border-neutral-700">
                  <h3 className="text-lg font-bold text-white">Financial Ratio Analysis</h3>
                  <p className="text-sm text-neutral-400">Key performance indicators per standard accounting practice</p>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {/* Liquidity Ratios */}
                    <div>
                      <h4 className="text-sm font-bold text-cyan-400 uppercase tracking-wide mb-4">Liquidity</h4>
                      <div className="space-y-3">
                        <div className="bg-neutral-800/50 rounded-lg p-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-neutral-300">Current Ratio</span>
                            <span className="font-mono text-white font-bold">{formatRatio(ratios.currentRatio)}</span>
                          </div>
                          <div className="text-xs text-neutral-500 mt-1">Target: {'>'}1.5x</div>
                        </div>
                        <div className="bg-neutral-800/50 rounded-lg p-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-neutral-300">Quick Ratio</span>
                            <span className="font-mono text-white font-bold">{formatRatio(ratios.quickRatio)}</span>
                          </div>
                          <div className="text-xs text-neutral-500 mt-1">Target: {'>'}1.0x</div>
                        </div>
                        <div className="bg-neutral-800/50 rounded-lg p-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-neutral-300">Cash Ratio</span>
                            <span className="font-mono text-white font-bold">{formatRatio(ratios.cashRatio)}</span>
                          </div>
                          <div className="text-xs text-neutral-500 mt-1">Target: {'>'}0.2x</div>
                        </div>
                      </div>
                    </div>

                    {/* Profitability Ratios */}
                    <div>
                      <h4 className="text-sm font-bold text-purple-400 uppercase tracking-wide mb-4">Profitability</h4>
                      <div className="space-y-3">
                        <div className="bg-neutral-800/50 rounded-lg p-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-neutral-300">ROE</span>
                            <span className="font-mono text-white font-bold">{formatPercent(ratios.returnOnEquity)}</span>
                          </div>
                          <div className="text-xs text-neutral-500 mt-1">Return on Equity</div>
                        </div>
                        <div className="bg-neutral-800/50 rounded-lg p-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-neutral-300">ROA</span>
                            <span className="font-mono text-white font-bold">{formatPercent(ratios.returnOnAssets)}</span>
                          </div>
                          <div className="text-xs text-neutral-500 mt-1">Return on Assets</div>
                        </div>
                        <div className="bg-neutral-800/50 rounded-lg p-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-neutral-300">Net Margin</span>
                            <span className="font-mono text-white font-bold">{formatPercent(ratios.netMargin)}</span>
                          </div>
                          <div className="text-xs text-neutral-500 mt-1">Net Income / Revenue</div>
                        </div>
                      </div>
                    </div>

                    {/* Leverage Ratios */}
                    <div>
                      <h4 className="text-sm font-bold text-orange-400 uppercase tracking-wide mb-4">Leverage</h4>
                      <div className="space-y-3">
                        <div className="bg-neutral-800/50 rounded-lg p-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-neutral-300">Debt/Equity</span>
                            <span className="font-mono text-white font-bold">{formatRatio(ratios.debtToEquity)}</span>
                          </div>
                          <div className="text-xs text-neutral-500 mt-1">Target: {'<'}2.0x</div>
                        </div>
                        <div className="bg-neutral-800/50 rounded-lg p-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-neutral-300">Debt/Assets</span>
                            <span className="font-mono text-white font-bold">{formatPercent(ratios.debtToAssets)}</span>
                          </div>
                          <div className="text-xs text-neutral-500 mt-1">Target: {'<'}60%</div>
                        </div>
                        <div className="bg-neutral-800/50 rounded-lg p-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-neutral-300">Interest Coverage</span>
                            <span className="font-mono text-white font-bold">{formatRatio(ratios.interestCoverage)}</span>
                          </div>
                          <div className="text-xs text-neutral-500 mt-1">Target: {'>'}3.0x</div>
                        </div>
                      </div>
                    </div>

                    {/* Activity Ratios */}
                    <div>
                      <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-wide mb-4">Activity</h4>
                      <div className="space-y-3">
                        <div className="bg-neutral-800/50 rounded-lg p-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-neutral-300">Asset Turnover</span>
                            <span className="font-mono text-white font-bold">{formatRatio(ratios.assetTurnover)}</span>
                          </div>
                          <div className="text-xs text-neutral-500 mt-1">Revenue / Assets</div>
                        </div>
                        <div className="bg-neutral-800/50 rounded-lg p-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-neutral-300">DSO</span>
                            <span className="font-mono text-white font-bold">{ratios.daysReceivables?.toFixed(0) || '--'} days</span>
                          </div>
                          <div className="text-xs text-neutral-500 mt-1">Days Sales Outstanding</div>
                        </div>
                        <div className="bg-neutral-800/50 rounded-lg p-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-neutral-300">DIO</span>
                            <span className="font-mono text-white font-bold">{ratios.daysInventory?.toFixed(0) || '--'} days</span>
                          </div>
                          <div className="text-xs text-neutral-500 mt-1">Days Inventory On-hand</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes to Financial Statements */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                <div className="bg-neutral-800 px-6 py-4 border-b border-neutral-700">
                  <h3 className="text-lg font-bold text-white">Notes to Financial Statements</h3>
                </div>
                <div className="p-6 text-sm text-neutral-400 space-y-4">
                  <div>
                    <span className="text-white font-semibold">Note 1 - Revenue Recognition:</span> Revenue is recognized when control of goods or services transfers to the customer, in accordance with ASC 606.
                  </div>
                  <div>
                    <span className="text-white font-semibold">Note 2 - Cost of Goods Sold:</span> COGS includes direct materials, direct labor, and manufacturing overhead allocated to products sold during the period.
                  </div>
                  <div>
                    <span className="text-white font-semibold">Note 3 - Operating Expenses:</span> Includes selling, general and administrative expenses, research and development costs, and other operating costs.
                  </div>
                  <div>
                    <span className="text-white font-semibold">Note 4 - Depreciation:</span> Property, plant, and equipment are depreciated using the straight-line method over their estimated useful lives.
                  </div>
                  <div>
                    <span className="text-white font-semibold">Note 5 - Interest Expense:</span> Interest expense includes interest on short-term and long-term debt obligations.
                  </div>
                  <div>
                    <span className="text-white font-semibold">Note 6 - Income Taxes:</span> The effective tax rate applied is based on applicable federal and state income tax rates.
                  </div>
                  <div className="mt-6 pt-4 border-t border-neutral-800">
                    <span className="text-amber-400 font-semibold">Disclaimer:</span> These financial statements are unaudited and prepared for analytical purposes using the Third-Order Accounting framework. They should not be relied upon for investment decisions without independent verification.
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

        {/* Tab: Component Mapping */}
        {activeTab === 'components' && (
          <div className="space-y-6">
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-cyan-300 mb-2">NIV Component Mapping</h3>
              <p className="text-sm text-neutral-400">
                Each NIV component derives from specific accounting metrics. The formula NIV = (T x E^2) / (S + D)^n
                compounds efficiency while balancing thrust against friction.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {['thrust', 'efficiency', 'slack', 'drag'].map(comp => {
                const data = currentAnalysis.components[comp as keyof typeof currentAnalysis.components] as NIVComponents['thrust']
                const labels: Record<string, { title: string; desc: string; symbol: string }> = {
                  thrust: { title: 'THRUST (T)', desc: 'Capital injection momentum', symbol: 'T' },
                  efficiency: { title: 'EFFICIENCY (E)', desc: 'Capital productivity (squared in NIV)', symbol: 'E' },
                  slack: { title: 'SLACK (S)', desc: 'Economic headroom buffer', symbol: 'S' },
                  drag: { title: 'DRAG (D)', desc: 'Systemic friction and burden', symbol: 'D' }
                }
                const info = labels[comp]
                return (
                  <div key={comp} className={`bg-neutral-900 border-2 rounded-xl p-5`} style={{ borderColor: `${getComponentColor(comp)}40` }}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold" style={{ backgroundColor: `${getComponentColor(comp)}20`, color: getComponentColor(comp) }}>
                        {info.symbol}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold" style={{ color: getComponentColor(comp) }}>{info.title}</h3>
                        <p className="text-xs text-neutral-500">{info.desc}</p>
                      </div>
                      <div className="ml-auto text-2xl font-bold" style={{ color: getComponentColor(comp) }}>{formatPercent(data.value)}</div>
                    </div>
                    <div className="space-y-3">
                      {data.sources.map((s, i) => (
                        <div key={i}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-neutral-400">{s.name}</span>
                            <span className="text-neutral-300">{formatPercent(s.contribution)} x {s.weight}</span>
                          </div>
                          <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                            <div className="h-full" style={{ width: `${Math.min(100, s.contribution * 100)}%`, backgroundColor: getComponentColor(comp) }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Component Trends */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
              <h3 className="text-lg font-semibold text-white mb-4">Component Evolution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analyses}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="period" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#9ca3af" domain={[0, 1]} />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} formatter={(value: number) => formatPercent(value)} />
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
            <div className="bg-gradient-to-r from-purple-900/30 via-neutral-900 to-cyan-900/30 border border-neutral-700 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Third-Order Regeneration Engine</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-neutral-900/80 rounded-lg p-4">
                  <div className="text-cyan-400 font-semibold mb-2">First-Order</div>
                  <div className="font-mono text-lg text-white mb-2">NIVt</div>
                  <p className="text-xs text-neutral-400">Current regeneration velocity. Instantaneous capital regeneration rate.</p>
                </div>
                <div className="bg-neutral-900/80 rounded-lg p-4">
                  <div className="text-purple-400 font-semibold mb-2">Second-Order</div>
                  <div className="font-mono text-lg text-white mb-2">dNIV/dt</div>
                  <p className="text-xs text-neutral-400">Acceleration of regeneration. Positive = improving, Negative = decelerating.</p>
                </div>
                <div className="bg-neutral-900/80 rounded-lg p-4">
                  <div className="text-emerald-400 font-semibold mb-2">Third-Order</div>
                  <div className="font-mono text-lg text-white mb-2">Ch = NIV0 x e^(rh x h) x (1-ph)</div>
                  <p className="text-xs text-neutral-400">Cumulative regenerated capital after horizon h years, risk-adjusted.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'n (eta)', value: NIV_PARAMS.eta, desc: 'Nonlinear exponent' },
                { label: 'a (alpha)', value: NIV_PARAMS.alpha, desc: 'Efficiency multiplier' },
                { label: 'b (beta)', value: NIV_PARAMS.beta, desc: 'Drag penalty' },
                { label: 'g / th', value: `${NIV_PARAMS.gamma} / ${NIV_PARAMS.theta}`, desc: 'Collapse sensitivity' }
              ].map(p => (
                <div key={p.label} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                  <div className="text-xs text-neutral-500 mb-1">{p.label}</div>
                  <div className="text-2xl font-bold text-neutral-200">{p.value}</div>
                  <div className="text-xs text-neutral-600">{p.desc}</div>
                </div>
              ))}
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
              <h3 className="text-lg font-semibold text-white mb-4">Cumulative Regeneration Projection (Ch)</h3>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={analyses}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="period" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} formatter={(value: number, name: string) => [formatNumber(value, 4), name]} />
                  <Legend />
                  <Area type="monotone" dataKey="confidenceUpper" stroke="none" fill="#a78bfa" fillOpacity={0.15} name="95% Upper" />
                  <Area type="monotone" dataKey="confidenceLower" stroke="none" fill="#a78bfa" fillOpacity={0.15} name="95% Lower" />
                  <Line type="monotone" dataKey="cumulativeRegen" stroke="#a78bfa" strokeWidth={3} dot={{ r: 4 }} name="Ch" />
                  <Line type="monotone" dataKey="effectiveRate" stroke="#22d3ee" strokeWidth={2} strokeDasharray="5 5" name="rh" />
                  <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
              <h3 className="text-lg font-semibold text-white mb-4">Analysis History</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-700">
                      <th className="text-left py-2 px-2 text-neutral-400">Period</th>
                      <th className="text-right py-2 px-2 text-cyan-400">NIV</th>
                      <th className="text-right py-2 px-2 text-neutral-400">dNIV/dt</th>
                      <th className="text-right py-2 px-2 text-neutral-400">rh</th>
                      <th className="text-right py-2 px-2 text-neutral-400">ph</th>
                      <th className="text-right py-2 px-2 text-purple-400">Ch</th>
                      <th className="text-right py-2 px-2 text-neutral-400">Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyses.map((a, i) => (
                      <tr key={a.period} className={`border-b border-neutral-800 ${i === selectedPeriod ? 'bg-cyan-500/10' : 'hover:bg-neutral-800/50'}`}>
                        <td className="py-2 px-2 font-mono text-neutral-300">{a.period}</td>
                        <td className={`py-2 px-2 text-right font-mono ${a.currentNIV >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>{formatNumber(a.currentNIV, 4)}</td>
                        <td className={`py-2 px-2 text-right font-mono ${a.nivAcceleration >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{a.nivAcceleration >= 0 ? '+' : ''}{formatNumber(a.nivAcceleration, 4)}</td>
                        <td className="py-2 px-2 text-right font-mono text-neutral-300">{formatNumber(a.effectiveRate, 3)}</td>
                        <td className="py-2 px-2 text-right font-mono text-neutral-300">{formatPercent(a.collapseProb)}</td>
                        <td className={`py-2 px-2 text-right font-mono font-bold ${a.cumulativeRegen >= 0 ? 'text-purple-400' : 'text-red-400'}`}>{formatNumber(a.cumulativeRegen, 3)}</td>
                        <td className="py-2 px-2 text-right"><span className={`px-2 py-0.5 rounded text-xs ${getRiskColor(a.riskLevel)}`}>{a.riskLevel}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab: S&P 500 Analysis */}
        {activeTab === 'sp500' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-emerald-900/20 to-cyan-900/20 border border-neutral-700 rounded-xl p-5">
              <h3 className="text-lg font-bold text-white mb-2">S&P 500 Third-Order Analysis</h3>
              <p className="text-sm text-neutral-400">Real-time NIV analysis of top S&P 500 companies reveals regeneration capacity invisible to traditional metrics.</p>
            </div>

            <div className="flex gap-4 items-center">
              <button onClick={fetchSP500} disabled={sp500Loading} className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50">
                {sp500Loading ? 'Loading...' : 'Refresh Data'}
              </button>
              {sp500Error && <span className="text-red-400 text-sm">{sp500Error}</span>}
              <span className="text-neutral-500 text-sm">{sp500Data.length} companies loaded</span>
            </div>

            {sp500Data.length > 0 && (
              <>
                {/* Aggregate Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                    <div className="text-xs text-neutral-500 mb-1">Avg NIV</div>
                    <div className="text-2xl font-bold text-cyan-400">{formatNumber(sp500Data.reduce((s, c) => s + (c.nivComponents?.niv || 0), 0) / sp500Data.length, 4)}</div>
                  </div>
                  <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                    <div className="text-xs text-neutral-500 mb-1">Avg Thrust</div>
                    <div className="text-2xl font-bold text-cyan-400">{formatPercent(sp500Data.reduce((s, c) => s + (c.nivComponents?.thrust || 0), 0) / sp500Data.length)}</div>
                  </div>
                  <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                    <div className="text-xs text-neutral-500 mb-1">Avg Efficiency</div>
                    <div className="text-2xl font-bold text-purple-400">{formatPercent(sp500Data.reduce((s, c) => s + (c.nivComponents?.efficiency || 0), 0) / sp500Data.length)}</div>
                  </div>
                  <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                    <div className="text-xs text-neutral-500 mb-1">Avg Slack</div>
                    <div className="text-2xl font-bold text-emerald-400">{formatPercent(sp500Data.reduce((s, c) => s + (c.nivComponents?.slack || 0), 0) / sp500Data.length)}</div>
                  </div>
                  <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                    <div className="text-xs text-neutral-500 mb-1">Avg Drag</div>
                    <div className="text-2xl font-bold text-red-400">{formatPercent(sp500Data.reduce((s, c) => s + (c.nivComponents?.drag || 0), 0) / sp500Data.length)}</div>
                  </div>
                </div>

                {/* NIV Ranking Chart */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                  <h3 className="text-lg font-semibold text-white mb-4">NIV Ranking (Top 15)</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={sp500Data.slice(0, 15)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis type="number" stroke="#9ca3af" domain={[0, 'auto']} />
                      <YAxis dataKey="symbol" type="category" width={60} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                        formatter={(value: number) => formatNumber(value, 4)} />
                      <Bar dataKey="nivComponents.niv" fill="#22d3ee" name="NIV" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Company Table */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                  <h3 className="text-lg font-semibold text-white mb-4">Company Analysis</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-neutral-700">
                          <th className="text-left py-2 px-2 text-neutral-400">Symbol</th>
                          <th className="text-left py-2 px-2 text-neutral-400">Name</th>
                          <th className="text-left py-2 px-2 text-neutral-400">Sector</th>
                          <th className="text-right py-2 px-2 text-neutral-400">Market Cap</th>
                          <th className="text-right py-2 px-2 text-cyan-400">NIV</th>
                          <th className="text-right py-2 px-2 text-neutral-400">T</th>
                          <th className="text-right py-2 px-2 text-neutral-400">E</th>
                          <th className="text-right py-2 px-2 text-neutral-400">S</th>
                          <th className="text-right py-2 px-2 text-neutral-400">D</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sp500Data.map(c => (
                          <tr key={c.symbol} className="border-b border-neutral-800 hover:bg-neutral-800/50">
                            <td className="py-2 px-2 font-mono font-bold text-white">{c.symbol}</td>
                            <td className="py-2 px-2 text-neutral-300 truncate max-w-[150px]">{c.name}</td>
                            <td className="py-2 px-2 text-neutral-500">{c.sector}</td>
                            <td className="py-2 px-2 text-right font-mono text-neutral-300">{formatCurrency(c.marketCap)}</td>
                            <td className={`py-2 px-2 text-right font-mono font-bold ${(c.nivComponents?.niv || 0) >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                              {formatNumber(c.nivComponents?.niv || 0, 4)}
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-neutral-400">{formatPercent(c.nivComponents?.thrust || 0)}</td>
                            <td className="py-2 px-2 text-right font-mono text-neutral-400">{formatPercent(c.nivComponents?.efficiency || 0)}</td>
                            <td className="py-2 px-2 text-right font-mono text-neutral-400">{formatPercent(c.nivComponents?.slack || 0)}</td>
                            <td className="py-2 px-2 text-right font-mono text-neutral-400">{formatPercent(c.nivComponents?.drag || 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Tab: AI Decision Engine */}
        {activeTab === 'ai-engine' && (
          <div className="space-y-6">
            {(() => {
              const company = provenanceCompany ? sp500Data.find(c => c.symbol === provenanceCompany) : null
              return (
                <div className="bg-gradient-to-r from-purple-900/20 to-amber-900/20 border border-neutral-700 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-white">AI Decision Engine</h3>
                    {company && (
                      <span className="text-sm text-cyan-400 bg-cyan-400/10 px-3 py-1 rounded-full">
                        Analyzing: {company.symbol} - {company.name}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-neutral-400">
                    {company
                      ? `Personalized regeneration plans for ${company.name} based on their financial metrics and NIV profile.`
                      : 'Optimal decision trees and organic regeneration plans generated from third-order analysis. Select a company in Data Provenance for company-specific insights.'}
                  </p>
                </div>
              )
            })()}

            <div className="flex items-center gap-4">
              <button onClick={() => fetchAIAnalysis(provenanceCompany)} disabled={aiLoading} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
                {aiLoading ? 'Generating...' : 'Regenerate Analysis'}
              </button>
              {provenanceCompany && (
                <span className="text-sm text-neutral-500">Using {provenanceCompany} NIV data</span>
              )}
            </div>

            {aiAnalysis && (
              <>
                {/* State Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-neutral-900 border border-red-500/30 rounded-xl p-5">
                    <h3 className="text-lg font-semibold text-red-400 mb-4">Current State</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between"><span className="text-neutral-400">NIV</span><span className="font-mono text-white">{formatNumber(aiAnalysis.currentState.niv, 4)}</span></div>
                      <div className="flex justify-between"><span className="text-neutral-400">Effective Rate</span><span className="font-mono text-white">{formatNumber(aiAnalysis.currentState.effectiveRate, 3)}</span></div>
                      <div className="flex justify-between"><span className="text-neutral-400">Collapse Prob</span><span className="font-mono text-white">{formatPercent(aiAnalysis.currentState.collapseProb)}</span></div>
                      <div className="flex justify-between"><span className="text-neutral-400">Cumulative Ch</span><span className="font-mono text-white">{formatNumber(aiAnalysis.currentState.cumulativeRegen, 3)}</span></div>
                      <div className="flex justify-between"><span className="text-neutral-400">Risk Level</span><span className={`px-2 py-0.5 rounded text-xs ${getRiskColor(aiAnalysis.currentState.riskLevel)}`}>{aiAnalysis.currentState.riskLevel}</span></div>
                    </div>
                  </div>
                  <div className="bg-neutral-900 border border-emerald-500/30 rounded-xl p-5">
                    <h3 className="text-lg font-semibold text-emerald-400 mb-4">Optimized State</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between"><span className="text-neutral-400">NIV</span><span className="font-mono text-emerald-400">{formatNumber(aiAnalysis.optimizedState.niv, 4)}</span></div>
                      <div className="flex justify-between"><span className="text-neutral-400">Effective Rate</span><span className="font-mono text-emerald-400">{formatNumber(aiAnalysis.optimizedState.effectiveRate, 3)}</span></div>
                      <div className="flex justify-between"><span className="text-neutral-400">Collapse Prob</span><span className="font-mono text-emerald-400">{formatPercent(aiAnalysis.optimizedState.collapseProb)}</span></div>
                      <div className="flex justify-between"><span className="text-neutral-400">Cumulative Ch</span><span className="font-mono text-emerald-400">{formatNumber(aiAnalysis.optimizedState.cumulativeRegen, 3)}</span></div>
                      <div className="flex justify-between"><span className="text-neutral-400">Risk Level</span><span className={`px-2 py-0.5 rounded text-xs ${getRiskColor(aiAnalysis.optimizedState.riskLevel)}`}>{aiAnalysis.optimizedState.riskLevel}</span></div>
                    </div>
                  </div>
                </div>

                {/* Improvement Delta */}
                <div className="bg-gradient-to-r from-emerald-900/30 to-cyan-900/30 border border-emerald-500/30 rounded-xl p-5">
                  <h3 className="text-lg font-semibold text-emerald-400 mb-4">Optimization Potential</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-emerald-400">+{formatNumber((aiAnalysis.optimizedState.niv - aiAnalysis.currentState.niv) * 100, 1)}%</div>
                      <div className="text-xs text-neutral-500">NIV Improvement</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-emerald-400">+{formatNumber((aiAnalysis.optimizedState.cumulativeRegen - aiAnalysis.currentState.cumulativeRegen) / Math.abs(aiAnalysis.currentState.cumulativeRegen || 0.01) * 100, 0)}%</div>
                      <div className="text-xs text-neutral-500">Ch Improvement</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-emerald-400">-{formatNumber((aiAnalysis.currentState.collapseProb - aiAnalysis.optimizedState.collapseProb) * 100, 1)}pp</div>
                      <div className="text-xs text-neutral-500">Risk Reduction</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-cyan-400">{aiAnalysis.actionPlans.length}</div>
                      <div className="text-xs text-neutral-500">Action Plans</div>
                    </div>
                  </div>
                </div>

                {/* Decision Tree */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                  <h3 className="text-lg font-semibold text-white mb-4">Decision Tree</h3>
                  <div className="space-y-4">
                    <div className="bg-neutral-800 rounded-lg p-4">
                      <div className="text-cyan-400 font-semibold">{aiAnalysis.decisionTree.label}</div>
                      <div className="text-sm text-neutral-400 mt-1">{aiAnalysis.decisionTree.description}</div>
                    </div>
                    {aiAnalysis.decisionTree.children?.map(branch => (
                      <div key={branch.id} className="ml-6 border-l-2 border-neutral-700 pl-4">
                        <div className="bg-neutral-800/50 rounded-lg p-4 mb-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-semibold text-white">{branch.label}</div>
                              <div className="text-sm text-neutral-400">{branch.description}</div>
                            </div>
                            <div className="text-right">
                              <div className={`text-lg font-bold ${branch.impact >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {branch.impact >= 0 ? '+' : ''}{formatNumber(branch.impact, 3)} Ch
                              </div>
                              <div className="text-xs text-neutral-500">{(branch.probability * 100).toFixed(0)}% confidence</div>
                            </div>
                          </div>
                        </div>
                        {branch.children?.map(action => (
                          <div key={action.id} className="ml-4 border-l border-neutral-700 pl-4 py-2">
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="text-sm font-medium text-neutral-300">{action.label}</div>
                                <div className="text-xs text-neutral-500">{action.timeframe}</div>
                              </div>
                              <div className="text-sm font-mono text-emerald-400">+{formatNumber(action.impact, 4)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Plans */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                  <h3 className="text-lg font-semibold text-white mb-4">Organic Action Plans</h3>
                  <div className="space-y-4">
                    {aiAnalysis.actionPlans.map(plan => (
                      <div key={plan.id} className={`border-2 rounded-xl p-5 ${getPriorityColor(plan.priority)}`}>
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${plan.priority === 'critical' ? 'bg-red-500 text-white' : plan.priority === 'high' ? 'bg-orange-500 text-white' : plan.priority === 'medium' ? 'bg-yellow-500 text-black' : 'bg-neutral-500 text-white'}`}>
                              {plan.priority}
                            </span>
                            <span className="ml-2 px-2 py-0.5 rounded text-xs" style={{ backgroundColor: `${getComponentColor(plan.category)}30`, color: getComponentColor(plan.category) }}>
                              {plan.category.toUpperCase()}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-emerald-400 font-bold">+{formatNumber(plan.expectedImpact.chDelta, 3)} Ch</div>
                            <div className="text-xs text-neutral-500">{plan.timeframe}</div>
                          </div>
                        </div>
                        <h4 className="text-lg font-semibold text-white mb-2">{plan.title}</h4>
                        <p className="text-sm text-neutral-400 mb-4">{plan.description}</p>
                        <div className="bg-neutral-800/50 rounded-lg p-4 mb-4">
                          <div className="text-xs text-neutral-500 uppercase mb-2">Rationale</div>
                          <p className="text-sm text-neutral-300">{plan.rationale}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <div className="text-xs text-neutral-500 uppercase mb-2">Implementation Steps</div>
                            <ul className="text-sm text-neutral-400 space-y-1">
                              {plan.implementation.steps.slice(0, 3).map((s, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="text-neutral-600">{i + 1}.</span>
                                  <span>{s}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <div className="text-xs text-neutral-500 uppercase mb-2">Key Metrics</div>
                            <ul className="text-sm text-neutral-400 space-y-1">
                              {plan.implementation.metrics.slice(0, 3).map((m, i) => (
                                <li key={i}>{m}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <div className="text-xs text-neutral-500 uppercase mb-2">Expected Impact</div>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-neutral-400">NIV Delta</span>
                                <span className="text-emerald-400">+{formatNumber(plan.expectedImpact.nivDelta, 4)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-neutral-400">Ch Delta</span>
                                <span className="text-emerald-400">+{formatNumber(plan.expectedImpact.chDelta, 3)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-neutral-400">Risk Reduction</span>
                                <span className="text-emerald-400">-{formatPercent(plan.expectedImpact.riskReduction)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Insights */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                  <h3 className="text-lg font-semibold text-white mb-4">AI Insights</h3>
                  <div className="space-y-3">
                    {aiAnalysis.insights.map((insight, i) => (
                      <div key={i} className="bg-neutral-800/50 rounded-lg p-4">
                        <p className="text-sm text-neutral-300">{insight}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Tab: Data Provenance */}
        {activeTab === 'provenance' && (
          <div className="space-y-6">
            {/* Company Source Selector */}
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-cyan-300 mb-3">S&P 500 Data Source</h3>
              <div className="flex flex-wrap items-center gap-4">
                <select
                  value={provenanceCompany || ''}
                  onChange={(e) => setProvenanceCompany(e.target.value || null)}
                  className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm min-w-[200px]"
                >
                  <option value="">Select a company...</option>
                  {sp500Data.map(c => (
                    <option key={c.symbol} value={c.symbol}>{c.symbol} - {c.name}</option>
                  ))}
                </select>
                {sp500Loading && <span className="text-sm text-neutral-500">Loading companies...</span>}
                {provenanceCompany && (
                  <span className="text-sm text-cyan-400">
                    Source: {sp500Data.find(c => c.symbol === provenanceCompany)?.name || provenanceCompany}
                  </span>
                )}
              </div>
              {provenanceCompany && (() => {
                const company = sp500Data.find(c => c.symbol === provenanceCompany)
                return company ? (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="bg-neutral-800/50 rounded-lg p-3">
                      <div className="text-xs text-neutral-500">Sector</div>
                      <div className="text-sm font-medium text-white">{company.sector}</div>
                    </div>
                    <div className="bg-neutral-800/50 rounded-lg p-3">
                      <div className="text-xs text-neutral-500">Market Cap</div>
                      <div className="text-sm font-medium text-white">{formatCurrency(company.marketCap)}</div>
                    </div>
                    <div className="bg-neutral-800/50 rounded-lg p-3">
                      <div className="text-xs text-neutral-500">NIV Score</div>
                      <div className="text-sm font-medium text-cyan-400">{formatNumber(company.nivComponents?.niv, 4)}</div>
                    </div>
                    <div className="bg-neutral-800/50 rounded-lg p-3">
                      <div className="text-xs text-neutral-500">Thrust</div>
                      <div className="text-sm font-medium text-cyan-400">{formatPercent(company.nivComponents?.thrust)}</div>
                    </div>
                    <div className="bg-neutral-800/50 rounded-lg p-3">
                      <div className="text-xs text-neutral-500">Efficiency</div>
                      <div className="text-sm font-medium text-purple-400">{formatPercent(company.nivComponents?.efficiency)}</div>
                    </div>
                  </div>
                ) : null
              })()}
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-amber-300 mb-2">Accounting Data Provenance</h3>
              <p className="text-sm text-neutral-400">
                {provenanceCompany
                  ? `Financial metrics mapped from ${sp500Data.find(c => c.symbol === provenanceCompany)?.name || provenanceCompany} SEC filings and earnings reports.`
                  : 'Select an S&P 500 company above to trace data provenance from real financial statements.'}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {(() => {
                const company = provenanceCompany ? sp500Data.find(c => c.symbol === provenanceCompany) : null
                const incomeFields = [
                  { key: 'revenue', apiKey: 'revenue', label: 'Revenue', maps: 'Thrust, Efficiency' },
                  { key: 'costOfGoodsSold', apiKey: 'costOfRevenue', label: 'Cost of Goods Sold', maps: 'Efficiency, Drag' },
                  { key: 'operatingExpenses', apiKey: 'operatingExpenses', label: 'Operating Expenses', maps: 'Drag' },
                  { key: 'depreciation', apiKey: 'depreciationAndAmortization', label: 'Depreciation', maps: 'Drag' },
                  { key: 'interestExpense', apiKey: 'interestExpense', label: 'Interest Expense', maps: 'Drag' },
                  { key: 'taxes', apiKey: 'incomeTaxExpense', label: 'Taxes', maps: 'Efficiency' }
                ]
                const balanceFields = [
                  { key: 'cash', apiKey: 'cashAndEquivalents', label: 'Cash', maps: 'Slack' },
                  { key: 'accountsReceivable', apiKey: 'accountsReceivable', label: 'Accounts Receivable', maps: 'Slack, Thrust' },
                  { key: 'inventory', apiKey: 'inventory', label: 'Inventory', maps: 'Efficiency' },
                  { key: 'fixedAssets', apiKey: 'propertyPlantEquipment', label: 'Fixed Assets', maps: 'Efficiency' },
                  { key: 'accountsPayable', apiKey: 'accountsPayable', label: 'Accounts Payable', maps: 'Thrust' },
                  { key: 'shortTermDebt', apiKey: 'shortTermDebt', label: 'Short-Term Debt', maps: 'Drag, Slack' },
                  { key: 'longTermDebt', apiKey: 'longTermDebt', label: 'Long-Term Debt', maps: 'Drag' },
                  { key: 'equity', apiKey: 'totalEquity', label: 'Equity', maps: 'Slack, Drag' }
                ]

                const getValue = (field: { key: string; apiKey: string }) => {
                  if (company && company[field.apiKey as keyof SP500Company] !== undefined) {
                    return company[field.apiKey as keyof SP500Company] as number
                  }
                  return currentData[field.key as keyof AccountingPeriod] as number
                }

                return (
                  <>
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white">Income Statement</h3>
                        {company && <span className="text-xs text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded">{company.symbol} - {company.name}</span>}
                      </div>
                      <div className="space-y-3">
                        {incomeFields.map(field => (
                          <div key={field.key} className="flex items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="text-sm text-neutral-300">{field.label}</div>
                              <div className="text-xs text-neutral-600">Maps to: {field.maps}</div>
                            </div>
                            <span className="font-mono text-sm text-white">{formatCurrency(getValue(field))}</span>
                          </div>
                        ))}
                        {company && (
                          <div className="pt-3 mt-3 border-t border-neutral-700">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-emerald-400">Net Income</span>
                              <span className="font-mono text-sm text-emerald-400">{formatCurrency(company.netIncome)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white">Balance Sheet</h3>
                        {company && <span className="text-xs text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded">{company.symbol}</span>}
                      </div>
                      <div className="space-y-3">
                        {balanceFields.map(field => (
                          <div key={field.key} className="flex items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="text-sm text-neutral-300">{field.label}</div>
                              <div className="text-xs text-neutral-600">Maps to: {field.maps}</div>
                            </div>
                            <span className="font-mono text-sm text-white">{formatCurrency(getValue(field))}</span>
                          </div>
                        ))}
                        {company && (
                          <div className="pt-3 mt-3 border-t border-neutral-700">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-blue-400">Total Assets</span>
                              <span className="font-mono text-sm text-blue-400">{formatCurrency(company.totalAssets)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )
              })()}
            </div>

            {/* NIV Component Mapping from Company */}
            {provenanceCompany && (() => {
              const company = sp500Data.find(c => c.symbol === provenanceCompany)
              return company?.nivComponents ? (
                <div className="bg-neutral-900 border border-cyan-500/30 rounded-xl p-5">
                  <h3 className="text-lg font-semibold text-white mb-4">NIV Component Derivation from {company.name}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-cyan-500/10 rounded-lg p-4">
                      <div className="text-xs text-neutral-500 mb-1">Thrust (T)</div>
                      <div className="text-2xl font-bold text-cyan-400">{formatPercent(company.nivComponents.thrust)}</div>
                      <div className="text-xs text-neutral-600 mt-2">Derived from: Revenue growth, Cash flow momentum</div>
                    </div>
                    <div className="bg-purple-500/10 rounded-lg p-4">
                      <div className="text-xs text-neutral-500 mb-1">Efficiency (E)</div>
                      <div className="text-2xl font-bold text-purple-400">{formatPercent(company.nivComponents.efficiency)}</div>
                      <div className="text-xs text-neutral-600 mt-2">Derived from: Gross margin, Asset turnover</div>
                    </div>
                    <div className="bg-emerald-500/10 rounded-lg p-4">
                      <div className="text-xs text-neutral-500 mb-1">Slack (S)</div>
                      <div className="text-2xl font-bold text-emerald-400">{formatPercent(company.nivComponents.slack)}</div>
                      <div className="text-xs text-neutral-600 mt-2">Derived from: Cash ratio, Working capital</div>
                    </div>
                    <div className="bg-red-500/10 rounded-lg p-4">
                      <div className="text-xs text-neutral-500 mb-1">Drag (D)</div>
                      <div className="text-2xl font-bold text-red-400">{formatPercent(company.nivComponents.drag)}</div>
                      <div className="text-xs text-neutral-600 mt-2">Derived from: Debt ratio, Interest coverage</div>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-neutral-800/50 rounded-lg">
                    <div className="text-sm text-neutral-400">
                      <span className="text-white font-medium">Formula Applied:</span> NIV = (T x E^2) / (S + D)^1.5 = {formatNumber(company.nivComponents.niv, 4)}
                    </div>
                  </div>
                </div>
              ) : null
            })()}

            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
              <h3 className="text-lg font-semibold text-white mb-4">Derived Regeneration Metrics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-neutral-800/50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-cyan-400">{formatNumber(currentAnalysis.components.regenerationRate, 4)}</div>
                  <div className="text-xs text-neutral-500">Regeneration Rate</div>
                  <div className="text-xs text-neutral-600 mt-1">NIV x E</div>
                </div>
                <div className="bg-neutral-800/50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-400">{formatNumber(currentAnalysis.components.capitalVelocity, 4)}</div>
                  <div className="text-xs text-neutral-500">Capital Velocity</div>
                  <div className="text-xs text-neutral-600 mt-1">T x (1-D)</div>
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
