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
  Brush,
} from 'recharts'
import { Calendar, Download, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { useSessionStore } from '@/store/sessionStore'
import { calculateNIVFromFRED, checkServerApiKey } from '@/lib/fredApi'

interface HistoricalDataPoint {
  date: string
  niv: number
}

// Helper to get date 5 years ago for faster default loading
const getDefaultStartDate = (): string => {
  const date = new Date()
  date.setFullYear(date.getFullYear() - 5)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

const getDefaultEndDate = (): string => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export default function ExplorerPage() {
  const { apiSettings, setApiSettings } = useSessionStore()
  const [data, setData] = useState<HistoricalDataPoint[]>([])
  const [allData, setAllData] = useState<HistoricalDataPoint[]>([])
  const [startDate, setStartDate] = useState(getDefaultStartDate)
  const [endDate, setEndDate] = useState(getDefaultEndDate)
  const [loading, setLoading] = useState(false)
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
        setApiSettings({ useLiveData: true })
      }
      setCheckingServerKey(false)
    }
    checkServer()
  }, [])

  // Fetch historical data
  const fetchData = async () => {
    const canFetch = hasServerKey || (apiSettings.fredApiKey && apiSettings.useLiveData)
    if (!canFetch) {
      setData([])
      setAllData([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Fetch full historical data from 1960
      const endDateStr = new Date().toISOString().split('T')[0]

      const apiKeyToUse = hasServerKey ? '' : apiSettings.fredApiKey
      const nivData = await calculateNIVFromFRED(
        apiKeyToUse,
        '1960-01-01',
        endDateStr,
        { eta: 1.5, weights: { thrust: 1, efficiency: 1, slack: 1, drag: 1 }, smoothWindow: 1 }
      )

      const historicalData: HistoricalDataPoint[] = nivData.map(point => ({
        date: point.date.substring(0, 7),
        niv: point.niv * 100,
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
    if (!checkingServerKey) {
      fetchData()
    }
  }, [apiSettings.fredApiKey, apiSettings.useLiveData, hasServerKey, checkingServerKey])

  useEffect(() => {
    if (allData.length > 0) {
      filterData(allData, startDate, endDate)
    }
  }, [startDate, endDate, allData])

  const exportCSV = () => {
    if (!data.length) return

    const csv = [
      'date,niv_score',
      ...data.map(d => `${d.date},${d.niv.toFixed(2)}`)
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `niv_data_${startDate}_${endDate}.csv`
    a.click()
  }

  // Still checking server key
  if (checkingServerKey) {
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
              <h1 className="text-3xl font-bold">Historical Explorer</h1>
              <p className="text-gray-400">60+ years of NIV data from FRED</p>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">Unable to load data</p>
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

          <div className="glass-card rounded-2xl p-12 text-center max-w-lg mx-auto">
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
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
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
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-bold mb-4">NIV Score Over Time</h3>
          <div className="h-[500px]">
            {data.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />

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
                    formatter={(value: number) => [value.toFixed(2), 'NIV Score']}
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
      </div>
    </div>
  )
}
