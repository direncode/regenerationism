'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Download,
  FileCode,
  CheckCircle,
  Copy,
  ExternalLink,
  Database,
  FlaskConical,
  ArrowRight,
  ArrowUpRight,
  Github,
  Mail,
  Table,
  Code,
  Play,
} from 'lucide-react'
import { useSessionStore } from '@/store/sessionStore'
import { calculateNIVFromFRED, checkServerApiKey } from '@/lib/fredApi'

// Sample FRED data for demonstration
const SAMPLE_DATA = [
  { date: '2024-01-01', investment: 4125.5, m2: 20873.5, fedFunds: 5.33, gdp: 22225.4, tcu: 78.2, spread: -0.43, cpi: 308.4 },
  { date: '2024-02-01', investment: 4125.5, m2: 20934.2, fedFunds: 5.33, gdp: 22225.4, tcu: 78.5, spread: -0.35, cpi: 309.7 },
  { date: '2024-03-01', investment: 4156.2, m2: 20988.1, fedFunds: 5.33, gdp: 22322.2, tcu: 78.4, spread: -0.38, cpi: 310.3 },
  { date: '2024-04-01', investment: 4156.2, m2: 21012.4, fedFunds: 5.33, gdp: 22322.2, tcu: 78.1, spread: -0.42, cpi: 311.0 },
  { date: '2024-05-01', investment: 4156.2, m2: 21064.8, fedFunds: 5.33, gdp: 22322.2, tcu: 77.8, spread: -0.45, cpi: 311.5 },
  { date: '2024-06-01', investment: 4189.7, m2: 21105.2, fedFunds: 5.33, gdp: 22398.5, tcu: 77.5, spread: -0.48, cpi: 312.1 },
]

const PYTHON_CODE = `"""
NIV (National Impact Velocity) Calculator
Reproduce the NIV formula using FRED data
"""

import pandas as pd
import numpy as np
from fredapi import Fred

# Get your free API key at: https://fred.stlouisfed.org/docs/api/api_key.html
fred = Fred(api_key='YOUR_FRED_API_KEY')

# Fetch required FRED series
series = {
    'GPDIC1': fred.get_series('GPDIC1'),      # Private Investment
    'M2SL': fred.get_series('M2SL'),          # M2 Money Supply
    'FEDFUNDS': fred.get_series('FEDFUNDS'),  # Federal Funds Rate
    'GDPC1': fred.get_series('GDPC1'),        # Real GDP
    'TCU': fred.get_series('TCU'),            # Capacity Utilization
    'T10Y3M': fred.get_series('T10Y3M'),      # Yield Spread
    'CPIAUCSL': fred.get_series('CPIAUCSL'),  # CPI
}

# Merge into monthly DataFrame (forward-fill quarterly data)
df = pd.DataFrame(series).resample('M').last().ffill()

# Calculate components
def calculate_niv(df, eta=1.5, epsilon=0.001):
    results = []

    for i in range(12, len(df)):
        curr = df.iloc[i]
        prev = df.iloc[i-1]
        year_ago = df.iloc[i-12]

        # Skip if missing data
        if pd.isna([curr['GPDIC1'], curr['M2SL'], curr['FEDFUNDS'],
                    curr['GDPC1'], curr['TCU'], curr['CPIAUCSL']]).any():
            continue

        # 1. THRUST (u)
        dG = (curr['GPDIC1'] - year_ago['GPDIC1']) / year_ago['GPDIC1']  # Investment YoY
        dA = (curr['M2SL'] - year_ago['M2SL']) / year_ago['M2SL']        # M2 YoY
        dr = curr['FEDFUNDS'] - prev['FEDFUNDS']                          # Rate change
        thrust = np.tanh(1.0 * dG + 1.0 * dA - 0.7 * dr)

        # 2. EFFICIENCY (P)
        efficiency = (curr['GPDIC1'] * 1.15) / curr['GDPC1']
        efficiency_sq = efficiency ** 2

        # 3. SLACK (X)
        slack = 1.0 - (curr['TCU'] / 100.0)

        # 4. DRAG (F)
        inflation = (curr['CPIAUCSL'] - year_ago['CPIAUCSL']) / year_ago['CPIAUCSL']
        spread = curr.get('T10Y3M', 0) or 0
        yield_penalty = abs(spread / 100) if spread < 0 else 0
        real_rate = max(0, (curr['FEDFUNDS'] / 100) - inflation)

        # 12-month Fed Funds volatility
        fed_window = df.iloc[i-11:i+1]['FEDFUNDS']
        volatility = fed_window.std() / 100

        drag = 0.4 * yield_penalty + 0.4 * real_rate + 0.2 * volatility

        # 5. MASTER FORMULA
        numerator = thrust * efficiency_sq
        safe_base = max(slack + drag, epsilon)
        denominator = safe_base ** eta
        niv = numerator / denominator

        results.append({
            'date': df.index[i],
            'thrust': thrust,
            'efficiency': efficiency,
            'slack': slack,
            'drag': drag,
            'niv': niv
        })

    return pd.DataFrame(results)

# Run calculation
niv_results = calculate_niv(df)
print(niv_results.tail(10))

# Compare with dashboard values
print("\\n--- Latest NIV Value ---")
print(f"NIV Score: {niv_results.iloc[-1]['niv'] * 100:.2f}")
`

const EXCEL_STEPS = `=== Excel Reproduction Steps ===

1. DOWNLOAD FRED DATA
   - Go to https://fred.stlouisfed.org
   - Download each series (GPDIC1, M2SL, FEDFUNDS, GDPC1, TCU, T10Y3M, CPIAUCSL)
   - Merge into one sheet by date

2. CALCULATE GROWTH RATES (Column H onwards)
   Investment YoY (dG):  =IF(A14<>"", (B14-B2)/B2, "")
   M2 YoY (dA):          =IF(A14<>"", (C14-C2)/C2, "")
   Rate Change (dr):     =D14-D13

3. CALCULATE COMPONENTS
   Thrust (u):      =TANH(H14 + I14 - 0.7*J14)
   Efficiency (P):  =(B14 * 1.15) / E14
   Slack (X):       =1 - (F14 / 100)

4. CALCULATE DRAG
   Inflation:       =(G14 - G2) / G2
   Yield Penalty:   =IF(G14<0, ABS(G14)/100, 0)
   Real Rate:       =MAX(0, D14/100 - [Inflation])
   Volatility:      =STDEV(D3:D14) / 100
   Drag (F):        =0.4*[YieldPen] + 0.4*[RealRate] + 0.2*[Vol]

5. FINAL NIV FORMULA
   NIV = (Thrust * Efficiency^2) / (Slack + Drag)^1.5

   Cell formula:
   =[Thrust] * [Efficiency]^2 / MAX([Slack]+[Drag], 0.001)^1.5
`

export default function ValidationPage() {
  const { apiSettings } = useSessionStore()
  const [copied, setCopied] = useState<string | null>(null)
  const [hasServerKey, setHasServerKey] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const checkServer = async () => {
      const hasKey = await checkServerApiKey()
      setHasServerKey(hasKey)
    }
    checkServer()
  }, [])

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const downloadCSV = () => {
    const headers = 'date,investment_gpdic1,m2_m2sl,fed_funds_fedfunds,gdp_gdpc1,capacity_tcu,spread_t10y3m,cpi_cpiaucsl\n'
    const rows = SAMPLE_DATA.map(d =>
      `${d.date},${d.investment},${d.m2},${d.fedFunds},${d.gdp},${d.tcu},${d.spread},${d.cpi}`
    ).join('\n')

    const blob = new Blob([headers + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'niv_sample_fred_data.csv'
    a.click()
  }

  const generateLiveSampleCSV = async () => {
    if (!hasServerKey && !apiSettings.fredApiKey) return

    setLoading(true)
    try {
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const apiKeyToUse = hasServerKey ? '' : apiSettings.fredApiKey

      const nivData = await calculateNIVFromFRED(
        apiKeyToUse,
        startDate,
        endDate,
        { eta: 1.5, weights: { thrust: 1, efficiency: 1, slack: 1, drag: 1 }, smoothWindow: 1 }
      )

      // Download as CSV
      const headers = 'date,niv,thrust,efficiency,slack,drag,probability,status\n'
      const rows = nivData.slice(-24).map(d =>
        `${d.date},${d.niv.toFixed(6)},${d.components.thrust.toFixed(4)},${d.components.efficiency.toFixed(4)},${d.components.slack.toFixed(4)},${d.components.drag.toFixed(4)},${d.probability.toFixed(1)},${d.status}`
      ).join('\n')

      const blob = new Blob([headers + rows], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `niv_live_data_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
    } catch (e) {
      console.error('Failed to generate live data:', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-black min-h-screen pt-24 pb-20">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16"
        >
          <p className="text-caption uppercase text-gray-500 mb-4">For Academic Review</p>
          <h1 className="section-headline text-white mb-6">
            Validation & Reproducibility
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl">
            Everything you need to independently verify NIV calculations.
            Public data, open formula, full transparency.
          </p>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid md:grid-cols-3 gap-px bg-white/10 mb-16"
        >
          <button
            onClick={downloadCSV}
            className="bg-black p-8 text-left hover:bg-[#0a0a0a] transition group"
          >
            <Download className="w-6 h-6 text-white mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Sample FRED Data</h3>
            <p className="text-sm text-gray-500">Download CSV with FRED series for manual calculation</p>
          </button>

          <button
            onClick={generateLiveSampleCSV}
            disabled={loading || (!hasServerKey && !apiSettings.fredApiKey)}
            className="bg-black p-8 text-left hover:bg-[#0a0a0a] transition group disabled:opacity-50"
          >
            <Database className="w-6 h-6 text-white mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Live Dashboard Data</h3>
            <p className="text-sm text-gray-500">
              {loading ? 'Generating...' : 'Export current NIV values with all components'}
            </p>
          </button>

          <Link
            href="/oos-tests"
            className="bg-black p-8 text-left hover:bg-[#0a0a0a] transition group"
          >
            <FlaskConical className="w-6 h-6 text-white mb-4" />
            <h3 className="text-lg font-medium text-white mb-2 flex items-center gap-2">
              OOS Backtest
              <ArrowUpRight className="w-4 h-4 text-gray-600 group-hover:text-white transition" />
            </h3>
            <p className="text-sm text-gray-500">Run walk-forward tests on 60+ years of data</p>
          </Link>
        </motion.div>

        {/* Reproducibility Checklist */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="border border-white/10 p-8 lg:p-12 mb-16"
        >
          <h2 className="text-xl font-medium text-white mb-8">Reproducibility Checklist</h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <ChecklistItem>All data from public FRED API (Federal Reserve Economic Data)</ChecklistItem>
              <ChecklistItem>Complete formula exposed with no hidden parameters</ChecklistItem>
              <ChecklistItem>Source code available on GitHub</ChecklistItem>
              <ChecklistItem>Python and Excel reproduction guides provided</ChecklistItem>
            </div>
            <div className="space-y-4">
              <ChecklistItem>Out-of-sample backtests (1970-present) runnable by anyone</ChecklistItem>
              <ChecklistItem>No proprietary data or models</ChecklistItem>
              <ChecklistItem>Real-time dashboard values downloadable as CSV</ChecklistItem>
              <ChecklistItem>Audit log of all calculations available</ChecklistItem>
            </div>
          </div>
        </motion.div>

        {/* FRED Series Reference */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="border border-white/10 p-8 lg:p-12 mb-16"
        >
          <h2 className="text-xl font-medium text-white mb-8">FRED Data Series Reference</h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 pr-8 text-caption uppercase text-gray-500">Series ID</th>
                  <th className="text-left py-4 pr-8 text-caption uppercase text-gray-500">Description</th>
                  <th className="text-left py-4 pr-8 text-caption uppercase text-gray-500">Frequency</th>
                  <th className="text-left py-4 text-caption uppercase text-gray-500">Used For</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <FredSeriesRow id="GPDIC1" desc="Real Private Domestic Investment" freq="Quarterly" use="Efficiency (P), Investment Growth (dG)" />
                <FredSeriesRow id="M2SL" desc="M2 Money Stock" freq="Monthly" use="M2 Growth (dA) in Thrust" />
                <FredSeriesRow id="FEDFUNDS" desc="Federal Funds Effective Rate" freq="Monthly" use="Rate Change (dr), Real Rate, Volatility" />
                <FredSeriesRow id="GDPC1" desc="Real Gross Domestic Product" freq="Quarterly" use="Efficiency ratio denominator" />
                <FredSeriesRow id="TCU" desc="Capacity Utilization" freq="Monthly" use="Slack (X) calculation" />
                <FredSeriesRow id="T10Y3M" desc="10Y-3M Treasury Spread" freq="Daily" use="Yield Penalty in Drag" />
                <FredSeriesRow id="CPIAUCSL" desc="Consumer Price Index" freq="Monthly" use="Inflation for Real Rate" />
                <FredSeriesRow id="USREC" desc="NBER Crisis Indicator" freq="Monthly" use="Backtest validation" />
              </tbody>
            </table>
          </div>

          <p className="text-sm text-gray-600 mt-8">
            Quarterly series (GPDIC1, GDPC1) are forward-filled to monthly frequency. All data is publicly available at{' '}
            <a href="https://fred.stlouisfed.org" target="_blank" rel="noopener noreferrer" className="text-white hover:underline">
              fred.stlouisfed.org
            </a>
          </p>
        </motion.div>

        {/* Python Code Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          id="python"
          className="border border-white/10 p-8 lg:p-12 mb-16"
        >
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-medium text-white">Python Reproduction Code</h2>
            <button
              onClick={() => copyToClipboard(PYTHON_CODE, 'python')}
              className="flex items-center gap-2 px-4 py-2 border border-white/20 text-sm text-gray-300 hover:border-white hover:text-white transition"
            >
              {copied === 'python' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied === 'python' ? 'Copied' : 'Copy'}
            </button>
          </div>

          <div className="bg-[#0a0a0a] p-6 overflow-x-auto">
            <pre className="text-sm font-mono text-gray-300 whitespace-pre-wrap">
              {PYTHON_CODE}
            </pre>
          </div>

          <div className="mt-6 flex flex-wrap gap-6">
            <a
              href="https://fred.stlouisfed.org/docs/api/api_key.html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition"
            >
              Get FRED API Key
              <ArrowUpRight className="w-4 h-4" />
            </a>
            <a
              href="https://pypi.org/project/fredapi/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition"
            >
              fredapi Python Package
              <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>
        </motion.div>

        {/* Excel Guide */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="border border-white/10 p-8 lg:p-12 mb-16"
        >
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-medium text-white">Excel Reproduction Steps</h2>
            <button
              onClick={() => copyToClipboard(EXCEL_STEPS, 'excel')}
              className="flex items-center gap-2 px-4 py-2 border border-white/20 text-sm text-gray-300 hover:border-white hover:text-white transition"
            >
              {copied === 'excel' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied === 'excel' ? 'Copied' : 'Copy'}
            </button>
          </div>

          <div className="bg-[#0a0a0a] p-6 overflow-x-auto">
            <pre className="text-sm font-mono text-gray-300 whitespace-pre-wrap">
              {EXCEL_STEPS}
            </pre>
          </div>
        </motion.div>

        {/* OOS Backtest Example */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="border border-white/10 p-8 lg:p-12 mb-16"
        >
          <h2 className="text-xl font-medium text-white mb-8">Out-of-Sample Backtest Example</h2>

          <div className="grid md:grid-cols-2 gap-px bg-white/10 mb-8">
            <div className="bg-black p-8">
              <p className="text-caption uppercase text-gray-500 mb-2">Training Period</p>
              <p className="text-3xl font-mono text-white mb-2">1970 – 2000</p>
              <p className="text-sm text-gray-600">Model parameters fixed during this period</p>
            </div>
            <div className="bg-black p-8">
              <p className="text-caption uppercase text-gray-500 mb-2">Testing Period</p>
              <p className="text-3xl font-mono text-white mb-2">2001 – 2025</p>
              <p className="text-sm text-gray-600">True out-of-sample evaluation</p>
            </div>
          </div>

          <div className="bg-[#0a0a0a] p-6 mb-8">
            <p className="text-caption uppercase text-gray-500 mb-4">Methodology</p>
            <ul className="space-y-3 text-sm text-gray-400">
              <li className="flex items-start gap-3">
                <span className="font-mono text-gray-600">01</span>
                Walk-forward analysis with 12-month crisis warning window
              </li>
              <li className="flex items-start gap-3">
                <span className="font-mono text-gray-600">02</span>
                Compare NIV vs Federal Reserve yield curve (T10Y3M) as baseline
              </li>
              <li className="flex items-start gap-3">
                <span className="font-mono text-gray-600">03</span>
                Evaluate using ROC-AUC on NBER crisis dates
              </li>
              <li className="flex items-start gap-3">
                <span className="font-mono text-gray-600">04</span>
                Test covers 2001, 2008, 2020 crises (not seen during training)
              </li>
            </ul>
          </div>

          <Link
            href="/oos-tests"
            className="inline-flex items-center gap-3 bg-white text-black px-8 py-4 text-sm font-medium uppercase tracking-wider hover:bg-gray-100 transition"
          >
            Run OOS Backtest
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>

        {/* Academic Contact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="border border-white/10 p-8 lg:p-12"
        >
          <h2 className="text-xl font-medium text-white mb-4">
            Seeking Academic & Industry Validation
          </h2>
          <p className="text-gray-400 mb-8 max-w-2xl">
            We welcome rigorous review from researchers, economists, and industry practitioners.
            Full source code access and methodology discussions available upon request.
          </p>

          <div className="flex flex-wrap gap-4">
            <a
              href="https://github.com/direncode/regenerationism"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 border border-white/20 text-white hover:border-white transition"
            >
              <Github className="w-5 h-5" />
              GitHub Repository
              <ArrowUpRight className="w-4 h-4" />
            </a>
            <a
              href="mailto:contact@regenerationism.ai?subject=Academic%20Validation%20Inquiry"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black hover:bg-gray-100 transition"
            >
              <Mail className="w-5 h-5" />
              Request Validation Access
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

// Checklist Item Component
function ChecklistItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-1 h-1 bg-white rounded-full mt-2 flex-shrink-0" />
      <span className="text-gray-400">{children}</span>
    </div>
  )
}

// FRED Series Row Component
function FredSeriesRow({ id, desc, freq, use }: { id: string; desc: string; freq: string; use: string }) {
  return (
    <tr className="border-b border-white/5 hover:bg-white/5 transition">
      <td className="py-4 pr-8">
        <a
          href={`https://fred.stlouisfed.org/series/${id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-white hover:underline"
        >
          {id}
        </a>
      </td>
      <td className="py-4 pr-8 text-gray-300">{desc}</td>
      <td className="py-4 pr-8 text-gray-500">{freq}</td>
      <td className="py-4 text-gray-500">{use}</td>
    </tr>
  )
}
