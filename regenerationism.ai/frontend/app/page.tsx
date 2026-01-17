'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  ArrowRight,
  Shield,
  Zap,
  BarChart3,
  Terminal,
  Database,
  Clock,
} from 'lucide-react'
import RecessionGauge from '@/components/RecessionGauge'
import CrashCam from '@/components/CrashCam'
import RedAlertBanner from '@/components/RedAlertBanner'

// Mock data - replace with API call
const mockLatest = {
  date: '2026-01-15',
  niv_score: 12.4,
  recession_probability: 32,
  alert_level: 'elevated',
  alert_color: '#ff9500',
  components: {
    thrust: 0.234,
    efficiency: 0.018,
    slack: 0.215,
    drag: 0.028,
  }
}

export default function Home() {
  const [data, setData] = useState(mockLatest)
  const [loading, setLoading] = useState(false)

  // Fetch latest data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/latest`)
        if (res.ok) {
          const json = await res.json()
          setData(json)
        }
      } catch (e) {
        console.log('Using mock data')
      }
    }
    fetchData()
  }, [])

  const isHighRisk = data.recession_probability > 50

  return (
    <div className="min-h-screen bg-terminal-bg">
      {/* Red Alert Banner */}
      {isHighRisk && <RedAlertBanner probability={data.recession_probability} />}

      {/* Hero Section */}
      <section className="relative py-16 px-4 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 grid-background opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-terminal-bg/50 to-terminal-bg" />

        <div className="relative max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 border border-bb-orange/30 bg-bb-orange/10 mb-6">
                <div className="w-2 h-2 rounded-full bg-bb-green animate-pulse" />
                <span className="text-xs font-mono text-bb-orange tracking-wide">LIVE ECONOMIC INTELLIGENCE</span>
              </div>

              <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight font-mono">
                <span className="text-bb-orange">PREDICT CRISES</span>
                <br />
                <span className="text-bb-white">BEFORE THEY HIT</span>
              </h1>

              <p className="text-base text-bb-gray mb-8 max-w-xl font-mono leading-relaxed">
                THE NATIONAL IMPACT VELOCITY (NIV) DETECTS LIQUIDITY SHOCKS AND RECESSIONS
                <span className="text-bb-orange"> 6 MONTHS BEFORE THE FED YIELD CURVE</span>.
                PROVEN 0.85 AUC ON OUT-OF-SAMPLE DATA.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/dashboard"
                  className="px-6 py-3 bg-bb-orange text-black font-mono font-bold text-sm tracking-wide hover:bg-bb-amber transition flex items-center gap-2"
                >
                  VIEW DASHBOARD
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/api-docs"
                  className="px-6 py-3 border border-bb-orange text-bb-orange font-mono font-bold text-sm tracking-wide hover:bg-bb-orange/10 transition"
                >
                  API ACCESS
                </Link>
              </div>
            </motion.div>

            {/* Right: Gauge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex justify-center"
            >
              <RecessionGauge
                probability={data.recession_probability}
                alertLevel={data.alert_level}
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Crash Cam Section */}
      <section className="py-12 px-4 bg-terminal-panel border-y border-terminal-border">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="terminal-panel-header inline-block px-3 py-1">
              CRASH CAM
            </div>
            <span className="text-xs font-mono text-bb-muted">
              NIV VS FED YIELD CURVE PERFORMANCE
            </span>
          </div>

          <CrashCam />
        </div>
      </section>

      {/* Components Section */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="terminal-panel-header inline-block px-3 py-1">
              NIV ENGINE
            </div>
            <span className="text-xs font-mono text-bb-muted">
              FOUR COMPONENTS MEASURING ECONOMIC KINETIC THROUGHPUT
            </span>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <ComponentCard
              title="THRUST"
              symbol="u"
              value={data.components.thrust}
              description="FISCAL + MONETARY IMPULSE MINUS RATE DRAG"
              icon={<Zap className="w-5 h-5" />}
              positive={data.components.thrust > 0}
            />
            <ComponentCard
              title="EFFICIENCY"
              symbol="P"
              value={data.components.efficiency}
              description="INVESTMENT PRODUCTIVITY, SQUARED TO PUNISH HOLLOW GROWTH"
              icon={<TrendingUp className="w-5 h-5" />}
              positive={data.components.efficiency > 0.01}
            />
            <ComponentCard
              title="SLACK"
              symbol="X"
              value={data.components.slack}
              description="UNUSED CAPACITY = ECONOMIC HEADROOM"
              icon={<BarChart3 className="w-5 h-5" />}
              positive={data.components.slack < 0.2}
            />
            <ComponentCard
              title="DRAG"
              symbol="F"
              value={data.components.drag}
              description="FRICTION FROM SPREADS, RATES, AND VOLATILITY"
              icon={<TrendingDown className="w-5 h-5" />}
              positive={data.components.drag < 0.03}
            />
          </div>
        </div>
      </section>

      {/* Formula Section */}
      <section className="py-12 px-4 bg-terminal-panel border-y border-terminal-border">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="terminal-panel-header inline-block px-3 py-1">
              MASTER FORMULA
            </div>
          </div>

          <div className="terminal-panel p-6 mb-8">
            <div className="font-mono text-2xl md:text-4xl text-bb-orange text-center mb-4">
              NIV<sub className="text-bb-gray">t</sub> = (u<sub className="text-bb-gray">t</sub> &middot; P<sub className="text-bb-gray">t</sub><sup>2</sup>) / (X<sub className="text-bb-gray">t</sub> + F<sub className="text-bb-gray">t</sub>)<sup>&eta;</sup>
            </div>

            <p className="text-center text-xs font-mono text-bb-muted">
              WHERE &eta; = 1.5, CAPTURING THE NONLINEAR IMPACT OF FRICTION ON CAPITAL FLOW
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <StatCard
              icon={<Shield className="w-6 h-6" />}
              value="0.85"
              label="AUC"
              description="OUT-OF-SAMPLE RECESSION PREDICTION ACCURACY"
            />
            <StatCard
              icon={<Clock className="w-6 h-6" />}
              value="6"
              label="MONTHS"
              description="LEAD TIME OVER FED YIELD CURVE SIGNALS"
            />
            <StatCard
              icon={<Database className="w-6 h-6" />}
              value="60+"
              label="YEARS"
              description="HISTORICAL DATA FROM FRED"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-mono font-bold mb-4 text-bb-white">
            STOP REACTING. <span className="text-bb-orange">START PREDICTING.</span>
          </h2>
          <p className="text-sm font-mono text-bb-gray mb-8">
            JOIN HEDGE FUNDS AND POLICYMAKERS USING NIV FOR CRISIS ALPHA.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/dashboard"
              className="px-6 py-3 bg-bb-orange text-black font-mono font-bold text-sm tracking-wide hover:bg-bb-amber transition flex items-center gap-2"
            >
              LAUNCH DASHBOARD
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/explorer"
              className="px-6 py-3 border border-terminal-border text-bb-gray font-mono font-bold text-sm tracking-wide hover:border-bb-orange hover:text-bb-orange transition"
            >
              EXPLORE 60 YEARS OF DATA
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

// Component Card
function ComponentCard({
  title,
  symbol,
  value,
  description,
  icon,
  positive,
}: {
  title: string
  symbol: string
  value: number
  description: string
  icon: React.ReactNode
  positive: boolean
}) {
  return (
    <div className="terminal-panel p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={positive ? 'text-bb-green' : 'text-bb-red'}>{icon}</span>
          <span className="font-mono text-xs text-bb-gray">{title}</span>
          <span className="font-mono text-xs text-bb-muted">({symbol})</span>
        </div>
        <span
          className={`font-mono text-lg font-bold ${positive ? 'text-bb-green' : 'text-bb-red'}`}
        >
          {value.toFixed(3)}
        </span>
      </div>
      <p className="text-xxs font-mono text-bb-muted leading-relaxed">{description}</p>
    </div>
  )
}

// Stat Card
function StatCard({
  icon,
  value,
  label,
  description,
}: {
  icon: React.ReactNode
  value: string
  label: string
  description: string
}) {
  return (
    <div className="terminal-panel p-4 text-center">
      <div className="text-bb-orange mb-3 flex justify-center">{icon}</div>
      <div className="font-mono">
        <span className="text-3xl font-bold text-bb-orange">{value}</span>
        <span className="text-sm text-bb-gray ml-1">{label}</span>
      </div>
      <p className="text-xxs font-mono text-bb-muted mt-2">{description}</p>
    </div>
  )
}
