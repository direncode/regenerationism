'use client'

import { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  Brush,
} from 'recharts'
import { Calendar, Download, Key, Loader2, AlertCircle, RefreshCw, Eye, EyeOff } from 'lucide-react'
import { useSessionStore } from '@/store/sessionStore'
import { calculateNIVFromFRED, NIVDataPoint } from '@/lib/fredApi'

interface HistoricalDataPoint {
  date: string
  niv: number
  probability: number
  isRecession: boolean
}

// Known NBER recession periods for reference areas
const RECESSION_PERIODS = [
  { start: '1969-12', end: '1970-11', name: '1970 Recession' },
  { start: '1973-11', end: '1975-03', name: '1973-75 Recession' },
  { start: '1980-01', end: '1980-07', name: '1980 Recession' },
  { start: '1981-07', end: '1982-11', name: '1981-82 Recession' },
  { start: '1990-07', end: '1991-03', name: '1990-91 Recession' },
  { start: '2001-03', end: '2001-11', name: 'Dot-com Recession' },
  { start: '2007-12', end: '2009-06', name: 'Great Recession' },
  { start: '2020-02', end: '2020-04', name: 'COVID Recession' },
]

export default function ExplorerPage() {
  const { apiSettings, setApiSettings } = useSessionStore()
  const [data, setData] = useState<HistoricalDataPoint[]>([])
  const [allData, setAllData] = useState<HistoricalDataPoint[]>([])
  const [startDate, setStartDate] = useState('2000-01')
  const [endDate, setEndDate] = useState('2026-01')
  const [showRecessions, setShowRecessions] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [apiKeyInput, setApiKeyInput] = useState(apiSettings.fredApiKey || '')
  const [showApiKey, setShowApiKey] = useState(false)

  // Fetch historical data
  const fetchData = async () => {
    if (!apiSettings.fredApiKey || !apiSettings.useLiveData) {
      setData([])
      setAllData([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Fetch maximum historical data (FRED has data back to 1960s for most series)
      const nivData = await calculateNIVFromFRED(
        apiSettings.fredApiKey,
        '1960-01-01',
        new Date().toISOString().split('T')[0],
        { eta: 1.5, weights: { thrust: 1, efficiency: 1, slack: 1, drag: 1 }, smoothWindow: 12 }
      )

      const historicalData: HistoricalDataPoint[] = nivData.map(point => ({
        date: point.date.substring(0, 7),
        niv: point.niv * 100,
        probability: point.probability,
        isRecession: point.isRecession,
      }))

      setAllData(historicalData)
      filterData(historicalData, startDate, endDate)
    } catch (e) {
      console.error('Failed to fetch historical FRED data:', e)
      setError(e instanceof Error ? e.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  const filterData = (source: HistoricalDataPoint[], start: string, end: string) => {
    const filtered = source.filter(d => d.date >= start && d.date <= end)
    setData(filtered)
  }

  useEffect(() => {
    fetchData()
  }, [apiSettings.fredApiKey, apiSettings.useLiveData])

  useEffect(() => {
    if (allData.length > 0) {
      filterData(allData, startDate, endDate)
    }
  }, [startDate, endDate, allData])

  const recessionPeriods = RECESSION_PERIODS.filter(r =>
    r.start >= startDate && r.end <= endDate
  )

  const exportCSV = () => {
    if (!data.length) return

    const csv = [
      'date,niv_score,recession_probability,is_recession',
      ...data.map(d => `${d.date},${d.niv.toFixed(2)},${d.probability.toFixed(2)},${d.isRecession}`)
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `niv_data_${startDate}_${endDate}.csv`
    a.click()
  }

  // No API key configured
  if (!apiSettings.fredApiKey || !apiSettings.useLiveData) {
    return (
      <div className="min-h-screen py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold">Historical Explorer</h1>
              <p className="text-gray-400">60+ years of NIV data from FRED</p>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-12 text-center max-w-lg mx-auto">
            <div className="w-20 h-20 mx-auto mb-6 bg-blue-500/20 rounded-full flex items-center justify-center">
              <Key className="w-10 h-10 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Connect to Live FRED Data</h2>
            <p className="text-gray-400 mb-6">
              Enter your FRED API key to explore 60+ years of historical economic data.
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
  if (loading && data.length === 0) {
    return (
      <div className="min-h-screen py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold">Historical Explorer</h1>
              <p className="text-gray-400">60+ years of NIV data from FRED</p>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-12 text-center">
            <Loader2 className="w-12 h-12 text-regen-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Loading historical FRED data...</p>
            <p className="text-sm text-gray-500 mt-2">This may take a moment for 60+ years of data</p>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error && data.length === 0) {
    return (
      <div className="min-h-screen py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold">Historical Explorer</h1>
              <p className="text-gray-400">60+ years of NIV data from FRED</p>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-12 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2 text-red-400">Failed to Load Data</h2>
            <p className="text-gray-400 mb-6">{error}</p>
            <button
              onClick={fetchData}
              className="inline-flex items-center gap-2 px-4 py-2 bg-dark-600 rounded-lg hover:bg-dark-500 transition"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  const dataYears = allData.length > 0
    ? Math.round((new Date(allData[allData.length - 1].date).getTime() - new Date(allData[0].date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : 0

  return (
    <div className="min-h-screen py-8 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Historical Explorer</h1>
            <p className="text-gray-400">
              {dataYears}+ years of NIV data ({allData[0]?.date || '---'} - present)
            </p>
          </div>
          <button
            onClick={exportCSV}
            disabled={!data.length}
            className="flex items-center gap-2 px-4 py-2 bg-regen-500 text-black font-bold rounded-lg hover:bg-regen-400 transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* Filters */}
        <div className="glass-card rounded-xl p-4 mb-6">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              <input
                type="month"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-dark-600 border border-white/10 rounded-lg px-3 py-2 text-sm"
              />
              <span className="text-gray-400">to</span>
              <input
                type="month"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-dark-600 border border-white/10 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showRecessions}
                onChange={(e) => setShowRecessions(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-gray-400">Show recession periods</span>
            </label>

            <div className="flex gap-2 ml-auto">
              <button
                onClick={() => { setStartDate('2020-01'); setEndDate('2026-01') }}
                className="px-3 py-1 text-sm bg-dark-600 rounded-lg hover:bg-dark-500"
              >
                5Y
              </button>
              <button
                onClick={() => { setStartDate('2015-01'); setEndDate('2026-01') }}
                className="px-3 py-1 text-sm bg-dark-600 rounded-lg hover:bg-dark-500"
              >
                10Y
              </button>
              <button
                onClick={() => { setStartDate('2000-01'); setEndDate('2026-01') }}
                className="px-3 py-1 text-sm bg-dark-600 rounded-lg hover:bg-dark-500"
              >
                25Y
              </button>
              <button
                onClick={() => {
                  if (allData.length > 0) {
                    setStartDate(allData[0].date)
                    setEndDate(allData[allData.length - 1].date)
                  }
                }}
                className="px-3 py-1 text-sm bg-dark-600 rounded-lg hover:bg-dark-500"
              >
                All
              </button>
            </div>
          </div>
        </div>

        {/* Main Chart */}
        <div className="glass-card rounded-2xl p-6 mb-6">
          <h3 className="text-lg font-bold mb-4">NIV Score Over Time</h3>
          <div className="h-[500px]">
            {data.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />

                  {showRecessions && recessionPeriods.map((period, i) => (
                    <ReferenceArea
                      key={i}
                      x1={period.start}
                      x2={period.end}
                      fill="#ef4444"
                      fillOpacity={0.15}
                    />
                  ))}

                  <XAxis
                    dataKey="date"
                    stroke="#666"
                    tick={{ fill: '#888', fontSize: 11 }}
                    tickFormatter={(v) => v.split('-')[0]}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    stroke="#666"
                    tick={{ fill: '#888', fontSize: 11 }}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1a1a',
                      border: '1px solid #333',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number, name: string) => [
                      name === 'niv' ? value.toFixed(1) : `${value.toFixed(1)}%`,
                      name === 'niv' ? 'NIV Score' : 'Recession Prob'
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="niv"
                    stroke="#22c55e"
                    strokeWidth={1.5}
                    dot={false}
                  />
                  <Brush
                    dataKey="date"
                    height={30}
                    stroke="#333"
                    fill="#1a1a1a"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No data available for selected date range
              </div>
            )}
          </div>
        </div>

        {/* Recession Probability Chart */}
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-bold mb-4">Recession Probability</h3>
          <div className="h-[300px]">
            {data.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />

                  {showRecessions && recessionPeriods.map((period, i) => (
                    <ReferenceArea
                      key={i}
                      x1={period.start}
                      x2={period.end}
                      fill="#ef4444"
                      fillOpacity={0.15}
                    />
                  ))}

                  <XAxis
                    dataKey="date"
                    stroke="#666"
                    tick={{ fill: '#888', fontSize: 11 }}
                    tickFormatter={(v) => v.split('-')[0]}
                  />
                  <YAxis
                    stroke="#666"
                    tick={{ fill: '#888', fontSize: 11 }}
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1a1a',
                      border: '1px solid #333',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`${value.toFixed(1)}%`, 'Probability']}
                  />

                  {/* 50% threshold */}
                  <Line
                    type="monotone"
                    dataKey={() => 50}
                    stroke="#666"
                    strokeDasharray="5 5"
                    dot={false}
                  />

                  <Line
                    type="monotone"
                    dataKey="probability"
                    stroke="#f97316"
                    strokeWidth={1.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No data available for selected date range
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-orange-500" />
              <span className="text-sm text-gray-400">Recession Probability</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 border-t-2 border-dashed border-gray-500" />
              <span className="text-sm text-gray-400">50% Threshold</span>
            </div>
            {showRecessions && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500/20" />
                <span className="text-sm text-gray-400">NBER Recession</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
