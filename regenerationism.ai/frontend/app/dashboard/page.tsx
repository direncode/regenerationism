'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  BarChart3,
  AlertTriangle,
  RefreshCw,
  Download,
} from 'lucide-react'
import RecessionGauge from '@/components/RecessionGauge'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts'

// Mock latest data
const mockData = {
  date: '2026-01-15',
  niv_score: 12.4,
  recession_probability: 32,
  alert_level: 'elevated',
  components: {
    thrust: 0.234,
    efficiency: 0.018,
    slack: 0.215,
    drag: 0.028,
    interpretation: {
      thrust_status: 'Moderate growth impulse',
      efficiency_status: 'Healthy investment levels',
      slack_status: 'Elevated slack',
      drag_status: 'Normal friction levels',
    }
  },
  vs_fed: {
    niv_signal: 'EXPANSION',
    yield_curve_signal: 'NORMAL',
    agreement: true,
    niv_lead_months: 6,
  }
}

// Mock historical for sparklines
const mockHistory = Array.from({ length: 24 }, (_, i) => ({
  date: `2024-${(i % 12 + 1).toString().padStart(2, '0')}`,
  niv: 10 + Math.random() * 20 + (i > 18 ? 10 : 0),
  prob: 20 + Math.random() * 20 + (i > 18 ? 15 : 0),
}))

export default function DashboardPage() {
  const [data, setData] = useState(mockData)
  const [history, setHistory] = useState(mockHistory)
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  
  const refresh = async () => {
    setLoading(true)
    // In production, fetch from API
    await new Promise(r => setTimeout(r, 500))
    setLastUpdate(new Date())
    setLoading(false)
  }
  
  return (
    <div className="min-h-screen py-8 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">NIV Dashboard</h1>
            <p className="text-gray-400">Real-time macro crisis detection</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              Updated: {lastUpdate.toLocaleTimeString()}
            </span>
            <button
              onClick={refresh}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-dark-600 rounded-lg hover:bg-dark-500 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-regen-500 text-black font-bold rounded-lg hover:bg-regen-400 transition">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
        
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
                data.vs_fed.niv_signal === 'EXPANSION' ? 'text-regen-400' : 'text-red-400'
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
                ✓ NIV and Fed Yield Curve are in agreement
              </p>
            ) : (
              <p className="text-yellow-400">
                ⚠ NIV and Fed Yield Curve are diverging — watch closely
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
