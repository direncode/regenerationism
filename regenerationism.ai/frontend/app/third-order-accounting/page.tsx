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
  Area
} from 'recharts'

// ============================================================================
// BASIC ACCOUNTING DATA TYPES
// ============================================================================

interface AccountingPeriod {
  period: string  // "2024-01", "2024-02", etc.

  // Basic Income Statement
  revenue: number
  costOfGoodsSold: number
  operatingExpenses: number
  interestExpense: number
  taxes: number

  // Basic Balance Sheet
  cash: number
  accountsReceivable: number
  inventory: number
  fixedAssets: number
  accountsPayable: number
  shortTermDebt: number
  longTermDebt: number
  equity: number
}

interface DerivedMetrics {
  period: string

  // Income Statement Metrics
  grossProfit: number
  grossMargin: number
  operatingIncome: number
  operatingMargin: number
  netIncome: number
  netMargin: number

  // Balance Sheet Metrics
  totalAssets: number
  totalLiabilities: number
  workingCapital: number
  currentRatio: number
  quickRatio: number
  debtToEquity: number

  // Cash Flow Proxy
  operatingCashFlow: number

  // Growth Metrics (requires previous period)
  revenueGrowth: number
  profitGrowth: number
  assetGrowth: number
}

interface ThirdOrderBusinessMetrics {
  period: string

  // First-Order: Current velocity
  businessVelocity: number        // Composite health score
  capitalEfficiency: number       // ROA-like metric
  cashCycleSpeed: number          // Working capital turnover

  // Second-Order: Acceleration
  velocityAcceleration: number
  efficiencyChange: number

  // Third-Order: Projected cumulative
  projectedValue: number          // Cₕ for business
  riskScore: number               // 0-100
  riskLevel: string
}

// ============================================================================
// DEFAULT DATA - Basic Trial Balance Style
// ============================================================================

function generateSampleData(): AccountingPeriod[] {
  const periods: AccountingPeriod[] = []
  let baseRevenue = 100000
  let baseCash = 25000
  let baseAR = 15000
  let baseInventory = 20000
  let baseAP = 12000

  for (let i = 0; i < 12; i++) {
    const month = (i + 1).toString().padStart(2, '0')
    const period = `2024-${month}`

    // Simulate some growth and variation
    const growthFactor = 1 + (Math.random() * 0.1 - 0.02) // -2% to +8%
    const seasonality = 1 + Math.sin((i / 12) * Math.PI * 2) * 0.15

    const revenue = Math.round(baseRevenue * growthFactor * seasonality)
    const cogs = Math.round(revenue * (0.55 + Math.random() * 0.1)) // 55-65% COGS
    const opex = Math.round(revenue * (0.2 + Math.random() * 0.05)) // 20-25% OpEx
    const interest = 1500 + Math.round(Math.random() * 500)
    const pretaxIncome = revenue - cogs - opex - interest
    const taxes = Math.max(0, Math.round(pretaxIncome * 0.25))

    const cash = Math.round(baseCash * (1 + Math.random() * 0.2 - 0.05))
    const ar = Math.round(baseAR * (1 + Math.random() * 0.3 - 0.1))
    const inventory = Math.round(baseInventory * (1 + Math.random() * 0.2 - 0.05))
    const ap = Math.round(baseAP * (1 + Math.random() * 0.2 - 0.1))

    periods.push({
      period,
      revenue,
      costOfGoodsSold: cogs,
      operatingExpenses: opex,
      interestExpense: interest,
      taxes,
      cash,
      accountsReceivable: ar,
      inventory,
      fixedAssets: 150000,
      accountsPayable: ap,
      shortTermDebt: 20000,
      longTermDebt: 80000,
      equity: 100000 + (i * 2000) // Growing equity
    })

    baseRevenue = revenue
    baseCash = cash
    baseAR = ar
    baseInventory = inventory
    baseAP = ap
  }

  return periods
}

// ============================================================================
// ACCOUNTING CALCULATIONS
// ============================================================================

function calculateDerivedMetrics(data: AccountingPeriod[]): DerivedMetrics[] {
  return data.map((period, index) => {
    const prev = index > 0 ? data[index - 1] : null

    // Income Statement Calculations
    const grossProfit = period.revenue - period.costOfGoodsSold
    const grossMargin = period.revenue > 0 ? grossProfit / period.revenue : 0
    const operatingIncome = grossProfit - period.operatingExpenses
    const operatingMargin = period.revenue > 0 ? operatingIncome / period.revenue : 0
    const netIncome = operatingIncome - period.interestExpense - period.taxes
    const netMargin = period.revenue > 0 ? netIncome / period.revenue : 0

    // Balance Sheet Calculations
    const currentAssets = period.cash + period.accountsReceivable + period.inventory
    const totalAssets = currentAssets + period.fixedAssets
    const currentLiabilities = period.accountsPayable + period.shortTermDebt
    const totalLiabilities = currentLiabilities + period.longTermDebt
    const workingCapital = currentAssets - currentLiabilities
    const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : 0
    const quickRatio = currentLiabilities > 0 ? (period.cash + period.accountsReceivable) / currentLiabilities : 0
    const debtToEquity = period.equity > 0 ? totalLiabilities / period.equity : 0

    // Operating Cash Flow (simplified indirect method)
    const operatingCashFlow = netIncome + (prev ? (prev.accountsReceivable - period.accountsReceivable) : 0) +
                              (prev ? (prev.inventory - period.inventory) : 0) +
                              (prev ? (period.accountsPayable - prev.accountsPayable) : 0)

    // Growth calculations
    const revenueGrowth = prev && prev.revenue > 0 ? (period.revenue - prev.revenue) / prev.revenue : 0
    const profitGrowth = prev && prev.revenue > 0 ? (netIncome - (prev.revenue - prev.costOfGoodsSold - prev.operatingExpenses - prev.interestExpense - prev.taxes)) / Math.abs(prev.revenue - prev.costOfGoodsSold - prev.operatingExpenses - prev.interestExpense - prev.taxes || 1) : 0
    const assetGrowth = prev ? (totalAssets - (prev.cash + prev.accountsReceivable + prev.inventory + prev.fixedAssets)) / (prev.cash + prev.accountsReceivable + prev.inventory + prev.fixedAssets) : 0

    return {
      period: period.period,
      grossProfit,
      grossMargin,
      operatingIncome,
      operatingMargin,
      netIncome,
      netMargin,
      totalAssets,
      totalLiabilities,
      workingCapital,
      currentRatio,
      quickRatio,
      debtToEquity,
      operatingCashFlow,
      revenueGrowth,
      profitGrowth,
      assetGrowth
    }
  })
}

function calculateThirdOrderMetrics(raw: AccountingPeriod[], derived: DerivedMetrics[]): ThirdOrderBusinessMetrics[] {
  return derived.map((d, index) => {
    const prev = index > 0 ? derived[index - 1] : null
    const rawPeriod = raw[index]

    // First-Order: Business Velocity
    // Combines profitability, liquidity, and efficiency
    const profitabilityScore = Math.min(1, Math.max(0, (d.netMargin + 0.1) / 0.3)) // Normalize -10% to +20%
    const liquidityScore = Math.min(1, Math.max(0, (d.currentRatio - 0.5) / 2)) // Normalize 0.5 to 2.5
    const leverageScore = Math.min(1, Math.max(0, 1 - d.debtToEquity / 3)) // Lower debt = higher score
    const growthScore = Math.min(1, Math.max(0, (d.revenueGrowth + 0.1) / 0.3)) // Normalize -10% to +20%

    const businessVelocity = (profitabilityScore * 0.3 + liquidityScore * 0.25 + leverageScore * 0.2 + growthScore * 0.25)

    // Capital Efficiency (ROA proxy)
    const capitalEfficiency = d.totalAssets > 0 ? d.netIncome / d.totalAssets : 0

    // Cash Cycle Speed (working capital turnover)
    const cashCycleSpeed = d.workingCapital !== 0 ? rawPeriod.revenue / Math.abs(d.workingCapital) : 0

    // Second-Order: Acceleration
    const velocityAcceleration = prev ? businessVelocity - (
      (Math.min(1, Math.max(0, (prev.netMargin + 0.1) / 0.3)) * 0.3 +
       Math.min(1, Math.max(0, (prev.currentRatio - 0.5) / 2)) * 0.25 +
       Math.min(1, Math.max(0, 1 - prev.debtToEquity / 3)) * 0.2 +
       Math.min(1, Math.max(0, (prev.revenueGrowth + 0.1) / 0.3)) * 0.25)
    ) : 0

    const prevEfficiency = prev && prev.totalAssets > 0 ? prev.netIncome / prev.totalAssets : 0
    const efficiencyChange = capitalEfficiency - prevEfficiency

    // Third-Order: Projected Cumulative Value
    // Cₕ = V₀ × e^(r×h) × (1 - ρ)
    // Where V₀ = current velocity, r = efficiency rate, h = horizon, ρ = risk
    const horizonYears = 3
    const effectiveRate = businessVelocity * 0.5 + capitalEfficiency * 2
    const baseRisk = (1 - liquidityScore) * 0.3 + (1 - leverageScore) * 0.4 + (1 - profitabilityScore) * 0.3
    const riskScore = Math.min(100, Math.max(0, baseRisk * 100))
    const collapseProb = baseRisk

    const projectedValue = businessVelocity * Math.exp(effectiveRate * horizonYears) * (1 - collapseProb)

    // Risk Level
    let riskLevel = 'low'
    if (riskScore >= 75) riskLevel = 'critical'
    else if (riskScore >= 50) riskLevel = 'high'
    else if (riskScore >= 35) riskLevel = 'elevated'
    else if (riskScore >= 20) riskLevel = 'moderate'

    return {
      period: d.period,
      businessVelocity,
      capitalEfficiency,
      cashCycleSpeed,
      velocityAcceleration,
      efficiencyChange,
      projectedValue,
      riskScore,
      riskLevel
    }
  })
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

const formatNumber = (n: number, decimals = 2) => {
  if (isNaN(n) || !isFinite(n)) return 'N/A'
  return n.toFixed(decimals)
}

const getRiskColor = (level: string) => {
  switch (level) {
    case 'low': return 'text-emerald-400 bg-emerald-400/20'
    case 'moderate': return 'text-yellow-400 bg-yellow-400/20'
    case 'elevated': return 'text-orange-400 bg-orange-400/20'
    case 'high': return 'text-red-400 bg-red-400/20'
    case 'critical': return 'text-red-300 bg-red-500/30'
    default: return 'text-gray-400 bg-gray-400/20'
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ThirdOrderAccountingPage() {
  // Raw accounting data state
  const [accountingData, setAccountingData] = useState<AccountingPeriod[]>(generateSampleData)
  const [selectedPeriod, setSelectedPeriod] = useState(11) // Latest period
  const [activeTab, setActiveTab] = useState<'entry' | 'statements' | 'ratios' | 'third-order'>('entry')

  // Editing state
  const [editMode, setEditMode] = useState(false)

  // Derived calculations
  const derivedMetrics = useMemo(() => calculateDerivedMetrics(accountingData), [accountingData])
  const thirdOrderMetrics = useMemo(() => calculateThirdOrderMetrics(accountingData, derivedMetrics), [accountingData, derivedMetrics])

  const currentRaw = accountingData[selectedPeriod]
  const currentDerived = derivedMetrics[selectedPeriod]
  const currentThirdOrder = thirdOrderMetrics[selectedPeriod]

  // Update a field in the current period
  const updateField = useCallback((field: keyof AccountingPeriod, value: number) => {
    setAccountingData(prev => {
      const updated = [...prev]
      updated[selectedPeriod] = { ...updated[selectedPeriod], [field]: value }
      return updated
    })
  }, [selectedPeriod])

  // Reset to sample data
  const resetData = () => {
    setAccountingData(generateSampleData())
    setSelectedPeriod(11)
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-neutral-900 to-slate-900 border-b border-neutral-800 py-6 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-white">Third-Order Business Accounting</h1>
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs font-bold rounded border border-amber-500/30">BETA</span>
          </div>
          <p className="text-neutral-400 text-sm">
            Basic business accounting with forward-looking velocity projections
          </p>
        </div>
      </div>

      {/* Period Selector */}
      <div className="bg-neutral-900/50 border-b border-neutral-800 px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <span className="text-sm text-neutral-500">Period:</span>
          <div className="flex gap-1 overflow-x-auto">
            {accountingData.map((p, i) => (
              <button
                key={p.period}
                onClick={() => setSelectedPeriod(i)}
                className={`px-3 py-1.5 text-xs rounded font-mono transition ${
                  selectedPeriod === i
                    ? 'bg-indigo-600 text-white'
                    : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                }`}
              >
                {p.period}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <button
            onClick={resetData}
            className="px-3 py-1.5 text-xs bg-neutral-800 text-neutral-400 rounded hover:bg-neutral-700"
          >
            Reset Sample
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-neutral-900/30 border-b border-neutral-800">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-1">
            {[
              { id: 'entry', label: 'Data Entry', icon: '📝' },
              { id: 'statements', label: 'Financial Statements', icon: '📊' },
              { id: 'ratios', label: 'Ratios & Analysis', icon: '📈' },
              { id: 'third-order', label: 'Third-Order Projection', icon: '🎯' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-indigo-500 text-indigo-400'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                <span className="mr-1.5">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Tab: Data Entry */}
        {activeTab === 'entry' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Trial Balance Entry - {currentRaw.period}</h2>
              <button
                onClick={() => setEditMode(!editMode)}
                className={`px-3 py-1.5 text-sm rounded ${
                  editMode ? 'bg-amber-600 text-white' : 'bg-neutral-800 text-neutral-300'
                }`}
              >
                {editMode ? 'Done Editing' : 'Edit Values'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Income Statement Inputs */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
                <h3 className="text-sm font-semibold text-neutral-300 mb-4 uppercase tracking-wide">Income Statement</h3>
                <div className="space-y-3">
                  {[
                    { key: 'revenue', label: 'Revenue', value: currentRaw.revenue },
                    { key: 'costOfGoodsSold', label: 'Cost of Goods Sold', value: currentRaw.costOfGoodsSold },
                    { key: 'operatingExpenses', label: 'Operating Expenses', value: currentRaw.operatingExpenses },
                    { key: 'interestExpense', label: 'Interest Expense', value: currentRaw.interestExpense },
                    { key: 'taxes', label: 'Taxes', value: currentRaw.taxes }
                  ].map(field => (
                    <div key={field.key} className="flex items-center justify-between">
                      <label className="text-sm text-neutral-400">{field.label}</label>
                      {editMode ? (
                        <input
                          type="number"
                          value={field.value}
                          onChange={(e) => updateField(field.key as keyof AccountingPeriod, parseFloat(e.target.value) || 0)}
                          className="w-32 px-2 py-1 text-right font-mono text-sm bg-neutral-800 border border-neutral-700 rounded text-white"
                        />
                      ) : (
                        <span className="font-mono text-sm text-white">{formatCurrency(field.value)}</span>
                      )}
                    </div>
                  ))}
                  <div className="border-t border-neutral-700 pt-3 mt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-emerald-400">Net Income</span>
                      <span className={`font-mono text-sm font-bold ${currentDerived.netIncome >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency(currentDerived.netIncome)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Balance Sheet Inputs */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
                <h3 className="text-sm font-semibold text-neutral-300 mb-4 uppercase tracking-wide">Balance Sheet</h3>
                <div className="space-y-3">
                  <div className="text-xs text-neutral-500 font-semibold mb-2">ASSETS</div>
                  {[
                    { key: 'cash', label: 'Cash', value: currentRaw.cash },
                    { key: 'accountsReceivable', label: 'Accounts Receivable', value: currentRaw.accountsReceivable },
                    { key: 'inventory', label: 'Inventory', value: currentRaw.inventory },
                    { key: 'fixedAssets', label: 'Fixed Assets', value: currentRaw.fixedAssets }
                  ].map(field => (
                    <div key={field.key} className="flex items-center justify-between">
                      <label className="text-sm text-neutral-400">{field.label}</label>
                      {editMode ? (
                        <input
                          type="number"
                          value={field.value}
                          onChange={(e) => updateField(field.key as keyof AccountingPeriod, parseFloat(e.target.value) || 0)}
                          className="w-32 px-2 py-1 text-right font-mono text-sm bg-neutral-800 border border-neutral-700 rounded text-white"
                        />
                      ) : (
                        <span className="font-mono text-sm text-white">{formatCurrency(field.value)}</span>
                      )}
                    </div>
                  ))}

                  <div className="text-xs text-neutral-500 font-semibold mt-4 mb-2">LIABILITIES</div>
                  {[
                    { key: 'accountsPayable', label: 'Accounts Payable', value: currentRaw.accountsPayable },
                    { key: 'shortTermDebt', label: 'Short-Term Debt', value: currentRaw.shortTermDebt },
                    { key: 'longTermDebt', label: 'Long-Term Debt', value: currentRaw.longTermDebt }
                  ].map(field => (
                    <div key={field.key} className="flex items-center justify-between">
                      <label className="text-sm text-neutral-400">{field.label}</label>
                      {editMode ? (
                        <input
                          type="number"
                          value={field.value}
                          onChange={(e) => updateField(field.key as keyof AccountingPeriod, parseFloat(e.target.value) || 0)}
                          className="w-32 px-2 py-1 text-right font-mono text-sm bg-neutral-800 border border-neutral-700 rounded text-white"
                        />
                      ) : (
                        <span className="font-mono text-sm text-white">{formatCurrency(field.value)}</span>
                      )}
                    </div>
                  ))}

                  <div className="text-xs text-neutral-500 font-semibold mt-4 mb-2">EQUITY</div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-neutral-400">Owner&apos;s Equity</label>
                    {editMode ? (
                      <input
                        type="number"
                        value={currentRaw.equity}
                        onChange={(e) => updateField('equity', parseFloat(e.target.value) || 0)}
                        className="w-32 px-2 py-1 text-right font-mono text-sm bg-neutral-800 border border-neutral-700 rounded text-white"
                      />
                    ) : (
                      <span className="font-mono text-sm text-white">{formatCurrency(currentRaw.equity)}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Summary */}
            <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-indigo-400">{formatCurrency(currentDerived.totalAssets)}</div>
                  <div className="text-xs text-neutral-500">Total Assets</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-orange-400">{formatCurrency(currentDerived.totalLiabilities)}</div>
                  <div className="text-xs text-neutral-500">Total Liabilities</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-emerald-400">{formatCurrency(currentRaw.equity)}</div>
                  <div className="text-xs text-neutral-500">Equity</div>
                </div>
                <div>
                  <div className={`text-lg font-bold ${currentDerived.workingCapital >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatCurrency(currentDerived.workingCapital)}
                  </div>
                  <div className="text-xs text-neutral-500">Working Capital</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Financial Statements */}
        {activeTab === 'statements' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Income Statement */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
                <h3 className="text-lg font-semibold text-white mb-4">Income Statement</h3>
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b border-neutral-800">
                      <td className="py-2 text-neutral-400">Revenue</td>
                      <td className="py-2 text-right font-mono text-white">{formatCurrency(currentRaw.revenue)}</td>
                    </tr>
                    <tr className="border-b border-neutral-800">
                      <td className="py-2 text-neutral-400">Cost of Goods Sold</td>
                      <td className="py-2 text-right font-mono text-red-400">({formatCurrency(currentRaw.costOfGoodsSold)})</td>
                    </tr>
                    <tr className="border-b border-neutral-700 bg-neutral-800/30">
                      <td className="py-2 font-semibold text-neutral-200">Gross Profit</td>
                      <td className="py-2 text-right font-mono font-semibold text-white">{formatCurrency(currentDerived.grossProfit)}</td>
                    </tr>
                    <tr className="border-b border-neutral-800">
                      <td className="py-2 text-neutral-400">Operating Expenses</td>
                      <td className="py-2 text-right font-mono text-red-400">({formatCurrency(currentRaw.operatingExpenses)})</td>
                    </tr>
                    <tr className="border-b border-neutral-700 bg-neutral-800/30">
                      <td className="py-2 font-semibold text-neutral-200">Operating Income</td>
                      <td className="py-2 text-right font-mono font-semibold text-white">{formatCurrency(currentDerived.operatingIncome)}</td>
                    </tr>
                    <tr className="border-b border-neutral-800">
                      <td className="py-2 text-neutral-400">Interest Expense</td>
                      <td className="py-2 text-right font-mono text-red-400">({formatCurrency(currentRaw.interestExpense)})</td>
                    </tr>
                    <tr className="border-b border-neutral-800">
                      <td className="py-2 text-neutral-400">Taxes</td>
                      <td className="py-2 text-right font-mono text-red-400">({formatCurrency(currentRaw.taxes)})</td>
                    </tr>
                    <tr className="bg-emerald-500/10">
                      <td className="py-3 font-bold text-emerald-400">Net Income</td>
                      <td className={`py-3 text-right font-mono font-bold ${currentDerived.netIncome >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency(currentDerived.netIncome)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Balance Sheet */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
                <h3 className="text-lg font-semibold text-white mb-4">Balance Sheet</h3>
                <table className="w-full text-sm">
                  <tbody>
                    <tr><td colSpan={2} className="py-2 text-xs font-semibold text-neutral-500 uppercase">Assets</td></tr>
                    <tr className="border-b border-neutral-800">
                      <td className="py-1.5 pl-4 text-neutral-400">Cash</td>
                      <td className="py-1.5 text-right font-mono text-white">{formatCurrency(currentRaw.cash)}</td>
                    </tr>
                    <tr className="border-b border-neutral-800">
                      <td className="py-1.5 pl-4 text-neutral-400">Accounts Receivable</td>
                      <td className="py-1.5 text-right font-mono text-white">{formatCurrency(currentRaw.accountsReceivable)}</td>
                    </tr>
                    <tr className="border-b border-neutral-800">
                      <td className="py-1.5 pl-4 text-neutral-400">Inventory</td>
                      <td className="py-1.5 text-right font-mono text-white">{formatCurrency(currentRaw.inventory)}</td>
                    </tr>
                    <tr className="border-b border-neutral-800">
                      <td className="py-1.5 pl-4 text-neutral-400">Fixed Assets</td>
                      <td className="py-1.5 text-right font-mono text-white">{formatCurrency(currentRaw.fixedAssets)}</td>
                    </tr>
                    <tr className="border-b border-neutral-700 bg-neutral-800/30">
                      <td className="py-2 font-semibold text-neutral-200">Total Assets</td>
                      <td className="py-2 text-right font-mono font-semibold text-white">{formatCurrency(currentDerived.totalAssets)}</td>
                    </tr>

                    <tr><td colSpan={2} className="py-2 text-xs font-semibold text-neutral-500 uppercase">Liabilities</td></tr>
                    <tr className="border-b border-neutral-800">
                      <td className="py-1.5 pl-4 text-neutral-400">Accounts Payable</td>
                      <td className="py-1.5 text-right font-mono text-white">{formatCurrency(currentRaw.accountsPayable)}</td>
                    </tr>
                    <tr className="border-b border-neutral-800">
                      <td className="py-1.5 pl-4 text-neutral-400">Short-Term Debt</td>
                      <td className="py-1.5 text-right font-mono text-white">{formatCurrency(currentRaw.shortTermDebt)}</td>
                    </tr>
                    <tr className="border-b border-neutral-800">
                      <td className="py-1.5 pl-4 text-neutral-400">Long-Term Debt</td>
                      <td className="py-1.5 text-right font-mono text-white">{formatCurrency(currentRaw.longTermDebt)}</td>
                    </tr>
                    <tr className="border-b border-neutral-700 bg-neutral-800/30">
                      <td className="py-2 font-semibold text-neutral-200">Total Liabilities</td>
                      <td className="py-2 text-right font-mono font-semibold text-white">{formatCurrency(currentDerived.totalLiabilities)}</td>
                    </tr>

                    <tr><td colSpan={2} className="py-2 text-xs font-semibold text-neutral-500 uppercase">Equity</td></tr>
                    <tr className="border-b border-neutral-700 bg-emerald-500/10">
                      <td className="py-2 font-semibold text-emerald-400">Owner&apos;s Equity</td>
                      <td className="py-2 text-right font-mono font-semibold text-emerald-400">{formatCurrency(currentRaw.equity)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Trend Charts */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
              <h3 className="text-lg font-semibold text-white mb-4">Revenue & Net Income Trend</h3>
              <ResponsiveContainer width="100%" height={250}>
                <ComposedChart data={accountingData.map((d, i) => ({
                  period: d.period,
                  revenue: d.revenue,
                  netIncome: derivedMetrics[i].netIncome
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="period" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#9ca3af" tickFormatter={(v) => `$${(v/1000).toFixed(0)}K`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend />
                  <Bar dataKey="revenue" fill="#6366f1" name="Revenue" />
                  <Line type="monotone" dataKey="netIncome" stroke="#10b981" strokeWidth={2} name="Net Income" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Tab: Ratios & Analysis */}
        {activeTab === 'ratios' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Profitability Ratios */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
                <div className="text-xs text-neutral-500 uppercase tracking-wide mb-3">Profitability</div>
                <div className="space-y-3">
                  <div>
                    <div className="text-lg font-bold text-indigo-400">{formatPercent(currentDerived.grossMargin)}</div>
                    <div className="text-xs text-neutral-500">Gross Margin</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-indigo-400">{formatPercent(currentDerived.operatingMargin)}</div>
                    <div className="text-xs text-neutral-500">Operating Margin</div>
                  </div>
                  <div>
                    <div className={`text-lg font-bold ${currentDerived.netMargin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatPercent(currentDerived.netMargin)}
                    </div>
                    <div className="text-xs text-neutral-500">Net Margin</div>
                  </div>
                </div>
              </div>

              {/* Liquidity Ratios */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
                <div className="text-xs text-neutral-500 uppercase tracking-wide mb-3">Liquidity</div>
                <div className="space-y-3">
                  <div>
                    <div className={`text-lg font-bold ${currentDerived.currentRatio >= 1.5 ? 'text-emerald-400' : currentDerived.currentRatio >= 1 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {formatNumber(currentDerived.currentRatio)}x
                    </div>
                    <div className="text-xs text-neutral-500">Current Ratio</div>
                  </div>
                  <div>
                    <div className={`text-lg font-bold ${currentDerived.quickRatio >= 1 ? 'text-emerald-400' : currentDerived.quickRatio >= 0.5 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {formatNumber(currentDerived.quickRatio)}x
                    </div>
                    <div className="text-xs text-neutral-500">Quick Ratio</div>
                  </div>
                  <div>
                    <div className={`text-lg font-bold ${currentDerived.workingCapital >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatCurrency(currentDerived.workingCapital)}
                    </div>
                    <div className="text-xs text-neutral-500">Working Capital</div>
                  </div>
                </div>
              </div>

              {/* Leverage Ratios */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
                <div className="text-xs text-neutral-500 uppercase tracking-wide mb-3">Leverage</div>
                <div className="space-y-3">
                  <div>
                    <div className={`text-lg font-bold ${currentDerived.debtToEquity <= 1 ? 'text-emerald-400' : currentDerived.debtToEquity <= 2 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {formatNumber(currentDerived.debtToEquity)}x
                    </div>
                    <div className="text-xs text-neutral-500">Debt/Equity</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-neutral-300">
                      {formatPercent(currentDerived.totalLiabilities / currentDerived.totalAssets)}
                    </div>
                    <div className="text-xs text-neutral-500">Debt Ratio</div>
                  </div>
                </div>
              </div>

              {/* Growth */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
                <div className="text-xs text-neutral-500 uppercase tracking-wide mb-3">Growth (MoM)</div>
                <div className="space-y-3">
                  <div>
                    <div className={`text-lg font-bold ${currentDerived.revenueGrowth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {currentDerived.revenueGrowth >= 0 ? '+' : ''}{formatPercent(currentDerived.revenueGrowth)}
                    </div>
                    <div className="text-xs text-neutral-500">Revenue Growth</div>
                  </div>
                  <div>
                    <div className={`text-lg font-bold ${currentDerived.assetGrowth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {currentDerived.assetGrowth >= 0 ? '+' : ''}{formatPercent(currentDerived.assetGrowth)}
                    </div>
                    <div className="text-xs text-neutral-500">Asset Growth</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Ratio Trends */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
              <h3 className="text-lg font-semibold text-white mb-4">Margin Trends</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={derivedMetrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="period" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#9ca3af" tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    formatter={(value: number) => formatPercent(value)}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="grossMargin" stroke="#818cf8" strokeWidth={2} name="Gross Margin" dot={false} />
                  <Line type="monotone" dataKey="operatingMargin" stroke="#fbbf24" strokeWidth={2} name="Operating Margin" dot={false} />
                  <Line type="monotone" dataKey="netMargin" stroke="#10b981" strokeWidth={2} name="Net Margin" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
              <h3 className="text-lg font-semibold text-white mb-4">Liquidity Trends</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={derivedMetrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="period" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    formatter={(value: number) => formatNumber(value)}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="currentRatio" stroke="#06b6d4" strokeWidth={2} name="Current Ratio" dot={false} />
                  <Line type="monotone" dataKey="quickRatio" stroke="#f472b6" strokeWidth={2} name="Quick Ratio" dot={false} />
                  <ReferenceLine y={1} stroke="#ef4444" strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Tab: Third-Order Projection */}
        {activeTab === 'third-order' && (
          <div className="space-y-6">
            {/* Explanation */}
            <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-5">
              <h3 className="text-sm font-semibold text-indigo-300 mb-2">Third-Order Business Projection</h3>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Third-order analysis projects cumulative business value using exponential compounding of current velocity
                metrics, adjusted for risk. The formula: <span className="font-mono text-indigo-400">Cₕ = V₀ × e^(r×h) × (1 − ρ)</span> where
                V₀ is current business velocity, r is the effective growth rate, h is the horizon (3 years), and ρ is the risk factor.
              </p>
            </div>

            {/* Current Third-Order Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
                <div className="text-xs text-neutral-500 mb-1">Business Velocity (V₀)</div>
                <div className="text-2xl font-bold text-indigo-400">{formatNumber(currentThirdOrder.businessVelocity, 3)}</div>
                <div className="text-xs text-neutral-600 mt-1">Composite health score</div>
              </div>
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
                <div className="text-xs text-neutral-500 mb-1">Capital Efficiency</div>
                <div className="text-2xl font-bold text-cyan-400">{formatPercent(currentThirdOrder.capitalEfficiency)}</div>
                <div className="text-xs text-neutral-600 mt-1">Return on assets</div>
              </div>
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
                <div className="text-xs text-neutral-500 mb-1">Projected Value (Cₕ)</div>
                <div className={`text-2xl font-bold ${currentThirdOrder.projectedValue >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatNumber(currentThirdOrder.projectedValue, 3)}
                </div>
                <div className="text-xs text-neutral-600 mt-1">3-year projection</div>
              </div>
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
                <div className="text-xs text-neutral-500 mb-1">Risk Level</div>
                <div className={`text-xl font-bold px-3 py-1 rounded inline-block ${getRiskColor(currentThirdOrder.riskLevel)}`}>
                  {currentThirdOrder.riskLevel.toUpperCase()}
                </div>
                <div className="text-xs text-neutral-600 mt-1">Score: {formatNumber(currentThirdOrder.riskScore, 1)}/100</div>
              </div>
            </div>

            {/* Velocity Evolution Chart */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
              <h3 className="text-lg font-semibold text-white mb-4">Business Velocity Evolution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={thirdOrderMetrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="period" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" stroke="#9ca3af" />
                  <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    formatter={(value: number, name: string) => [formatNumber(value, 3), name]}
                  />
                  <Legend />
                  <Area yAxisId="left" type="monotone" dataKey="projectedValue" fill="#10b981" stroke="#10b981" fillOpacity={0.2} name="Projected Value (Cₕ)" />
                  <Line yAxisId="left" type="monotone" dataKey="businessVelocity" stroke="#818cf8" strokeWidth={2} name="Business Velocity" />
                  <Line yAxisId="right" type="monotone" dataKey="riskScore" stroke="#f87171" strokeWidth={2} name="Risk Score" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Acceleration & Efficiency Change */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
                <h3 className="text-lg font-semibold text-white mb-4">Velocity Acceleration</h3>
                <div className="text-center mb-4">
                  <div className={`text-3xl font-bold ${currentThirdOrder.velocityAcceleration >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {currentThirdOrder.velocityAcceleration >= 0 ? '+' : ''}{formatNumber(currentThirdOrder.velocityAcceleration, 4)}
                  </div>
                  <div className="text-sm text-neutral-500">Change in velocity from prior period</div>
                </div>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={thirdOrderMetrics.slice(-6)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="period" stroke="#9ca3af" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                      formatter={(value: number) => formatNumber(value, 4)}
                    />
                    <ReferenceLine y={0} stroke="#9ca3af" />
                    <Bar dataKey="velocityAcceleration">
                      {thirdOrderMetrics.slice(-6).map((entry, index) => (
                        <Cell key={index} fill={entry.velocityAcceleration >= 0 ? '#10b981' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
                <h3 className="text-lg font-semibold text-white mb-4">Risk Breakdown</h3>
                <div className="space-y-4">
                  {[
                    { label: 'Profitability Risk', value: Math.min(1, Math.max(0, 1 - (currentDerived.netMargin + 0.1) / 0.3)) * 30, weight: '30%' },
                    { label: 'Liquidity Risk', value: Math.min(1, Math.max(0, 1 - (currentDerived.currentRatio - 0.5) / 2)) * 30, weight: '30%' },
                    { label: 'Leverage Risk', value: Math.min(1, Math.max(0, currentDerived.debtToEquity / 3)) * 40, weight: '40%' }
                  ].map(risk => (
                    <div key={risk.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-neutral-400">{risk.label}</span>
                        <span className="text-neutral-500">{risk.weight}</span>
                      </div>
                      <div className="h-3 bg-neutral-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            risk.value < 10 ? 'bg-emerald-500' :
                            risk.value < 20 ? 'bg-yellow-500' :
                            risk.value < 30 ? 'bg-orange-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${risk.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="border-t border-neutral-700 pt-3 mt-3">
                    <div className="flex justify-between">
                      <span className="font-semibold text-neutral-300">Total Risk Score</span>
                      <span className={`font-bold ${
                        currentThirdOrder.riskScore < 20 ? 'text-emerald-400' :
                        currentThirdOrder.riskScore < 35 ? 'text-yellow-400' :
                        currentThirdOrder.riskScore < 50 ? 'text-orange-400' : 'text-red-400'
                      }`}>
                        {formatNumber(currentThirdOrder.riskScore, 1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Historical Third-Order Table */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
              <h3 className="text-lg font-semibold text-white mb-4">Historical Third-Order Metrics</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-700">
                      <th className="text-left py-2 px-3 text-neutral-400">Period</th>
                      <th className="text-right py-2 px-3 text-neutral-400">Velocity</th>
                      <th className="text-right py-2 px-3 text-neutral-400">Acceleration</th>
                      <th className="text-right py-2 px-3 text-neutral-400">Efficiency</th>
                      <th className="text-right py-2 px-3 text-neutral-400">Projected Cₕ</th>
                      <th className="text-right py-2 px-3 text-neutral-400">Risk</th>
                      <th className="text-center py-2 px-3 text-neutral-400">Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {thirdOrderMetrics.map((m, i) => (
                      <tr key={m.period} className={`border-b border-neutral-800 ${i === selectedPeriod ? 'bg-indigo-500/10' : 'hover:bg-neutral-800/50'}`}>
                        <td className="py-2 px-3 font-mono text-neutral-300">{m.period}</td>
                        <td className="py-2 px-3 text-right font-mono text-indigo-400">{formatNumber(m.businessVelocity, 3)}</td>
                        <td className={`py-2 px-3 text-right font-mono ${m.velocityAcceleration >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {m.velocityAcceleration >= 0 ? '+' : ''}{formatNumber(m.velocityAcceleration, 4)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-cyan-400">{formatPercent(m.capitalEfficiency)}</td>
                        <td className={`py-2 px-3 text-right font-mono ${m.projectedValue >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {formatNumber(m.projectedValue, 3)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-neutral-300">{formatNumber(m.riskScore, 1)}%</td>
                        <td className="py-2 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs ${getRiskColor(m.riskLevel)}`}>{m.riskLevel}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
