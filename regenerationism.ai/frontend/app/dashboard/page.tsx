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
  Key,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  Settings,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import RecessionGauge from '@/components/RecessionGauge'
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
  recession_probability: number
  alert_level: string
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
  prob: number
}

export default function DashboardPage() {
  const { apiSettings, setApiSettings } = useSessionStore()
  const [data, setData] = useState<DashboardData | null>(null)
  const [history, setHistory] = useState<HistoryPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [apiKeyInput, setApiKeyInput] = useState(apiSettings.fredApiKey || '')
  const [showApiKey, setShowApiKey] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
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
      // Fetch 2 years of data for historical chart
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      // Use server key (empty string) if available, otherwise client key
      const apiKeyToUse = hasServerKey ? '' : apiSettings.fredApiKey
      const nivData = await calculateNIVFromFRED(
        apiKeyToUse,
        startDate,
        endDate,
        { eta: 1.5, weights: { thrust: 1, efficiency: 1, slack: 1, drag: 1 }, smoothWindow: 12 }
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

        // Determine NIV signal
        const nivSignal = latest.probability < 30 ? 'EXPANSION' : latest.probability < 50 ? 'CAUTION' : 'CONTRACTION'

        // Determine yield curve signal from yield penalty component
        const yieldCurveSignal = latest.components.yieldPenalty > 0 ? 'INVERTED' : 'NORMAL'

        setData({
          date: latest.date,
          niv_score: latest.niv * 100,
          recession_probability: latest.probability,
          alert_level: latest.probability > 70 ? 'critical' : latest.probability > 50 ? 'warning' : latest.probability > 30 ? 'elevated' : 'normal',
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

        // Transform for chart
        setHistory(nivData.slice(-24).map(point => ({
          date: point.date.substring(0, 7),
          niv: point.niv * 100,
          prob: point.probability,
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
    if (!history.length) return

    const csv = [
      'date,niv_score,recession_probability',
      ...history.map(d => `${d.date},${d.niv.toFixed(2)},${d.prob.toFixed(2)}`)
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `niv_data_${new Date().toISOString().split('T')[0]}.csv`
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

          <div className="glass-card rounded-2xl p-12 text-center">
            <Loader2 className="w-12 h-12 text-regen-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Initializing...</p>
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
            <div className="w-20 h-20 mx-auto mb-6 bg-blue-500/20 rounded-full flex items-center justify-center">
              <Key className="w-10 h-10 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Connect to Live FRED Data</h2>
            <p className="text-gray-400 mb-6">
              Enter your FRED API key to display real-time economic data from the Federal Reserve.
            </p>

            <div className="flex gap-3 mb-4">
              <div className="relative flex-1">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Enter your FRED API key..."
                  className="w-full bg-dark-700 border border-white/10 rounded-lg px-4 py-3 pr-10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
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
                onClick={() => {
                  setApiSettings({ fredApiKey: apiKeyInput, useLiveData: true })
                }}
                disabled={!apiKeyInput}
                className="px-6 py-3 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Connect
              </button>
            </div>

            <p className="text-sm text-gray-500">
              Get a free API key at{' '}
              <a href="https://fred.stlouisfed.org/docs/api/api_key.html" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                fred.stlouisfed.org
              </a>
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

          <div className="glass-card rounded-2xl p-12 text-center">
            <Loader2 className="w-12 h-12 text-regen-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Loading live FRED data...</p>
          </div>
        </div>
      </div>
    )
  }

  // Error state - show API key input to allow re-entry
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

            {/* API Key Re-entry */}
            <div className="text-left mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Enter or update your FRED API key:
              </label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="Enter your FRED API key..."
                    className="w-full bg-dark-700 border border-white/10 rounded-lg px-4 py-3 pr-10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
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
                  onClick={() => {
                    setApiSettings({ fredApiKey: apiKeyInput, useLiveData: true })
                    setError(null)
                  }}
                  disabled={!apiKeyInput}
                  className="px-6 py-3 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save & Retry
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Get a free API key at{' '}
                <a href="https://fred.stlouisfed.org/docs/api/api_key.html" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                  fred.stlouisfed.org
                </a>
              </p>
            </div>

            <button
              onClick={refresh}
              className="inline-flex items-center gap-2 px-4 py-2 bg-dark-600 rounded-lg hover:bg-dark-500 transition"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again with Current Key
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="min-h-screen py-8 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold">NIV Dashboard</h1>
            <p className="text-gray-400">Real-time macro crisis detection</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              Updated: {lastUpdate?.toLocaleTimeString() || 'Never'}
            </span>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-2 px-4 py-2 bg-dark-600 rounded-lg hover:bg-dark-500 transition"
            >
              <Settings className="w-4 h-4" />
              {showSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <button
              onClick={refresh}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-dark-600 rounded-lg hover:bg-dark-500 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={exportCSV}
              disabled={!history.length}
              className="flex items-center gap-2 px-4 py-2 bg-regen-500 text-black font-bold rounded-lg hover:bg-regen-400 transition disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Collapsible Settings Panel */}
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
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
                onClick={() => {
                  setApiSettings({ fredApiKey: apiKeyInput, useLiveData: true })
                  setShowSettings(false)
                }}
                disabled={!apiKeyInput}
                className="px-4 py-2 bg-regen-500 text-black font-bold rounded-lg hover:bg-regen-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
            <p className="text-gray-500 text-sm mt-2">
              Get a free API key from{' '}
              <a
                href="https://fred.stlouisfed.org/docs/api/api_key.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-regen-400 hover:underline"
              >
                FRED
              </a>
            </p>
          </motion.div>
        )}

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Gauge - Takes 1 column */}
          <div className="glass-card rounded-2xl p-6 flex flex-col items-center justify-center">
            <RecessionGauge
              probability={data.recession_probability}
              alertLevel={data.alert_level}
            />
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-400">As of {data.date}</p>
            </div>
          </div>

          {/* NIV Score + Trend - Takes 2 columns */}
          <div className="lg:col-span-2 glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold">NIV Score</h3>
                <p className="text-sm text-gray-400">National Impact Velocity</p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-mono font-bold text-regen-400">
                  {data.niv_score.toFixed(1)}
                </div>
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
          />
          <ComponentCard
            title="Efficiency (P)"
            value={data.components.efficiency}
            status={data.components.interpretation.efficiency_status}
            icon={<TrendingUp className="w-6 h-6" />}
            trend={data.components.efficiency > 0.01 ? 'up' : 'down'}
          />
          <ComponentCard
            title="Slack (X)"
            value={data.components.slack}
            status={data.components.interpretation.slack_status}
            icon={<BarChart3 className="w-6 h-6" />}
            trend={data.components.slack < 0.2 ? 'up' : 'down'}
          />
          <ComponentCard
            title="Drag (F)"
            value={data.components.drag}
            status={data.components.interpretation.drag_status}
            icon={<TrendingDown className="w-6 h-6" />}
            trend={data.components.drag < 0.03 ? 'up' : 'down'}
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
                Leads by ~{data.vs_fed.niv_lead_months} months
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
}: {
  title: string
  value: number
  status: string
  icon: React.ReactNode
  trend: 'up' | 'down'
}) {
  const color = trend === 'up' ? '#22c55e' : '#ef4444'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-xl p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div style={{ color }}>{icon}</div>
        {trend === 'up' ? (
          <TrendingUp className="w-4 h-4 text-regen-400" />
        ) : (
          <TrendingDown className="w-4 h-4 text-red-400" />
        )}
      </div>
      <h4 className="text-sm text-gray-400 mb-1">{title}</h4>
      <div className="text-2xl font-mono font-bold mb-2" style={{ color }}>
        {value.toFixed(3)}
      </div>
      <p className="text-xs text-gray-500">{status}</p>
    </motion.div>
  )
}
