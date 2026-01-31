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
  Github,
  Mail,
  BookOpen,
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
  const [sampleNivData, setSampleNivData] = useState<any[]>([])
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

      setSampleNivData(nivData.slice(-24)) // Last 24 months

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
    <div className="min-h-screen bg-neutral-950 py-12 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium text-emerald-300">For Academic Review</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-neutral-100 mb-4">
            Validation & Reproducibility
          </h1>
          <p className="text-xl text-neutral-400 max-w-3xl mx-auto">
            Everything you need to independently verify NIV calculations. Public data, open formula, full transparency.
          </p>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid md:grid-cols-3 gap-4 mb-12"
        >
          <button
            onClick={downloadCSV}
            className="card p-6 text-left hover:border-emerald-500/30 transition group"
          >
            <Download className="w-8 h-8 text-emerald-400 mb-3" />
            <h3 className="font-bold text-neutral-100 mb-1">Sample FRED Data</h3>
            <p className="text-sm text-neutral-500">Download CSV with FRED series for manual calculation</p>
          </button>

          <button
            onClick={generateLiveSampleCSV}
            disabled={loading || (!hasServerKey && !apiSettings.fredApiKey)}
            className="card p-6 text-left hover:border-blue-500/30 transition group disabled:opacity-50"
          >
            <Database className="w-8 h-8 text-blue-400 mb-3" />
            <h3 className="font-bold text-neutral-100 mb-1">Live Dashboard Data</h3>
            <p className="text-sm text-neutral-500">
              {loading ? 'Generating...' : 'Export current NIV values with all components'}
            </p>
          </button>

          <Link
            href="/oos-tests"
            className="card p-6 text-left hover:border-purple-500/30 transition group"
          >
            <FlaskConical className="w-8 h-8 text-purple-400 mb-3" />
            <h3 className="font-bold text-neutral-100 mb-1">OOS Backtest</h3>
            <p className="text-sm text-neutral-500">Run walk-forward tests on 60+ years of data</p>
          </Link>
        </motion.div>

        {/* Reproducibility Checklist */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-8 mb-12 border border-emerald-500/20"
        >
          <h2 className="text-2xl font-bold text-neutral-100 mb-6 flex items-center gap-3">
            <CheckCircle className="w-7 h-7 text-emerald-400" />
            Reproducibility Checklist
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <ChecklistItem checked>
                All data from public FRED API (Federal Reserve Economic Data)
              </ChecklistItem>
              <ChecklistItem checked>
                Complete formula exposed with no hidden parameters
              </ChecklistItem>
              <ChecklistItem checked>
                Source code available on GitHub
              </ChecklistItem>
              <ChecklistItem checked>
                Python and Excel reproduction guides provided
              </ChecklistItem>
            </div>
            <div className="space-y-4">
              <ChecklistItem checked>
                Out-of-sample backtests (1970-present) runnable by anyone
              </ChecklistItem>
              <ChecklistItem checked>
                No proprietary data or models
              </ChecklistItem>
              <ChecklistItem checked>
                Real-time dashboard values downloadable as CSV
              </ChecklistItem>
              <ChecklistItem checked>
                Audit log of all calculations available
              </ChecklistItem>
            </div>
          </div>
        </motion.div>

        {/* FRED Series Reference */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card p-8 mb-12"
        >
          <h2 className="text-2xl font-bold text-neutral-100 mb-6 flex items-center gap-3">
            <Database className="w-7 h-7 text-blue-400" />
            FRED Data Series Reference
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-800">
                  <th className="text-left py-3 px-4 text-neutral-400 font-medium">Series ID</th>
                  <th className="text-left py-3 px-4 text-neutral-400 font-medium">Description</th>
                  <th className="text-left py-3 px-4 text-neutral-400 font-medium">Frequency</th>
                  <th className="text-left py-3 px-4 text-neutral-400 font-medium">Used For</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/50">
                <FredSeriesRow id="GPDIC1" desc="Real Private Domestic Investment" freq="Quarterly" use="Efficiency (P), Investment Growth (dG)" />
                <FredSeriesRow id="M2SL" desc="M2 Money Stock" freq="Monthly" use="M2 Growth (dA) in Thrust" />
                <FredSeriesRow id="FEDFUNDS" desc="Federal Funds Effective Rate" freq="Monthly" use="Rate Change (dr), Real Rate, Volatility" />
                <FredSeriesRow id="GDPC1" desc="Real Gross Domestic Product" freq="Quarterly" use="Efficiency ratio denominator" />
                <FredSeriesRow id="TCU" desc="Capacity Utilization" freq="Monthly" use="Slack (X) calculation" />
                <FredSeriesRow id="T10Y3M" desc="10Y-3M Treasury Spread" freq="Daily" use="Yield Penalty in Drag" />
                <FredSeriesRow id="CPIAUCSL" desc="Consumer Price Index" freq="Monthly" use="Inflation for Real Rate" />
                <FredSeriesRow id="USREC" desc="NBER Recession Indicator" freq="Monthly" use="Backtest validation" />
              </tbody>
            </table>
          </div>

          <div className="mt-6 p-4 bg-neutral-900 rounded-lg">
            <p className="text-sm text-neutral-500">
              <strong className="text-neutral-300">Note:</strong> Quarterly series (GPDIC1, GDPC1) are forward-filled to monthly frequency. All data is publicly available at{' '}
              <a href="https://fred.stlouisfed.org" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                fred.stlouisfed.org
              </a>
            </p>
          </div>
        </motion.div>

        {/* Python Code Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          id="python"
          className="card p-8 mb-12"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-neutral-100 flex items-center gap-3">
              <Code className="w-7 h-7 text-yellow-400" />
              Python Reproduction Code
            </h2>
            <button
              onClick={() => copyToClipboard(PYTHON_CODE, 'python')}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-300 hover:border-neutral-600 transition text-sm"
            >
              {copied === 'python' ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copied === 'python' ? 'Copied!' : 'Copy Code'}
            </button>
          </div>

          <div className="bg-neutral-900 rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm font-mono text-neutral-300 whitespace-pre-wrap">
              {PYTHON_CODE}
            </pre>
          </div>

          <div className="mt-6 flex flex-wrap gap-4">
            <a
              href="https://fred.stlouisfed.org/docs/api/api_key.html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
            >
              Get FRED API Key
              <ExternalLink className="w-4 h-4" />
            </a>
            <a
              href="https://pypi.org/project/fredapi/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
            >
              fredapi Python Package
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </motion.div>

        {/* Excel Guide */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="card p-8 mb-12"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-neutral-100 flex items-center gap-3">
              <Table className="w-7 h-7 text-green-400" />
              Excel Reproduction Steps
            </h2>
            <button
              onClick={() => copyToClipboard(EXCEL_STEPS, 'excel')}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-300 hover:border-neutral-600 transition text-sm"
            >
              {copied === 'excel' ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copied === 'excel' ? 'Copied!' : 'Copy Steps'}
            </button>
          </div>

          <div className="bg-neutral-900 rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm font-mono text-neutral-300 whitespace-pre-wrap">
              {EXCEL_STEPS}
            </pre>
          </div>
        </motion.div>

        {/* OOS Backtest Example */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="card p-8 mb-12 border border-purple-500/20"
        >
          <h2 className="text-2xl font-bold text-neutral-100 mb-6 flex items-center gap-3">
            <FlaskConical className="w-7 h-7 text-purple-400" />
            Out-of-Sample Backtest Example
          </h2>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="p-4 bg-neutral-900 rounded-lg">
              <h3 className="font-bold text-neutral-200 mb-3">Training Period</h3>
              <p className="text-3xl font-mono text-purple-400 mb-2">1970 - 2000</p>
              <p className="text-sm text-neutral-500">Model parameters fixed during this period</p>
            </div>
            <div className="p-4 bg-neutral-900 rounded-lg">
              <h3 className="font-bold text-neutral-200 mb-3">Testing Period</h3>
              <p className="text-3xl font-mono text-emerald-400 mb-2">2001 - 2025</p>
              <p className="text-sm text-neutral-500">True out-of-sample evaluation</p>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div className="p-4 bg-neutral-900 rounded-lg">
              <h3 className="font-bold text-neutral-200 mb-2">Methodology</h3>
              <ul className="text-sm text-neutral-400 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-purple-400">1.</span>
                  Walk-forward analysis with 12-month recession warning window
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400">2.</span>
                  Compare NIV vs Federal Reserve yield curve (T10Y3M) as baseline
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400">3.</span>
                  Evaluate using ROC-AUC on NBER recession dates
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400">4.</span>
                  Test covers 2001, 2008, 2020 recessions (not seen during training)
                </li>
              </ul>
            </div>
          </div>

          <Link
            href="/oos-tests"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-purple-700 transition"
          >
            <Play className="w-5 h-5" />
            Run OOS Backtest Now
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>

        {/* Academic Contact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="card p-8 border border-accent-500/20"
        >
          <h2 className="text-2xl font-bold text-neutral-100 mb-4">
            Seeking Academic & Industry Validation
          </h2>
          <p className="text-neutral-400 mb-6">
            We welcome rigorous review from researchers, economists, and industry practitioners.
            Full source code access and methodology discussions available upon request.
          </p>

          <div className="flex flex-wrap gap-4">
            <a
              href="https://github.com/direncode/regenerationism"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-neutral-200 hover:border-neutral-600 transition"
            >
              <Github className="w-5 h-5" />
              GitHub Repository
              <ExternalLink className="w-4 h-4" />
            </a>
            <a
              href="mailto:contact@regenerationism.ai?subject=Academic%20Validation%20Inquiry"
              className="inline-flex items-center gap-2 px-6 py-3 bg-accent-500/10 border border-accent-500/30 rounded-xl text-accent-300 hover:bg-accent-500/20 transition"
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
function ChecklistItem({ checked, children }: { checked: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${
        checked ? 'bg-emerald-500/20 text-emerald-400' : 'bg-neutral-800 text-neutral-500'
      }`}>
        {checked && <CheckCircle className="w-3.5 h-3.5" />}
      </div>
      <span className={checked ? 'text-neutral-300' : 'text-neutral-500'}>{children}</span>
    </div>
  )
}

// FRED Series Row Component
function FredSeriesRow({ id, desc, freq, use }: { id: string; desc: string; freq: string; use: string }) {
  return (
    <tr className="hover:bg-neutral-900/50 transition">
      <td className="py-3 px-4">
        <a
          href={`https://fred.stlouisfed.org/series/${id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-blue-400 hover:underline"
        >
          {id}
        </a>
      </td>
      <td className="py-3 px-4 text-neutral-300">{desc}</td>
      <td className="py-3 px-4 text-neutral-500">{freq}</td>
      <td className="py-3 px-4 text-neutral-400">{use}</td>
    </tr>
  )
}
