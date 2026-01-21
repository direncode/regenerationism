'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Area, ComposedChart, Brush,
  AreaChart, BarChart, Bar, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, ScatterChart, Scatter,
} from 'recharts'
import {
  Play, Loader2, Users, Package, Cog, Lightbulb, ArrowRight,
  ChevronRight, ChevronDown, AlertTriangle, Info, TrendingUp,
  TrendingDown, Sigma, Layers, Zap, BarChart3, Activity, Calculator,
  FlaskConical, Download, Calendar, Target, Crosshair, GitBranch,
  Gauge, Brain, Scale, Clock, Microscope,
} from 'lucide-react'
import { checkServerApiKey } from '@/lib/fredApi'

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════
const ETA = 1.5
const EPSILON = 0.001
const PROXY_MULTIPLIER = 1.15

const RECESSIONS = [
  { start: '1980-01-01', end: '1980-07-01', name: '1980' },
  { start: '1981-07-01', end: '1982-11-01', name: '1981-82' },
  { start: '1990-07-01', end: '1991-03-01', name: '1990-91' },
  { start: '2001-03-01', end: '2001-11-01', name: '2001' },
  { start: '2007-12-01', end: '2009-06-01', name: '2008 GFC' },
  { start: '2020-02-01', end: '2020-04-01', name: 'COVID' },
]

// ═══════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

interface FREDObservation { date: string; value: string }

interface MicroComponents {
  men: number; materials: number; machines: number; entrepreneurial: number
  microP: number; traditionalP: number
}

interface NIVComponents {
  thrust: number; slack: number; drag: number
  yieldPenalty: number; realRate: number; volatility: number
  dG: number; dA: number; dr: number
}

interface FullResult {
  date: string
  micro: MicroComponents
  niv: NIVComponents
  nivMicro: number
  nivTraditional: number
  isRecession: boolean
}

interface Analytics {
  // Factor contribution to P divergence
  contributions: { men: number; materials: number; machines: number; entrepreneurial: number }
  // Current regime
  regime: 'LABOR' | 'MATERIAL' | 'CAPITAL' | 'INNOVATION' | 'BALANCED'
  regimeScore: number
  // Political inefficiency (labor sacrifice)
  politicalInefficiency: number
  laborPotentialGap: number
  // Factor momentum (3-month change)
  momentum: { men: number; materials: number; machines: number; entrepreneurial: number }
  // Counterfactual P if each factor at historical max
  counterfactual: { men: number; materials: number; machines: number; entrepreneurial: number; combined: number }
  // Early warning signals
  divergenceSignal: number
  correlationBreak: boolean
  // Historical percentiles
  percentiles: { men: number; materials: number; machines: number; entrepreneurial: number }
}

interface OOSResult {
  aucMicro: number; aucTraditional: number
  winner: 'micro' | 'traditional' | 'tie'
  testSamples: number; recessionsCaptured: number
}

interface LeadLagResult {
  leader: string; lagger: string; correlation: number; lagMonths: number
}

// All FRED Series
const ALL_SERIES = {
  EMPLOYMENT: 'PAYEMS', PARTICIPATION: 'CIVPART', HOURS: 'AWHNONAG',
  PPI: 'PPIACO', INDUSTRIAL: 'INDPRO',
  INVESTMENT: 'GPDIC1', CAPACITY: 'TCU', DURABLE: 'DGORDER',
  BUSINESS_APPS: 'BABATOTALSAUS', SENTIMENT: 'UMCSENT',
  GDP: 'GDPC1', M2: 'M2SL', FED_FUNDS: 'FEDFUNDS', YIELD_SPREAD: 'T10Y3M', CPI: 'CPIAUCSL',
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function isInRecession(date: string): boolean {
  const d = new Date(date)
  return RECESSIONS.some(r => d >= new Date(r.start) && d <= new Date(r.end))
}

function calculateAUC(actuals: number[], predictions: number[]): number {
  const pairs = actuals.map((a, i) => ({ actual: a, pred: predictions[i] }))
  pairs.sort((a, b) => b.pred - a.pred)
  let tp = 0, fp = 0
  const totalPos = actuals.filter(a => a === 1).length
  const totalNeg = actuals.length - totalPos
  if (totalPos === 0 || totalNeg === 0) return 0.5
  const points: Array<{ tpr: number; fpr: number }> = [{ tpr: 0, fpr: 0 }]
  for (const pair of pairs) {
    if (pair.actual === 1) tp++; else fp++
    points.push({ tpr: tp / totalPos, fpr: fp / totalNeg })
  }
  let auc = 0
  for (let i = 1; i < points.length; i++) {
    auc += (points[i].fpr - points[i - 1].fpr) * (points[i].tpr + points[i - 1].tpr) / 2
  }
  return auc
}

function rollingMean(data: number[], window: number): number[] {
  return data.map((_, i) => {
    if (i < window - 1) return NaN
    const slice = data.slice(i - window + 1, i + 1)
    return slice.reduce((a, b) => a + b, 0) / window
  })
}

function percentile(arr: number[], value: number): number {
  const sorted = [...arr].filter(x => !isNaN(x)).sort((a, b) => a - b)
  if (sorted.length === 0) return 50
  const idx = sorted.findIndex(x => x >= value)
  if (idx === -1) return 100
  return (idx / sorted.length) * 100
}

function correlation(x: number[], y: number[], lag = 0): number {
  const n = Math.min(x.length - lag, y.length)
  if (n < 10) return 0
  const xSlice = x.slice(0, n)
  const ySlice = y.slice(lag, lag + n)
  const meanX = xSlice.reduce((a, b) => a + b, 0) / n
  const meanY = ySlice.reduce((a, b) => a + b, 0) / n
  let num = 0, denX = 0, denY = 0
  for (let i = 0; i < n; i++) {
    const dx = xSlice[i] - meanX
    const dy = ySlice[i] - meanY
    num += dx * dy
    denX += dx * dx
    denY += dy * dy
  }
  const den = Math.sqrt(denX * denY)
  return den > 0 ? num / den : 0
}

// ═══════════════════════════════════════════════════════════════════════════
// ANALYTICS ENGINE
// ═══════════════════════════════════════════════════════════════════════════

function computeAnalytics(results: FullResult[], idx: number): Analytics {
  const current = results[idx]
  const { men, materials, machines, entrepreneurial, microP, traditionalP } = current.micro

  // Historical arrays for percentiles
  const histMen = results.slice(0, idx + 1).map(r => r.micro.men)
  const histMat = results.slice(0, idx + 1).map(r => r.micro.materials)
  const histMac = results.slice(0, idx + 1).map(r => r.micro.machines)
  const histEnt = results.slice(0, idx + 1).map(r => r.micro.entrepreneurial)

  // Percentiles
  const percentiles = {
    men: percentile(histMen, men),
    materials: percentile(histMat, materials),
    machines: percentile(histMac, machines),
    entrepreneurial: percentile(histEnt, entrepreneurial),
  }

  // Factor contribution to P (Shapley-style decomposition)
  const logP = Math.log(microP)
  const logFactors = {
    men: Math.log(Math.max(0.001, men)),
    materials: Math.log(Math.max(0.001, materials)),
    machines: Math.log(Math.max(0.001, machines)),
    entrepreneurial: Math.log(Math.max(0.001, entrepreneurial)),
  }
  const totalLog = Object.values(logFactors).reduce((a, b) => a + b, 0)
  const contributions = {
    men: totalLog !== 0 ? (logFactors.men / totalLog) * 100 : 25,
    materials: totalLog !== 0 ? (logFactors.materials / totalLog) * 100 : 25,
    machines: totalLog !== 0 ? (logFactors.machines / totalLog) * 100 : 25,
    entrepreneurial: totalLog !== 0 ? (logFactors.entrepreneurial / totalLog) * 100 : 25,
  }

  // Regime detection (which factor is the binding constraint?)
  const factorScores = [
    { name: 'LABOR' as const, score: percentiles.men, factor: 'men' },
    { name: 'MATERIAL' as const, score: percentiles.materials, factor: 'materials' },
    { name: 'CAPITAL' as const, score: percentiles.machines, factor: 'machines' },
    { name: 'INNOVATION' as const, score: percentiles.entrepreneurial, factor: 'entrepreneurial' },
  ]
  const minFactor = factorScores.reduce((a, b) => a.score < b.score ? a : b)
  const maxFactor = factorScores.reduce((a, b) => a.score > b.score ? a : b)
  const spread = maxFactor.score - minFactor.score

  let regime: Analytics['regime'] = 'BALANCED'
  let regimeScore = 0
  if (spread > 30) {
    regime = minFactor.name
    regimeScore = 100 - minFactor.score
  }

  // Political inefficiency (labor sacrifice metric)
  // Based on user's thesis: politicians sacrifice labor efficiency for stability
  const laborPotential = Math.max(...histMen) // Historical max labor efficiency
  const laborPotentialGap = ((laborPotential - men) / laborPotential) * 100

  // Political inefficiency = gap between current labor and what it could be
  // weighted by how far below other factors labor is
  const avgOtherFactors = (percentiles.materials + percentiles.machines + percentiles.entrepreneurial) / 3
  const laborLag = avgOtherFactors - percentiles.men
  const politicalInefficiency = Math.max(0, laborLag * (laborPotentialGap / 100))

  // Factor momentum (3-month rate of change)
  const momentum = { men: 0, materials: 0, machines: 0, entrepreneurial: 0 }
  if (idx >= 3) {
    const prev = results[idx - 3].micro
    momentum.men = ((men - prev.men) / prev.men) * 100
    momentum.materials = ((materials - prev.materials) / prev.materials) * 100
    momentum.machines = ((machines - prev.machines) / prev.machines) * 100
    momentum.entrepreneurial = ((entrepreneurial - prev.entrepreneurial) / prev.entrepreneurial) * 100
  }

  // Counterfactual: What if each factor at historical maximum?
  const maxMen = Math.max(...histMen)
  const maxMat = Math.max(...histMat)
  const maxMac = Math.max(...histMac)
  const maxEnt = Math.max(...histEnt)

  const counterfactual = {
    men: Math.pow(maxMen * materials * machines * entrepreneurial, 0.25),
    materials: Math.pow(men * maxMat * machines * entrepreneurial, 0.25),
    machines: Math.pow(men * materials * maxMac * entrepreneurial, 0.25),
    entrepreneurial: Math.pow(men * materials * machines * maxEnt, 0.25),
    combined: Math.pow(maxMen * maxMat * maxMac * maxEnt, 0.25),
  }

  // Early warning: divergence between micro and traditional P
  const pRatio = microP / traditionalP
  const historicalRatios = results.slice(Math.max(0, idx - 24), idx).map(r => r.micro.microP / r.micro.traditionalP)
  const avgRatio = historicalRatios.length > 0 ? historicalRatios.reduce((a, b) => a + b, 0) / historicalRatios.length : 1
  const divergenceSignal = Math.abs((pRatio - avgRatio) / avgRatio) * 100

  // Correlation break detection
  const recentCorr = idx >= 12 ? correlation(
    results.slice(idx - 12, idx).map(r => r.micro.men),
    results.slice(idx - 12, idx).map(r => r.micro.machines)
  ) : 0
  const historicalCorr = idx >= 36 ? correlation(
    results.slice(idx - 36, idx - 12).map(r => r.micro.men),
    results.slice(idx - 36, idx - 12).map(r => r.micro.machines)
  ) : recentCorr
  const correlationBreak = Math.abs(recentCorr - historicalCorr) > 0.3

  return {
    contributions, regime, regimeScore, politicalInefficiency, laborPotentialGap,
    momentum, counterfactual, divergenceSignal, correlationBreak, percentiles,
  }
}

function computeLeadLag(results: FullResult[]): LeadLagResult[] {
  const factors = ['men', 'materials', 'machines', 'entrepreneurial'] as const
  const series: Record<string, number[]> = {}
  factors.forEach(f => {
    series[f] = results.map(r => r.micro[f])
  })

  const leadLagResults: LeadLagResult[] = []

  for (let i = 0; i < factors.length; i++) {
    for (let j = i + 1; j < factors.length; j++) {
      const f1 = factors[i], f2 = factors[j]
      let bestLag = 0, bestCorr = correlation(series[f1], series[f2], 0)

      for (let lag = 1; lag <= 6; lag++) {
        const corr1 = correlation(series[f1], series[f2], lag) // f1 leads f2
        const corr2 = correlation(series[f2], series[f1], lag) // f2 leads f1

        if (Math.abs(corr1) > Math.abs(bestCorr)) {
          bestCorr = corr1
          bestLag = lag
        }
        if (Math.abs(corr2) > Math.abs(bestCorr)) {
          bestCorr = -corr2 // Negative to indicate reverse direction
          bestLag = -lag
        }
      }

      if (Math.abs(bestLag) > 0 && Math.abs(bestCorr) > 0.3) {
        leadLagResults.push({
          leader: bestLag > 0 ? f1 : f2,
          lagger: bestLag > 0 ? f2 : f1,
          correlation: Math.abs(bestCorr),
          lagMonths: Math.abs(bestLag),
        })
      }
    }
  }

  return leadLagResults.sort((a, b) => b.correlation - a.correlation)
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function MicroIntegrationPage() {
  const [isCalculating, setIsCalculating] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<FullResult[]>([])
  const [oosResult, setOosResult] = useState<OOSResult | null>(null)
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [leadLag, setLeadLag] = useState<LeadLagResult[]>([])
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['formula']))
  const [hasServerKey, setHasServerKey] = useState<boolean | null>(null)
  const [checkingServerKey, setCheckingServerKey] = useState(true)
  const [brushRange, setBrushRange] = useState<{ startIndex?: number; endIndex?: number }>({})

  useEffect(() => {
    const checkServer = async () => {
      setCheckingServerKey(true)
      const hasKey = await checkServerApiKey()
      setHasServerKey(hasKey)
      setCheckingServerKey(false)
    }
    checkServer()
  }, [])

  const toggleSection = (s: string) => {
    const n = new Set(expandedSections)
    n.has(s) ? n.delete(s) : n.add(s)
    setExpandedSections(n)
  }

  const fetchFREDSeries = async (seriesId: string, startDate: string, endDate: string): Promise<FREDObservation[]> => {
    const url = new URL('/api/fred', window.location.origin)
    url.searchParams.set('series_id', seriesId)
    url.searchParams.set('observation_start', startDate)
    url.searchParams.set('observation_end', endDate)
    url.searchParams.set('endpoint', 'observations')
    const res = await fetch(url.toString())
    if (!res.ok) throw new Error(`Failed to fetch ${seriesId}`)
    const data = await res.json()
    return data.observations || []
  }

  const parseValue = (v: string): number | null => {
    if (v === '.' || v === '') return null
    const p = parseFloat(v)
    return isNaN(p) ? null : p
  }

  const stdDev = (arr: number[]): number => {
    if (arr.length === 0) return 0
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length
    return Math.sqrt(arr.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / arr.length)
  }

  const runOOSTest = useCallback((data: FullResult[]): OOSResult => {
    const nivMicro = rollingMean(data.map(d => d.nivMicro), 12)
    const nivTrad = rollingMean(data.map(d => d.nivTraditional), 12)
    const targets = data.map((_, i) => i + 12 < data.length ? (data[i + 12].isRecession ? 1 : 0) : NaN)
    const valid = data.map((_, i) => !isNaN(nivMicro[i]) && !isNaN(nivTrad[i]) && !isNaN(targets[i]))
    const vMicro = nivMicro.filter((_, i) => valid[i])
    const vTrad = nivTrad.filter((_, i) => valid[i])
    const vTargets = targets.filter((_, i) => valid[i])
    if (vMicro.length < 50) return { aucMicro: 0.5, aucTraditional: 0.5, winner: 'tie', testSamples: 0, recessionsCaptured: 0 }
    const aucMicro = calculateAUC(vTargets, vMicro.map(v => -v))
    const aucTraditional = calculateAUC(vTargets, vTrad.map(v => -v))
    const winner = Math.abs(aucMicro - aucTraditional) > 0.01 ? (aucMicro > aucTraditional ? 'micro' : 'traditional') : 'tie'
    return { aucMicro, aucTraditional, winner, testSamples: vMicro.length, recessionsCaptured: vTargets.filter(t => t === 1).length }
  }, [])

  const calculateFullNIV = useCallback(async () => {
    if (!hasServerKey) { setError('Server API key not configured'); return }
    setIsCalculating(true)
    setError(null)
    setResults([])
    setOosResult(null)
    setAnalytics(null)

    try {
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = '1965-01-01'
      const seriesList = Object.entries(ALL_SERIES)
      const seriesData = new Map<string, FREDObservation[]>()

      for (let i = 0; i < seriesList.length; i++) {
        const [name, seriesId] = seriesList[i]
        setLoadingStatus(`Fetching ${name} (${i + 1}/${seriesList.length})...`)
        try { seriesData.set(name, await fetchFREDSeries(seriesId, startDate, endDate)) }
        catch { seriesData.set(name, []) }
      }

      setLoadingStatus('Processing data...')

      const createLookup = (obs: FREDObservation[]) => {
        const m = new Map<string, number>()
        obs.forEach(o => { const v = parseValue(o.value); if (v !== null) m.set(o.date.substring(0, 7), v) })
        return m
      }

      const L = {
        employment: createLookup(seriesData.get('EMPLOYMENT') || []),
        participation: createLookup(seriesData.get('PARTICIPATION') || []),
        hours: createLookup(seriesData.get('HOURS') || []),
        ppi: createLookup(seriesData.get('PPI') || []),
        industrial: createLookup(seriesData.get('INDUSTRIAL') || []),
        investment: createLookup(seriesData.get('INVESTMENT') || []),
        capacity: createLookup(seriesData.get('CAPACITY') || []),
        durable: createLookup(seriesData.get('DURABLE') || []),
        businessApps: createLookup(seriesData.get('BUSINESS_APPS') || []),
        sentiment: createLookup(seriesData.get('SENTIMENT') || []),
        gdp: createLookup(seriesData.get('GDP') || []),
        m2: createLookup(seriesData.get('M2') || []),
        fedFunds: createLookup(seriesData.get('FED_FUNDS') || []),
        yieldSpread: createLookup(seriesData.get('YIELD_SPREAD') || []),
        cpi: createLookup(seriesData.get('CPI') || []),
      }

      const allDates = Array.from(L.m2.keys()).sort()
      const calc: FullResult[] = []
      let lastInv: number | null = null, lastGdp: number | null = null
      const ffHist: number[] = []

      setLoadingStatus('Calculating NIV...')

      for (let i = 12; i < allDates.length; i++) {
        const mk = allDates[i], yk = allDates[i - 12], pk = allDates[i - 1]
        const emp = L.employment.get(mk), part = L.participation.get(mk), hrs = L.hours.get(mk)
        const ppi = L.ppi.get(mk), ind = L.industrial.get(mk), cap = L.capacity.get(mk)
        const dur = L.durable.get(mk), biz = L.businessApps.get(mk), sent = L.sentiment.get(mk)
        const m2 = L.m2.get(mk), ff = L.fedFunds.get(mk), ys = L.yieldSpread.get(mk), cpi = L.cpi.get(mk)

        const inv = L.investment.get(mk); if (inv !== undefined) lastInv = inv
        const gdp = L.gdp.get(mk); if (gdp !== undefined) lastGdp = gdp
        if (ff !== undefined) { ffHist.push(ff); if (ffHist.length > 12) ffHist.shift() }

        const empYA = L.employment.get(yk), ppiYA = L.ppi.get(yk), indYA = L.industrial.get(yk)
        const invYA = L.investment.get(yk), durYA = L.durable.get(yk), bizYA = L.businessApps.get(yk)
        const m2YA = L.m2.get(yk), cpiYA = L.cpi.get(yk), ffP = L.fedFunds.get(pk)

        if (!emp || !empYA || !part || !hrs || !ind || !indYA || !cap || !lastInv || !lastGdp || !m2 || !m2YA || !ff || !cpi || !cpiYA) continue

        // MICRO FACTORS
        const empG = (emp - empYA) / empYA
        const men = (0.4 * (1 + empG)) * (0.35 * part / 100 + 0.65) * (0.25 * (hrs ?? 34) / 40 + 0.75)
        const ppiG = ppi && ppiYA ? (ppi - ppiYA) / ppiYA : 0
        const materials = (0.6 * ind / 100) * (0.4 / (1 + Math.max(0, ppiG)) + 0.6)
        const invG = invYA ? (lastInv - invYA) / invYA : 0
        const durG = dur && durYA ? (dur - durYA) / durYA : 0
        const machines = (0.5 * cap / 100) * (0.3 * (1 + invG) + 0.7) * (0.2 * (1 + durG) + 0.8)
        const bizG = biz && bizYA ? (biz - bizYA) / bizYA : 0
        const entrepreneurial = (0.6 * (1 + bizG * 0.5) + 0.4) * (0.4 * (sent ?? 80) / 100 + 0.6)

        const microP = Math.pow(Math.max(0.001, men * materials * machines * entrepreneurial), 0.25)
        const traditionalP = (lastInv * PROXY_MULTIPLIER) / lastGdp

        // NIV COMPONENTS
        const dG = invG, dA = (m2 - m2YA) / m2YA, dr = ffP !== undefined ? ff - ffP : 0
        const thrust = Math.tanh(dG + dA - 0.7 * dr)
        const slack = 1 - cap / 100
        const yieldPenalty = (ys ?? 0) < 0 ? Math.abs((ys ?? 0) / 100) : 0
        const realRate = Math.max(0, ff / 100 - (cpi - cpiYA) / cpiYA)
        const volatility = stdDev(ffHist) / 100
        const drag = 0.4 * yieldPenalty + 0.4 * realRate + 0.2 * volatility

        const denom = Math.pow(Math.max(slack + drag, EPSILON), ETA)
        const nivMicro = thrust * Math.pow(microP, 2) / denom
        const nivTraditional = thrust * Math.pow(traditionalP, 2) / denom

        calc.push({
          date: `${mk}-01`,
          micro: { men, materials, machines, entrepreneurial, microP, traditionalP },
          niv: { thrust, slack, drag, yieldPenalty, realRate, volatility, dG, dA, dr },
          nivMicro, nivTraditional,
          isRecession: isInRecession(`${mk}-01`),
        })
      }

      setResults(calc)

      setLoadingStatus('Running analytics...')
      const oos = runOOSTest(calc)
      setOosResult(oos)

      if (calc.length > 0) {
        const a = computeAnalytics(calc, calc.length - 1)
        setAnalytics(a)
        const ll = computeLeadLag(calc)
        setLeadLag(ll)
      }

      setLoadingStatus('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Calculation failed')
    } finally {
      setIsCalculating(false)
    }
  }, [hasServerKey, runOOSTest])

  const latestResult = results[results.length - 1]

  const chartData = useMemo(() => results.map(r => ({
    date: r.date.substring(0, 7),
    nivMicro: r.nivMicro, nivTraditional: r.nivTraditional,
    men: r.micro.men, materials: r.micro.materials, machines: r.micro.machines, entrepreneurial: r.micro.entrepreneurial,
    microP: r.micro.microP, traditionalP: r.micro.traditionalP,
    thrust: r.niv.thrust, slack: r.niv.slack, drag: r.niv.drag,
    isRecession: r.isRecession ? 0.1 : 0,
  })), [results])

  const filteredData = useMemo(() => {
    if (brushRange.startIndex !== undefined && brushRange.endIndex !== undefined) {
      return chartData.slice(brushRange.startIndex, brushRange.endIndex + 1)
    }
    return chartData
  }, [chartData, brushRange])

  // Radar chart data for factor balance
  const radarData = analytics ? [
    { factor: 'Men', value: analytics.percentiles.men, fullMark: 100 },
    { factor: 'Materials', value: analytics.percentiles.materials, fullMark: 100 },
    { factor: 'Machines', value: analytics.percentiles.machines, fullMark: 100 },
    { factor: 'Entrepreneurial', value: analytics.percentiles.entrepreneurial, fullMark: 100 },
  ] : []

  // Contribution bar chart data
  const contributionData = analytics ? [
    { name: 'Men', value: analytics.contributions.men, fill: '#3b82f6' },
    { name: 'Materials', value: analytics.contributions.materials, fill: '#f59e0b' },
    { name: 'Machines', value: analytics.contributions.machines, fill: '#10b981' },
    { name: 'Entrepreneurial', value: analytics.contributions.entrepreneurial, fill: '#a855f7' },
  ] : []

  // Counterfactual data
  const counterfactualData = analytics && latestResult ? [
    { name: 'Current', value: latestResult.micro.microP, fill: '#6b7280' },
    { name: 'Max Men', value: analytics.counterfactual.men, fill: '#3b82f6' },
    { name: 'Max Materials', value: analytics.counterfactual.materials, fill: '#f59e0b' },
    { name: 'Max Machines', value: analytics.counterfactual.machines, fill: '#10b981' },
    { name: 'Max Entrep.', value: analytics.counterfactual.entrepreneurial, fill: '#a855f7' },
    { name: 'All Max', value: analytics.counterfactual.combined, fill: '#ec4899' },
  ] : []

  const exportCSV = useCallback(() => {
    if (results.length === 0) return
    const headers = ['Date', 'M_l', 'M_m', 'M_k', 'E', 'P_micro', 'P_trad', 'u', 'X', 'F', 'NIV_micro', 'NIV_trad', 'Recession']
    const rows = results.map(r => [
      r.date, r.micro.men.toFixed(4), r.micro.materials.toFixed(4), r.micro.machines.toFixed(4),
      r.micro.entrepreneurial.toFixed(4), r.micro.microP.toFixed(4), r.micro.traditionalP.toFixed(4),
      r.niv.thrust.toFixed(4), r.niv.slack.toFixed(4), r.niv.drag.toFixed(4),
      r.nivMicro.toFixed(4), r.nivTraditional.toFixed(4), r.isRecession ? '1' : '0'
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'micro_niv_analytics.csv'
    a.click()
  }, [results])

  const regimeColors: Record<string, string> = {
    LABOR: 'text-blue-400 bg-blue-500/20', MATERIAL: 'text-amber-400 bg-amber-500/20',
    CAPITAL: 'text-emerald-400 bg-emerald-500/20', INNOVATION: 'text-purple-400 bg-purple-500/20',
    BALANCED: 'text-neutral-400 bg-neutral-500/20',
  }

  return (
    <div className="min-h-screen bg-neutral-950 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 mb-4">
            <Microscope className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-purple-300">Advanced Analytics</span>
          </div>
          <h1 className="text-3xl font-bold text-neutral-100 flex items-center gap-3">
            <Sigma className="w-8 h-8 text-accent-400" />
            Micro Integration Experiment
          </h1>
          <p className="text-neutral-400 mt-2 max-w-3xl">
            Deep economic analytics: factor contributions, regime detection, political inefficiency scoring, and counterfactual analysis.
          </p>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400" /><span className="text-red-200">{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Formula */}
        <CollapsibleSection title="NIV Formula" icon={<Calculator className="w-5 h-5" />}
          isExpanded={expandedSections.has('formula')} onToggle={() => toggleSection('formula')} color="accent">
          <div className="text-center p-4 bg-neutral-900 rounded-xl border border-accent-500/30">
            <div className="font-mono text-xl text-accent-400 mb-2">NIV = (u × P²) / (X + F)<sup>η</sup></div>
            <div className="font-mono text-sm text-accent-300">P<sub>micro</sub> = (M<sub>l</sub> × M<sub>m</sub> × M<sub>k</sub> × E)<sup>1/4</sup></div>
          </div>
        </CollapsibleSection>

        {/* Calculate Button */}
        <button onClick={calculateFullNIV} disabled={isCalculating || checkingServerKey || !hasServerKey}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 text-white font-bold rounded-xl transition disabled:opacity-50 my-8">
          {checkingServerKey ? <><Loader2 className="w-5 h-5 animate-spin" />Initializing...</> :
           isCalculating ? <><Loader2 className="w-5 h-5 animate-spin" />{loadingStatus}</> :
           !hasServerKey ? <><AlertTriangle className="w-5 h-5" />Server API Key Required</> :
           <><Play className="w-5 h-5" />Run Full Analysis (60 Years)</>}
        </button>

        {/* Results */}
        {latestResult && analytics && (
          <>
            {/* Key Metrics Dashboard */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
              <div className="grid md:grid-cols-4 gap-4 mb-6">
                {/* Regime Card */}
                <div className="p-4 bg-neutral-900 rounded-xl border border-neutral-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-neutral-400" />
                    <span className="text-sm text-neutral-400">Current Regime</span>
                  </div>
                  <div className={`text-2xl font-bold px-3 py-1 rounded-lg inline-block ${regimeColors[analytics.regime]}`}>
                    {analytics.regime}
                  </div>
                  <div className="text-xs text-neutral-500 mt-1">Binding constraint: {analytics.regimeScore.toFixed(0)}%</div>
                </div>

                {/* Political Inefficiency */}
                <div className="p-4 bg-neutral-900 rounded-xl border border-red-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Scale className="w-4 h-4 text-red-400" />
                    <span className="text-sm text-neutral-400">Political Inefficiency</span>
                  </div>
                  <div className={`text-3xl font-mono font-bold ${analytics.politicalInefficiency > 10 ? 'text-red-400' : analytics.politicalInefficiency > 5 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                    {analytics.politicalInefficiency.toFixed(1)}
                  </div>
                  <div className="text-xs text-neutral-500 mt-1">Labor potential gap: {analytics.laborPotentialGap.toFixed(1)}%</div>
                </div>

                {/* Divergence Signal */}
                <div className="p-4 bg-neutral-900 rounded-xl border border-neutral-700">
                  <div className="flex items-center gap-2 mb-2">
                    <GitBranch className="w-4 h-4 text-neutral-400" />
                    <span className="text-sm text-neutral-400">P Divergence</span>
                  </div>
                  <div className={`text-3xl font-mono font-bold ${analytics.divergenceSignal > 20 ? 'text-red-400' : analytics.divergenceSignal > 10 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                    {analytics.divergenceSignal.toFixed(1)}%
                  </div>
                  {analytics.correlationBreak && <div className="text-xs text-amber-400 mt-1">⚠ Correlation break detected</div>}
                </div>

                {/* OOS Winner */}
                {oosResult && (
                  <div className="p-4 bg-neutral-900 rounded-xl border border-accent-500/30">
                    <div className="flex items-center gap-2 mb-2">
                      <FlaskConical className="w-4 h-4 text-accent-400" />
                      <span className="text-sm text-neutral-400">OOS Test Winner</span>
                    </div>
                    <div className="text-2xl font-bold text-accent-400">{oosResult.winner.toUpperCase()}</div>
                    <div className="text-xs text-neutral-500 mt-1">
                      Micro: {oosResult.aucMicro.toFixed(3)} | Trad: {oosResult.aucTraditional.toFixed(3)}
                    </div>
                  </div>
                )}
              </div>

              {/* Factor Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <FactorMetricCard name="Men" symbol="M_l" value={latestResult.micro.men} percentile={analytics.percentiles.men}
                  momentum={analytics.momentum.men} icon={<Users className="w-5 h-5" />} color="blue" />
                <FactorMetricCard name="Materials" symbol="M_m" value={latestResult.micro.materials} percentile={analytics.percentiles.materials}
                  momentum={analytics.momentum.materials} icon={<Package className="w-5 h-5" />} color="amber" />
                <FactorMetricCard name="Machines" symbol="M_k" value={latestResult.micro.machines} percentile={analytics.percentiles.machines}
                  momentum={analytics.momentum.machines} icon={<Cog className="w-5 h-5" />} color="emerald" />
                <FactorMetricCard name="Entrepreneurial" symbol="E" value={latestResult.micro.entrepreneurial} percentile={analytics.percentiles.entrepreneurial}
                  momentum={analytics.momentum.entrepreneurial} icon={<Lightbulb className="w-5 h-5" />} color="purple" />
              </div>

              {/* Export */}
              <div className="flex justify-end">
                <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm text-neutral-300 transition">
                  <Download className="w-4 h-4" />Export CSV
                </button>
              </div>
            </motion.div>

            {/* Factor Balance Radar */}
            <CollapsibleSection title="Factor Balance Analysis" icon={<Crosshair className="w-5 h-5" />}
              isExpanded={expandedSections.has('balance')} onToggle={() => toggleSection('balance')} color="purple">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Radar Chart */}
                <div>
                  <h4 className="text-sm font-semibold text-neutral-300 mb-2">Historical Percentile Position</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="#333" />
                        <PolarAngleAxis dataKey="factor" tick={{ fill: '#999', fontSize: 12 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#666', fontSize: 10 }} />
                        <Radar name="Current" dataKey="value" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.3} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-xs text-neutral-500 text-center">Shows where each factor stands vs. its own history (50 = median)</p>
                </div>

                {/* Contribution Bar */}
                <div>
                  <h4 className="text-sm font-semibold text-neutral-300 mb-2">Contribution to P<sub>micro</sub></h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={contributionData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis type="number" domain={[0, 100]} tick={{ fill: '#999', fontSize: 10 }} />
                        <YAxis type="category" dataKey="name" tick={{ fill: '#999', fontSize: 12 }} width={100} />
                        <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                          {contributionData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-xs text-neutral-500 text-center">Geometric mean contribution (log-weighted)</p>
                </div>
              </div>
            </CollapsibleSection>

            {/* Counterfactual Analysis */}
            <CollapsibleSection title="Counterfactual Analysis" icon={<Brain className="w-5 h-5" />}
              isExpanded={expandedSections.has('counterfactual')} onToggle={() => toggleSection('counterfactual')} color="blue">
              <div className="space-y-4">
                <p className="text-sm text-neutral-400">
                  What would P<sub>micro</sub> be if each factor were at its historical maximum?
                </p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={counterfactualData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="name" tick={{ fill: '#999', fontSize: 10 }} />
                      <YAxis tick={{ fill: '#999', fontSize: 10 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {counterfactualData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid md:grid-cols-3 gap-4 mt-4">
                  <div className="p-3 bg-neutral-800 rounded-lg">
                    <div className="text-xs text-neutral-500">Largest Potential Gain</div>
                    <div className="text-lg font-bold text-emerald-400">
                      {counterfactualData.length > 1 ?
                        `${((Math.max(...counterfactualData.slice(1, 5).map(d => d.value)) / counterfactualData[0].value - 1) * 100).toFixed(1)}%`
                        : '—'}
                    </div>
                  </div>
                  <div className="p-3 bg-neutral-800 rounded-lg">
                    <div className="text-xs text-neutral-500">Full Optimization Gain</div>
                    <div className="text-lg font-bold text-pink-400">
                      {counterfactualData.length > 5 ?
                        `${((counterfactualData[5].value / counterfactualData[0].value - 1) * 100).toFixed(1)}%`
                        : '—'}
                    </div>
                  </div>
                  <div className="p-3 bg-neutral-800 rounded-lg">
                    <div className="text-xs text-neutral-500">Weakest Factor</div>
                    <div className="text-lg font-bold text-blue-400">
                      {['Men', 'Materials', 'Machines', 'Entrep.'][
                        [analytics.percentiles.men, analytics.percentiles.materials, analytics.percentiles.machines, analytics.percentiles.entrepreneurial]
                          .indexOf(Math.min(analytics.percentiles.men, analytics.percentiles.materials, analytics.percentiles.machines, analytics.percentiles.entrepreneurial))
                      ]}
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            {/* Lead-Lag Analysis */}
            {leadLag.length > 0 && (
              <CollapsibleSection title="Lead-Lag Relationships" icon={<Clock className="w-5 h-5" />}
                isExpanded={expandedSections.has('leadlag')} onToggle={() => toggleSection('leadlag')} color="blue">
                <div className="space-y-4">
                  <p className="text-sm text-neutral-400">
                    Which factors predict movements in others? (Cross-correlation analysis)
                  </p>
                  <div className="space-y-2">
                    {leadLag.slice(0, 5).map((ll, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-neutral-800 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-emerald-400 font-bold capitalize">{ll.leader}</span>
                          <ArrowRight className="w-4 h-4 text-neutral-500" />
                          <span className="text-neutral-300 capitalize">{ll.lagger}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-neutral-500">{ll.lagMonths} month{ll.lagMonths > 1 ? 's' : ''}</span>
                          <span className="text-sm font-mono text-accent-400">r = {ll.correlation.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-neutral-500">
                    Interpretation: If &quot;Men → Machines&quot; with 3 month lag, labor efficiency changes predict capital efficiency 3 months later.
                  </p>
                </div>
              </CollapsibleSection>
            )}

            {/* Historical Explorer */}
            <CollapsibleSection title={`Historical Explorer (${results.length} months)`} icon={<Calendar className="w-5 h-5" />}
              isExpanded={expandedSections.has('explorer')} onToggle={() => toggleSection('explorer')} color="accent">
              <div className="space-y-6">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="date" stroke="#666" tick={{ fill: '#999', fontSize: 10 }} interval={Math.floor(chartData.length / 10)} />
                      <YAxis stroke="#666" tick={{ fill: '#999', fontSize: 10 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                      <Legend />
                      <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="5 5" />
                      <Area type="step" dataKey="isRecession" fill="#ef4444" fillOpacity={0.3} stroke="none" name="Recession" />
                      <Line type="monotone" dataKey="nivMicro" stroke="#7c3aed" name="NIV (Micro)" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="nivTraditional" stroke="#6b7280" name="NIV (Traditional)" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                      <Brush dataKey="date" height={30} stroke="#7c3aed" fill="#1a1a1a"
                        onChange={(range) => setBrushRange(range as { startIndex?: number; endIndex?: number })} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={filteredData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="date" stroke="#666" tick={{ fill: '#999', fontSize: 10 }} />
                      <YAxis stroke="#666" tick={{ fill: '#999', fontSize: 10 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                      <Legend />
                      <Line type="monotone" dataKey="men" stroke="#3b82f6" name="Men" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="materials" stroke="#f59e0b" name="Materials" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="machines" stroke="#10b981" name="Machines" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="entrepreneurial" stroke="#a855f7" name="Entrepreneurial" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CollapsibleSection>

            {/* Data Table */}
            <CollapsibleSection title="Data Table" icon={<BarChart3 className="w-5 h-5" />}
              isExpanded={expandedSections.has('table')} onToggle={() => toggleSection('table')} color="gray">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-neutral-400 border-b border-neutral-800">
                      <th className="text-left py-2 px-2">Date</th>
                      <th className="text-right py-2 px-2">M<sub>l</sub></th>
                      <th className="text-right py-2 px-2">M<sub>m</sub></th>
                      <th className="text-right py-2 px-2">M<sub>k</sub></th>
                      <th className="text-right py-2 px-2">E</th>
                      <th className="text-right py-2 px-2 text-accent-400">NIV<sub>μ</sub></th>
                      <th className="text-right py-2 px-2">NIV<sub>t</sub></th>
                      <th className="text-right py-2 px-2">Rec</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.slice(-24).reverse().map((r) => (
                      <tr key={r.date} className={`border-b border-neutral-800/50 hover:bg-neutral-900 ${r.isRecession ? 'bg-red-500/10' : ''}`}>
                        <td className="py-2 px-2 font-mono text-neutral-300">{r.date.substring(0, 7)}</td>
                        <td className="py-2 px-2 font-mono text-right text-blue-400">{r.micro.men.toFixed(3)}</td>
                        <td className="py-2 px-2 font-mono text-right text-amber-400">{r.micro.materials.toFixed(3)}</td>
                        <td className="py-2 px-2 font-mono text-right text-emerald-400">{r.micro.machines.toFixed(3)}</td>
                        <td className="py-2 px-2 font-mono text-right text-purple-400">{r.micro.entrepreneurial.toFixed(3)}</td>
                        <td className={`py-2 px-2 font-mono text-right font-bold ${r.nivMicro >= 0.035 ? 'text-emerald-400' : r.nivMicro >= 0.015 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {r.nivMicro.toFixed(4)}
                        </td>
                        <td className="py-2 px-2 font-mono text-right text-neutral-400">{r.nivTraditional.toFixed(4)}</td>
                        <td className="py-2 px-2">{r.isRecession ? <span className="text-red-400">●</span> : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CollapsibleSection>
          </>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function CollapsibleSection({ title, icon, isExpanded, onToggle, color, children }: {
  title: string; icon: React.ReactNode; isExpanded: boolean; onToggle: () => void; color: string; children: React.ReactNode
}) {
  const colors: Record<string, string> = {
    accent: 'border-accent-500/30 bg-accent-500/5', blue: 'border-blue-500/30 bg-blue-500/5',
    purple: 'border-purple-500/30 bg-purple-500/5', gray: 'border-neutral-700 bg-neutral-900',
  }
  const icons: Record<string, string> = { accent: 'text-accent-400', blue: 'text-blue-400', purple: 'text-purple-400', gray: 'text-neutral-400' }
  return (
    <div className={`mb-4 border rounded-xl overflow-hidden ${colors[color]}`}>
      <button onClick={onToggle} className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition">
        <div className="flex items-center gap-3"><span className={icons[color]}>{icon}</span><span className="font-bold text-neutral-100">{title}</span></div>
        {isExpanded ? <ChevronDown className="w-5 h-5 text-neutral-400" /> : <ChevronRight className="w-5 h-5 text-neutral-400" />}
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="p-4 border-t border-neutral-800">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function FactorMetricCard({ name, symbol, value, percentile, momentum, icon, color }: {
  name: string; symbol: string; value: number; percentile: number; momentum: number; icon: React.ReactNode; color: string
}) {
  const colors: Record<string, string> = {
    blue: 'border-blue-500/30 text-blue-400', amber: 'border-amber-500/30 text-amber-400',
    emerald: 'border-emerald-500/30 text-emerald-400', purple: 'border-purple-500/30 text-purple-400',
  }
  const [border, text] = colors[color].split(' ')
  return (
    <div className={`p-4 bg-neutral-900 rounded-xl border ${border}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={text}>{icon}</span>
          <span className="text-sm text-neutral-400">{name}</span>
        </div>
        <span className="text-xs text-neutral-500 font-mono">{symbol}</span>
      </div>
      <div className={`text-2xl font-mono font-bold ${text}`}>{value.toFixed(3)}</div>
      <div className="flex items-center justify-between mt-2 text-xs">
        <span className="text-neutral-500">P{percentile.toFixed(0)}</span>
        <span className={momentum >= 0 ? 'text-emerald-400' : 'text-red-400'}>
          {momentum >= 0 ? '↑' : '↓'} {Math.abs(momentum).toFixed(1)}%
        </span>
      </div>
    </div>
  )
}
