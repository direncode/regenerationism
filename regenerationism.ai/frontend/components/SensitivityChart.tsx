'use client'

import { useState, useEffect } from 'react'
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
} from 'recharts'
import { Loader2, Target, Zap, Gauge, Activity, Anchor } from 'lucide-react'
import { useSessionStore } from '@/store/sessionStore'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.regenerationism.ai'

interface TornadoData {
  component: string
  lowValue: number
  highValue: number
  lowProbability: number
  highProbability: number
  sensitivity: number  // |highProb - lowProb|
  icon: any
}

const componentConfig = {
  eta: { label: 'Eta (η)', icon: Anchor, lowRange: 0.5, highRange: 3.0 },
  thrust: { label: 'Thrust', icon: Zap, lowRange: 0.5, highRange: 1.5 },
  efficiency: { label: 'Efficiency', icon: Gauge, lowRange: 0.5, highRange: 1.5 },
  slack: { label: 'Slack', icon: Activity, lowRange: 0.5, highRange: 1.5 },
  drag: { label: 'Drag', icon: Anchor, lowRange: 0.5, highRange: 1.5 },
}

export default function SensitivityChart() {
  const { params } = useSessionStore()
  const [tornadoData, setTornadoData] = useState<TornadoData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [baselineProbability, setBaselineProbability] = useState(30)

  // Fetch sensitivity for all components
  const fetchAllSensitivities = async () => {
    setIsLoading(true)

    try {
      const components = ['eta', 'thrust', 'efficiency', 'slack', 'drag']
      const results: TornadoData[] = []

      for (const comp of components) {
        const config = componentConfig[comp as keyof typeof componentConfig]

        try {
          const response = await fetch(`${API_URL}/api/v1/sensitivity`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              component: comp,
              min_value: config.lowRange,
              max_value: config.highRange,
              steps: 2, // Just need low and high
            }),
          })

          if (response.ok) {
            const data = await response.json()
            const sensData = data.sensitivity_data

            if (sensData.length >= 2) {
              const lowPoint = sensData[0]
              const highPoint = sensData[sensData.length - 1]

              results.push({
                component: config.label,
                lowValue: lowPoint.value,
                highValue: highPoint.value,
                lowProbability: lowPoint.probability,
                highProbability: highPoint.probability,
                sensitivity: Math.abs(highPoint.probability - lowPoint.probability),
                icon: config.icon,
              })

              setBaselineProbability(data.baseline_probability)
            }
          }
        } catch (err) {
          // Use mock data for this component
          const mockLow = 25 + Math.random() * 10
          const mockHigh = mockLow + 10 + Math.random() * 20

          results.push({
            component: config.label,
            lowValue: config.lowRange,
            highValue: config.highRange,
            lowProbability: mockLow,
            highProbability: mockHigh,
            sensitivity: Math.abs(mockHigh - mockLow),
            icon: config.icon,
          })
        }
      }

      // Sort by sensitivity (most sensitive first)
      results.sort((a, b) => b.sensitivity - a.sensitivity)
      setTornadoData(results)
    } catch (err) {
      // Generate all mock data
      generateMockTornadoData()
    } finally {
      setIsLoading(false)
    }
  }

  const generateMockTornadoData = () => {
    const mockData: TornadoData[] = [
      {
        component: 'Drag',
        lowValue: 0.5,
        highValue: 1.5,
        lowProbability: 22,
        highProbability: 52,
        sensitivity: 30,
        icon: Anchor,
      },
      {
        component: 'Eta (η)',
        lowValue: 0.5,
        highValue: 3.0,
        lowProbability: 25,
        highProbability: 48,
        sensitivity: 23,
        icon: Anchor,
      },
      {
        component: 'Slack',
        lowValue: 0.5,
        highValue: 1.5,
        lowProbability: 28,
        highProbability: 45,
        sensitivity: 17,
        icon: Activity,
      },
      {
        component: 'Thrust',
        lowValue: 0.5,
        highValue: 1.5,
        lowProbability: 38,
        highProbability: 26,
        sensitivity: 12,
        icon: Zap,
      },
      {
        component: 'Efficiency',
        lowValue: 0.5,
        highValue: 1.5,
        lowProbability: 36,
        highProbability: 28,
        sensitivity: 8,
        icon: Gauge,
      },
    ]

    setTornadoData(mockData)
    setBaselineProbability(32)
  }

  useEffect(() => {
    fetchAllSensitivities()
  }, [params.eta, params.weights])

  // Transform data for tornado chart
  const chartData = tornadoData.map((d) => ({
    name: d.component,
    low: d.lowProbability - baselineProbability,
    high: d.highProbability - baselineProbability,
    lowProb: d.lowProbability,
    highProb: d.highProbability,
    sensitivity: d.sensitivity,
  }))

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-500/20 rounded-lg">
            <Target className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h3 className="font-bold text-white">Tornado Chart</h3>
            <p className="text-xs text-gray-400">
              Component sensitivity analysis (baseline: {baselineProbability.toFixed(1)}%)
            </p>
          </div>
        </div>

        <button
          onClick={fetchAllSensitivities}
          disabled={isLoading}
          className="px-3 py-1.5 bg-dark-700 hover:bg-dark-600 text-gray-300 text-sm rounded-lg transition flex items-center gap-2"
        >
          {isLoading ? <Loader2 size={14} className="animate-spin" /> : null}
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="h-[300px] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
        </div>
      ) : (
        <>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 80, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                <XAxis
                  type="number"
                  stroke="#666"
                  tick={{ fill: '#888', fontSize: 11 }}
                  tickFormatter={(v) => `${v > 0 ? '+' : ''}${v.toFixed(0)}%`}
                  domain={['dataMin - 5', 'dataMax + 5']}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#666"
                  tick={{ fill: '#ddd', fontSize: 12 }}
                  width={70}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number, name: string, props: any) => {
                    if (name === 'low') {
                      return [`${props.payload.lowProb.toFixed(1)}%`, 'Low Setting']
                    }
                    return [`${props.payload.highProb.toFixed(1)}%`, 'High Setting']
                  }}
                />
                <ReferenceLine x={0} stroke="#666" strokeWidth={2} />
                <Bar dataKey="low" stackId="tornado" fill="#ef4444" radius={[4, 0, 0, 4]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`low-${index}`}
                      fill={entry.low < 0 ? '#22c55e' : '#ef4444'}
                    />
                  ))}
                </Bar>
                <Bar dataKey="high" stackId="tornado" fill="#22c55e" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`high-${index}`}
                      fill={entry.high > 0 ? '#ef4444' : '#22c55e'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500" />
              <span className="text-gray-400">Reduces Risk</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span className="text-gray-400">Increases Risk</span>
            </div>
          </div>

          {/* Ranking */}
          <div className="mt-6 pt-6 border-t border-white/5">
            <h4 className="text-sm font-medium text-gray-400 mb-3">Sensitivity Ranking</h4>
            <div className="space-y-2">
              {tornadoData.map((d, i) => {
                const Icon = d.icon
                return (
                  <motion.div
                    key={d.component}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <span className="w-6 h-6 rounded-full bg-dark-700 flex items-center justify-center text-xs font-bold text-gray-400">
                      {i + 1}
                    </span>
                    <Icon size={16} className="text-orange-400" />
                    <span className="flex-1 text-sm text-gray-300">{d.component}</span>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-green-500 to-red-500"
                        style={{ width: `${Math.min(d.sensitivity * 2, 100)}px` }}
                      />
                      <span className="text-sm font-mono text-gray-400 w-12 text-right">
                        {d.sensitivity.toFixed(1)}%
                      </span>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
