'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Activity,
  ArrowRight,
  Shield,
  Zap,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Sparkles,
  LineChart,
  FlaskConical,
} from 'lucide-react'

// Static demo data for component cards
const DEMO_COMPONENTS = {
  thrust: 0.142,
  efficiency: 0.171,
  slack: 0.224,
  drag: 0.031,
}

export default function Home() {
  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Hero Section */}
      <section className="relative py-24 lg:py-32 px-6 overflow-hidden hero-gradient">
        <div className="absolute inset-0 grid-background opacity-30" />

        <div className="relative max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-500/10 border border-accent-500/20 mb-8">
              <Sparkles className="w-4 h-4 text-accent-400" />
              <span className="text-sm font-medium text-accent-300">Economic Intelligence Platform</span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight tracking-tight">
              <span className="text-neutral-100">Predict crises for</span>
              <br />
              <span className="gradient-text">researchers & quants</span>
            </h1>

            <p className="text-xl text-neutral-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              The National Impact Velocity (NIV) is a{' '}
              <strong className="text-neutral-100">novel systematic stress detector</strong>{' '}
              based on regeneration theory — measuring how efficiently capital flows through the economy.
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/dashboard"
                className="px-8 py-4 bg-gradient-to-r from-accent-500 to-accent-600 text-white font-semibold rounded-xl hover:from-accent-600 hover:to-accent-700 transition shadow-medium flex items-center gap-2"
              >
                View Live Dashboard
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/methodology"
                className="px-8 py-4 bg-neutral-900 border border-neutral-700 text-neutral-200 font-semibold rounded-xl hover:border-neutral-600 hover:bg-neutral-800 transition shadow-soft"
              >
                Learn Methodology
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid - Tinker style */}
      <section className="py-20 px-6 bg-neutral-900">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-100 mb-4">
              Your economic insight in four components
            </h2>
            <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
              Four components measure the economy's kinetic throughput — the speed at
              which capital regenerates vs. friction losses.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={<Zap className="w-6 h-6" />}
              title="thrust"
              subtitle="Fiscal + Monetary impulse"
              description="Net policy stimulus driving economic acceleration"
              value={DEMO_COMPONENTS.thrust}
              color="emerald"
            />
            <FeatureCard
              icon={<TrendingUp className="w-6 h-6" />}
              title="efficiency"
              subtitle="Investment productivity"
              description="Squared to punish hollow growth patterns"
              value={DEMO_COMPONENTS.efficiency}
              color="blue"
            />
            <FeatureCard
              icon={<BarChart3 className="w-6 h-6" />}
              title="slack"
              subtitle="Unused capacity"
              description="Economic headroom before overheating"
              value={DEMO_COMPONENTS.slack}
              color="amber"
            />
            <FeatureCard
              icon={<TrendingDown className="w-6 h-6" />}
              title="drag"
              subtitle="System friction"
              description="Spreads, rates, and volatility resistance"
              value={DEMO_COMPONENTS.drag}
              color="rose"
            />
          </div>
        </div>
      </section>

      {/* Formula Section */}
      <section className="py-20 px-6 bg-neutral-900">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-100 mb-4">
              The Master Formula
            </h2>
          </motion.div>

          {/* Main Formula */}
          <div className="card p-8 md:p-12 mb-8 text-center border border-accent-500/30">
            <div className="font-mono text-2xl md:text-4xl text-accent-400 mb-6">
              NIV<sub>t</sub> = (u<sub>t</sub> · P<sub>t</sub><sup>2</sup>) / (X<sub>t</sub> + F<sub>t</sub>)<sup>η</sup>
            </div>
            <p className="text-neutral-400 mb-6">
              National Impact Velocity — measures economic momentum vs. friction
            </p>
            <div className="text-sm text-neutral-500">
              Where η = 1.5 captures nonlinear crisis sensitivity
            </div>
          </div>

          {/* Component Formulas Grid */}
          <div className="grid md:grid-cols-2 gap-4 mb-12">
            <div className="card p-5 border-l-4 border-blue-500">
              <div className="font-mono text-blue-400 text-lg mb-2">
                u = tanh(<span className="text-green-400">+ΔG</span> <span className="text-green-400">+ΔA</span> <span className="text-red-400">−0.7Δr</span>)
              </div>
              <p className="text-neutral-500 text-sm">
                <strong className="text-neutral-300">Thrust:</strong> Investment growth + M2 growth − rate hikes
              </p>
            </div>
            <div className="card p-5 border-l-4 border-green-500">
              <div className="font-mono text-green-400 text-lg mb-2">
                P = (Investment × 1.15) / GDP
              </div>
              <p className="text-neutral-500 text-sm">
                <strong className="text-neutral-300">Efficiency:</strong> Capital productivity (squared in formula)
              </p>
            </div>
            <div className="card p-5 border-l-4 border-yellow-500">
              <div className="font-mono text-yellow-400 text-lg mb-2">
                X = 1 − (TCU / 100)
              </div>
              <p className="text-neutral-500 text-sm">
                <strong className="text-neutral-300">Slack:</strong> Economic headroom before overheating
              </p>
            </div>
            <div className="card p-5 border-l-4 border-red-500">
              <div className="font-mono text-red-400 text-lg mb-2">
                F = 0.4s + 0.4(r−π) + 0.2σ
              </div>
              <p className="text-neutral-500 text-sm">
                <strong className="text-neutral-300">Drag:</strong> Yield penalty + real rates + volatility
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <StatCard
              icon={<Shield className="w-6 h-6" />}
              value="4"
              label="Components"
              description="Thrust, efficiency, slack, and drag forces"
            />
            <StatCard
              icon={<Zap className="w-6 h-6" />}
              value="60+"
              label="Years of Data"
              description="Historical analysis back to 1960"
            />
            <StatCard
              icon={<Activity className="w-6 h-6" />}
              value="Live"
              label="Real-Time"
              description="Updated monthly from FRED data"
            />
          </div>
        </div>
      </section>

      {/* Use Cases / Testimonials Style */}
      <section className="py-20 px-6 bg-neutral-950">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-100 mb-4">
              Built for serious research
            </h2>
            <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
              Tools designed for hedge funds, policymakers, and academic researchers.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            <UseCaseCard
              icon={<FlaskConical className="w-8 h-8" />}
              title="Out-of-Sample Testing"
              description="Run rigorous backtests across 60+ years of economic data with proper train/test splits."
              link="/oos-tests"
              linkText="Run Tests"
            />
            <UseCaseCard
              icon={<LineChart className="w-8 h-8" />}
              title="Historical Explorer"
              description="Dive deep into NIV components across recessions, crises, and recoveries."
              link="/explorer"
              linkText="Explore Data"
            />
            <UseCaseCard
              icon={<Activity className="w-8 h-8" />}
              title="API Access"
              description="Integrate NIV calculations into your models with our REST API."
              link="/api-docs"
              linkText="View Docs"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-gradient-to-br from-accent-600 to-accent-700">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Stop reacting. Start predicting.
            </h2>
            <p className="text-xl text-accent-100 mb-10 max-w-2xl mx-auto">
              Join researchers and institutions using NIV for economic foresight.
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/dashboard"
                className="px-8 py-4 bg-white text-accent-600 font-semibold rounded-xl hover:bg-accent-50 transition shadow-medium flex items-center gap-2"
              >
                Launch Dashboard
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/explorer"
                className="px-8 py-4 bg-accent-500/20 text-white border border-white/30 font-semibold rounded-xl hover:bg-accent-500/30 transition"
              >
                Explore 60 Years of Data
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}

// Feature Card - Dark theme
function FeatureCard({
  icon,
  title,
  subtitle,
  description,
  value,
  color
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  description: string
  value: number
  color: 'emerald' | 'blue' | 'amber' | 'rose'
}) {
  const colorClasses = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="card p-6 hover:shadow-medium"
    >
      <div className={`w-12 h-12 rounded-xl ${colorClasses[color]} border flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="font-mono text-lg font-semibold text-neutral-100">{title}</h3>
        <span className="font-mono text-sm text-neutral-500">{value.toFixed(3)}</span>
      </div>
      <p className="text-sm font-medium text-neutral-300 mb-1">{subtitle}</p>
      <p className="text-sm text-neutral-500">{description}</p>
    </motion.div>
  )
}

// Stat Card - Dark theme
function StatCard({
  icon,
  value,
  label,
  description
}: {
  icon: React.ReactNode
  value: string
  label: string
  description: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="card p-6 text-center"
    >
      <div className="w-12 h-12 rounded-xl bg-accent-500/10 text-accent-400 border border-accent-500/20 flex items-center justify-center mx-auto mb-4">
        {icon}
      </div>
      <div className="text-3xl font-bold text-neutral-100 mb-1">{value}</div>
      <div className="text-sm font-semibold text-neutral-300 mb-2">{label}</div>
      <p className="text-sm text-neutral-500">{description}</p>
    </motion.div>
  )
}

// Use Case Card - Dark theme
function UseCaseCard({
  icon,
  title,
  description,
  link,
  linkText
}: {
  icon: React.ReactNode
  title: string
  description: string
  link: string
  linkText: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="card p-8"
    >
      <div className="w-14 h-14 rounded-2xl bg-neutral-800 text-neutral-400 flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-neutral-100 mb-3">{title}</h3>
      <p className="text-neutral-400 mb-6">{description}</p>
      <Link
        href={link}
        className="inline-flex items-center gap-2 text-accent-400 font-medium hover:text-accent-300 transition"
      >
        {linkText}
        <ArrowRight className="w-4 h-4" />
      </Link>
    </motion.div>
  )
}
