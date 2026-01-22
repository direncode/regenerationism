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
  Download,
  Monitor,
  Cpu,
  Database,
  Lock,
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
      {/* Hero Section - Desktop Download Focus */}
      <section className="relative py-24 lg:py-32 px-6 overflow-hidden hero-gradient">
        <div className="absolute inset-0 grid-background opacity-30" />

        <div className="relative max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-8">
              <Monitor className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-purple-300">Desktop Application Available</span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight tracking-tight">
              <span className="text-neutral-100">Third-Order Accounting</span>
              <br />
              <span className="gradient-text">for your Desktop</span>
            </h1>

            <p className="text-xl text-neutral-400 mb-6 max-w-2xl mx-auto leading-relaxed">
              The full power of NIV analysis and Third-Order Accounting runs as a{' '}
              <strong className="text-neutral-100">native Windows application</strong>.
              Offline analysis, S&P 500 data, AI insights, and more.
            </p>

            <p className="text-sm text-neutral-500 mb-10">
              This website is a preview. Download the desktop app for the complete experience.
            </p>

            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <a
                href="/downloads/RegenerationismNIV-Setup-1.0.0.exe"
                className="px-8 py-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-purple-700 transition shadow-medium flex items-center gap-3"
              >
                <Download className="w-5 h-5" />
                Download for Windows
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded">64-bit</span>
              </a>
              <a
                href="/downloads/RegenerationismNIV-1.0.0-portable.exe"
                className="px-8 py-4 bg-neutral-900 border border-neutral-700 text-neutral-200 font-semibold rounded-xl hover:border-neutral-600 hover:bg-neutral-800 transition shadow-soft flex items-center gap-2"
              >
                <Download className="w-5 h-5" />
                Portable Version
              </a>
            </div>

            <div className="flex justify-center gap-8 text-sm text-neutral-500">
              <span className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Offline capable
              </span>
              <span className="flex items-center gap-2">
                <Cpu className="w-4 h-4" />
                No installation required (portable)
              </span>
              <span className="flex items-center gap-2">
                <Database className="w-4 h-4" />
                Local data storage
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Desktop App Features */}
      <section className="py-20 px-6 bg-neutral-900">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-100 mb-4">
              Professional Desktop Software
            </h2>
            <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
              Everything you need for Third-Order Accounting analysis in one application
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            <DesktopFeatureCard
              icon={<BarChart3 className="w-6 h-6" />}
              title="NIV Calculator"
              description="Full formula implementation with real-time component analysis and 5-year projections"
            />
            <DesktopFeatureCard
              icon={<Database className="w-6 h-6" />}
              title="S&P 500 Analysis"
              description="Analyze top companies with NIV scoring, financial data, and regeneration rankings"
            />
            <DesktopFeatureCard
              icon={<Sparkles className="w-6 h-6" />}
              title="AI Decision Engine"
              description="Company-specific insights, optimization paths, and organic action plans"
            />
            <DesktopFeatureCard
              icon={<LineChart className="w-6 h-6" />}
              title="Third-Order Engine"
              description="Full projection model with customizable parameters and collapse probability"
            />
            <DesktopFeatureCard
              icon={<Shield className="w-6 h-6" />}
              title="Data Provenance"
              description="Trace every NIV component back to financial statement line items"
            />
            <DesktopFeatureCard
              icon={<Monitor className="w-6 h-6" />}
              title="Native Performance"
              description="Fast, responsive desktop experience with persistent local storage"
            />
          </div>

          {/* Screenshot/Preview */}
          <div className="bg-neutral-800 rounded-2xl p-4 border border-neutral-700">
            <div className="bg-neutral-950 rounded-xl p-8 text-center">
              <div className="inline-flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center text-sm font-bold text-white">R</div>
                <span className="text-lg font-semibold text-white">Regenerationism NIV Analyzer</span>
              </div>
              <p className="text-neutral-500 text-sm mb-6">Desktop Application Preview</p>
              <div className="grid grid-cols-4 gap-4 max-w-2xl mx-auto">
                <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
                  <div className="text-xs text-neutral-500 mb-1">NIV</div>
                  <div className="text-xl font-mono font-bold text-cyan-400">0.0342</div>
                </div>
                <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
                  <div className="text-xs text-neutral-500 mb-1">Thrust</div>
                  <div className="text-xl font-mono font-bold text-cyan-400">45.2%</div>
                </div>
                <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
                  <div className="text-xs text-neutral-500 mb-1">Efficiency</div>
                  <div className="text-xl font-mono font-bold text-purple-400">62.1%</div>
                </div>
                <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
                  <div className="text-xs text-neutral-500 mb-1">Risk</div>
                  <div className="text-xl font-mono font-bold text-amber-400">12.3%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Web Preview - NIV Components */}
      <section className="py-20 px-6 bg-neutral-950">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-500/10 border border-accent-500/20 mb-6">
              <Sparkles className="w-4 h-4 text-accent-400" />
              <span className="text-sm font-medium text-accent-300">Web Preview</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-100 mb-4">
              The Four Components of NIV
            </h2>
            <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
              Four components measure the economy's kinetic throughput - the speed at
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
              NIV<sub>t</sub> = (u<sub>t</sub> x P<sub>t</sub><sup>2</sup>) / (X<sub>t</sub> + F<sub>t</sub>)<sup>n</sup>
            </div>
            <p className="text-neutral-400 mb-6">
              National Impact Velocity - measures economic momentum vs. friction
            </p>
            <div className="text-sm text-neutral-500">
              Where n = 1.5 captures nonlinear crisis sensitivity
            </div>
          </div>

          {/* Third-Order Formula */}
          <div className="card p-8 md:p-12 mb-8 text-center border border-purple-500/30">
            <div className="text-sm text-purple-400 mb-4">Third-Order Projection</div>
            <div className="font-mono text-2xl md:text-3xl text-purple-400 mb-6">
              C<sub>h</sub> = NIV<sub>0</sub> x e<sup>(r<sub>h</sub> x h)</sup> x (1 - p<sub>h</sub>)
            </div>
            <p className="text-neutral-400">
              Cumulative regenerated capital after horizon h years, accounting for collapse probability
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-gradient-to-br from-purple-600 to-purple-700">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Get the Full Experience
            </h2>
            <p className="text-xl text-purple-100 mb-10 max-w-2xl mx-auto">
              Download the desktop application for complete Third-Order Accounting analysis with S&P 500 data, AI insights, and offline capability.
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="/downloads/RegenerationismNIV-Setup-1.0.0.exe"
                className="px-8 py-4 bg-white text-purple-600 font-semibold rounded-xl hover:bg-purple-50 transition shadow-medium flex items-center gap-2"
              >
                <Download className="w-5 h-5" />
                Download Now
              </a>
              <Link
                href="/third-order-accounting"
                className="px-8 py-4 bg-purple-500/20 text-white border border-white/30 font-semibold rounded-xl hover:bg-purple-500/30 transition"
              >
                Try Web Preview
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

// Desktop Feature Card
function DesktopFeatureCard({
  icon,
  title,
  description
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="card p-6 border border-purple-500/20 hover:border-purple-500/40 transition"
    >
      <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-neutral-100 mb-2">{title}</h3>
      <p className="text-sm text-neutral-500">{description}</p>
    </motion.div>
  )
}
