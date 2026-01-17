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
  Key,
  Loader2
} from 'lucide-react'
import RecessionGauge from '@/components/RecessionGauge'
import CrashCam from '@/components/CrashCam'
import RedAlertBanner from '@/components/RedAlertBanner'
import { useSessionStore } from '@/store/sessionStore'
import { calculateNIVFromFRED, NIVDataPoint, checkServerApiKey } from '@/lib/fredApi'

interface NIVData {
  date: string
  niv_score: number
  recession_probability: number
  alert_level: string
  components: {
    thrust: number
    efficiency: number
    slack: number
    drag: number
  }
}

export default function Home() {
  const { apiSettings, setApiSettings } = useSessionStore()
  const [data, setData] = useState<NIVData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasServerKey, setHasServerKey] = useState<boolean | null>(null)

  // Check for server key and fetch data
  useEffect(() => {
    const initAndFetch = async () => {
      setLoading(true)

      // Check if server has API key
      const serverHasKey = await checkServerApiKey()
      setHasServerKey(serverHasKey)

      if (serverHasKey) {
        setApiSettings({ useLiveData: true })
      }

      // Can fetch if server has key OR client has key
      const canFetch = serverHasKey || (apiSettings.fredApiKey && apiSettings.useLiveData)
      if (!canFetch) {
        setLoading(false)
        setData(null)
        return
      }

      setError(null)

      try {
        // Get last year of data to get the latest point
        const endDate = new Date().toISOString().split('T')[0]
        const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

        const apiKeyToUse = serverHasKey ? '' : apiSettings.fredApiKey
        const nivData = await calculateNIVFromFRED(
          apiKeyToUse,
          startDate,
          endDate,
          { eta: 1.5, weights: { thrust: 1, efficiency: 1, slack: 1, drag: 1 }, smoothWindow: 12 }
        )

        if (nivData.length > 0) {
          const latest = nivData[nivData.length - 1]
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
            }
          })
        }
      } catch (e) {
        console.error('Failed to fetch FRED data:', e)
        setError(e instanceof Error ? e.message : 'Failed to fetch data')
      } finally {
        setLoading(false)
      }
    }
    initAndFetch()
  }, [apiSettings.fredApiKey, apiSettings.useLiveData])

  const isHighRisk = data ? data.recession_probability > 50 : false

  return (
    <div className="min-h-screen">
      {/* Red Alert Banner */}
      {isHighRisk && data && <RedAlertBanner probability={data.recession_probability} />}

      {/* Hero Section */}
      <section className="relative py-20 px-6 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 grid-background opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-dark-900/50 to-dark-900" />

        <div className="relative max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-regen-500/10 border border-regen-500/20 mb-6">
                <Activity className="w-4 h-4 text-regen-400" />
                <span className="text-sm text-regen-400">Live Economic Intelligence</span>
              </div>

              <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
                <span className="gradient-text">Predict Crises</span>
                <br />
                <span className="text-white">Before They Hit</span>
              </h1>

              <p className="text-xl text-gray-400 mb-8 max-w-xl">
                The National Impact Velocity (NIV) detects liquidity shocks and recessions
                <strong className="text-white"> 6 months before the Fed Yield Curve</strong>.
                Proven 0.85 AUC on out-of-sample data.
              </p>

              <div className="flex flex-wrap gap-4">
                <Link
                  href="/dashboard"
                  className="px-8 py-4 bg-regen-500 text-black font-bold rounded-lg hover:bg-regen-400 transition flex items-center gap-2"
                >
                  View Dashboard
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/methodology"
                  className="px-8 py-4 border border-gray-700 text-white font-bold rounded-lg hover:border-regen-500 hover:bg-regen-500/10 transition"
                >
                  Learn Methodology
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
              {loading ? (
                <div className="flex flex-col items-center justify-center p-12 glass-card rounded-2xl">
                  <Loader2 className="w-12 h-12 text-regen-400 animate-spin mb-4" />
                  <p className="text-gray-400">Loading live FRED data...</p>
                </div>
              ) : data ? (
                <RecessionGauge
                  probability={data.recession_probability}
                  alertLevel={data.alert_level}
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-12 glass-card rounded-2xl">
                  <Activity className="w-12 h-12 text-gray-500 mb-4" />
                  <p className="text-gray-400">Unable to load data</p>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Crash Cam Section */}
      <section className="py-16 px-6 bg-dark-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              The <span className="gradient-text">Crash Cam</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              NIV vs Fed Yield Curve recession probability. Watch how NIV detected 
              2008 and 2020 months before traditional indicators.
            </p>
          </div>
          
          <CrashCam />
        </div>
      </section>
      
      {/* Components Section */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Inside the NIV Engine</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Four components measure the economy's kinetic throughput — the speed at
              which capital regenerates vs. friction losses.
            </p>
          </div>

          {data ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <ComponentCard
                title="Thrust (u)"
                value={data.components.thrust}
                description="Fiscal + Monetary impulse minus rate drag"
                icon={<Zap className="w-6 h-6" />}
                color={data.components.thrust > 0 ? '#22c55e' : '#ef4444'}
              />
              <ComponentCard
                title="Efficiency (P)"
                value={data.components.efficiency}
                description="Investment productivity, squared to punish hollow growth"
                icon={<TrendingUp className="w-6 h-6" />}
                color={data.components.efficiency > 0.01 ? '#22c55e' : '#eab308'}
              />
              <ComponentCard
                title="Slack (X)"
                value={data.components.slack}
                description="Unused capacity = economic headroom"
                icon={<BarChart3 className="w-6 h-6" />}
                color={data.components.slack < 0.2 ? '#22c55e' : '#f97316'}
              />
              <ComponentCard
                title="Drag (F)"
                value={data.components.drag}
                description="Friction from spreads, rates, and volatility"
                icon={<TrendingDown className="w-6 h-6" />}
                color={data.components.drag < 0.03 ? '#22c55e' : '#ef4444'}
              />
            </div>
          ) : loading ? (
            <div className="glass-card rounded-2xl p-8 text-center">
              <Loader2 className="w-8 h-8 text-regen-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Loading component data...</p>
            </div>
          ) : (
            <div className="glass-card rounded-2xl p-8 text-center">
              <p className="text-gray-400">Component data unavailable</p>
            </div>
          )}
        </div>
      </section>
      
      {/* Formula Section */}
      <section className="py-16 px-6 bg-dark-800">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-8">The Master Formula</h2>
          
          <div className="glass-card rounded-2xl p-8 mb-8">
            <div className="font-mono text-2xl md:text-4xl text-regen-400 mb-6">
              NIV<sub>t</sub> = (u<sub>t</sub> · P<sub>t</sub><sup>2</sup>) / (X<sub>t</sub> + F<sub>t</sub>)<sup>η</sup>
            </div>
            
            <p className="text-gray-400">
              Where η = 1.5, capturing the nonlinear impact of friction on capital flow.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 text-left">
            <div className="glass-card rounded-xl p-6">
              <Shield className="w-8 h-8 text-regen-400 mb-4" />
              <h3 className="font-bold mb-2">0.85 AUC</h3>
              <p className="text-sm text-gray-400">
                Out-of-sample recession prediction accuracy, beating the Fed Yield Curve.
              </p>
            </div>
            <div className="glass-card rounded-xl p-6">
              <Zap className="w-8 h-8 text-regen-400 mb-4" />
              <h3 className="font-bold mb-2">6-Month Lead</h3>
              <p className="text-sm text-gray-400">
                NIV signals liquidity stress months before traditional indicators.
              </p>
            </div>
            <div className="glass-card rounded-xl p-6">
              <Activity className="w-8 h-8 text-regen-400 mb-4" />
              <h3 className="font-bold mb-2">Real-Time</h3>
              <p className="text-sm text-gray-400">
                Updated monthly from FRED data. API access for quants and researchers.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">
            Stop Reacting. <span className="gradient-text">Start Predicting.</span>
          </h2>
          <p className="text-xl text-gray-400 mb-8">
            Join hedge funds and policymakers using NIV for crisis alpha.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4">
            <Link 
              href="/dashboard"
              className="px-8 py-4 bg-regen-500 text-black font-bold rounded-lg hover:bg-regen-400 transition flex items-center gap-2"
            >
              Launch Dashboard
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link 
              href="/explorer"
              className="px-8 py-4 border border-gray-700 text-white font-bold rounded-lg hover:border-regen-500 transition"
            >
              Explore 60 Years of Data
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
  value, 
  description, 
  icon, 
  color 
}: {
  title: string
  value: number
  description: string
  icon: React.ReactNode
  color: string
}) {
  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div style={{ color }}>{icon}</div>
        <span 
          className="font-mono text-2xl font-bold"
          style={{ color }}
        >
          {value.toFixed(3)}
        </span>
      </div>
      <h3 className="font-bold mb-2">{title}</h3>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
  )
}
