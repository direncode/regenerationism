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
  BarChart3
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
  alert_color: '#eab308',
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
    <div className="min-h-screen">
      {/* Red Alert Banner */}
      {isHighRisk && <RedAlertBanner probability={data.recession_probability} />}
      
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
                  href="/api-docs"
                  className="px-8 py-4 border border-gray-700 text-white font-bold rounded-lg hover:border-regen-500 hover:bg-regen-500/10 transition"
                >
                  API Access
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
