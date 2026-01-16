'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  AreaChart,
  Area,
} from 'recharts'
import { Loader2, Dice5, TrendingUp, TrendingDown, Target, Settings2 } from 'lucide-react'
import { useSessionStore } from '@/store/sessionStore'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.regenerationism.ai'

interface MonteCarloResult {
  numDraws: number
  windowSize: number
  currentProbability: number
  mean: number
  stdDev: number
  percentiles: {
    p5: number
    p10: number
    p25: number
    p50: number
    p75: number
    p90: number
    p95: number
  }
  distribution: Array<{
    rangeStart: number
    rangeEnd: number
    count: number
    frequency: number
  }>
  cumulativeDistribution: Array<{
    probability: number
    cumulativeFrequency: number
  }>
}

export default function MonteCarloRunner() {
  const { params, monteCarloConfig, setMonteCarloConfig, setMonteCarloResults } = useSessionStore()

  const [result, setResult] = useState<MonteCarloResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Local config state
  const [numDraws, setNumDraws] = useState(monteCarloConfig.numDraws)
  const [windowSize, setWindowSize] = useState(monteCarloConfig.windowSize)

  const runMonteCarlo = async () => {
    setIsRunning(true)
    setError(null)

    // Update global config
    setMonteCarloConfig({ numDraws, windowSize })

    try {
      const response = await fetch(`${API_URL}/api/v1/monte-carlo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          num_draws: numDraws,
          window_size: windowSize,
          eta: params.eta,
        }),
      })

      if (!response.ok) {
        throw new Error(`Monte Carlo failed: ${response.statusText}`)
      }

      const data = await response.json()

      // Transform response
      const transformed: MonteCarloResult = {
        numDraws: data.num_draws,
        windowSize: data.window_size,
        currentProbability: data.current_probability,
        mean: data.distribution.mean,
        stdDev: data.distribution.std_dev,
        percentiles: {
          p5: data.percentiles.p5,
          p10: data.percentiles.p10,
          p25: data.percentiles.p25,
          p50: data.percentiles.p50,
          p75: data.percentiles.p75,
          p90: data.percentiles.p90,
          p95: data.percentiles.p95,
        },
        distribution: data.distribution.buckets.map((b: any) => ({
          rangeStart: b.range_start,
          rangeEnd: b.range_end,
          count: b.count,
          frequency: b.frequency,
        })),
        cumulativeDistribution: [],
      }

      // Calculate cumulative distribution
      let cumulative = 0
      transformed.cumulativeDistribution = transformed.distribution.map((b) => {
        cumulative += b.frequency
        return {
          probability: b.rangeStart + (b.rangeEnd - b.rangeStart) / 2,
          cumulativeFrequency: cumulative,
        }
      })

      setResult(transformed)
      setMonteCarloResults({
        mean: transformed.mean,
        median: transformed.percentiles.p50,
        p5: transformed.percentiles.p5,
        p95: transformed.percentiles.p95,
        distribution: transformed.distribution.map((d) => d.frequency),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Monte Carlo simulation failed')
      generateMockResult()
    } finally {
      setIsRunning(false)
    }
  }

  const generateMockResult = () => {
    const distribution = []
    let total = 0
    const center = 32 + params.eta * 5
    const stdDev = 12

    for (let i = 0; i < 20; i++) {
      const rangeStart = i * 5
      const rangeEnd = rangeStart + 5
      const midpoint = rangeStart + 2.5
      const freq = Math.exp(-Math.pow(midpoint - center, 2) / (2 * stdDev * stdDev)) * 0.15
      total += freq
      distribution.push({
        rangeStart,
        rangeEnd,
        count: Math.round(freq * numDraws),
        frequency: freq,
      })
    }

    // Normalize
    distribution.forEach((d) => (d.frequency /= total))

    let cumulative = 0
    const cumulativeDistribution = distribution.map((b) => {
      cumulative += b.frequency
      return {
        probability: b.rangeStart + (b.rangeEnd - b.rangeStart) / 2,
        cumulativeFrequency: cumulative,
      }
    })

    setResult({
      numDraws,
      windowSize,
      currentProbability: center,
      mean: center,
      stdDev,
      percentiles: {
        p5: center - 1.645 * stdDev,
        p10: center - 1.282 * stdDev,
        p25: center - 0.674 * stdDev,
        p50: center,
        p75: center + 0.674 * stdDev,
        p90: center + 1.282 * stdDev,
        p95: center + 1.645 * stdDev,
      },
      distribution,
      cumulativeDistribution,
    })
  }

  return (
    <div className="glass-card rounded-2xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Dice5 className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="font-bold text-white">Monte Carlo Simulation</h3>
            <p className="text-xs text-gray-400">
              Sample historical windows to estimate probability distribution
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2 rounded-lg transition ${
            showSettings ? 'bg-purple-500/20 text-purple-400' : 'bg-dark-700 text-gray-400 hover:text-white'
          }`}
        >
          <Settings2 size={18} />
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="p-4 bg-dark-700/50 rounded-xl border border-white/5 space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Number of Draws</label>
              <select
                value={numDraws}
                onChange={(e) => setNumDraws(parseInt(e.target.value))}
                className="w-full bg-dark-600 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value={100}>100 draws</option>
                <option value={500}>500 draws</option>
                <option value={1000}>1,000 draws</option>
                <option value={5000}>5,000 draws</option>
                <option value={10000}>10,000 draws</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Window Size (months)</label>
              <select
                value={windowSize}
                onChange={(e) => setWindowSize(parseInt(e.target.value))}
                className="w-full bg-dark-600 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value={12}>12 months (1 year)</option>
                <option value={24}>24 months (2 years)</option>
                <option value={36}>36 months (3 years)</option>
                <option value={60}>60 months (5 years)</option>
                <option value={120}>120 months (10 years)</option>
              </select>
            </div>
          </div>
        </motion.div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg text-sm text-yellow-200">
          {error} - Using demo data
        </div>
      )}

      {/* Run Button */}
      <button
        onClick={runMonteCarlo}
        disabled={isRunning}
        className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-purple-600 to-purple-400 hover:from-purple-500 hover:to-purple-300 text-white font-bold rounded-xl transition disabled:opacity-50"
      >
        {isRunning ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Running {numDraws.toLocaleString()} draws...
          </>
        ) : (
          <>
            <Dice5 className="w-5 h-5" />
            Run Monte Carlo ({numDraws.toLocaleString()} draws)
          </>
        )}
      </button>

      {/* Results */}
      {result && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-3">
            <StatCard label="Mean" value={`${result.mean.toFixed(1)}%`} color="purple" />
            <StatCard label="Median (P50)" value={`${result.percentiles.p50.toFixed(1)}%`} color="regen" />
            <StatCard label="Std Dev" value={`${result.stdDev.toFixed(1)}%`} color="gray" />
            <StatCard
              label="Current"
              value={`${result.currentProbability.toFixed(1)}%`}
              color="blue"
            />
          </div>

          {/* Confidence Intervals */}
          <div className="p-4 bg-dark-700/50 rounded-xl">
            <h4 className="text-sm font-medium text-gray-400 mb-3">Confidence Intervals</h4>
            <div className="space-y-2">
              <ConfidenceBar
                label="90% CI"
                low={result.percentiles.p5}
                high={result.percentiles.p95}
                current={result.currentProbability}
              />
              <ConfidenceBar
                label="80% CI"
                low={result.percentiles.p10}
                high={result.percentiles.p90}
                current={result.currentProbability}
              />
              <ConfidenceBar
                label="50% CI"
                low={result.percentiles.p25}
                high={result.percentiles.p75}
                current={result.currentProbability}
              />
            </div>
          </div>

          {/* Distribution Chart */}
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-3">Probability Distribution</h4>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={result.distribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis
                    dataKey="rangeStart"
                    stroke="#666"
                    tick={{ fill: '#888', fontSize: 10 }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <YAxis
                    stroke="#666"
                    tick={{ fill: '#888', fontSize: 10 }}
                    tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1a1a',
                      border: '1px solid #333',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, 'Frequency']}
                    labelFormatter={(v) => `${v}% - ${v + 5}%`}
                  />
                  <ReferenceLine
                    x={Math.floor(result.currentProbability / 5) * 5}
                    stroke="#22c55e"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />
                  <Bar dataKey="frequency" radius={[2, 2, 0, 0]}>
                    {result.distribution.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={
                          entry.rangeStart <= result.currentProbability &&
                          entry.rangeEnd > result.currentProbability
                            ? '#22c55e'
                            : '#a855f7'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* CDF Chart */}
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-3">Cumulative Distribution (CDF)</h4>
            <div className="h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={result.cumulativeDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis
                    dataKey="probability"
                    stroke="#666"
                    tick={{ fill: '#888', fontSize: 10 }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <YAxis
                    stroke="#666"
                    tick={{ fill: '#888', fontSize: 10 }}
                    tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                    domain={[0, 1]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1a1a',
                      border: '1px solid #333',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, 'Cumulative']}
                  />
                  <ReferenceLine y={0.5} stroke="#666" strokeDasharray="3 3" />
                  <Area
                    type="monotone"
                    dataKey="cumulativeFrequency"
                    stroke="#a855f7"
                    fill="#a855f7"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color: 'purple' | 'regen' | 'gray' | 'blue'
}) {
  const colorClasses = {
    purple: 'text-purple-400',
    regen: 'text-regen-400',
    gray: 'text-gray-300',
    blue: 'text-blue-400',
  }

  return (
    <div className="p-3 bg-dark-700/50 rounded-lg text-center">
      <div className={`text-lg font-mono font-bold ${colorClasses[color]}`}>{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  )
}

function ConfidenceBar({
  label,
  low,
  high,
  current,
}: {
  label: string
  low: number
  high: number
  current: number
}) {
  // Scale to 0-100% width
  const lowPct = Math.max(0, low)
  const highPct = Math.min(100, high)
  const currentPct = Math.min(100, Math.max(0, current))

  return (
    <div className="flex items-center gap-3">
      <span className="w-16 text-xs text-gray-400">{label}</span>
      <div className="flex-1 relative h-6 bg-dark-600 rounded">
        {/* Range bar */}
        <div
          className="absolute h-full bg-purple-500/30 rounded"
          style={{
            left: `${lowPct}%`,
            width: `${highPct - lowPct}%`,
          }}
        />
        {/* Current marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-regen-400"
          style={{ left: `${currentPct}%` }}
        />
        {/* Labels */}
        <span
          className="absolute top-1/2 -translate-y-1/2 text-xs text-purple-400 font-mono"
          style={{ left: `${lowPct}%`, transform: 'translateX(-100%) translateY(-50%)' }}
        >
          {low.toFixed(0)}
        </span>
        <span
          className="absolute top-1/2 -translate-y-1/2 text-xs text-purple-400 font-mono"
          style={{ left: `${highPct}%`, transform: 'translateX(10%) translateY(-50%)' }}
        >
          {high.toFixed(0)}
        </span>
      </div>
    </div>
  )
}
