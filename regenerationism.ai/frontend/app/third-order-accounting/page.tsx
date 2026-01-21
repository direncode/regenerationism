'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
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
  ReferenceLine,
  PieChart,
  Pie,
  Cell
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
  NIVDataPoint
} from '@/lib/thirdOrderAccounting'

// ============================================================================
// ACCOUNTING SOFTWARE DEFINITIONS
// ============================================================================

interface AccountingSoftware {
  id: string
  name: string
  logo: string
  color: string
  description: string
  dataTypes: string[]
  sampleCompanies: number
}

const ACCOUNTING_SOFTWARE: AccountingSoftware[] = [
  {
    id: 'quickbooks',
    name: 'QuickBooks',
    logo: '📗',
    color: '#2CA01C',
    description: 'Small business accounting by Intuit',
    dataTypes: ['P&L', 'Balance Sheet', 'Cash Flow', 'AR/AP'],
    sampleCompanies: 847
  },
  {
    id: 'xero',
    name: 'Xero',
    logo: '📘',
    color: '#13B5EA',
    description: 'Cloud accounting for growing businesses',
    dataTypes: ['Invoicing', 'Bank Reconciliation', 'Payroll', 'Inventory'],
    sampleCompanies: 623
  },
  {
    id: 'sap',
    name: 'SAP S/4HANA',
    logo: '📙',
    color: '#0070F2',
    description: 'Enterprise resource planning',
    dataTypes: ['General Ledger', 'Cost Centers', 'Profit Centers', 'COPA'],
    sampleCompanies: 156
  },
  {
    id: 'netsuite',
    name: 'Oracle NetSuite',
    logo: '📕',
    color: '#C74634',
    description: 'Cloud ERP for mid-market',
    dataTypes: ['Multi-subsidiary', 'Revenue Recognition', 'Fixed Assets', 'Projects'],
    sampleCompanies: 234
  },
  {
    id: 'sage',
    name: 'Sage Intacct',
    logo: '📓',
    color: '#00D632',
    description: 'Financial management and accounting',
    dataTypes: ['Dimensions', 'Statistical Accounts', 'Allocations', 'Consolidation'],
    sampleCompanies: 189
  }
]

// ============================================================================
// DATA SOURCE DEFINITIONS
// ============================================================================

interface DataSource {
  id: string
  name: string
  type: 'government' | 'financial' | 'market' | 'industry'
  icon: string
  series: string[]
  updateFrequency: string
}

const DATA_SOURCES: DataSource[] = [
  {
    id: 'fred',
    name: 'Federal Reserve (FRED)',
    type: 'government',
    icon: '🏛️',
    series: ['GDP', 'Employment', 'Interest Rates', 'M2 Supply', 'Capacity Utilization'],
    updateFrequency: 'Daily/Monthly'
  },
  {
    id: 'bea',
    name: 'Bureau of Economic Analysis',
    type: 'government',
    icon: '📊',
    series: ['National Income', 'Personal Income', 'Corporate Profits', 'Trade Balance'],
    updateFrequency: 'Quarterly'
  },
  {
    id: 'sec',
    name: 'SEC EDGAR',
    type: 'financial',
    icon: '📋',
    series: ['10-K Filings', '10-Q Filings', '8-K Events', 'Insider Trading'],
    updateFrequency: 'Real-time'
  },
  {
    id: 'bloomberg',
    name: 'Bloomberg Terminal',
    type: 'market',
    icon: '💹',
    series: ['Equity Prices', 'Fixed Income', 'Derivatives', 'FX Rates'],
    updateFrequency: 'Real-time'
  },
  {
    id: 'spglobal',
    name: 'S&P Capital IQ',
    type: 'financial',
    icon: '📈',
    series: ['Company Financials', 'Credit Ratings', 'M&A Data', 'Industry Metrics'],
    updateFrequency: 'Daily'
  }
]

// ============================================================================
// SIMULATED COMPANY DATA
// ============================================================================

interface CompanyData {
  id: string
  name: string
  ticker: string
  sector: string
  source: string
  revenue: number
  netIncome: number
  assets: number
  liabilities: number
  cashFlow: number
  employees: number
  nivMetrics: {
    thrust: number
    efficiency: number
    slack: number
    drag: number
    niv: number
  }
}

function generateCompanyData(count: number, source: string): CompanyData[] {
  const sectors = ['Technology', 'Healthcare', 'Finance', 'Manufacturing', 'Retail', 'Energy', 'Services']
  const prefixes = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Omega', 'Sigma', 'Zeta', 'Nova', 'Apex', 'Prime']
  const suffixes = ['Corp', 'Inc', 'Ltd', 'Holdings', 'Group', 'Industries', 'Systems', 'Solutions']

  const companies: CompanyData[] = []

  for (let i = 0; i < count; i++) {
    const sector = sectors[Math.floor(Math.random() * sectors.length)]
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)]

    const revenue = Math.floor(Math.random() * 50000 + 1000) * 1000000
    const margin = 0.05 + Math.random() * 0.2
    const netIncome = revenue * margin
    const assets = revenue * (1.5 + Math.random())
    const liabilities = assets * (0.3 + Math.random() * 0.4)

    const thrust = (netIncome / revenue) * 0.5 + Math.random() * 0.3
    const efficiency = (revenue / assets) * 0.3
    const slack = Math.max(0.05, 0.3 - (liabilities / assets) * 0.5)
    const drag = (liabilities / assets) * 0.2 + Math.random() * 0.1

    const eta = 1.5
    const denominator = Math.pow(slack + drag, eta)
    const niv = denominator > 0 ? (thrust * efficiency * efficiency) / denominator : 0

    companies.push({
      id: `${source}-${i}`,
      name: `${prefix} ${suffix}`,
      ticker: `${prefix.slice(0, 3).toUpperCase()}${Math.floor(Math.random() * 10)}`,
      sector,
      source,
      revenue,
      netIncome,
      assets,
      liabilities,
      cashFlow: netIncome * (0.8 + Math.random() * 0.4),
      employees: Math.floor(revenue / 200000),
      nivMetrics: { thrust, efficiency, slack, drag, niv }
    })
  }

  return companies
}

// ============================================================================
// SIMULATION STATE
// ============================================================================

interface SimulationState {
  running: boolean
  tick: number
  companiesProcessed: number
  totalCompanies: number
  aggregateNIV: number
  aggregateThrust: number
  aggregateDrag: number
  history: { tick: number; niv: number; thrust: number; drag: number; companies: number }[]
  sectorBreakdown: { sector: string; niv: number; count: number }[]
  riskLevel: string
  collapseProb: number
  cumulativeRegen: number
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ThirdOrderAccountingPage() {
  // State
  const [activeSource, setActiveSource] = useState<string | null>(null)
  const [connectedSources, setConnectedSources] = useState<string[]>([])
  const [companies, setCompanies] = useState<CompanyData[]>([])
  const [simulation, setSimulation] = useState<SimulationState>({
    running: false,
    tick: 0,
    companiesProcessed: 0,
    totalCompanies: 0,
    aggregateNIV: 0,
    aggregateThrust: 0,
    aggregateDrag: 0,
    history: [],
    sectorBreakdown: [],
    riskLevel: 'low',
    collapseProb: 0,
    cumulativeRegen: 0
  })
  const [selectedTab, setSelectedTab] = useState<'connect' | 'simulate' | 'forecast' | 'heatmap' | 'scenarios' | 'export'>('connect')

  // Third-order analysis state
  const [params, setParams] = useState<ThirdOrderParams>(DEFAULT_THIRD_ORDER_PARAMS)
  const [thirdOrderResult, setThirdOrderResult] = useState<ThirdOrderResult | null>(null)
  const [forecastPaths, setForecastPaths] = useState<ForecastPath[]>([])
  const [heatmapData, setHeatmapData] = useState<RiskHeatmapCell[]>([])
  const [scenarioResults, setScenarioResults] = useState<ScenarioResult[]>([])
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>([])

  const simulationRef = useRef<NodeJS.Timeout | null>(null)

  // ============================================================================
  // CONNECTION HANDLERS
  // ============================================================================

  const connectSource = (sourceId: string) => {
    if (connectedSources.includes(sourceId)) return

    setActiveSource(sourceId)

    setTimeout(() => {
      setConnectedSources(prev => [...prev, sourceId])

      const software = ACCOUNTING_SOFTWARE.find(s => s.id === sourceId)
      if (software) {
        const newCompanies = generateCompanyData(software.sampleCompanies, sourceId)
        setCompanies(prev => [...prev, ...newCompanies])
      }

      setActiveSource(null)
    }, 1500)
  }

  const disconnectSource = (sourceId: string) => {
    setConnectedSources(prev => prev.filter(s => s !== sourceId))
    setCompanies(prev => prev.filter(c => c.source !== sourceId))
  }

  // ============================================================================
  // SIMULATION & THIRD-ORDER ANALYSIS
  // ============================================================================

  const startSimulation = useCallback(() => {
    if (companies.length === 0) return

    setSimulation(prev => ({
      ...prev,
      running: true,
      tick: 0,
      companiesProcessed: 0,
      totalCompanies: companies.length,
      history: [],
      sectorBreakdown: []
    }))

    let tick = 0
    const batchSize = Math.ceil(companies.length / 20)

    simulationRef.current = setInterval(() => {
      tick++
      const processed = Math.min(tick * batchSize, companies.length)
      const processedCompanies = companies.slice(0, processed)

      const aggregateNIV = processedCompanies.reduce((sum, c) => sum + c.nivMetrics.niv, 0) / processed
      const aggregateThrust = processedCompanies.reduce((sum, c) => sum + c.nivMetrics.thrust, 0) / processed
      const aggregateDrag = processedCompanies.reduce((sum, c) => sum + c.nivMetrics.drag, 0) / processed

      const sectorMap = new Map<string, { total: number; count: number }>()
      processedCompanies.forEach(c => {
        const existing = sectorMap.get(c.sector) || { total: 0, count: 0 }
        sectorMap.set(c.sector, {
          total: existing.total + c.nivMetrics.niv,
          count: existing.count + 1
        })
      })
      const sectorBreakdown = Array.from(sectorMap.entries()).map(([sector, data]) => ({
        sector,
        niv: data.total / data.count,
        count: data.count
      }))

      const gamma = 3.5
      const theta = 0.15
      const collapseProb = 1 / (1 + Math.exp(-(gamma * aggregateDrag - theta)))
      const alpha = 1.1
      const beta = 0.8
      const effectiveRate = alpha * aggregateNIV - beta * aggregateDrag
      const horizonYears = 5
      const cumulativeRegen = aggregateNIV * Math.exp(effectiveRate * horizonYears) * (1 - collapseProb)

      let riskLevel = 'low'
      if (collapseProb >= 0.75) riskLevel = 'critical'
      else if (collapseProb >= 0.5) riskLevel = 'high'
      else if (collapseProb >= 0.25) riskLevel = 'elevated'
      else if (collapseProb >= 0.1) riskLevel = 'moderate'

      setSimulation(prev => ({
        ...prev,
        tick,
        companiesProcessed: processed,
        aggregateNIV,
        aggregateThrust,
        aggregateDrag,
        collapseProb,
        cumulativeRegen,
        riskLevel,
        sectorBreakdown,
        history: [
          ...prev.history,
          { tick, niv: aggregateNIV, thrust: aggregateThrust, drag: aggregateDrag, companies: processed }
        ]
      }))

      if (processed >= companies.length) {
        if (simulationRef.current) clearInterval(simulationRef.current)
        setSimulation(prev => ({ ...prev, running: false }))

        // Generate NIV data points for third-order analysis
        const nivData: NIVDataPoint[] = processedCompanies.slice(-120).map((c, i) => {
          const date = new Date()
          date.setMonth(date.getMonth() - (120 - i))
          return {
            date: date.toISOString().slice(0, 10),
            niv: c.nivMetrics.niv + (Math.random() - 0.5) * 0.01,
            thrust: c.nivMetrics.thrust,
            efficiency: c.nivMetrics.efficiency,
            slack: c.nivMetrics.slack,
            drag: c.nivMetrics.drag
          }
        })

        if (nivData.length >= params.lookbackMonths) {
          const result = computeThirdOrder(nivData, params)
          setThirdOrderResult(result)

          const paths = generateForecastPaths(nivData, params)
          setForecastPaths(paths)

          const heatmap = generateRiskHeatmap(nivData, params)
          setHeatmapData(heatmap)
        }
      }
    }, 200)
  }, [companies, params])

  const stopSimulation = () => {
    if (simulationRef.current) {
      clearInterval(simulationRef.current)
      simulationRef.current = null
    }
    setSimulation(prev => ({ ...prev, running: false }))
  }

  const resetSimulation = () => {
    stopSimulation()
    setSimulation({
      running: false,
      tick: 0,
      companiesProcessed: 0,
      totalCompanies: companies.length,
      aggregateNIV: 0,
      aggregateThrust: 0,
      aggregateDrag: 0,
      history: [],
      sectorBreakdown: [],
      riskLevel: 'low',
      collapseProb: 0,
      cumulativeRegen: 0
    })
    setThirdOrderResult(null)
    setForecastPaths([])
    setHeatmapData([])
  }

  useEffect(() => {
    return () => {
      if (simulationRef.current) clearInterval(simulationRef.current)
    }
  }, [])

  // ============================================================================
  // SCENARIO ANALYSIS
  // ============================================================================

  const runScenarios = useCallback(() => {
    if (!thirdOrderResult || forecastPaths.length === 0) return

    const nivData: NIVDataPoint[] = companies.slice(-120).map((c, i) => {
      const date = new Date()
      date.setMonth(date.getMonth() - (120 - i))
      return {
        date: date.toISOString().slice(0, 10),
        niv: c.nivMetrics.niv,
        thrust: c.nivMetrics.thrust,
        efficiency: c.nivMetrics.efficiency,
        slack: c.nivMetrics.slack,
        drag: c.nivMetrics.drag
      }
    })

    if (nivData.length >= params.lookbackMonths) {
      const selected = PRESET_SCENARIOS.filter(s => selectedScenarios.includes(s.name))
      const results = selected.map(s => runScenarioAnalysis(nivData, s, params))
      setScenarioResults(results)
    }
  }, [companies, params, selectedScenarios, thirdOrderResult, forecastPaths])

  useEffect(() => {
    if (selectedScenarios.length > 0 && thirdOrderResult) {
      runScenarios()
    }
  }, [selectedScenarios, runScenarios, thirdOrderResult])

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const formatCurrency = (n: number) => {
    if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
    if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
    return `$${n.toLocaleString()}`
  }

  const formatNumber = (n: number, decimals: number = 4) => {
    if (isNaN(n) || !isFinite(n)) return 'N/A'
    return n.toFixed(decimals)
  }

  const formatPercent = (n: number) => {
    if (isNaN(n) || !isFinite(n)) return 'N/A'
    return `${(n * 100).toFixed(1)}%`
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

  const SECTOR_COLORS = ['#818cf8', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#22d3ee', '#f472b6']

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-950 via-indigo-950 to-purple-950 border-b border-neutral-800 py-8 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-white">Third-Order Accounting</h1>
            <span className="px-3 py-1 bg-amber-500/20 text-amber-400 text-sm font-bold rounded-full border border-amber-500/30">BETA</span>
          </div>
          <p className="text-purple-300/80 mb-4">
            Real-time integration with enterprise accounting software for forward-looking capital regeneration analysis
          </p>
          <div className="flex gap-4 text-sm">
            <span className="bg-neutral-800/50 border border-neutral-700 px-3 py-1 rounded text-neutral-300">
              Connected Sources: {connectedSources.length}
            </span>
            <span className="bg-neutral-800/50 border border-neutral-700 px-3 py-1 rounded text-neutral-300">
              Companies: {companies.length.toLocaleString()}
            </span>
            {simulation.running && (
              <span className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-3 py-1 rounded animate-pulse">
                Simulation Running...
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-neutral-900/50 border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex gap-1 overflow-x-auto">
            {[
              { id: 'connect', label: 'Connect Sources', icon: '🔌' },
              { id: 'simulate', label: 'Run Simulation', icon: '▶️' },
              { id: 'forecast', label: 'Forecast Paths', icon: '📈' },
              { id: 'heatmap', label: 'Risk Heatmap', icon: '🌡️' },
              { id: 'scenarios', label: 'Scenarios', icon: '🎯' },
              { id: 'export', label: 'Export & API', icon: '📤' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as typeof selectedTab)}
                className={`px-5 py-4 font-medium transition-colors whitespace-nowrap ${
                  selectedTab === tab.id
                    ? 'border-b-2 border-purple-500 text-purple-400'
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
      <div className="max-w-7xl mx-auto px-8 py-6">
        {/* Tab: Connect Sources */}
        {selectedTab === 'connect' && (
          <div className="space-y-6">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 text-white">Accounting Software Integrations</h3>
              <p className="text-sm text-neutral-400 mb-6">
                Connect to your accounting software to import real company financial data for third-order analysis.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ACCOUNTING_SOFTWARE.map(software => {
                  const isConnected = connectedSources.includes(software.id)
                  const isConnecting = activeSource === software.id

                  return (
                    <div
                      key={software.id}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        isConnected
                          ? 'border-emerald-500/50 bg-emerald-500/10'
                          : 'border-neutral-700 bg-neutral-800/50 hover:border-neutral-600'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{software.logo}</span>
                          <div>
                            <h4 className="font-semibold text-white">{software.name}</h4>
                            <p className="text-xs text-neutral-500">{software.description}</p>
                          </div>
                        </div>
                        {isConnected && (
                          <span className="text-emerald-400 text-xl">✓</span>
                        )}
                      </div>

                      <div className="text-xs text-neutral-500 mb-3">
                        Data: {software.dataTypes.join(' • ')}
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-neutral-400">
                          {software.sampleCompanies.toLocaleString()} companies
                        </span>
                        {isConnected ? (
                          <button
                            onClick={() => disconnectSource(software.id)}
                            className="px-3 py-1 text-sm text-red-400 hover:bg-red-500/10 rounded border border-red-500/30"
                          >
                            Disconnect
                          </button>
                        ) : (
                          <button
                            onClick={() => connectSource(software.id)}
                            disabled={isConnecting}
                            className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                          >
                            {isConnecting ? 'Connecting...' : 'Connect'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 text-white">Economic Data Sources</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {DATA_SOURCES.map(source => (
                  <div key={source.id} className="p-4 rounded-xl border border-neutral-700 bg-neutral-800/30">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{source.icon}</span>
                      <div>
                        <h4 className="font-medium text-white">{source.name}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          source.type === 'government' ? 'bg-blue-500/20 text-blue-400' :
                          source.type === 'financial' ? 'bg-green-500/20 text-green-400' :
                          source.type === 'market' ? 'bg-purple-500/20 text-purple-400' :
                          'bg-orange-500/20 text-orange-400'
                        }`}>
                          {source.type}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-neutral-500">{source.series.join(' • ')}</div>
                  </div>
                ))}
              </div>
            </div>

            {companies.length > 0 && (
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4 text-purple-300">Data Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-purple-400">{companies.length.toLocaleString()}</div>
                    <div className="text-sm text-neutral-400">Total Companies</div>
                  </div>
                  <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-purple-400">
                      {formatCurrency(companies.reduce((s, c) => s + c.revenue, 0))}
                    </div>
                    <div className="text-sm text-neutral-400">Total Revenue</div>
                  </div>
                  <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-purple-400">
                      {new Set(companies.map(c => c.sector)).size}
                    </div>
                    <div className="text-sm text-neutral-400">Sectors</div>
                  </div>
                  <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-purple-400">
                      {companies.reduce((s, c) => s + c.employees, 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-neutral-400">Total Employees</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Simulate */}
        {selectedTab === 'simulate' && (
          <div className="space-y-6">
            {companies.length === 0 ? (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-8 text-center">
                <span className="text-4xl mb-4 block">⚠️</span>
                <h3 className="text-lg font-semibold text-amber-400 mb-2">No Data Connected</h3>
                <p className="text-amber-300/70 mb-4">
                  Connect at least one accounting software source to run the simulation.
                </p>
                <button
                  onClick={() => setSelectedTab('connect')}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                >
                  Go to Connect Sources
                </button>
              </div>
            ) : (
              <>
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
                  <h3 className="text-lg font-semibold mb-4 text-white">Simulation Controls</h3>
                  <div className="flex items-center gap-4 mb-6">
                    {!simulation.running ? (
                      <button
                        onClick={startSimulation}
                        className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium flex items-center gap-2"
                      >
                        <span>▶️</span> Start Simulation
                      </button>
                    ) : (
                      <button
                        onClick={stopSimulation}
                        className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium flex items-center gap-2"
                      >
                        <span>⏹️</span> Stop
                      </button>
                    )}
                    <button
                      onClick={resetSimulation}
                      className="px-6 py-3 bg-neutral-700 text-neutral-200 rounded-lg hover:bg-neutral-600 font-medium"
                    >
                      Reset
                    </button>
                    <div className="flex-1" />
                    <div className="text-right">
                      <div className="text-2xl font-bold text-white">
                        {simulation.companiesProcessed.toLocaleString()} / {companies.length.toLocaleString()}
                      </div>
                      <div className="text-sm text-neutral-500">Companies Processed</div>
                    </div>
                  </div>

                  <div className="h-4 bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 transition-all duration-200"
                      style={{ width: `${(simulation.companiesProcessed / companies.length) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                    <div className="text-sm text-neutral-500 mb-1">Aggregate NIV</div>
                    <div className="text-2xl font-bold text-indigo-400">
                      {simulation.aggregateNIV.toFixed(4)}
                    </div>
                    <div className="text-xs text-neutral-600 mt-1">Capital regeneration velocity</div>
                  </div>
                  <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                    <div className="text-sm text-neutral-500 mb-1">Cumulative Cₕ (5Y)</div>
                    <div className={`text-2xl font-bold ${simulation.cumulativeRegen >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {simulation.cumulativeRegen.toFixed(4)}
                    </div>
                    <div className="text-xs text-neutral-600 mt-1">Third-order projection</div>
                  </div>
                  <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                    <div className="text-sm text-neutral-500 mb-1">Collapse Probability</div>
                    <div className="text-2xl font-bold text-orange-400">
                      {formatPercent(simulation.collapseProb)}
                    </div>
                    <div className="text-xs text-neutral-600 mt-1">Risk-adjusted</div>
                  </div>
                  <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                    <div className="text-sm text-neutral-500 mb-1">Risk Level</div>
                    <div className={`text-xl font-bold px-3 py-1 rounded inline-block ${getRiskColor(simulation.riskLevel)}`}>
                      {simulation.riskLevel.toUpperCase()}
                    </div>
                  </div>
                </div>

                {simulation.history.length > 0 && (
                  <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
                    <h3 className="text-lg font-semibold mb-4 text-white">Real-Time NIV Evolution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={simulation.history}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="companies" tickFormatter={(v) => `${v}`} stroke="#9ca3af" />
                        <YAxis yAxisId="left" stroke="#9ca3af" />
                        <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                          labelStyle={{ color: '#9ca3af' }}
                          formatter={(value: number, name: string) => [value.toFixed(4), name]}
                          labelFormatter={(v) => `${v} companies`}
                        />
                        <Legend />
                        <Line yAxisId="left" type="monotone" dataKey="niv" stroke="#818cf8" strokeWidth={2} dot={false} name="NIV" />
                        <Area yAxisId="right" type="monotone" dataKey="thrust" fill="#34d399" stroke="#34d399" fillOpacity={0.2} name="Thrust" />
                        <Area yAxisId="right" type="monotone" dataKey="drag" fill="#f87171" stroke="#f87171" fillOpacity={0.2} name="Drag" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {simulation.sectorBreakdown.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
                      <h3 className="text-lg font-semibold mb-4 text-white">NIV by Sector</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={simulation.sectorBreakdown} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis type="number" stroke="#9ca3af" />
                          <YAxis dataKey="sector" type="category" width={100} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                          <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} formatter={(v: number) => v.toFixed(4)} />
                          <Bar dataKey="niv" fill="#818cf8" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
                      <h3 className="text-lg font-semibold mb-4 text-white">Company Distribution</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={simulation.sectorBreakdown}
                            dataKey="count"
                            nameKey="sector"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ sector, count }) => `${sector}: ${count}`}
                            labelLine={{ stroke: '#6b7280' }}
                          >
                            {simulation.sectorBreakdown.map((_, i) => (
                              <Cell key={i} fill={SECTOR_COLORS[i % SECTOR_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Tab: Forecast */}
        {selectedTab === 'forecast' && (
          <div className="space-y-6">
            {forecastPaths.length === 0 ? (
              <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-8 text-center">
                <span className="text-4xl mb-4 block">📈</span>
                <h3 className="text-lg font-semibold text-neutral-300 mb-2">No Forecast Data</h3>
                <p className="text-neutral-500 mb-4">Run the simulation first to generate forecast paths.</p>
                <button onClick={() => setSelectedTab('simulate')} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                  Go to Simulation
                </button>
              </div>
            ) : (
              <>
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
                  <h3 className="text-lg font-semibold mb-4 text-white">Cumulative Regeneration Forecast (Cₕ)</h3>
                  <p className="text-sm text-neutral-400 mb-4">Monte Carlo simulation with 1,000 paths showing median and confidence bands</p>
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={forecastPaths.map(p => ({ horizon: `${p.horizon}Y`, median: p.median, lower5: p.lower5, upper95: p.upper95 }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="horizon" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" />
                      <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
                      <Legend />
                      <Area type="monotone" dataKey="upper95" stroke="none" fill="#818cf8" fillOpacity={0.3} name="95th %ile" />
                      <Area type="monotone" dataKey="lower5" stroke="none" fill="#818cf8" fillOpacity={0.3} name="5th %ile" />
                      <Line type="monotone" dataKey="median" stroke="#a78bfa" strokeWidth={3} dot={{ fill: '#a78bfa', r: 4 }} name="Median" />
                      <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="5 5" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
                  <h3 className="text-lg font-semibold mb-4 text-white">Forecast Details</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-neutral-700">
                          <th className="text-left py-3 px-3 text-neutral-400">Horizon</th>
                          <th className="text-right py-3 px-3 text-neutral-400">5th %ile</th>
                          <th className="text-right py-3 px-3 text-purple-400 bg-purple-500/10">Median</th>
                          <th className="text-right py-3 px-3 text-neutral-400">95th %ile</th>
                          <th className="text-right py-3 px-3 text-neutral-400">Collapse P</th>
                          <th className="text-center py-3 px-3 text-neutral-400">Risk</th>
                        </tr>
                      </thead>
                      <tbody>
                        {forecastPaths.map(p => (
                          <tr key={p.horizon} className="border-b border-neutral-800 hover:bg-neutral-800/50">
                            <td className="py-3 px-3 font-medium text-white">{p.horizon}Y</td>
                            <td className="py-3 px-3 text-right font-mono text-red-400">{formatNumber(p.lower5)}</td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-purple-400 bg-purple-500/10">{formatNumber(p.median)}</td>
                            <td className="py-3 px-3 text-right font-mono text-emerald-400">{formatNumber(p.upper95)}</td>
                            <td className="py-3 px-3 text-right font-mono text-neutral-300">{formatPercent(p.collapseProb)}</td>
                            <td className="py-3 px-3 text-center">
                              <span className={`px-2 py-1 rounded text-xs ${getRiskColor(p.riskLevel)}`}>{p.riskLevel}</span>
                            </td>
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

        {/* Tab: Heatmap */}
        {selectedTab === 'heatmap' && (
          <div className="space-y-6">
            {heatmapData.length === 0 ? (
              <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-8 text-center">
                <span className="text-4xl mb-4 block">🌡️</span>
                <h3 className="text-lg font-semibold text-neutral-300 mb-2">No Heatmap Data</h3>
                <p className="text-neutral-500 mb-4">Run the simulation first to generate risk heatmap.</p>
                <button onClick={() => setSelectedTab('simulate')} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                  Go to Simulation
                </button>
              </div>
            ) : (
              <HeatmapDisplay heatmapData={heatmapData} />
            )}
          </div>
        )}

        {/* Tab: Scenarios */}
        {selectedTab === 'scenarios' && (
          <div className="space-y-6">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 text-white">Select Scenarios to Analyze</h3>
              <p className="text-sm text-neutral-400 mb-4">
                {thirdOrderResult ? 'Choose scenarios to see their impact on third-order projections.' : 'Run the simulation first to enable scenario analysis.'}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {PRESET_SCENARIOS.map(scenario => (
                  <button
                    key={scenario.name}
                    onClick={() => {
                      if (!thirdOrderResult) return
                      if (selectedScenarios.includes(scenario.name)) {
                        setSelectedScenarios(selectedScenarios.filter(s => s !== scenario.name))
                      } else {
                        setSelectedScenarios([...selectedScenarios, scenario.name])
                      }
                    }}
                    disabled={!thirdOrderResult}
                    className={`p-3 rounded-xl border text-left transition-all disabled:opacity-50 ${
                      selectedScenarios.includes(scenario.name)
                        ? 'border-purple-500 bg-purple-500/20'
                        : 'border-neutral-700 bg-neutral-800/50 hover:border-neutral-600'
                    }`}
                  >
                    <div className="font-medium text-sm text-white">{scenario.name}</div>
                    <div className="text-xs text-neutral-500 mt-1">{scenario.description}</div>
                    <div className="text-xs mt-2 font-mono text-neutral-600">
                      T:{scenario.thrustShock > 0 ? '+' : ''}{scenario.thrustShock}%
                      D:{scenario.dragShock > 0 ? '+' : ''}{scenario.dragShock}%
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {scenarioResults.length > 0 && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4 text-white">Scenario Impact Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {scenarioResults.map(result => (
                    <div
                      key={result.scenario.name}
                      className={`p-4 rounded-xl border ${
                        result.impactDelta > 0 ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-red-500/30 bg-red-500/10'
                      }`}
                    >
                      <div className="font-medium text-white">{result.scenario.name}</div>
                      <div className={`text-2xl font-bold mt-2 ${result.impactDelta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {result.impactDelta > 0 ? '+' : ''}{result.impactDelta.toFixed(1)}%
                      </div>
                      <div className="text-xs text-neutral-500 mt-1">Impact on final Cₕ</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Export */}
        {selectedTab === 'export' && (
          <div className="space-y-6">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 text-white">Export Data</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => {
                    const csv = [
                      ['Company', 'Ticker', 'Sector', 'Revenue', 'NIV', 'Thrust', 'Efficiency', 'Slack', 'Drag'].join(','),
                      ...companies.map(c => [c.name, c.ticker, c.sector, c.revenue, c.nivMetrics.niv, c.nivMetrics.thrust, c.nivMetrics.efficiency, c.nivMetrics.slack, c.nivMetrics.drag].join(','))
                    ].join('\n')
                    const blob = new Blob([csv], { type: 'text/csv' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `third-order-companies-${new Date().toISOString().slice(0, 10)}.csv`
                    a.click()
                  }}
                  disabled={companies.length === 0}
                  className="p-4 border-2 border-dashed border-neutral-700 rounded-xl hover:border-purple-500 hover:bg-purple-500/10 transition disabled:opacity-50"
                >
                  <div className="text-2xl mb-2">📄</div>
                  <div className="font-medium text-white">Export CSV</div>
                  <div className="text-sm text-neutral-500">Company-level data</div>
                </button>
                <button
                  onClick={() => {
                    const data = {
                      exportedAt: new Date().toISOString(),
                      summary: {
                        totalCompanies: companies.length,
                        aggregateNIV: simulation.aggregateNIV,
                        cumulativeRegen: simulation.cumulativeRegen,
                        collapseProb: simulation.collapseProb,
                        riskLevel: simulation.riskLevel
                      },
                      sectorBreakdown: simulation.sectorBreakdown,
                      forecastPaths
                    }
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `third-order-analysis-${new Date().toISOString().slice(0, 10)}.json`
                    a.click()
                  }}
                  disabled={simulation.companiesProcessed === 0}
                  className="p-4 border-2 border-dashed border-neutral-700 rounded-xl hover:border-purple-500 hover:bg-purple-500/10 transition disabled:opacity-50"
                >
                  <div className="text-2xl mb-2">📊</div>
                  <div className="font-medium text-white">Export JSON</div>
                  <div className="text-sm text-neutral-500">Full analysis results</div>
                </button>
                <button
                  onClick={() => {
                    const report = `THIRD-ORDER ACCOUNTING ANALYSIS REPORT\nGenerated: ${new Date().toISOString()}\n\nSUMMARY\n=======\nTotal Companies: ${companies.length}\nAggregate NIV: ${simulation.aggregateNIV.toFixed(4)}\n5Y Cumulative Regeneration: ${simulation.cumulativeRegen.toFixed(4)}\nCollapse Probability: ${(simulation.collapseProb * 100).toFixed(1)}%\nRisk Level: ${simulation.riskLevel.toUpperCase()}`
                    const blob = new Blob([report], { type: 'text/plain' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `third-order-report-${new Date().toISOString().slice(0, 10)}.txt`
                    a.click()
                  }}
                  disabled={simulation.companiesProcessed === 0}
                  className="p-4 border-2 border-dashed border-neutral-700 rounded-xl hover:border-purple-500 hover:bg-purple-500/10 transition disabled:opacity-50"
                >
                  <div className="text-2xl mb-2">📝</div>
                  <div className="font-medium text-white">Export Report</div>
                  <div className="text-sm text-neutral-500">Executive summary</div>
                </button>
              </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 text-white">API Integration</h3>
              <pre className="bg-neutral-950 border border-neutral-800 text-neutral-300 p-4 rounded-lg overflow-x-auto text-sm">
{`// POST /api/third-order
const response = await fetch('https://regenerationism.ai/api/third-order', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    data: companyNIVData,
    params: { alpha: 1.1, beta: 0.8, horizonYears: 5 },
    includeForecastPaths: true
  })
});`}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// HEATMAP COMPONENT
// ============================================================================

function HeatmapDisplay({ heatmapData }: { heatmapData: RiskHeatmapCell[] }) {
  const [selectedHorizon, setSelectedHorizon] = useState(5)
  const horizons = [1, 2, 3, 5, 10]

  const filteredData = heatmapData.filter(d => d.horizonYear === selectedHorizon)
  const thrustLevels = [-2, -1, 0, 1, 2]
  const dragLevels = [-2, -1, 0, 1, 2]

  const getCell = (thrust: number, drag: number) => filteredData.find(d => d.thrustLevel === thrust && d.dragLevel === drag)

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-4 text-white">Risk Heatmap</h3>
      <div className="flex gap-2 mb-6">
        {horizons.map(h => (
          <button
            key={h}
            onClick={() => setSelectedHorizon(h)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedHorizon === h ? 'bg-purple-600 text-white' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
            }`}
          >
            {h}Y
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block">
          <div className="flex items-center mb-2">
            <div className="w-24"></div>
            {dragLevels.map(d => (
              <div key={d} className="w-20 text-center text-xs font-medium text-neutral-500">
                Drag {d > 0 ? '+' : ''}{d}σ
              </div>
            ))}
          </div>
          {[...thrustLevels].reverse().map(t => (
            <div key={t} className="flex items-center mb-1">
              <div className="w-24 text-xs font-medium text-neutral-500 text-right pr-3">
                Thrust {t > 0 ? '+' : ''}{t}σ
              </div>
              {dragLevels.map(d => {
                const cell = getCell(t, d)
                if (!cell) return <div key={d} className="w-20 h-14 bg-neutral-800 m-0.5 rounded" />
                return (
                  <div
                    key={d}
                    className="w-20 h-14 m-0.5 rounded flex flex-col items-center justify-center text-xs"
                    style={{ backgroundColor: cell.color }}
                  >
                    <span className="font-mono font-bold text-white drop-shadow">{cell.cumulativeRegen.toFixed(3)}</span>
                    <span className="text-white/80 text-[10px]">{(cell.collapseProb * 100).toFixed(0)}%</span>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
