'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  ReferenceLine
} from 'recharts'
import {
  computeThirdOrder,
  generateForecastPaths,
  generateRiskHeatmap,
  runScenarioAnalysis,
  DEFAULT_THIRD_ORDER_PARAMS,
  PRESET_SCENARIOS,
  ThirdOrderParams,
  ThirdOrderResult,
  ForecastPath,
  RiskHeatmapCell,
  ScenarioResult,
  NIVDataPoint,
  getRiskLevel
} from '@/lib/thirdOrderAccounting'

// ============================================================================
// TAB SYSTEM
// ============================================================================

type TabId = 'overview' | 'forecast' | 'heatmap' | 'scenarios' | 'api'

interface Tab {
  id: TabId
  label: string
  icon: string
}

const TABS: Tab[] = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'forecast', label: 'Forecast Paths', icon: '📈' },
  { id: 'heatmap', label: 'Risk Heatmap', icon: '🌡️' },
  { id: 'scenarios', label: 'Scenarios', icon: '🎯' },
  { id: 'api', label: 'API Integration', icon: '🔌' }
]

// ============================================================================
// SIMULATED ACCOUNTING DATA GENERATOR
// ============================================================================

function generateAccountingNIVData(months: number = 120): NIVDataPoint[] {
  const data: NIVDataPoint[] = []
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - months)

  // Base parameters that evolve over time
  let baseThrust = 0.12
  let baseEfficiency = 0.065
  let baseSlack = 0.22
  let baseDrag = 0.10

  // Historical recession periods (simplified)
  const recessionPeriods = [
    { start: 24, end: 30 },   // ~2 years ago recession
    { start: 84, end: 96 },   // ~7-8 years ago (like 2008)
  ]

  for (let i = 0; i < months; i++) {
    const date = new Date(startDate)
    date.setMonth(date.getMonth() + i)
    const dateStr = date.toISOString().slice(0, 10)

    // Check if in recession
    const monthsAgo = months - i
    const isRecession = recessionPeriods.some(p => monthsAgo >= p.start && monthsAgo <= p.end)

    // Add cyclical and random variation
    const cycle = Math.sin(i / 12 * Math.PI) * 0.02
    const trend = i / months * 0.01
    const noise = (Math.random() - 0.5) * 0.02

    // Recession impact
    const recessionMultiplier = isRecession ? 0.7 : 1.0
    const recessionDragAdd = isRecession ? 0.08 : 0

    // Calculate metrics from "accounting data"
    // Thrust = f(revenue growth, investment, working capital)
    const thrust = Math.max(0.01, (baseThrust + cycle + trend + noise) * recessionMultiplier)

    // Efficiency = f(ROA, asset turnover, margin)
    const efficiency = Math.max(0.01, baseEfficiency + trend * 0.5 + noise * 0.5)

    // Slack = f(capacity utilization, inventory levels)
    const slack = Math.max(0.05, Math.min(0.4, baseSlack - trend * 0.3 + noise))

    // Drag = f(debt ratio, interest coverage, aging receivables)
    const drag = Math.max(0.02, baseDrag + recessionDragAdd + Math.abs(noise) * 0.5)

    // Calculate NIV: (u × P²) / (X + F)^η
    const eta = 1.5
    const denominator = Math.pow(slack + drag, eta)
    const niv = denominator > 0 ? (thrust * efficiency * efficiency) / denominator : 0

    data.push({
      date: dateStr,
      niv,
      thrust,
      efficiency,
      slack,
      drag,
      isRecession
    })

    // Gradual evolution of base parameters
    baseThrust += (Math.random() - 0.48) * 0.002
    baseEfficiency += (Math.random() - 0.45) * 0.001
    baseDrag += (Math.random() - 0.52) * 0.001
  }

  return data
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ThirdOrderAccountingPage() {
  // State
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [loading, setLoading] = useState(true)
  const [rawData, setRawData] = useState<NIVDataPoint[]>([])

  // Parameters
  const [params, setParams] = useState<ThirdOrderParams>(DEFAULT_THIRD_ORDER_PARAMS)

  // Results
  const [thirdOrderResult, setThirdOrderResult] = useState<ThirdOrderResult | null>(null)
  const [forecastPaths, setForecastPaths] = useState<ForecastPath[]>([])
  const [heatmapData, setHeatmapData] = useState<RiskHeatmapCell[]>([])
  const [scenarioResults, setScenarioResults] = useState<ScenarioResult[]>([])
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>([])

  // ============================================================================
  // DATA LOADING - Uses simulated accounting data
  // ============================================================================

  useEffect(() => {
    // Generate 10 years of accounting-derived NIV data
    const data = generateAccountingNIVData(120)
    setRawData(data)

    // Compute third-order analysis
    if (data.length >= params.lookbackMonths) {
      const result = computeThirdOrder(data, params)
      setThirdOrderResult(result)

      const paths = generateForecastPaths(data, params)
      setForecastPaths(paths)

      const heatmap = generateRiskHeatmap(data, params)
      setHeatmapData(heatmap)
    }

    setLoading(false)
  }, [])

  // ============================================================================
  // SCENARIO HANDLING
  // ============================================================================

  const runScenarios = useCallback(() => {
    if (rawData.length < params.lookbackMonths) return

    const selected = PRESET_SCENARIOS.filter(s => selectedScenarios.includes(s.name))
    const results = selected.map(s => runScenarioAnalysis(rawData, s, params))
    setScenarioResults(results)
  }, [rawData, params, selectedScenarios])

  useEffect(() => {
    if (selectedScenarios.length > 0 && rawData.length > 0) {
      runScenarios()
    }
  }, [selectedScenarios, runScenarios])

  // ============================================================================
  // PARAMETER HANDLERS
  // ============================================================================

  const updateParam = (key: keyof ThirdOrderParams, value: number) => {
    setParams(prev => ({ ...prev, [key]: value }))
  }

  // Recompute when params change
  useEffect(() => {
    if (rawData.length >= params.lookbackMonths) {
      const result = computeThirdOrder(rawData, params)
      setThirdOrderResult(result)

      const paths = generateForecastPaths(rawData, params)
      setForecastPaths(paths)

      const heatmap = generateRiskHeatmap(rawData, params)
      setHeatmapData(heatmap)
    }
  }, [params, rawData])

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const formatNumber = (n: number, decimals: number = 4) => {
    if (isNaN(n) || !isFinite(n)) return 'N/A'
    return n.toFixed(decimals)
  }

  const formatPercent = (n: number) => {
    if (isNaN(n) || !isFinite(n)) return 'N/A'
    return `${(n * 100).toFixed(1)}%`
  }

  const getRiskBadgeColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800'
      case 'moderate': return 'bg-yellow-100 text-yellow-800'
      case 'elevated': return 'bg-orange-100 text-orange-800'
      case 'high': return 'bg-red-100 text-red-800'
      case 'critical': return 'bg-red-200 text-red-900'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // ============================================================================
  // RENDER: LOADING
  // ============================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading accounting data...</p>
          <p className="text-sm text-gray-500 mt-2">Computing third-order projections</p>
        </div>
      </div>
    )
  }

  // ============================================================================
  // RENDER: MAIN
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-900 text-white py-8 px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Third-Order Accounting</h1>
          <p className="text-indigo-200">
            Forward-looking meta-layer: exponential compounding + risk-adjusted forecasting
          </p>
          <div className="mt-4 flex gap-4 text-sm">
            <span className="bg-indigo-800 px-3 py-1 rounded">
              Data Points: {rawData.length}
            </span>
            <span className="bg-indigo-800 px-3 py-1 rounded">
              Horizon: {params.horizonYears} years
            </span>
            {thirdOrderResult && (
              <span className={`px-3 py-1 rounded ${getRiskBadgeColor(thirdOrderResult.riskLevel)}`}>
                Risk: {thirdOrderResult.riskLevel.toUpperCase()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex gap-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-indigo-600 text-indigo-600'
                    : 'text-gray-600 hover:text-gray-900'
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
      <div className="max-w-7xl mx-auto px-8 py-6">
        {activeTab === 'overview' && (
          <OverviewTab
            result={thirdOrderResult}
            params={params}
            updateParam={updateParam}
            rawData={rawData}
            formatNumber={formatNumber}
            formatPercent={formatPercent}
            getRiskBadgeColor={getRiskBadgeColor}
          />
        )}

        {activeTab === 'forecast' && (
          <ForecastTab
            forecastPaths={forecastPaths}
            rawData={rawData}
            formatNumber={formatNumber}
            formatPercent={formatPercent}
            getRiskBadgeColor={getRiskBadgeColor}
          />
        )}

        {activeTab === 'heatmap' && (
          <HeatmapTab
            heatmapData={heatmapData}
            params={params}
          />
        )}

        {activeTab === 'scenarios' && (
          <ScenariosTab
            selectedScenarios={selectedScenarios}
            setSelectedScenarios={setSelectedScenarios}
            scenarioResults={scenarioResults}
            formatNumber={formatNumber}
            formatPercent={formatPercent}
          />
        )}

        {activeTab === 'api' && (
          <APITab rawData={rawData} params={params} />
        )}
      </div>
    </div>
  )
}

// ============================================================================
// TAB: OVERVIEW
// ============================================================================

interface OverviewTabProps {
  result: ThirdOrderResult | null
  params: ThirdOrderParams
  updateParam: (key: keyof ThirdOrderParams, value: number) => void
  rawData: NIVDataPoint[]
  formatNumber: (n: number, d?: number) => string
  formatPercent: (n: number) => string
  getRiskBadgeColor: (level: string) => string
}

function OverviewTab({ result, params, updateParam, rawData, formatNumber, formatPercent, getRiskBadgeColor }: OverviewTabProps) {
  if (!result) return <div>No data available</div>

  // Recent NIV trend data
  const trendData = rawData.slice(-24).map(d => ({
    date: d.date.slice(0, 7),
    niv: d.niv,
    drag: d.drag
  }))

  return (
    <div className="space-y-6">
      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Current NIV"
          value={formatNumber(result.currentNIV)}
          subtitle="First-order velocity"
          trend={result.accelerationTrend}
        />
        <MetricCard
          title="Acceleration"
          value={formatNumber(result.acceleration, 6)}
          subtitle={`Second-order: ${result.accelerationTrend}`}
          trend={result.accelerationTrend}
        />
        <MetricCard
          title="Cumulative Cₕ"
          value={formatNumber(result.cumulativeRegeneration)}
          subtitle={`Third-order @ ${params.horizonYears}yr`}
          positive={result.cumulativeRegeneration > 0}
        />
        <MetricCard
          title="Collapse Probability"
          value={formatPercent(result.collapseProb)}
          subtitle={`Risk: ${result.riskLevel}`}
          badge={result.riskLevel}
          badgeColor={getRiskBadgeColor(result.riskLevel)}
        />
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Third-Order Breakdown */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Third-Order Breakdown</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Effective Rate (rₕ)</span>
              <span className="font-mono">{formatNumber(result.effectiveRate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Average Drag</span>
              <span className="font-mono">{formatNumber(result.avgDrag)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">NIV Volatility</span>
              <span className="font-mono">{formatNumber(result.volatility)}</span>
            </div>
            <hr />
            <div className="flex justify-between">
              <span className="text-gray-600">Confidence Range (95%)</span>
              <span className="font-mono text-sm">
                [{formatNumber(result.confidenceBands.lower5)} — {formatNumber(result.confidenceBands.upper95)}]
              </span>
            </div>
          </div>

          {/* Formula Display */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-2">Third-Order Formula:</p>
            <p className="font-mono text-sm">
              Cₕ = NIV₀ × e<sup>(rₕ×h)</sup> × (1 − ρₕ)
            </p>
            <p className="font-mono text-sm mt-2 text-gray-600">
              = {formatNumber(result.avgNIV)} × e<sup>({formatNumber(result.effectiveRate)}×{params.horizonYears})</sup> × (1 − {formatNumber(result.collapseProb)})
            </p>
            <p className="font-mono text-sm mt-2 text-indigo-600">
              = {formatNumber(result.cumulativeRegeneration)}
            </p>
          </div>
        </div>

        {/* Parameter Controls */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Model Parameters</h3>
          <div className="space-y-4">
            <ParamSlider
              label="Alpha (α) - Efficiency Multiplier"
              value={params.alpha}
              min={0.5}
              max={2.0}
              step={0.1}
              onChange={(v) => updateParam('alpha', v)}
            />
            <ParamSlider
              label="Beta (β) - Friction Penalty"
              value={params.beta}
              min={0.1}
              max={2.0}
              step={0.1}
              onChange={(v) => updateParam('beta', v)}
            />
            <ParamSlider
              label="Gamma (γ) - Drag Sensitivity"
              value={params.gamma}
              min={0.5}
              max={10.0}
              step={0.5}
              onChange={(v) => updateParam('gamma', v)}
            />
            <ParamSlider
              label="Theta (θ) - Tipping Threshold"
              value={params.theta}
              min={-1.0}
              max={1.0}
              step={0.05}
              onChange={(v) => updateParam('theta', v)}
            />
            <ParamSlider
              label="Horizon (years)"
              value={params.horizonYears}
              min={1}
              max={10}
              step={1}
              onChange={(v) => updateParam('horizonYears', v)}
            />
            <ParamSlider
              label="Lookback Window (months)"
              value={params.lookbackMonths}
              min={3}
              max={24}
              step={1}
              onChange={(v) => updateParam('lookbackMonths', v)}
            />
          </div>
        </div>
      </div>

      {/* NIV Trend Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Recent NIV Trend (24 months)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="niv"
              stroke="#6366f1"
              strokeWidth={2}
              name="NIV"
              dot={false}
            />
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="drag"
              fill="#fca5a5"
              stroke="#ef4444"
              fillOpacity={0.3}
              name="Drag"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Data Source Info */}
      <div className="bg-indigo-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-3">Data Source</h3>
        <p className="text-sm text-gray-700">
          This analysis uses NIV metrics derived from accounting data. The underlying components are:
        </p>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-white p-3 rounded">
            <div className="font-medium text-indigo-600">Thrust</div>
            <div className="text-gray-500">Revenue growth, investment, working capital</div>
          </div>
          <div className="bg-white p-3 rounded">
            <div className="font-medium text-indigo-600">Efficiency</div>
            <div className="text-gray-500">ROA, asset turnover, profit margin</div>
          </div>
          <div className="bg-white p-3 rounded">
            <div className="font-medium text-indigo-600">Slack</div>
            <div className="text-gray-500">Capacity utilization, inventory levels</div>
          </div>
          <div className="bg-white p-3 rounded">
            <div className="font-medium text-indigo-600">Drag</div>
            <div className="text-gray-500">Debt ratio, interest coverage, aging AR</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// TAB: FORECAST
// ============================================================================

interface ForecastTabProps {
  forecastPaths: ForecastPath[]
  rawData: NIVDataPoint[]
  formatNumber: (n: number, d?: number) => string
  formatPercent: (n: number) => string
  getRiskBadgeColor: (level: string) => string
}

function ForecastTab({ forecastPaths, formatNumber, formatPercent, getRiskBadgeColor }: ForecastTabProps) {
  const chartData = forecastPaths.map(p => ({
    horizon: `${p.horizon}Y`,
    median: p.median,
    lower5: p.lower5,
    upper95: p.upper95,
    lower25: p.lower25,
    upper75: p.upper75
  }))

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Cumulative Regeneration Forecast (Cₕ)</h3>
        <p className="text-sm text-gray-600 mb-4">
          Monte Carlo simulation with 1,000 paths showing median and confidence bands
        </p>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="horizon" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value: number) => formatNumber(value)} labelFormatter={(label) => `Horizon: ${label}`} />
            <Legend />
            <Area type="monotone" dataKey="upper95" stackId="1" stroke="none" fill="#c7d2fe" name="95th Percentile" />
            <Area type="monotone" dataKey="upper75" stackId="2" stroke="none" fill="#a5b4fc" name="75th Percentile" />
            <Area type="monotone" dataKey="lower25" stackId="3" stroke="none" fill="#818cf8" name="25th Percentile" />
            <Area type="monotone" dataKey="lower5" stackId="4" stroke="none" fill="#6366f1" name="5th Percentile" />
            <Line type="monotone" dataKey="median" stroke="#312e81" strokeWidth={3} dot={{ fill: '#312e81', r: 4 }} name="Median" />
            <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="5 5" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Forecast Details</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3">Horizon</th>
                <th className="text-left py-2 px-3">Date</th>
                <th className="text-right py-2 px-3">5th %ile</th>
                <th className="text-right py-2 px-3">25th %ile</th>
                <th className="text-right py-2 px-3 bg-indigo-50">Median</th>
                <th className="text-right py-2 px-3">75th %ile</th>
                <th className="text-right py-2 px-3">95th %ile</th>
                <th className="text-right py-2 px-3">Collapse P</th>
                <th className="text-center py-2 px-3">Risk</th>
              </tr>
            </thead>
            <tbody>
              {forecastPaths.map(p => (
                <tr key={p.horizon} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-3 font-medium">{p.horizon}Y</td>
                  <td className="py-2 px-3 text-gray-600">{p.date}</td>
                  <td className="py-2 px-3 text-right font-mono text-red-600">{formatNumber(p.lower5)}</td>
                  <td className="py-2 px-3 text-right font-mono text-orange-600">{formatNumber(p.lower25)}</td>
                  <td className="py-2 px-3 text-right font-mono font-bold bg-indigo-50">{formatNumber(p.median)}</td>
                  <td className="py-2 px-3 text-right font-mono text-green-600">{formatNumber(p.upper75)}</td>
                  <td className="py-2 px-3 text-right font-mono text-emerald-600">{formatNumber(p.upper95)}</td>
                  <td className="py-2 px-3 text-right font-mono">{formatPercent(p.collapseProb)}</td>
                  <td className="py-2 px-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs ${getRiskBadgeColor(p.riskLevel)}`}>
                      {p.riskLevel}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-indigo-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-3">Interpretation</h3>
        <div className="text-sm text-gray-700 space-y-2">
          <p><strong>Positive Cₕ:</strong> Capital is regenerating faster than friction destroys it. The economy is building productive capacity.</p>
          <p><strong>Negative Cₕ:</strong> Friction exceeds regeneration. Capital stock is eroding. Without intervention, this leads to contraction.</p>
          <p><strong>Collapse Probability:</strong> Likelihood of a regime shift to crisis mode based on accumulated drag and tipping point dynamics.</p>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// TAB: HEATMAP
// ============================================================================

interface HeatmapTabProps {
  heatmapData: RiskHeatmapCell[]
  params: ThirdOrderParams
}

function HeatmapTab({ heatmapData }: HeatmapTabProps) {
  const [selectedHorizon, setSelectedHorizon] = useState(5)
  const horizons = [1, 2, 3, 5, 10]

  const filteredData = heatmapData.filter(d => d.horizonYear === selectedHorizon)
  const thrustLevels = [-2, -1, 0, 1, 2]
  const dragLevels = [-2, -1, 0, 1, 2]

  const getCell = (thrust: number, drag: number) => {
    return filteredData.find(d => d.thrustLevel === thrust && d.dragLevel === drag)
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Risk Heatmap</h3>
        <p className="text-sm text-gray-600 mb-4">
          Shows cumulative regeneration (Cₕ) and collapse probability across different
          thrust and drag scenarios, measured in standard deviations from current levels.
        </p>
        <div className="flex gap-2 mb-6">
          {horizons.map(h => (
            <button
              key={h}
              onClick={() => setSelectedHorizon(h)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedHorizon === h
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {h} Year{h > 1 ? 's' : ''}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <div className="inline-block">
            <div className="flex items-center mb-2">
              <div className="w-24"></div>
              <div className="flex">
                {dragLevels.map(d => (
                  <div key={d} className="w-24 text-center text-sm font-medium">
                    Drag {d > 0 ? '+' : ''}{d}σ
                  </div>
                ))}
              </div>
            </div>

            {[...thrustLevels].reverse().map(t => (
              <div key={t} className="flex items-center mb-1">
                <div className="w-24 text-sm font-medium text-right pr-4">
                  Thrust {t > 0 ? '+' : ''}{t}σ
                </div>
                <div className="flex">
                  {dragLevels.map(d => {
                    const cell = getCell(t, d)
                    if (!cell) return <div key={d} className="w-24 h-16 bg-gray-100 m-0.5" />

                    return (
                      <div
                        key={d}
                        className="w-24 h-16 m-0.5 rounded flex flex-col items-center justify-center text-xs"
                        style={{ backgroundColor: cell.color }}
                        title={`Cₕ: ${cell.cumulativeRegen.toFixed(4)}, P(collapse): ${(cell.collapseProb * 100).toFixed(1)}%`}
                      >
                        <span className="font-mono font-bold text-white drop-shadow">
                          {cell.cumulativeRegen.toFixed(3)}
                        </span>
                        <span className="text-white/80 drop-shadow">
                          {(cell.collapseProb * 100).toFixed(0)}%
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex items-center gap-4 text-sm">
          <span className="text-gray-600">Legend:</span>
          <div className="flex items-center gap-1">
            <div className="w-6 h-4 rounded" style={{ backgroundColor: '#22c55e' }}></div>
            <span>Safe (high Cₕ)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-6 h-4 rounded" style={{ backgroundColor: '#eab308' }}></div>
            <span>Caution</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-6 h-4 rounded" style={{ backgroundColor: '#f97316' }}></div>
            <span>Elevated</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-6 h-4 rounded" style={{ backgroundColor: '#dc2626' }}></div>
            <span>Danger (&gt;50% collapse)</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// TAB: SCENARIOS
// ============================================================================

interface ScenariosTabProps {
  selectedScenarios: string[]
  setSelectedScenarios: (s: string[]) => void
  scenarioResults: ScenarioResult[]
  formatNumber: (n: number, d?: number) => string
  formatPercent: (n: number) => string
}

function ScenariosTab({ selectedScenarios, setSelectedScenarios, scenarioResults, formatNumber, formatPercent }: ScenariosTabProps) {
  const toggleScenario = (name: string) => {
    if (selectedScenarios.includes(name)) {
      setSelectedScenarios(selectedScenarios.filter(s => s !== name))
    } else {
      setSelectedScenarios([...selectedScenarios, name])
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Select Scenarios to Analyze</h3>
        <p className="text-sm text-gray-600 mb-4">
          Choose scenarios to see how they would affect third-order projections compared to baseline.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {PRESET_SCENARIOS.map(scenario => (
            <button
              key={scenario.name}
              onClick={() => toggleScenario(scenario.name)}
              className={`p-3 rounded-lg border text-left transition-all ${
                selectedScenarios.includes(scenario.name)
                  ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-200'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium text-sm">{scenario.name}</div>
              <div className="text-xs text-gray-500 mt-1">{scenario.description}</div>
              <div className="text-xs mt-2 font-mono text-gray-400">
                T:{scenario.thrustShock > 0 ? '+' : ''}{scenario.thrustShock}%
                D:{scenario.dragShock > 0 ? '+' : ''}{scenario.dragShock}%
                E:{scenario.efficiencyShock > 0 ? '+' : ''}{scenario.efficiencyShock}%
              </div>
            </button>
          ))}
        </div>
      </div>

      {scenarioResults.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Scenario Impact Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {scenarioResults.map(result => (
              <div
                key={result.scenario.name}
                className={`p-4 rounded-lg border ${
                  result.impactDelta > 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="font-medium">{result.scenario.name}</div>
                <div className={`text-2xl font-bold mt-2 ${
                  result.impactDelta > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {result.impactDelta > 0 ? '+' : ''}{result.impactDelta.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500 mt-1">Impact on final Cₕ</div>
                <div className={`text-sm mt-2 ${
                  result.riskDelta > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  Risk: {result.riskDelta > 0 ? '+' : ''}{(result.riskDelta * 100).toFixed(1)}pp
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedScenarios.length === 0 && (
        <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
          Select one or more scenarios above to see their impact on third-order projections.
        </div>
      )}
    </div>
  )
}

// ============================================================================
// TAB: API INTEGRATION
// ============================================================================

interface APITabProps {
  rawData: NIVDataPoint[]
  params: ThirdOrderParams
}

function APITab({ rawData, params }: APITabProps) {
  const [copied, setCopied] = useState<string | null>(null)

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const sampleRequest = JSON.stringify({
    data: rawData.slice(-12).map(d => ({
      date: d.date,
      niv: parseFloat(d.niv.toFixed(6)),
      thrust: parseFloat(d.thrust.toFixed(6)),
      efficiency: parseFloat(d.efficiency.toFixed(6)),
      slack: parseFloat(d.slack.toFixed(4)),
      drag: parseFloat(d.drag.toFixed(6))
    })),
    params: {
      alpha: params.alpha,
      beta: params.beta,
      horizonYears: params.horizonYears
    },
    includeForecastPaths: true,
    includeHeatmap: false
  }, null, 2)

  const pythonExample = `import requests

url = "https://regenerationism.ai/api/third-order"

data = {
    "data": [
        {"date": "2024-01-01", "niv": 0.045, "thrust": 0.15, "efficiency": 0.08, "slack": 0.23, "drag": 0.12},
        # ... more data points from your accounting system
    ],
    "params": {"alpha": 1.1, "beta": 0.8, "horizonYears": 5},
    "includeForecastPaths": True
}

response = requests.post(url, json=data)
result = response.json()
print(f"Risk Level: {result['result']['riskLevel']}")`

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">API Integration</h3>
        <p className="text-sm text-gray-600 mb-4">
          Integrate third-order accounting into your existing accounting systems via our REST API.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-indigo-50 rounded-lg">
            <div className="font-medium text-indigo-800">Endpoint</div>
            <code className="text-sm">POST /api/third-order</code>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="font-medium text-green-800">Rate Limit</div>
            <code className="text-sm">50 requests/minute</code>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="font-medium text-purple-800">Max Data Points</div>
            <code className="text-sm">1,000 per request</code>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-semibold">Python Example</h4>
          <button
            onClick={() => copyToClipboard(pythonExample, 'python')}
            className="text-sm text-indigo-600 hover:text-indigo-800"
          >
            {copied === 'python' ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
          {pythonExample}
        </pre>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-semibold">Sample Request (Current Data)</h4>
          <button
            onClick={() => copyToClipboard(sampleRequest, 'sample')}
            className="text-sm text-indigo-600 hover:text-indigo-800"
          >
            {copied === 'sample' ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm max-h-64">
          {sampleRequest}
        </pre>
      </div>

      <div className="bg-indigo-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-3">Integration with Accounting Software</h3>
        <p className="text-sm text-gray-700 mb-4">
          Map your accounting data to NIV components:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="bg-white p-4 rounded">
            <div className="font-medium text-indigo-600 mb-2">From your GL/ERP:</div>
            <ul className="space-y-1 text-gray-600">
              <li>• Revenue Growth → Thrust</li>
              <li>• ROA / Asset Turnover → Efficiency</li>
              <li>• Working Capital Ratio → Slack</li>
              <li>• Debt/Equity, Interest Coverage → Drag</li>
            </ul>
          </div>
          <div className="bg-white p-4 rounded">
            <div className="font-medium text-indigo-600 mb-2">Compatible Systems:</div>
            <ul className="space-y-1 text-gray-600">
              <li>• QuickBooks, Xero, Sage</li>
              <li>• SAP, Oracle NetSuite</li>
              <li>• Any system with CSV/API export</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface MetricCardProps {
  title: string
  value: string
  subtitle: string
  trend?: 'accelerating' | 'decelerating' | 'stable'
  positive?: boolean
  badge?: string
  badgeColor?: string
}

function MetricCard({ title, value, subtitle, trend, positive, badge, badgeColor }: MetricCardProps) {
  const getTrendIcon = () => {
    if (trend === 'accelerating') return '↑'
    if (trend === 'decelerating') return '↓'
    return '→'
  }

  const getTrendColor = () => {
    if (trend === 'accelerating') return 'text-green-600'
    if (trend === 'decelerating') return 'text-red-600'
    return 'text-gray-600'
  }

  return (
    <div className="bg-white rounded-lg shadow p-5">
      <div className="text-sm text-gray-500 mb-1">{title}</div>
      <div className="flex items-baseline gap-2">
        <span className={`text-2xl font-bold ${positive === false ? 'text-red-600' : positive === true ? 'text-green-600' : ''}`}>
          {value}
        </span>
        {trend && (
          <span className={`text-lg ${getTrendColor()}`}>{getTrendIcon()}</span>
        )}
      </div>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-xs text-gray-500">{subtitle}</span>
        {badge && badgeColor && (
          <span className={`text-xs px-2 py-0.5 rounded ${badgeColor}`}>{badge}</span>
        )}
      </div>
    </div>
  )
}

interface ParamSliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}

function ParamSlider({ label, value, min, max, step, onChange }: ParamSliderProps) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-mono">{value.toFixed(step < 1 ? 2 : 0)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
      />
    </div>
  )
}
