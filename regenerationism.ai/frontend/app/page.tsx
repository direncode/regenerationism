'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowUpRight } from 'lucide-react'

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
              Real-time Macro Crisis Detection
            </motion.p>

            {/* Main headline */}
            <h1 className="hero-headline max-w-5xl mx-auto mb-8">
              We build systems that detect
              <br />
              <span className="text-gray-500">economic crises before they unfold</span>
            </h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="hero-subheadline mx-auto mb-12"
            >
              The National Impact Velocity indicator synthesizes Federal Reserve data
              into a single measure of systemic stress. Validated against 60+ years of history.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="flex flex-wrap items-center justify-center gap-4"
            >
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-3 bg-white text-black px-8 py-4 text-sm font-medium uppercase tracking-wider hover:bg-gray-100 transition-colors"
              >
                Launch Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/methodology"
                className="inline-flex items-center gap-3 border border-white/30 text-white px-8 py-4 text-sm font-medium uppercase tracking-wider hover:border-white hover:bg-white/5 transition-all"
              >
                Learn More
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
            <Stat value="0.85" label="AUC Score" />
            <Stat value="60+" label="Years of Data" />
            <Stat value="8" label="FRED Series" />
            <Stat value="<1s" label="Update Latency" />
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

      {/* What We Do Section */}
      <section className="py-32 border-t border-white/10">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-start">
            <div>
              <p className="text-caption uppercase text-gray-500 mb-6">The Problem</p>
              <h2 className="section-headline text-white mb-8">
                Traditional indicators fail to capture systemic stress
              </h2>
              <p className="text-lg text-gray-400 leading-relaxed mb-8">
                The Federal Reserve yield curve inverts months before recessions, but provides
                no granularity. GDP reports are delayed. Sentiment indicators are noisy.
              </p>
              <p className="text-lg text-gray-400 leading-relaxed">
                NIV synthesizes investment flows, monetary policy, capacity utilization, and
                market stress into a single real-time indicator that captures systemic vulnerability.
              </p>
            </div>

            <div className="lg:pt-16">
              <div className="space-y-6">
                <FeatureItem
                  number="01"
                  title="Real-time FRED Data"
                  description="Pulls directly from 8 Federal Reserve economic series with sub-second latency."
                />
                <FeatureItem
                  number="02"
                  title="Physics-Based Model"
                  description="NIV formula models economic momentum as thrust, efficiency, slack, and drag."
                />
                <FeatureItem
                  number="03"
                  title="Validated Performance"
                  description="Outperforms Fed yield curve with 0.85 AUC on out-of-sample crisis prediction."
                />
                <FeatureItem
                  number="04"
                  title="Full Transparency"
                  description="Open formula, public data, reproducible results. No black boxes."
                />
              </div>
            </div>
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
            </div>

            {/* Components grid */}
            <div className="grid md:grid-cols-2 gap-px bg-white/10">
              <FormulaComponent
                symbol="u"
                name="Thrust"
                formula="tanh(ΔG + ΔA − 0.7Δr)"
                description="Net policy stimulus from investment growth, M2 expansion, and rate changes"
              />
              <FormulaComponent
                symbol="P"
                name="Efficiency"
                formula="(Investment × 1.15) / GDP"
                description="Capital productivity ratio, squared in the numerator"
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
                formula="0.4s + 0.4(r−π) + 0.2σ"
                description="System friction from yield inversion, real rates, and volatility"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="py-32 border-t border-white/10">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="text-center mb-20">
            <p className="text-caption uppercase text-gray-500 mb-6">Capabilities</p>
            <h2 className="section-headline text-white">
              Built for analysis and integration
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-px bg-white/10">
            <ProductCard
              title="Live Dashboard"
              description="Real-time NIV monitoring with component breakdown, historical trends, and crisis alerts."
              href="/dashboard"
            />
            <ProductCard
              title="Historical Explorer"
              description="Browse 60+ years of NIV data. Zoom into crises. Export for your own analysis."
              href="/explorer"
            />
            <ProductCard
              title="API Access"
              description="REST endpoints for integration. Pull NIV scores programmatically for your systems."
              href="/api-docs"
            />
          </div>
        </div>
      </section>

      {/* Validation Section */}
      <section className="py-32 bg-[#0a0a0a]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            <div>
              <p className="text-caption uppercase text-gray-500 mb-6">Validation</p>
              <h2 className="section-headline text-white mb-8">
                Reproducible by design
              </h2>
              <p className="text-lg text-gray-400 leading-relaxed mb-8">
                Every data point comes from public FRED series. The formula is fully exposed.
                Anyone can reproduce our results with the same inputs.
              </p>

              <ul className="space-y-4 mb-10">
                <ValidationItem>All data from Federal Reserve Economic Data (FRED)</ValidationItem>
                <ValidationItem>Complete formula with no hidden parameters</ValidationItem>
                <ValidationItem>Python reproduction code provided</ValidationItem>
                <ValidationItem>Out-of-sample backtests runnable by anyone</ValidationItem>
              </ul>

              <Link
                href="/validation"
                className="inline-flex items-center gap-3 text-white border-b border-white/30 pb-1 hover:border-white transition-colors"
              >
                View validation guide
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="bg-black border border-white/10 p-8 lg:p-12">
              <p className="text-caption uppercase text-gray-500 mb-8">FRED Series Used</p>
              <div className="space-y-4 font-mono text-sm">
                <DataRow series="GPDIC1" name="Private Investment" />
                <DataRow series="M2SL" name="M2 Money Stock" />
                <DataRow series="FEDFUNDS" name="Federal Funds Rate" />
                <DataRow series="GDPC1" name="Real GDP" />
                <DataRow series="TCU" name="Capacity Utilization" />
                <DataRow series="T10Y3M" name="10Y-3M Spread" />
                <DataRow series="CPIAUCSL" name="Consumer Price Index" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 border-t border-white/10">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8 text-center">
          <h2 className="section-headline text-white mb-8">
            See the signal in the noise
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-12">
            Launch the dashboard to explore real-time NIV data, historical trends,
            and component breakdowns.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-3 bg-white text-black px-10 py-5 text-sm font-medium uppercase tracking-wider hover:bg-gray-100 transition-colors"
          >
            Launch Dashboard
            <ArrowRight className="w-4 h-4" />
          </Link>
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

// Feature item component
function FeatureItem({
  number,
  title,
  description,
}: {
  number: string
  title: string
  description: string
}) {
  return (
    <div className="flex gap-6 py-6 border-b border-white/10">
      <span className="text-sm font-mono text-gray-600">{number}</span>
      <div>
        <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
        <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
      </div>
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

// Product card component
function ProductCard({
  title,
  description,
  href,
}: {
  title: string
  description: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="bg-black p-8 lg:p-12 group hover:bg-[#0a0a0a] transition-colors"
    >
      <h3 className="text-xl font-medium text-white mb-4 flex items-center gap-3">
        {title}
        <ArrowUpRight className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
      </h3>
      <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
    </Link>
  )
}

// Validation item component
function ValidationItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="w-1 h-1 bg-white rounded-full mt-2.5 flex-shrink-0" />
      <span className="text-gray-400">{children}</span>
    </li>
  )
}

// Data row component
function DataRow({ series, name }: { series: string; name: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5">
      <span className="text-white">{series}</span>
      <span className="text-gray-600">{name}</span>
    </div>
  )
}
