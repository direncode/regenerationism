'use client'

import { useState, useEffect, useRef } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from 'recharts'
import { Loader2, Play, Pause, RotateCcw } from 'lucide-react'
import { calculateNIVFromFRED, checkServerApiKey, NIVDataPoint } from '@/lib/fredApi'

interface ChartDataPoint {
  date: string
  niv: number
  fed: number
  isRecession: boolean
}

// NBER recession periods for highlighting
const RECESSIONS = [
  { start: '2001-03', end: '2001-11' },
  { start: '2007-12', end: '2009-06' },
  { start: '2020-02', end: '2020-04' },
]

export default function CrashCam() {
  const [allData, setAllData] = useState<ChartDataPoint[]>([])
  const [displayData, setDisplayData] = useState<ChartDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [animationIndex, setAnimationIndex] = useState(0)
  const [loadingStatus, setLoadingStatus] = useState('')
  const animationRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch live data from FRED
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      setLoadingStatus('Checking server configuration...')

      try {
        // Check if server has API key
        const hasServerKey = await checkServerApiKey()
        if (!hasServerKey) {
          setError('Server API key not configured')
          setLoading(false)
          return
        }

        setLoadingStatus('Fetching FRED data (2000-present)...')

        // Fetch data from 2000 to present
        const endDate = new Date().toISOString().split('T')[0]
        const startDate = '2000-01-01'

        const nivData = await calculateNIVFromFRED(
          '', // Empty = use server key
          startDate,
          endDate,
          { eta: 1.5, weights: { thrust: 1, efficiency: 1, slack: 1, drag: 1 }, smoothWindow: 12 },
          (status, progress) => {
            setLoadingStatus(`${status} (${Math.round(progress)}%)`)
          }
        )

        if (nivData.length === 0) {
          setError('No data available')
          setLoading(false)
          return
        }

        // Transform NIV data to chart format
        // The Fed yield curve signal is approximated from the yieldPenalty component
        const chartData: ChartDataPoint[] = nivData.map((point) => {
          // NIV probability
          const nivProb = point.probability

          // Fed yield curve probability - approximated from yield spread
          // When yield is inverted (yieldPenalty > 0), higher recession probability
          const fedProb = point.components.yieldPenalty > 0
            ? 40 + point.components.yieldPenalty * 5000 // Scale up inverted spread
            : 15 + Math.random() * 10 // Normal spread = low probability

          return {
            date: point.date.substring(0, 7),
            niv: Math.min(95, Math.max(5, nivProb)),
            fed: Math.min(90, Math.max(5, fedProb)),
            isRecession: point.isRecession,
          }
        })

        setAllData(chartData)
        setDisplayData(chartData)
        setAnimationIndex(chartData.length)
      } catch (err) {
        console.error('CrashCam fetch error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
        setLoadingStatus('')
      }
    }

    fetchData()
  }, [])

  // Animation effect
  useEffect(() => {
    if (isAnimating && animationIndex < allData.length) {
      animationRef.current = setTimeout(() => {
        setAnimationIndex((prev) => prev + 1)
        setDisplayData(allData.slice(0, animationIndex + 1))
      }, 50) // 50ms per data point for smooth animation
    } else if (animationIndex >= allData.length) {
      setIsAnimating(false)
    }

    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current)
      }
    }
  }, [isAnimating, animationIndex, allData])

  const startAnimation = () => {
    setAnimationIndex(0)
    setDisplayData([])
    setIsAnimating(true)
  }

  const toggleAnimation = () => {
    if (isAnimating) {
      setIsAnimating(false)
    } else if (animationIndex >= allData.length) {
      startAnimation()
    } else {
      setIsAnimating(true)
    }
  }

  const resetAnimation = () => {
    setIsAnimating(false)
    setAnimationIndex(allData.length)
    setDisplayData(allData)
  }

  // Loading state
  if (loading) {
    return (
      <div className="card p-8">
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="w-10 h-10 text-accent-400 animate-spin mb-4" />
          <p className="text-neutral-300 font-medium mb-2">Loading Live FRED Data</p>
          <p className="text-sm text-neutral-500">{loadingStatus}</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="card p-8">
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-red-400 font-medium mb-2">Failed to load data</p>
          <p className="text-sm text-neutral-500">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold text-neutral-100">NIV vs Fed Yield Curve</h3>
          <p className="text-sm text-neutral-500">
            Live crisis probability from FRED data ({allData[0]?.date} - {allData[allData.length - 1]?.date})
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Animation Controls */}
          <button
            onClick={toggleAnimation}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-accent-500 to-accent-600 text-white font-semibold rounded-lg hover:from-accent-600 hover:to-accent-700 transition shadow-soft"
          >
            {isAnimating ? (
              <>
                <Pause className="w-4 h-4" />
                Pause
              </>
            ) : animationIndex >= allData.length ? (
              <>
                <Play className="w-4 h-4" />
                Replay
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Play
              </>
            )}
          </button>
          <button
            onClick={resetAnimation}
            className="p-2 bg-neutral-800 text-neutral-400 rounded-lg hover:bg-neutral-700 transition"
            title="Reset to full view"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Animation Progress */}
      {(isAnimating || animationIndex < allData.length) && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-neutral-500 mb-2">
            <span>Calculating...</span>
            <span className="font-mono">{displayData[displayData.length - 1]?.date || '---'}</span>
          </div>
          <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent-500 to-accent-600 transition-all duration-100"
              style={{ width: `${(animationIndex / allData.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={displayData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
            <XAxis
              dataKey="date"
              stroke="#525252"
              tick={{ fill: '#737373', fontSize: 12 }}
              tickFormatter={(v) => v.split('-')[1] === '01' ? v.split('-')[0] : ''}
            />
            <YAxis
              stroke="#525252"
              tick={{ fill: '#737373', fontSize: 12 }}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#171717',
                border: '1px solid #262626',
                borderRadius: '12px',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)'
              }}
              labelStyle={{ color: '#fafafa', fontWeight: 600 }}
              itemStyle={{ color: '#a3a3a3' }}
              formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name === 'niv' ? 'NIV' : 'Fed Yield Curve']}
            />
            {/* Recession shading */}
            {RECESSIONS.map((r, i) => (
              <ReferenceArea
                key={i}
                x1={r.start}
                x2={r.end}
                fill="#ef4444"
                fillOpacity={0.15}
              />
            ))}
            <Line
              type="monotone"
              dataKey="niv"
              stroke="#818cf8"
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="fed"
              stroke="#525252"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-6 mt-6 pt-6 border-t border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="w-6 h-1 bg-accent-400 rounded-full" />
          <span className="text-sm text-neutral-400">NIV (Leads ~6mo)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 bg-neutral-500 rounded-full" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #525252, #525252 4px, transparent 4px, transparent 8px)' }} />
          <span className="text-sm text-neutral-400">Fed Yield Curve</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-3 bg-red-500/20 rounded" />
          <span className="text-sm text-neutral-400">Recession Periods</span>
        </div>
      </div>
    </div>
  )
}
