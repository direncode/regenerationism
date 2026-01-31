'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  BarChart3,
  RefreshCw,
  Download,
  Loader2,
  AlertCircle,
  Info,
  FlaskConical,
  FileSpreadsheet,
  ExternalLink,
} from 'lucide-react'
import Link from 'next/link'
import { useSessionStore } from '@/store/sessionStore'
import { calculateNIVFromFRED, NIVDataPoint, checkServerApiKey } from '@/lib/fredApi'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface DashboardData {
  date: string
  niv_score: number
  components: {
    thrust: number
    efficiency: number
    slack: number
    drag: number
    interpretation: {
      thrust_status: string
      efficiency_status: string
      slack_status: string
      drag_status: string
    }
  }
  vs_fed: {
    niv_signal: string
    yield_curve_signal: string
    agreement: boolean
    niv_lead_months: number
  }
}

interface HistoryPoint {
  date: string
  niv: number
}

export default function DashboardPage() {
  const { apiSettings, setApiSettings } = useSessionStore()
  const [data, setData] = useState<DashboardData | null>(null)
  const [history, setHistory] = useState<HistoryPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hasServerKey, setHasServerKey] = useState<boolean | null>(null)
  const [checkingServerKey, setCheckingServerKey] = useState(true)

  // Check if server has configured API key on mount
  useEffect(() => {
    const checkServer = async () => {
      setCheckingServerKey(true)
      const hasKey = await checkServerApiKey()
      setHasServerKey(hasKey)
      if (hasKey) {
        // Auto-enable live data if server has key
        setApiSettings({ useLiveData: true })
      }
      setCheckingServerKey(false)
    }
    checkServer()
  }, [])

  const fetchData = async () => {
    // If server has key, we don't need client key
    const canFetch = hasServerKey || (apiSettings.fredApiKey && apiSettings.useLiveData)
    if (!canFetch) {
      setData(null)
      setHistory([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Fetch last 3 years of data (we only display 24 months)
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      // Use server key (empty string) if available, otherwise client key
      const apiKeyToUse = hasServerKey ? '' : apiSettings.fredApiKey
      const nivData = await calculateNIVFromFRED(
        apiKeyToUse,
        startDate,
        endDate,
        { eta: 1.5, weights: { thrust: 1, efficiency: 1, slack: 1, drag: 1 }, smoothWindow: 1 }
      )

      if (nivData.length > 0) {
        const latest = nivData[nivData.length - 1]

        // Interpret component values
        const getInterpretation = (point: NIVDataPoint) => ({
          thrust_status: point.components.thrust > 0.2 ? 'Strong growth impulse' : point.components.thrust > 0 ? 'Moderate growth impulse' : 'Negative impulse',
          efficiency_status: point.components.efficiency > 0.015 ? 'Healthy investment levels' : 'Below-average investment',
          slack_status: point.components.slack > 0.25 ? 'Elevated slack' : 'Tight capacity',
          drag_status: point.components.drag < 0.02 ? 'Low friction levels' : point.components.drag < 0.04 ? 'Normal friction levels' : 'High friction',
        })

        // Determine NIV signal based on NIV score
        const nivSignal = latest.niv > 0.05 ? 'EXPANSION' : latest.niv > 0.02 ? 'CAUTION' : 'CONTRACTION'

        // Determine yield curve signal from yield penalty component
        const yieldCurveSignal = latest.components.yieldPenalty > 0 ? 'INVERTED' : 'NORMAL'

        setData({
          date: latest.date,
          niv_score: latest.niv * 100,
          components: {
            thrust: latest.components.thrust,
            efficiency: latest.components.efficiency,
            slack: latest.components.slack,
            drag: latest.components.drag,
            interpretation: getInterpretation(latest),
          },
          vs_fed: {
            niv_signal: nivSignal,
            yield_curve_signal: yieldCurveSignal,
            agreement: (nivSignal === 'EXPANSION' && yieldCurveSignal === 'NORMAL') || (nivSignal === 'CONTRACTION' && yieldCurveSignal === 'INVERTED'),
            niv_lead_months: 6,
          }
        })

        // Transform for chart - show last 24 months
        setHistory(nivData.slice(-24).map(point => ({
          date: point.date.substring(0, 7),
          niv: point.niv * 100,
        })))

        setLastUpdate(new Date())
      }
    } catch (e) {
      console.error('Failed to fetch FRED data:', e)
      setError(e instanceof Error ? e.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!checkingServerKey) {
      fetchData()
    }
  }, [apiSettings.fredApiKey, apiSettings.useLiveData, hasServerKey, checkingServerKey])

  const refresh = () => {
    fetchData()
  }

  const exportCSV = () => {
    if (!history.length || !data) return

    // Include full component data for reproducibility
    const csv = [
      'date,niv_score,thrust,efficiency,slack,drag,status',
      ...history.map(d => `${d.date},${d.niv.toFixed(4)},${data.components.thrust.toFixed(4)},${data.components.efficiency.toFixed(4)},${data.components.slack.toFixed(4)},${data.components.drag.toFixed(4)},${data.vs_fed.niv_signal}`)
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `niv_dashboard_data_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  // Export detailed current data with all FRED sources
  const exportDetailedCSV = () => {
    if (!data) return

    const detailedData = `NIV Dashboard Export - ${new Date().toISOString()}
=====================================

CURRENT NIV SCORE
Date: ${data.date}
NIV Score: ${data.niv_score.toFixed(4)}
Status: ${data.vs_fed.niv_signal}

COMPONENTS
Thrust (u): ${data.components.thrust.toFixed(6)}
Efficiency (P): ${data.components.efficiency.toFixed(6)}
Slack (X): ${data.components.slack.toFixed(6)}
Drag (F): ${data.components.drag.toFixed(6)}

FORMULAS USED
Master: NIV = (u × P²) / (X + F)^η where η = 1.5
Thrust: u = tanh(ΔG + ΔA - 0.7Δr)
Efficiency: P = (Investment × 1.15) / GDP
Slack: X = 1 - (TCU / 100)
Drag: F = 0.4s + 0.4(r-π) + 0.2σ

FRED SERIES USED
- GPDIC1: Private Investment (Quarterly)
- M2SL: M2 Money Stock (Monthly)
- FEDFUNDS: Federal Funds Rate (Monthly)
- GDPC1: Real GDP (Quarterly)
- TCU: Capacity Utilization (Monthly)
- T10Y3M: 10Y-3M Treasury Spread (Daily)
- CPIAUCSL: Consumer Price Index (Monthly)

DATA SOURCE
Federal Reserve Economic Data (FRED): https://fred.stlouisfed.org

REPRODUCIBILITY
Visit /validation for step-by-step reproduction guide
`

    const blob = new Blob([detailedData], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `niv_full_export_${new Date().toISOString().split('T')[0]}.txt`
    a.click()
  }

  // Still checking server key
  if (checkingServerKey) {
    return (
      <div className="min-h-screen py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold">NIV Dashboard</h1>
              <p className="text-gray-400">Real-time macro crisis detection</p>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-12 text-center max-w-lg mx-auto">
            <Loader2 className="w-12 h-12 text-regen-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-400 mb-2">Initializing connection to FRED API...</p>
            <p className="text-xs text-gray-500">Checking server configuration</p>
          </div>
        </div>
      </div>
    )
  }

  // No API key configured (and server doesn't have one)
  if (!hasServerKey && (!apiSettings.fredApiKey || !apiSettings.useLiveData)) {
    return (
      <div className="min-h-screen py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold">NIV Dashboard</h1>
              <p className="text-gray-400">Real-time macro crisis detection</p>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-12 text-center max-w-lg mx-auto">
            <AlertCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-300 mb-2">Unable to Load Data</h2>
            <p className="text-gray-400 mb-6">
              FRED API connection not available. This may be a temporary issue.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-dark-600 rounded-lg hover:bg-dark-500 transition"
              >
                <RefreshCw className="w-4 h-4" />
                Retry Connection
              </button>
              <Link
                href="/validation"
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-accent-500/10 border border-accent-500/30 text-accent-300 rounded-lg hover:bg-accent-500/20 transition"
              >
                <ExternalLink className="w-4 h-4" />
                View Static Validation Data
              </Link>
            </div>
            <p className="text-xs text-gray-500 mt-6">
              Data source: Federal Reserve Economic Data (FRED)
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Loading state
  if (loading && !data) {
    return (
      <div className="min-h-screen py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold">NIV Dashboard</h1>
              <p className="text-gray-400">Real-time macro crisis detection</p>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-12 text-center max-w-lg mx-auto">
            <Loader2 className="w-12 h-12 text-regen-400 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-300 mb-2">Loading Live FRED Data</h2>
            <p className="text-gray-400 mb-4">Fetching 8 economic series from Federal Reserve...</p>
            <div className="text-xs text-gray-500 space-y-1">
              <p>GPDIC1, M2SL, FEDFUNDS, GDPC1, TCU, T10Y3M, CPIAUCSL, USREC</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error && !data) {
    return (
      <div className="min-h-screen py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold">NIV Dashboard</h1>
              <p className="text-gray-400">Real-time macro crisis detection</p>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-12 text-center max-w-lg mx-auto">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2 text-red-400">Failed to Load Data</h2>
            <p className="text-gray-400 mb-6">{error}</p>

            <div className="space-y-3">
              <button
                onClick={refresh}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-dark-600 rounded-lg hover:bg-dark-500 transition"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <Link
                href="/validation"
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-accent-500/10 border border-accent-500/30 text-accent-300 rounded-lg hover:bg-accent-500/20 transition text-sm"
              >
                <Download className="w-4 h-4" />
                Download Sample Data Instead
              </Link>
            </div>
            <p className="text-xs text-gray-500 mt-6">
              If issues persist, try the validation page for offline data
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!data) return null

  // Determine status color based on NIV score
  const getStatusColor = () => {
    if (data.niv_score > 5) return '#22c55e' // Green - Expansion
    if (data.niv_score > 2) return '#eab308' // Yellow - Caution
    if (data.niv_score > 0) return '#f97316' // Orange - Slowdown
    return '#ef4444' // Red - Contraction
  }

  const statusColor = getStatusColor()
  const statusLabel = data.niv_score > 5 ? 'EXPANSION' : data.niv_score > 2 ? 'CAUTION' : data.niv_score > 0 ? 'SLOWDOWN' : 'CONTRACTION'

  return (
    <div className="min-h-screen py-8 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold">NIV Dashboard</h1>
            <p className="text-gray-400">Real-time macro crisis detection</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-gray-500">
              Updated: {lastUpdate?.toLocaleTimeString() || 'Never'}
            </span>
            <button
              onClick={refresh}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-dark-600 rounded-lg hover:bg-dark-500 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            {/* Download dropdown */}
            <div className="relative group">
              <button
                disabled={!history.length}
                className="flex items-center gap-2 px-4 py-2 bg-regen-500 text-black font-bold rounded-lg hover:bg-regen-400 transition disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              <div className="absolute right-0 mt-2 w-56 bg-dark-700 border border-dark-600 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <button
                  onClick={exportCSV}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-gray-300 hover:bg-dark-600 transition"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  Download CSV
                </button>
                <button
                  onClick={exportDetailedCSV}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-gray-300 hover:bg-dark-600 transition border-t border-dark-600"
                >
                  <Download className="w-4 h-4 text-blue-400" />
                  Full Export (with formulas)
                </button>
              </div>
            </div>
            <Link
              href="/oos-tests"
              className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded-lg hover:bg-purple-500/30 transition"
            >
              <FlaskConical className="w-4 h-4" />
              View OOS Tests
            </Link>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* NIV Score Display - Takes 1 column */}
          <div className="glass-card rounded-2xl p-6 flex flex-col items-center justify-center">
            <span className="text-sm text-gray-400 uppercase tracking-wider mb-2">
              NIV Score
            </span>
            <motion.div
              className="text-6xl font-mono font-bold mb-2"
              style={{ color: statusColor }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              {data.niv_score.toFixed(1)}
            </motion.div>
            <span
              className="text-sm font-bold uppercase tracking-wider"
              style={{ color: statusColor }}
            >
              {statusLabel}
            </span>
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-400">As of {data.date}</p>
            </div>
          </div>

          {/* NIV Score + Trend - Takes 2 columns */}
          <div className="lg:col-span-2 glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold">NIV Trend</h3>
                <p className="text-sm text-gray-400">National Impact Velocity (24 months)</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">
                  {data.niv_score > 0 ? 'Positive momentum' : 'Negative momentum'}
                </p>
              </div>
            </div>

            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="nivGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="date" stroke="#666" tick={{ fill: '#888', fontSize: 10 }} />
                  <YAxis stroke="#666" tick={{ fill: '#888', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                    formatter={(value: number) => [value.toFixed(2), 'NIV Score']}
                  />
                  <Area
                    type="monotone"
                    dataKey="niv"
                    stroke="#22c55e"
                    fill="url(#nivGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Components Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <ComponentCard
            title="Thrust (u)"
            value={data.components.thrust}
            status={data.components.interpretation.thrust_status}
            icon={<Zap className="w-6 h-6" />}
            trend={data.components.thrust > 0 ? 'up' : 'down'}
            tooltip={{
              formula: 'u = tanh(ΔG + ΔA - 0.7Δr)',
              series: ['GPDIC1 (Investment YoY)', 'M2SL (M2 YoY)', 'FEDFUNDS (Rate Change)'],
              description: 'Net policy stimulus: Investment growth + M2 growth - rate hikes'
            }}
          />
          <ComponentCard
            title="Efficiency (P)"
            value={data.components.efficiency}
            status={data.components.interpretation.efficiency_status}
            icon={<TrendingUp className="w-6 h-6" />}
            trend={data.components.efficiency > 0.01 ? 'up' : 'down'}
            tooltip={{
              formula: 'P = (Investment × 1.15) / GDP',
              series: ['GPDIC1 (Investment)', 'GDPC1 (Real GDP)'],
              description: 'Capital productivity ratio (squared in NIV formula)'
            }}
          />
          <ComponentCard
            title="Slack (X)"
            value={data.components.slack}
            status={data.components.interpretation.slack_status}
            icon={<BarChart3 className="w-6 h-6" />}
            trend={data.components.slack < 0.2 ? 'up' : 'down'}
            tooltip={{
              formula: 'X = 1 - (TCU / 100)',
              series: ['TCU (Capacity Utilization)'],
              description: 'Economic headroom: higher slack = more room before overheating'
            }}
          />
          <ComponentCard
            title="Drag (F)"
            value={data.components.drag}
            status={data.components.interpretation.drag_status}
            icon={<TrendingDown className="w-6 h-6" />}
            trend={data.components.drag < 0.03 ? 'up' : 'down'}
            tooltip={{
              formula: 'F = 0.4s + 0.4(r-π) + 0.2σ',
              series: ['T10Y3M (Yield Spread)', 'FEDFUNDS/CPIAUCSL (Real Rate)', 'FEDFUNDS StdDev (Volatility)'],
              description: 'System friction: yield penalty + real rates + volatility'
            }}
          />
        </div>

        {/* NIV vs Fed Comparison */}
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-bold mb-6">NIV vs Fed Yield Curve</h3>

          <div className="grid md:grid-cols-2 gap-8">
            {/* NIV Signal */}
            <div className="text-center p-6 bg-dark-700 rounded-xl">
              <Activity className="w-10 h-10 text-regen-400 mx-auto mb-4" />
              <h4 className="font-bold mb-2">NIV Signal</h4>
              <div className={`text-2xl font-bold ${
                data.vs_fed.niv_signal === 'EXPANSION' ? 'text-regen-400' : data.vs_fed.niv_signal === 'CAUTION' ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {data.vs_fed.niv_signal}
              </div>
              <p className="text-sm text-gray-400 mt-2">
                Regeneration-based indicator
              </p>
            </div>

            {/* Fed Signal */}
            <div className="text-center p-6 bg-dark-700 rounded-xl">
              <BarChart3 className="w-10 h-10 text-blue-400 mx-auto mb-4" />
              <h4 className="font-bold mb-2">Fed Yield Curve</h4>
              <div className={`text-2xl font-bold ${
                data.vs_fed.yield_curve_signal === 'NORMAL' ? 'text-regen-400' : 'text-red-400'
              }`}>
                {data.vs_fed.yield_curve_signal}
              </div>
              <p className="text-sm text-gray-400 mt-2">
                Traditional indicator
              </p>
            </div>
          </div>

          {/* Agreement Status */}
          <div className={`mt-6 p-4 rounded-lg text-center ${
            data.vs_fed.agreement ? 'bg-regen-500/10' : 'bg-yellow-500/10'
          }`}>
            {data.vs_fed.agreement ? (
              <p className="text-regen-400">
                NIV and Fed Yield Curve are in agreement
              </p>
            ) : (
              <p className="text-yellow-400">
                NIV and Fed Yield Curve are diverging — watch closely
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ComponentCard({
  title,
  value,
  status,
  icon,
  trend,
  tooltip,
}: {
  title: string
  value: number
  status: string
  icon: React.ReactNode
  trend: 'up' | 'down'
  tooltip?: {
    formula: string
    series: string[]
    description: string
  }
}) {
  const [showTooltip, setShowTooltip] = useState(false)
  const color = trend === 'up' ? '#22c55e' : '#ef4444'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-xl p-6 relative"
    >
      <div className="flex items-center justify-between mb-4">
        <div style={{ color }}>{icon}</div>
        <div className="flex items-center gap-2">
          {tooltip && (
            <button
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              className="text-gray-500 hover:text-gray-300 transition"
            >
              <Info className="w-4 h-4" />
            </button>
          )}
          {trend === 'up' ? (
            <TrendingUp className="w-4 h-4 text-regen-400" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-400" />
          )}
        </div>
      </div>
      <h4 className="text-sm text-gray-400 mb-1">{title}</h4>
      <div className="text-2xl font-mono font-bold mb-2" style={{ color }}>
        {value.toFixed(3)}
      </div>
      <p className="text-xs text-gray-500">{status}</p>

      {/* Tooltip */}
      {tooltip && showTooltip && (
        <div className="absolute z-50 bottom-full left-0 mb-2 w-72 bg-dark-700 border border-dark-600 rounded-lg shadow-xl p-4">
          <div className="text-xs space-y-3">
            <div>
              <span className="text-gray-500 block mb-1">Formula:</span>
              <code className="text-blue-400 font-mono">{tooltip.formula}</code>
            </div>
            <div>
              <span className="text-gray-500 block mb-1">FRED Series:</span>
              <ul className="space-y-1">
                {tooltip.series.map((s, i) => (
                  <li key={i} className="text-gray-300 flex items-center gap-1">
                    <span className="w-1 h-1 bg-regen-400 rounded-full" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <span className="text-gray-500 block mb-1">Interpretation:</span>
              <p className="text-gray-400">{tooltip.description}</p>
            </div>
          </div>
          {/* Arrow */}
          <div className="absolute bottom-0 left-6 transform translate-y-full">
            <div className="w-3 h-3 bg-dark-700 border-r border-b border-dark-600 transform rotate-45 -translate-y-1.5" />
          </div>
        </div>
      )}
    </motion.div>
  )
}
