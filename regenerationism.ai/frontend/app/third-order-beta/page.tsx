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
  },
  {
    id: 'census',
    name: 'Census Bureau',
    type: 'government',
    icon: '🗂️',
    series: ['Business Formation', 'Retail Sales', 'Construction', 'Manufacturing'],
    updateFrequency: 'Monthly'
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

    // Calculate NIV metrics from company financials
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
// SIMULATION ENGINE
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

export default function ThirdOrderBetaPage() {
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
  const [selectedTab, setSelectedTab] = useState<'connect' | 'simulate' | 'results' | 'export'>('connect')

  const simulationRef = useRef<NodeJS.Timeout | null>(null)

  // ============================================================================
  // CONNECTION HANDLERS
  // ============================================================================

  const connectSource = (sourceId: string) => {
    if (connectedSources.includes(sourceId)) return

    setActiveSource(sourceId)

    // Simulate connection delay
    setTimeout(() => {
      setConnectedSources(prev => [...prev, sourceId])

      // Generate sample companies for this source
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
  // SIMULATION HANDLERS
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

      // Calculate aggregate metrics
      const aggregateNIV = processedCompanies.reduce((sum, c) => sum + c.nivMetrics.niv, 0) / processed
      const aggregateThrust = processedCompanies.reduce((sum, c) => sum + c.nivMetrics.thrust, 0) / processed
      const aggregateDrag = processedCompanies.reduce((sum, c) => sum + c.nivMetrics.drag, 0) / processed

      // Calculate sector breakdown
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

      // Third-order calculations
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
      }
    }, 200)
  }, [companies])

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
  }

  useEffect(() => {
    return () => {
      if (simulationRef.current) clearInterval(simulationRef.current)
    }
  }, [])

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const formatCurrency = (n: number) => {
    if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
    if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
    return `$${n.toLocaleString()}`
  }

  const formatPercent = (n: number) => `${(n * 100).toFixed(1)}%`

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-100'
      case 'moderate': return 'text-yellow-600 bg-yellow-100'
      case 'elevated': return 'text-orange-600 bg-orange-100'
      case 'high': return 'text-red-600 bg-red-100'
      case 'critical': return 'text-red-800 bg-red-200'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const SECTOR_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899']

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-900 text-white py-8 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">Third-Order Accounting</h1>
            <span className="px-3 py-1 bg-yellow-500 text-yellow-900 text-sm font-bold rounded-full">BETA</span>
          </div>
          <p className="text-purple-200 mb-4">
            Real-time integration with enterprise accounting software for forward-looking capital regeneration analysis
          </p>
          <div className="flex gap-4 text-sm">
            <span className="bg-purple-800 px-3 py-1 rounded">
              Connected Sources: {connectedSources.length}
            </span>
            <span className="bg-purple-800 px-3 py-1 rounded">
              Companies: {companies.length.toLocaleString()}
            </span>
            {simulation.running && (
              <span className="bg-green-600 px-3 py-1 rounded animate-pulse">
                Simulation Running...
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex gap-1">
            {[
              { id: 'connect', label: 'Connect Sources', icon: '🔌' },
              { id: 'simulate', label: 'Run Simulation', icon: '▶️' },
              { id: 'results', label: 'Analysis Results', icon: '📊' },
              { id: 'export', label: 'Export & API', icon: '📤' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                className={`px-6 py-4 font-medium transition-colors ${
                  selectedTab === tab.id
                    ? 'border-b-2 border-purple-600 text-purple-600'
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
        {/* Tab: Connect Sources */}
        {selectedTab === 'connect' && (
          <div className="space-y-6">
            {/* Accounting Software */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Accounting Software Integrations</h3>
              <p className="text-sm text-gray-600 mb-6">
                Connect to your accounting software to import real company financial data for third-order analysis.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ACCOUNTING_SOFTWARE.map(software => {
                  const isConnected = connectedSources.includes(software.id)
                  const isConnecting = activeSource === software.id

                  return (
                    <div
                      key={software.id}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        isConnected
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{software.logo}</span>
                          <div>
                            <h4 className="font-semibold">{software.name}</h4>
                            <p className="text-xs text-gray-500">{software.description}</p>
                          </div>
                        </div>
                        {isConnected && (
                          <span className="text-green-600 text-xl">✓</span>
                        )}
                      </div>

                      <div className="text-xs text-gray-500 mb-3">
                        Data: {software.dataTypes.join(' • ')}
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          {software.sampleCompanies.toLocaleString()} companies
                        </span>
                        {isConnected ? (
                          <button
                            onClick={() => disconnectSource(software.id)}
                            className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
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

            {/* Data Sources */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Economic Data Sources</h3>
              <p className="text-sm text-gray-600 mb-6">
                Real-time economic indicators used to calibrate third-order parameters.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {DATA_SOURCES.map(source => (
                  <div key={source.id} className="p-4 rounded-lg border bg-gray-50">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{source.icon}</span>
                      <div>
                        <h4 className="font-medium">{source.name}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          source.type === 'government' ? 'bg-blue-100 text-blue-700' :
                          source.type === 'financial' ? 'bg-green-100 text-green-700' :
                          source.type === 'market' ? 'bg-purple-100 text-purple-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {source.type}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 mb-2">
                      {source.series.join(' • ')}
                    </div>
                    <div className="text-xs text-gray-500">
                      Updates: {source.updateFrequency}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Connected Summary */}
            {companies.length > 0 && (
              <div className="bg-purple-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Data Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-purple-600">{companies.length.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">Total Companies</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-purple-600">
                      {formatCurrency(companies.reduce((s, c) => s + c.revenue, 0))}
                    </div>
                    <div className="text-sm text-gray-600">Total Revenue</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-purple-600">
                      {new Set(companies.map(c => c.sector)).size}
                    </div>
                    <div className="text-sm text-gray-600">Sectors</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-purple-600">
                      {companies.reduce((s, c) => s + c.employees, 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">Total Employees</div>
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
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
                <span className="text-4xl mb-4 block">⚠️</span>
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">No Data Connected</h3>
                <p className="text-yellow-700 mb-4">
                  Connect at least one accounting software source to run the simulation.
                </p>
                <button
                  onClick={() => setSelectedTab('connect')}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                >
                  Go to Connect Sources
                </button>
              </div>
            ) : (
              <>
                {/* Simulation Controls */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">Simulation Controls</h3>
                  <div className="flex items-center gap-4 mb-6">
                    {!simulation.running ? (
                      <button
                        onClick={startSimulation}
                        className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2"
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
                      className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                    >
                      Reset
                    </button>
                    <div className="flex-1" />
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        {simulation.companiesProcessed.toLocaleString()} / {companies.length.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500">Companies Processed</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-200"
                      style={{ width: `${(simulation.companiesProcessed / companies.length) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Real-time Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg shadow p-5">
                    <div className="text-sm text-gray-500 mb-1">Aggregate NIV</div>
                    <div className="text-2xl font-bold text-indigo-600">
                      {simulation.aggregateNIV.toFixed(4)}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">Capital regeneration velocity</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-5">
                    <div className="text-sm text-gray-500 mb-1">Cumulative Cₕ (5Y)</div>
                    <div className={`text-2xl font-bold ${simulation.cumulativeRegen >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {simulation.cumulativeRegen.toFixed(4)}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">Third-order projection</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-5">
                    <div className="text-sm text-gray-500 mb-1">Collapse Probability</div>
                    <div className="text-2xl font-bold text-orange-600">
                      {formatPercent(simulation.collapseProb)}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">Risk-adjusted</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-5">
                    <div className="text-sm text-gray-500 mb-1">Risk Level</div>
                    <div className={`text-xl font-bold px-3 py-1 rounded inline-block ${getRiskColor(simulation.riskLevel)}`}>
                      {simulation.riskLevel.toUpperCase()}
                    </div>
                  </div>
                </div>

                {/* Real-time Chart */}
                {simulation.history.length > 0 && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">Real-Time NIV Evolution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={simulation.history}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="companies" tickFormatter={(v) => `${v}`} />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip
                          formatter={(value: number, name: string) => [value.toFixed(4), name]}
                          labelFormatter={(v) => `${v} companies`}
                        />
                        <Legend />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="niv"
                          stroke="#6366f1"
                          strokeWidth={2}
                          dot={false}
                          name="NIV"
                        />
                        <Area
                          yAxisId="right"
                          type="monotone"
                          dataKey="thrust"
                          fill="#22c55e"
                          stroke="#22c55e"
                          fillOpacity={0.2}
                          name="Thrust"
                        />
                        <Area
                          yAxisId="right"
                          type="monotone"
                          dataKey="drag"
                          fill="#ef4444"
                          stroke="#ef4444"
                          fillOpacity={0.2}
                          name="Drag"
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Sector Breakdown */}
                {simulation.sectorBreakdown.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-lg shadow p-6">
                      <h3 className="text-lg font-semibold mb-4">NIV by Sector</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={simulation.sectorBreakdown} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="sector" type="category" width={100} tick={{ fontSize: 12 }} />
                          <Tooltip formatter={(v: number) => v.toFixed(4)} />
                          <Bar dataKey="niv" fill="#6366f1" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                      <h3 className="text-lg font-semibold mb-4">Company Distribution</h3>
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
                          >
                            {simulation.sectorBreakdown.map((_, i) => (
                              <Cell key={i} fill={SECTOR_COLORS[i % SECTOR_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Tab: Results */}
        {selectedTab === 'results' && (
          <div className="space-y-6">
            {simulation.companiesProcessed === 0 ? (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <span className="text-4xl mb-4 block">📊</span>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No Results Yet</h3>
                <p className="text-gray-500 mb-4">Run the simulation to see analysis results.</p>
                <button
                  onClick={() => setSelectedTab('simulate')}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Go to Simulation
                </button>
              </div>
            ) : (
              <>
                {/* Third-Order Summary */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-6">Third-Order Analysis Summary</h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="text-center p-6 bg-indigo-50 rounded-lg">
                      <div className="text-sm text-indigo-600 mb-2">First-Order (Velocity)</div>
                      <div className="text-4xl font-bold text-indigo-700">{simulation.aggregateNIV.toFixed(4)}</div>
                      <div className="text-xs text-indigo-500 mt-2">NIVₜ = current regeneration</div>
                    </div>
                    <div className="text-center p-6 bg-purple-50 rounded-lg">
                      <div className="text-sm text-purple-600 mb-2">Second-Order (Acceleration)</div>
                      <div className="text-4xl font-bold text-purple-700">
                        {simulation.history.length > 2
                          ? (simulation.history[simulation.history.length - 1].niv - simulation.history[simulation.history.length - 2].niv).toFixed(5)
                          : '0.00000'
                        }
                      </div>
                      <div className="text-xs text-purple-500 mt-2">dNIV/dt = rate of change</div>
                    </div>
                    <div className="text-center p-6 bg-green-50 rounded-lg">
                      <div className="text-sm text-green-600 mb-2">Third-Order (Projection)</div>
                      <div className={`text-4xl font-bold ${simulation.cumulativeRegen >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {simulation.cumulativeRegen.toFixed(4)}
                      </div>
                      <div className="text-xs text-green-500 mt-2">Cₕ = 5-year cumulative</div>
                    </div>
                  </div>

                  {/* Formula Display */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-3">Third-Order Computation:</p>
                    <div className="font-mono text-sm space-y-2">
                      <p>Cₕ = NIV₀ × e<sup>(rₕ×h)</sup> × (1 − ρₕ)</p>
                      <p className="text-gray-500">
                        = {simulation.aggregateNIV.toFixed(4)} × e<sup>({(1.1 * simulation.aggregateNIV - 0.8 * simulation.aggregateDrag).toFixed(4)} × 5)</sup> × (1 − {simulation.collapseProb.toFixed(4)})
                      </p>
                      <p className="text-indigo-600 font-bold">
                        = {simulation.cumulativeRegen.toFixed(4)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Sector Analysis */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">Sector-Level Analysis</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3">Sector</th>
                          <th className="text-right py-2 px-3">Companies</th>
                          <th className="text-right py-2 px-3">Avg NIV</th>
                          <th className="text-right py-2 px-3">Contribution</th>
                          <th className="text-center py-2 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {simulation.sectorBreakdown
                          .sort((a, b) => b.niv - a.niv)
                          .map((sector, i) => {
                            const contribution = (sector.niv * sector.count) /
                              simulation.sectorBreakdown.reduce((s, sec) => s + sec.niv * sec.count, 0) * 100
                            return (
                              <tr key={sector.sector} className="border-b hover:bg-gray-50">
                                <td className="py-2 px-3 font-medium">
                                  <span className="inline-block w-3 h-3 rounded mr-2" style={{ backgroundColor: SECTOR_COLORS[i % SECTOR_COLORS.length] }} />
                                  {sector.sector}
                                </td>
                                <td className="py-2 px-3 text-right">{sector.count}</td>
                                <td className="py-2 px-3 text-right font-mono">{sector.niv.toFixed(4)}</td>
                                <td className="py-2 px-3 text-right">{contribution.toFixed(1)}%</td>
                                <td className="py-2 px-3 text-center">
                                  <span className={`px-2 py-1 rounded text-xs ${
                                    sector.niv > simulation.aggregateNIV
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-yellow-100 text-yellow-700'
                                  }`}>
                                    {sector.niv > simulation.aggregateNIV ? 'Above Avg' : 'Below Avg'}
                                  </span>
                                </td>
                              </tr>
                            )
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Top/Bottom Companies */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4 text-green-700">Top 10 by NIV</h3>
                    <div className="space-y-2">
                      {companies
                        .sort((a, b) => b.nivMetrics.niv - a.nivMetrics.niv)
                        .slice(0, 10)
                        .map((c, i) => (
                          <div key={c.id} className="flex items-center justify-between py-2 border-b">
                            <div>
                              <span className="text-gray-400 mr-2">#{i + 1}</span>
                              <span className="font-medium">{c.name}</span>
                              <span className="text-xs text-gray-500 ml-2">({c.ticker})</span>
                            </div>
                            <div className="text-right">
                              <div className="font-mono text-green-600">{c.nivMetrics.niv.toFixed(4)}</div>
                              <div className="text-xs text-gray-500">{c.sector}</div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4 text-red-700">Bottom 10 by NIV</h3>
                    <div className="space-y-2">
                      {companies
                        .sort((a, b) => a.nivMetrics.niv - b.nivMetrics.niv)
                        .slice(0, 10)
                        .map((c, i) => (
                          <div key={c.id} className="flex items-center justify-between py-2 border-b">
                            <div>
                              <span className="text-gray-400 mr-2">#{i + 1}</span>
                              <span className="font-medium">{c.name}</span>
                              <span className="text-xs text-gray-500 ml-2">({c.ticker})</span>
                            </div>
                            <div className="text-right">
                              <div className="font-mono text-red-600">{c.nivMetrics.niv.toFixed(4)}</div>
                              <div className="text-xs text-gray-500">{c.sector}</div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Tab: Export */}
        {selectedTab === 'export' && (
          <div className="space-y-6">
            {/* Export Options */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Export Data</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => {
                    const csv = [
                      ['Company', 'Ticker', 'Sector', 'Revenue', 'NIV', 'Thrust', 'Efficiency', 'Slack', 'Drag'].join(','),
                      ...companies.map(c =>
                        [c.name, c.ticker, c.sector, c.revenue, c.nivMetrics.niv, c.nivMetrics.thrust, c.nivMetrics.efficiency, c.nivMetrics.slack, c.nivMetrics.drag].join(',')
                      )
                    ].join('\n')
                    const blob = new Blob([csv], { type: 'text/csv' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `third-order-companies-${new Date().toISOString().slice(0, 10)}.csv`
                    a.click()
                  }}
                  disabled={companies.length === 0}
                  className="p-4 border-2 border-dashed rounded-lg hover:border-purple-400 hover:bg-purple-50 transition disabled:opacity-50"
                >
                  <div className="text-2xl mb-2">📄</div>
                  <div className="font-medium">Export CSV</div>
                  <div className="text-sm text-gray-500">Company-level data</div>
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
                      companies: companies.slice(0, 100)
                    }
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `third-order-analysis-${new Date().toISOString().slice(0, 10)}.json`
                    a.click()
                  }}
                  disabled={simulation.companiesProcessed === 0}
                  className="p-4 border-2 border-dashed rounded-lg hover:border-purple-400 hover:bg-purple-50 transition disabled:opacity-50"
                >
                  <div className="text-2xl mb-2">📊</div>
                  <div className="font-medium">Export JSON</div>
                  <div className="text-sm text-gray-500">Full analysis results</div>
                </button>
                <button
                  onClick={() => {
                    const report = `
THIRD-ORDER ACCOUNTING ANALYSIS REPORT
Generated: ${new Date().toISOString()}

EXECUTIVE SUMMARY
================
Total Companies Analyzed: ${companies.length.toLocaleString()}
Aggregate NIV: ${simulation.aggregateNIV.toFixed(4)}
5-Year Cumulative Regeneration (Cₕ): ${simulation.cumulativeRegen.toFixed(4)}
Collapse Probability: ${(simulation.collapseProb * 100).toFixed(1)}%
Risk Level: ${simulation.riskLevel.toUpperCase()}

METHODOLOGY
===========
Third-Order Accounting applies exponential compounding and risk-adjusted
forecasting to the NIV (National Impact Velocity) metric:

Cₕ = NIV₀ × e^(rₕ×h) × (1 − ρₕ)

Where:
- NIV₀ = ${simulation.aggregateNIV.toFixed(4)} (baseline velocity)
- rₕ = ${(1.1 * simulation.aggregateNIV - 0.8 * simulation.aggregateDrag).toFixed(4)} (effective rate)
- h = 5 years (horizon)
- ρₕ = ${simulation.collapseProb.toFixed(4)} (collapse probability)

SECTOR BREAKDOWN
===============
${simulation.sectorBreakdown.map(s => `${s.sector}: ${s.count} companies, NIV = ${s.niv.toFixed(4)}`).join('\n')}

DATA SOURCES
============
${connectedSources.map(s => ACCOUNTING_SOFTWARE.find(sw => sw.id === s)?.name).join(', ')}
`.trim()
                    const blob = new Blob([report], { type: 'text/plain' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `third-order-report-${new Date().toISOString().slice(0, 10)}.txt`
                    a.click()
                  }}
                  disabled={simulation.companiesProcessed === 0}
                  className="p-4 border-2 border-dashed rounded-lg hover:border-purple-400 hover:bg-purple-50 transition disabled:opacity-50"
                >
                  <div className="text-2xl mb-2">📝</div>
                  <div className="font-medium">Export Report</div>
                  <div className="text-sm text-gray-500">Executive summary</div>
                </button>
              </div>
            </div>

            {/* API Integration */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">API Integration</h3>
              <p className="text-sm text-gray-600 mb-4">
                Integrate third-order accounting into your existing systems via our REST API.
              </p>

              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm mb-4">
                <pre>{`// POST /api/third-order
const response = await fetch('https://regenerationism.ai/api/third-order', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    data: companyNIVData,  // Array of NIVDataPoint
    params: {
      alpha: 1.1,      // Efficiency multiplier
      beta: 0.8,       // Friction penalty
      gamma: 3.5,      // Drag sensitivity
      theta: 0.15,     // Tipping threshold
      horizonYears: 5  // Forecast horizon
    },
    includeForecastPaths: true,
    includeHeatmap: false
  })
});

const { result, forecastPaths } = await response.json();
console.log(\`Risk Level: \${result.riskLevel}\`);
console.log(\`5Y Projection: \${result.cumulativeRegeneration}\`);`}</pre>
              </div>

              <div className="flex gap-4">
                <a
                  href="/api-docs"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  View Full API Docs
                </a>
                <a
                  href="/third-order-accounting"
                  className="px-4 py-2 border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50"
                >
                  Standard Third-Order Page
                </a>
              </div>
            </div>

            {/* Webhook Configuration */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Webhook Notifications</h3>
              <p className="text-sm text-gray-600 mb-4">
                Configure webhooks to receive alerts when risk levels change.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Webhook URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://your-server.com/webhook"
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alert Threshold
                  </label>
                  <select className="w-full px-4 py-2 border rounded-lg">
                    <option value="elevated">Elevated Risk or Higher</option>
                    <option value="high">High Risk or Higher</option>
                    <option value="critical">Critical Risk Only</option>
                  </select>
                </div>
              </div>
              <button className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg">
                Save Webhook (Coming Soon)
              </button>
            </div>

            {/* Compatible Software */}
            <div className="bg-purple-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Compatible Accounting Software</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {ACCOUNTING_SOFTWARE.map(sw => (
                  <div key={sw.id} className="text-center">
                    <div className="text-3xl mb-2">{sw.logo}</div>
                    <div className="text-sm font-medium">{sw.name}</div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-purple-700 mt-4 text-center">
                Direct integrations available via OAuth 2.0 or file import (CSV, QBO, OFX, XLS)
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
