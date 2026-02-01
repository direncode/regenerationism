'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  ArrowUpRight,
  FlaskConical,
  Sliders,
  GitFork,
  Share2,
  Download,
  Code,
  BarChart3,
  Shuffle,
  Target,
  Database,
  Globe,
  Lock,
  Zap,
} from 'lucide-react'

export default function HomePage() {
  return (
    <div className="bg-black min-h-screen">
      {/* Hero Section - Full viewport */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Subtle grid background */}
        <div className="absolute inset-0 grid-background opacity-50" />

        {/* Radial gradient overlay */}
        <div className="absolute inset-0 hero-gradient" />

        <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-8 pt-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-center"
          >
            {/* Eyebrow */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-caption uppercase text-gray-500 mb-8"
            >
              Open-Source Economic Simulation Lab
            </motion.p>

            {/* Main headline */}
            <h1 className="hero-headline max-w-5xl mx-auto mb-8">
              Build, test, and validate
              <br />
              <span className="text-gray-500">economic crisis models</span>
            </h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="hero-subheadline mx-auto mb-12"
            >
              A researcher-first platform for scenario simulation, sensitivity analysis,
              and reproducible macro forecasting. Public data. Open formula. Full transparency.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="flex flex-wrap items-center justify-center gap-4"
            >
              <Link
                href="/custom-model"
                className="inline-flex items-center gap-3 bg-white text-black px-8 py-4 text-sm font-medium uppercase tracking-wider hover:bg-gray-100 transition-colors"
              >
                Launch Simulator
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/validation"
                className="inline-flex items-center gap-3 border border-white/30 text-white px-8 py-4 text-sm font-medium uppercase tracking-wider hover:border-white hover:bg-white/5 transition-all"
              >
                View Validation
              </Link>
            </motion.div>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="mt-32 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-16 border-t border-white/10 pt-16"
          >
            <Stat value="84.7%" label="OOS AUC Score" />
            <Stat value="55+" label="Years of Data" />
            <Stat value="3/3" label="Crises Detected" />
            <Stat value="100%" label="Reproducible" />
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="absolute bottom-12 left-1/2 -translate-x-1/2"
        >
          <div className="w-px h-16 bg-gradient-to-b from-white/0 via-white/20 to-white/0" />
        </motion.div>
      </section>

      {/* Research Capabilities Section */}
      <section className="py-32 border-t border-white/10">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="text-center mb-20">
            <p className="text-caption uppercase text-gray-500 mb-6">For Researchers</p>
            <h2 className="section-headline text-white mb-6">
              Your economic experimentation lab
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Combine the governance controls of enterprise platforms with the flexibility
              of open-source tools. Build, test, and share custom economic models.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/10">
            <CapabilityCard
              icon={<Sliders className="w-6 h-6" />}
              title="Scenario Simulator"
              description="Adjust thrust, efficiency, slack, and drag parameters. Run what-if scenarios and project NIV over 1-5 years."
            />
            <CapabilityCard
              icon={<Shuffle className="w-6 h-6" />}
              title="Monte Carlo Analysis"
              description="Run thousands of simulations with uncertainty bands. Quantify confidence intervals for your forecasts."
            />
            <CapabilityCard
              icon={<Target className="w-6 h-6" />}
              title="Sensitivity Analysis"
              description="Tornado plots showing parameter impacts. Identify which variables drive model outputs."
            />
            <CapabilityCard
              icon={<GitFork className="w-6 h-6" />}
              title="Fork & Customize"
              description="Clone any model configuration. Build custom variants with your own parameter weights."
            />
            <CapabilityCard
              icon={<Share2 className="w-6 h-6" />}
              title="Shareable Results"
              description="Export CSV, PDF reports, or shareable links. Perfect for publications and peer review."
            />
            <CapabilityCard
              icon={<Code className="w-6 h-6" />}
              title="Reproducibility Kit"
              description="Python notebooks, Docker containers, and API docs. Reproduce everything locally."
            />
          </div>
        </div>
      </section>

      {/* The Formula Section */}
      <section className="py-32 bg-[#0a0a0a]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="text-center mb-20">
            <p className="text-caption uppercase text-gray-500 mb-6">The Engine</p>
            <h2 className="section-headline text-white">
              National Impact Velocity
            </h2>
          </div>

          <div className="max-w-4xl mx-auto">
            {/* Main formula */}
            <div className="text-center mb-16">
              <div className="inline-block bg-black border border-white/10 px-12 py-8">
                <code className="text-2xl md:text-4xl font-mono text-white tracking-wider">
                  NIV = (u × P²) / (X + F)<sup className="text-lg">η</sup>
                </code>
              </div>
              <p className="text-gray-500 mt-6">
                All parameters adjustable: η ∈ [1.0, 2.5], investment multiplier ∈ [1.0, 1.5]
              </p>
            </div>

            {/* Components grid */}
            <div className="grid md:grid-cols-2 gap-px bg-white/10">
              <FormulaComponent
                symbol="u"
                name="Thrust"
                formula="tanh(w_G·ΔG + w_A·ΔA − w_r·Δr)"
                description="Net policy stimulus with adjustable weights for investment, M2, and rate sensitivity"
              />
              <FormulaComponent
                symbol="P"
                name="Efficiency"
                formula="(Investment × mult) / GDP"
                description="Capital productivity with tunable R&D/education multiplier (default 1.15)"
              />
              <FormulaComponent
                symbol="X"
                name="Slack"
                formula="1 − (TCU / 100)"
                description="Economic headroom before capacity constraints bind"
              />
              <FormulaComponent
                symbol="F"
                name="Drag"
                formula="w_s·s + w_r·(r−π) + w_v·σ"
                description="System friction with adjustable weights for yield, rates, and volatility"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Data Integration Section */}
      <section className="py-32 border-t border-white/10">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-start">
            <div>
              <p className="text-caption uppercase text-gray-500 mb-6">Data Sources</p>
              <h2 className="section-headline text-white mb-8">
                Public data, transparent methodology
              </h2>
              <p className="text-lg text-gray-400 leading-relaxed mb-8">
                Every data point comes from the Federal Reserve Economic Data (FRED) API.
                No proprietary data. No hidden parameters. Full reproducibility.
              </p>

              <div className="space-y-4 mb-10">
                <DataFeature icon={<Database className="w-5 h-5" />} title="8 FRED Series" description="Investment, M2, Fed Funds, GDP, TCU, Yield Spread, CPI, NBER" />
                <DataFeature icon={<Globe className="w-5 h-5" />} title="Extensible" description="Add World Bank, BEA, OECD CLI for international comparisons" />
                <DataFeature icon={<Zap className="w-5 h-5" />} title="Real-time" description="Sub-second updates with automatic data refresh" />
                <DataFeature icon={<Lock className="w-5 h-5" />} title="Audit Trail" description="Full logging of all calculations for governance" />
              </div>

              <Link
                href="/validation"
                className="inline-flex items-center gap-3 text-white border-b border-white/30 pb-1 hover:border-white transition-colors"
              >
                View full data documentation
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="bg-black border border-white/10 p-8 lg:p-12">
              <p className="text-caption uppercase text-gray-500 mb-8">FRED Series Used</p>
              <div className="space-y-4 font-mono text-sm">
                <DataRow series="GPDIC1" name="Private Investment" component="Thrust, Efficiency" />
                <DataRow series="M2SL" name="M2 Money Stock" component="Thrust" />
                <DataRow series="FEDFUNDS" name="Federal Funds Rate" component="Thrust, Drag" />
                <DataRow series="GDPC1" name="Real GDP" component="Efficiency" />
                <DataRow series="TCU" name="Capacity Utilization" component="Slack" />
                <DataRow series="T10Y3M" name="10Y-3M Spread" component="Drag" />
                <DataRow series="CPIAUCSL" name="Consumer Price Index" component="Drag" />
                <DataRow series="USREC" name="NBER Recession" component="Validation" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="py-32 bg-[#0a0a0a]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="text-center mb-20">
            <p className="text-caption uppercase text-gray-500 mb-6">Platform</p>
            <h2 className="section-headline text-white">
              Tools for every research workflow
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-white/10">
            <ProductCard
              title="Custom Model"
              description="Adjust all NIV parameters. Run Monte Carlo and sensitivity analysis. Export results."
              href="/custom-model"
              badge="New"
            />
            <ProductCard
              title="Live Dashboard"
              description="Real-time NIV monitoring with component breakdown and crisis probability."
              href="/dashboard"
            />
            <ProductCard
              title="OOS Validation"
              description="Walk-forward backtests on 55+ years. Compare vs yield curve and GDP."
              href="/oos-tests"
            />
            <ProductCard
              title="API Access"
              description="REST endpoints for integration. Pull NIV programmatically for your systems."
              href="/api-docs"
            />
          </div>
        </div>
      </section>

      {/* Validation Summary Section */}
      <section className="py-32 border-t border-white/10">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            <div>
              <p className="text-caption uppercase text-gray-500 mb-6">Validation</p>
              <h2 className="section-headline text-white mb-8">
                Independently verified results
              </h2>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-4 mb-10">
                <div className="bg-[#0a0a0a] border border-white/10 p-6">
                  <p className="text-3xl font-mono font-bold text-white mb-1">84.7%</p>
                  <p className="text-sm text-gray-500">ROC-AUC (OOS)</p>
                </div>
                <div className="bg-[#0a0a0a] border border-white/10 p-6">
                  <p className="text-3xl font-mono font-bold text-white mb-1">3/3</p>
                  <p className="text-sm text-gray-500">Crises Detected</p>
                </div>
                <div className="bg-[#0a0a0a] border border-white/10 p-6">
                  <p className="text-3xl font-mono font-bold text-white mb-1">5.3 mo</p>
                  <p className="text-sm text-gray-500">Avg Lead Time</p>
                </div>
                <div className="bg-[#0a0a0a] border border-white/10 p-6">
                  <p className="text-3xl font-mono font-bold text-white mb-1">&gt;72%</p>
                  <p className="text-sm text-gray-500">vs Yield Curve</p>
                </div>
              </div>

              <Link
                href="/validation"
                className="inline-flex items-center gap-3 bg-white text-black px-8 py-4 text-sm font-medium uppercase tracking-wider hover:bg-gray-100 transition-colors"
              >
                View Full Validation Report
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="bg-black border border-white/10 p-8 lg:p-12">
              <p className="text-caption uppercase text-gray-500 mb-8">Crisis Detection (OOS Test Period)</p>
              <div className="space-y-6">
                <CrisisRow year="2001" name="Dot-Com Recession" warning="Sep 2000" lead="6 months" />
                <CrisisRow year="2008" name="Global Financial Crisis" warning="Aug 2007" lead="5 months" />
                <CrisisRow year="2020" name="COVID Recession" warning="Nov 2019" lead="3 months" />
              </div>
              <p className="text-xs text-gray-600 mt-8">
                Training period: 1970–2000 | Testing period: 2001–2025 | No lookahead bias
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 bg-[#0a0a0a] border-t border-white/10">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8 text-center">
          <p className="text-caption uppercase text-gray-500 mb-6">Get Started</p>
          <h2 className="section-headline text-white mb-8">
            Start building your models
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-12">
            Launch the scenario simulator to adjust parameters, run Monte Carlo analysis,
            and generate reproducible forecasts with public FRED data.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/custom-model"
              className="inline-flex items-center gap-3 bg-white text-black px-10 py-5 text-sm font-medium uppercase tracking-wider hover:bg-gray-100 transition-colors"
            >
              Launch Simulator
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="https://github.com/direncode/regenerationism"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 border border-white/30 text-white px-10 py-5 text-sm font-medium uppercase tracking-wider hover:border-white hover:bg-white/5 transition-all"
            >
              View on GitHub
              <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}

// Stat component
function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="stat-value text-white mb-2">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

// Capability card component
function CapabilityCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="bg-black p-8 lg:p-10">
      <div className="text-white mb-4">{icon}</div>
      <h3 className="text-lg font-medium text-white mb-3">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
    </div>
  )
}

// Formula component
function FormulaComponent({
  symbol,
  name,
  formula,
  description,
}: {
  symbol: string
  name: string
  formula: string
  description: string
}) {
  return (
    <div className="bg-black p-8">
      <div className="flex items-baseline gap-4 mb-4">
        <span className="text-3xl font-mono text-white">{symbol}</span>
        <span className="text-sm uppercase tracking-wider text-gray-500">{name}</span>
      </div>
      <code className="block text-sm font-mono text-gray-400 mb-4">{formula}</code>
      <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
    </div>
  )
}

// Data feature component
function DataFeature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex gap-4">
      <div className="text-gray-600 flex-shrink-0">{icon}</div>
      <div>
        <h4 className="text-white font-medium mb-1">{title}</h4>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </div>
  )
}

// Product card component
function ProductCard({
  title,
  description,
  href,
  badge,
}: {
  title: string
  description: string
  href: string
  badge?: string
}) {
  return (
    <Link
      href={href}
      className="bg-black p-8 lg:p-10 group hover:bg-[#111] transition-colors"
    >
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-lg font-medium text-white">{title}</h3>
        {badge && (
          <span className="text-xs uppercase tracking-wider px-2 py-1 bg-white/10 text-white">
            {badge}
          </span>
        )}
        <ArrowUpRight className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors ml-auto" />
      </div>
      <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
    </Link>
  )
}

// Data row component
function DataRow({ series, name, component }: { series: string; name: string; component: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5">
      <div>
        <span className="text-white">{series}</span>
        <span className="text-gray-600 ml-3">{name}</span>
      </div>
      <span className="text-xs text-gray-600">{component}</span>
    </div>
  )
}

// Crisis row component
function CrisisRow({
  year,
  name,
  warning,
  lead,
}: {
  year: string
  name: string
  warning: string
  lead: string
}) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-white/5">
      <div>
        <span className="text-white font-mono mr-3">{year}</span>
        <span className="text-gray-400">{name}</span>
      </div>
      <div className="text-right">
        <span className="text-white font-mono text-sm">{warning}</span>
        <span className="text-gray-600 text-xs ml-3">({lead})</span>
      </div>
    </div>
  )
}
