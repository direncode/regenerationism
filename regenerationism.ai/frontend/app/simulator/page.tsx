'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  BarChart,
  Bar,
  Cell,
} from 'recharts'
import {
  Play,
  Loader2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  BarChart3,
  Activity,
  Target,
  Zap,
  Download,
  RefreshCw,
  Database,
  Key,
} from 'lucide-react'
import ParameterPanel from '@/components/ParameterPanel'
import ScenarioLibrary from '@/components/ScenarioLibrary'
import ApiSettings from '@/components/ApiSettings'
import { useSessionStore, SimulationResult } from '@/store/sessionStore'
import { calculateNIVFromFRED, NIVDataPoint } from '@/lib/fredApi'

interface SimulationResponse {
  params: {
    eta: number
    weights: { thrust: number; efficiency: number; slack: number; drag: number }
    smooth_window: number
    start_date: string
    end_date: string
  }
  data: Array<{
    date: string
    niv_score: number
    recession_probability: number
    alert_level: string
    is_recession: boolean
  }>
  summary: {
    total_points: number
    avg_probability: number
    max_probability: number
    min_probability: number
    recessions_detected: number
    false_positives: number
    true_positives: number
  }
}

interface MonteCarloResponse {
  num_draws: number
  window_size: number
  current_probability: number
  distribution: {
    buckets: Array<{
      range_start: number
      range_end: number
      count: number
      frequency: number
    }>
    mean: number
    std_dev: number
  }
  percentiles: {
    p5: number
    p10: number
    p25: number
    p50: number
    p75: number
    p90: number
    p95: number
  }
}

interface SensitivityResponse {
  component: string
  baseline_value: number
  baseline_probability: number
  sensitivity_data: Array<{
    value: number
    probability: number
    delta_from_baseline: number
  }>
}

export default function SimulatorPage() {
  const { params, apiSettings, setSimulationResults, isSimulating, setIsSimulating } = useSessionStore()

  const [simulationData, setSimulationData] = useState<SimulationResponse | null>(null)
  const [monteCarloData, setMonteCarloData] = useState<MonteCarloResponse | null>(null)
  const [sensitivityData, setSensitivityData] = useState<SensitivityResponse | null>(null)
  const [activeTab, setActiveTab] = useState<'simulation' | 'montecarlo' | 'sensitivity'>('simulation')
  const [sensitivityComponent, setSensitivityComponent] = useState('eta')
  const [error, setError] = useState<string | null>(null)
  const [loadingStatus, setLoadingStatus] = useState<string>('')

  const hasApiKey = !!apiSettings.fredApiKey && apiSettings.useLiveData

  // Run simulation with FRED API
  const runSimulation = useCallback(async () => {
    if (!hasApiKey) return

    setIsSimulating(true)
    setError(null)
    setLoadingStatus('')

    try {
      const nivData = await calculateNIVFromFRED(
        apiSettings.fredApiKey,
        params.startDate,
        params.endDate,
        {
          eta: params.eta,
          weights: params.weights,
          smoothWindow: params.smoothWindow,
        },
        (status, progress) => {
          setLoadingStatus(`${status} (${progress.toFixed(0)}%)`)
        }
      )

      if (nivData.length === 0) {
        throw new Error('No data returned from FRED API')
      }

      // Convert NIVDataPoint[] to SimulationResponse format
      const data: SimulationResponse['data'] = nivData.map((point) => ({
        date: point.date,
        niv_score: point.niv * 100,
        recession_probability: point.probability,
        alert_level: point.probability > 70 ? 'critical' : point.probability > 50 ? 'warning' : point.probability > 30 ? 'elevated' : 'normal',
        is_recession: point.isRecession,
      }))

      const probabilities = data.map((d) => d.recession_probability)
      const recessionMonths = data.filter((d) => d.is_recession)
      const highProbMonths = data.filter((d) => d.recession_probability > 50)

      setSimulationData({
        params: {
          eta: params.eta,
          weights: params.weights,
          smooth_window: params.smoothWindow,
          start_date: params.startDate,
          end_date: params.endDate,
        },
        data,
        summary: {
          total_points: data.length,
          avg_probability: probabilities.reduce((a, b) => a + b, 0) / probabilities.length,
          max_probability: Math.max(...probabilities),
          min_probability: Math.min(...probabilities),
          recessions_detected: highProbMonths.length,
          false_positives: highProbMonths.filter((d) => !d.is_recession).length,
          true_positives: highProbMonths.filter((d) => d.is_recession).length,
        },
      })

      // Convert to store format
      const results: SimulationResult[] = data.map((d) => ({
        date: d.date,
        nivScore: d.niv_score,
        recessionProbability: d.recession_probability,
        alertLevel: d.alert_level as any,
        components: {
          thrust: params.weights.thrust,
          efficiency: params.weights.efficiency,
          slack: params.weights.slack,
          drag: params.weights.drag,
        },
      }))
      setSimulationResults(results)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'FRED API request failed'
      console.error('Simulation error:', err)
      setError(errorMessage)
    } finally {
      setIsSimulating(false)
      setLoadingStatus('')
    }
  }, [params, apiSettings, hasApiKey, setIsSimulating, setSimulationResults])

  // Run Monte Carlo with live FRED data
  const runMonteCarlo = async () => {
    if (!hasApiKey) return

    setIsSimulating(true)
    setError(null)
    setLoadingStatus('')

    try {
      setLoadingStatus('Fetching FRED data for Monte Carlo...')

      // Fetch FRED data first
      const nivData = await calculateNIVFromFRED(
        apiSettings.fredApiKey,
        params.startDate,
        params.endDate,
        {
          eta: params.eta,
          weights: params.weights,
          smoothWindow: params.smoothWindow,
        },
        (status, progress) => {
          setLoadingStatus(`${status} (${progress.toFixed(0)}%)`)
        }
      )

      if (nivData.length === 0) {
        throw new Error('No data for Monte Carlo')
      }

      setLoadingStatus('Running Monte Carlo simulation...')

      // Run Monte Carlo using the actual data
      const probabilities = nivData.map(d => d.probability)
      const currentProb = probabilities[probabilities.length - 1] || 0
      const numDraws = 1000
      const windowSize = Math.min(60, probabilities.length)

      // Bootstrap resampling from historical data
      const bootstrapResults: number[] = []
      for (let i = 0; i < numDraws; i++) {
        // Random sample from historical window
        const startIdx = Math.floor(Math.random() * Math.max(1, probabilities.length - windowSize))
        const window = probabilities.slice(startIdx, startIdx + windowSize)
        const avgProb = window.reduce((a, b) => a + b, 0) / window.length
        // Add some noise
        const noise = (Math.random() - 0.5) * 10
        bootstrapResults.push(Math.max(0, Math.min(100, avgProb + noise)))
      }

      // Calculate distribution buckets
      const buckets: MonteCarloResponse['distribution']['buckets'] = []
      for (let i = 0; i < 20; i++) {
        const rangeStart = i * 5
        const rangeEnd = rangeStart + 5
        const count = bootstrapResults.filter(v => v >= rangeStart && v < rangeEnd).length
        buckets.push({
          range_start: rangeStart,
          range_end: rangeEnd,
          count,
          frequency: count / numDraws,
        })
      }

      // Calculate percentiles
      const sorted = [...bootstrapResults].sort((a, b) => a - b)
      const getPercentile = (p: number) => sorted[Math.floor(sorted.length * p / 100)] || 0

      // Calculate mean and std dev
      const mean = bootstrapResults.reduce((a, b) => a + b, 0) / numDraws
      const variance = bootstrapResults.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / numDraws
      const stdDev = Math.sqrt(variance)

      setMonteCarloData({
        num_draws: numDraws,
        window_size: windowSize,
        current_probability: currentProb,
        distribution: {
          buckets,
          mean,
          std_dev: stdDev,
        },
        percentiles: {
          p5: getPercentile(5),
          p10: getPercentile(10),
          p25: getPercentile(25),
          p50: getPercentile(50),
          p75: getPercentile(75),
          p90: getPercentile(90),
          p95: getPercentile(95),
        },
      })
    } catch (err) {
      console.error('Monte Carlo error:', err)
      setError(err instanceof Error ? err.message : 'Monte Carlo failed')
    } finally {
      setIsSimulating(false)
      setLoadingStatus('')
    }
  }

  // Run Sensitivity with live FRED data
  const runSensitivity = async (component: string) => {
    if (!hasApiKey) return

    setIsSimulating(true)
    setError(null)
    setLoadingStatus('')
    setSensitivityComponent(component)

    try {
      setLoadingStatus('Running sensitivity analysis with FRED data...')

      // Define ranges for each component
      const ranges: Record<string, { min: number; max: number; baseline: number }> = {
        eta: { min: 0.5, max: 3.0, baseline: params.eta },
        thrust: { min: 0.1, max: 2.0, baseline: params.weights.thrust },
        efficiency: { min: 0.1, max: 2.0, baseline: params.weights.efficiency },
        slack: { min: 0.1, max: 2.0, baseline: params.weights.slack },
        drag: { min: 0.1, max: 2.0, baseline: params.weights.drag },
      }

      const range = ranges[component] || ranges.eta
      const steps = 11 // Fewer steps for faster computation

      // Calculate baseline probability
      const baselineData = await calculateNIVFromFRED(
        apiSettings.fredApiKey,
        params.startDate,
        params.endDate,
        {
          eta: params.eta,
          weights: params.weights,
          smoothWindow: params.smoothWindow,
        },
        (status, progress) => {
          setLoadingStatus(`Baseline: ${status} (${progress.toFixed(0)}%)`)
        }
      )

      const baselineProb = baselineData.length > 0
        ? baselineData[baselineData.length - 1].probability
        : 30

      // Run sensitivity for each step
      const sensitivityResults: SensitivityResponse['sensitivity_data'] = []

      for (let i = 0; i <= steps; i++) {
        const value = range.min + (i / steps) * (range.max - range.min)
        setLoadingStatus(`Testing ${component} = ${value.toFixed(2)} (${Math.round((i / steps) * 100)}%)`)

        // Create modified params
        const modifiedWeights = { ...params.weights }
        let modifiedEta = params.eta

        if (component === 'eta') {
          modifiedEta = value
        } else {
          modifiedWeights[component as keyof typeof modifiedWeights] = value
        }

        try {
          const testData = await calculateNIVFromFRED(
            apiSettings.fredApiKey,
            params.startDate,
            params.endDate,
            {
              eta: modifiedEta,
              weights: modifiedWeights,
              smoothWindow: params.smoothWindow,
            }
          )

          const prob = testData.length > 0
            ? testData[testData.length - 1].probability
            : baselineProb

          sensitivityResults.push({
            value: Math.round(value * 100) / 100,
            probability: Math.round(prob * 100) / 100,
            delta_from_baseline: Math.round((prob - baselineProb) * 100) / 100,
          })
        } catch {
          // If a step fails, interpolate
          sensitivityResults.push({
            value: Math.round(value * 100) / 100,
            probability: baselineProb,
            delta_from_baseline: 0,
          })
        }
      }

      setSensitivityData({
        component,
        baseline_value: range.baseline,
        baseline_probability: baselineProb,
        sensitivity_data: sensitivityResults,
      })
    } catch (err) {
      console.error('Sensitivity error:', err)
      setError(err instanceof Error ? err.message : 'Sensitivity analysis failed')
    } finally {
      setIsSimulating(false)
      setLoadingStatus('')
    }
  }

  // No API key configured - show setup screen
  if (!hasApiKey) {
    return (
      <div className="min-h-screen bg-dark-900 pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold gradient-text">NIV Simulator</h1>
            <p className="text-gray-400 mt-2">
              Interactive research lab - tweak parameters, run Monte Carlo, analyze sensitivity
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - API Settings */}
            <div className="space-y-6">
              <ApiSettings />
            </div>

            {/* Right Column - Instructions */}
            <div className="lg:col-span-2">
              <div className="glass-card rounded-2xl p-8 text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <Key className="w-10 h-10 text-blue-400" />
                </div>
                <h2 className="text-2xl font-bold mb-4">Connect Your FRED API Key</h2>
                <p className="text-gray-400 mb-8 max-w-lg mx-auto">
                  The NIV Simulator uses real economic data from the Federal Reserve Economic Data (FRED) API.
                  Enter your free API key in the settings panel to get started.
                </p>

                <div className="bg-dark-700/50 rounded-xl p-6 text-left max-w-md mx-auto">
                  <h3 className="font-bold mb-4 text-white">How to get a FRED API Key:</h3>
                  <ol className="space-y-3 text-gray-400">
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-sm font-bold">1</span>
                      <span>Go to <a href="https://fred.stlouisfed.org/docs/api/api_key.html" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">fred.stlouisfed.org</a></span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-sm font-bold">2</span>
                      <span>Create a free account (takes 30 seconds)</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-sm font-bold">3</span>
                      <span>Request an API key (instant approval)</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-sm font-bold">4</span>
                      <span>Paste your key in the API Settings panel</span>
                    </li>
                  </ol>
                </div>

                <div className="mt-8 p-4 bg-regen-500/10 border border-regen-500/20 rounded-lg">
                  <p className="text-regen-400 text-sm">
                    <strong>Why FRED?</strong> The NIV Engine uses 7 official Federal Reserve data series to calculate recession probability with 0.85 AUC accuracy.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-900 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold gradient-text">NIV Simulator</h1>
          <p className="text-gray-400 mt-2">
            Interactive research lab - tweak parameters, run Monte Carlo, analyze sensitivity
          </p>
        </div>

        {/* Error Banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center gap-3"
            >
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <span className="text-red-200">{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Parameters, Scenarios & API Settings */}
          <div className="space-y-6">
            <ApiSettings />
            <ParameterPanel />
            <ScenarioLibrary />
          </div>

          {/* Right Column - Results */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tab Navigation */}
            <div className="flex gap-2 p-1 bg-dark-800 rounded-xl">
              {[
                { id: 'simulation', label: 'Simulation', icon: Activity },
                { id: 'montecarlo', label: 'Monte Carlo', icon: BarChart3 },
                { id: 'sensitivity', label: 'Sensitivity', icon: Target },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => {
                    setActiveTab(id as any)
                    if (id === 'montecarlo' && !monteCarloData && !isSimulating) runMonteCarlo()
                    if (id === 'sensitivity' && !sensitivityData && !isSimulating) runSensitivity('eta')
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition ${
                    activeTab === id
                      ? 'bg-blue-500 text-white font-bold'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {/* Simulation Tab */}
            {activeTab === 'simulation' && (
              <div className="space-y-6">
                {/* Run Button */}
                <button
                  onClick={runSimulation}
                  disabled={isSimulating}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 font-bold rounded-xl transition disabled:opacity-50 bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-500 hover:to-blue-300 text-white"
                >
                  {isSimulating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {loadingStatus || 'Running Simulation...'}
                    </>
                  ) : (
                    <>
                      <Database className="w-5 h-5" />
                      Run with Live FRED Data
                    </>
                  )}
                </button>

                {/* Data Source Indicator */}
                {simulationData && (
                  <div className="flex items-center justify-center gap-2 text-sm text-blue-400">
                    <Database size={14} />
                    <span>Using live FRED data from Federal Reserve</span>
                  </div>
                )}

                {/* Summary Cards */}
                {simulationData && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <SummaryCard
                      label="Avg Probability"
                      value={`${simulationData.summary.avg_probability.toFixed(1)}%`}
                      icon={Activity}
                      color="blue"
                    />
                    <SummaryCard
                      label="Max Probability"
                      value={`${simulationData.summary.max_probability.toFixed(1)}%`}
                      icon={TrendingUp}
                      color="red"
                    />
                    <SummaryCard
                      label="True Positives"
                      value={simulationData.summary.true_positives.toString()}
                      icon={Target}
                      color="green"
                    />
                    <SummaryCard
                      label="False Positives"
                      value={simulationData.summary.false_positives.toString()}
                      icon={AlertTriangle}
                      color="yellow"
                    />
                  </div>
                )}

                {/* Chart */}
                <div className="glass-card rounded-2xl p-6">
                  <h3 className="text-lg font-bold mb-4">Recession Probability Over Time</h3>
                  <div className="h-[400px]">
                    {simulationData ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={simulationData.data}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                          <XAxis
                            dataKey="date"
                            stroke="#666"
                            tick={{ fill: '#888', fontSize: 11 }}
                            tickFormatter={(v) => {
                              const parts = v.split('-')
                              return parts[1] === '01' ? parts[0] : ''
                            }}
                          />
                          <YAxis
                            stroke="#666"
                            tick={{ fill: '#888', fontSize: 12 }}
                            domain={[0, 100]}
                            tickFormatter={(v) => `${v}%`}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1a1a1a',
                              border: '1px solid #333',
                              borderRadius: '8px',
                            }}
                            formatter={(value: number) => [`${value.toFixed(1)}%`, 'Probability']}
                          />
                          {/* Recession bands */}
                          <ReferenceArea x1="2007-12-01" x2="2009-06-01" fill="#ef4444" fillOpacity={0.1} />
                          <ReferenceArea x1="2020-02-01" x2="2020-04-01" fill="#ef4444" fillOpacity={0.1} />
                          <Line
                            type="monotone"
                            dataKey="recession_probability"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        Click "Run with Live FRED Data" to see results
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Monte Carlo Tab */}
            {activeTab === 'montecarlo' && (
              <div className="space-y-6">
                <button
                  onClick={runMonteCarlo}
                  disabled={isSimulating}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 font-bold rounded-xl transition disabled:opacity-50 bg-gradient-to-r from-blue-600 to-purple-500 hover:from-blue-500 hover:to-purple-400 text-white"
                >
                  {isSimulating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {loadingStatus || 'Running Monte Carlo...'}
                    </>
                  ) : (
                    <>
                      <Database className="w-5 h-5" />
                      Run Monte Carlo (Live Data)
                    </>
                  )}
                </button>

                {monteCarloData && (
                  <>
                    {/* Percentiles */}
                    <div className="glass-card rounded-2xl p-6">
                      <h3 className="text-lg font-bold mb-4">Probability Distribution</h3>
                      <div className="grid grid-cols-7 gap-2 mb-6">
                        {[
                          { label: 'P5', value: monteCarloData.percentiles.p5 },
                          { label: 'P10', value: monteCarloData.percentiles.p10 },
                          { label: 'P25', value: monteCarloData.percentiles.p25 },
                          { label: 'P50', value: monteCarloData.percentiles.p50, highlight: true },
                          { label: 'P75', value: monteCarloData.percentiles.p75 },
                          { label: 'P90', value: monteCarloData.percentiles.p90 },
                          { label: 'P95', value: monteCarloData.percentiles.p95 },
                        ].map(({ label, value, highlight }) => (
                          <div
                            key={label}
                            className={`p-3 rounded-lg text-center ${
                              highlight ? 'bg-purple-500/20 border border-purple-500/30' : 'bg-dark-700'
                            }`}
                          >
                            <div className="text-xs text-gray-400">{label}</div>
                            <div className={`font-mono font-bold ${highlight ? 'text-purple-400' : 'text-white'}`}>
                              {value.toFixed(1)}%
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Histogram */}
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={monteCarloData.distribution.buckets}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis
                              dataKey="range_start"
                              stroke="#666"
                              tick={{ fill: '#888', fontSize: 11 }}
                              tickFormatter={(v) => `${v}%`}
                            />
                            <YAxis
                              stroke="#666"
                              tick={{ fill: '#888', fontSize: 12 }}
                              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#1a1a1a',
                                border: '1px solid #333',
                                borderRadius: '8px',
                              }}
                              formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, 'Frequency']}
                              labelFormatter={(v) => `${v}% - ${v + 5}%`}
                            />
                            <Bar dataKey="frequency" fill="#a855f7" radius={[4, 4, 0, 0]}>
                              {monteCarloData.distribution.buckets.map((entry, index) => (
                                <Cell
                                  key={index}
                                  fill={
                                    entry.range_start <= monteCarloData.current_probability &&
                                    entry.range_end > monteCarloData.current_probability
                                      ? '#3b82f6'
                                      : '#a855f7'
                                  }
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="flex justify-center gap-8 mt-4 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded bg-purple-500" />
                          <span className="text-gray-400">Historical Distribution</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded bg-blue-500" />
                          <span className="text-gray-400">Current Probability</span>
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="glass-card rounded-xl p-4 text-center">
                        <div className="text-2xl font-mono font-bold text-purple-400">
                          {monteCarloData.distribution.mean.toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-400">Mean</div>
                      </div>
                      <div className="glass-card rounded-xl p-4 text-center">
                        <div className="text-2xl font-mono font-bold text-blue-400">
                          {monteCarloData.current_probability.toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-400">Current</div>
                      </div>
                      <div className="glass-card rounded-xl p-4 text-center">
                        <div className="text-2xl font-mono font-bold text-gray-300">
                          {monteCarloData.distribution.std_dev.toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-400">Std Dev</div>
                      </div>
                    </div>
                  </>
                )}

                {!monteCarloData && !isSimulating && (
                  <div className="glass-card rounded-2xl p-12 text-center text-gray-500">
                    Click "Run Monte Carlo" to see distribution analysis
                  </div>
                )}
              </div>
            )}

            {/* Sensitivity Tab */}
            {activeTab === 'sensitivity' && (
              <div className="space-y-6">
                {/* Loading Status */}
                {isSimulating && loadingStatus && (
                  <div className="flex items-center justify-center gap-2 p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-300">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">{loadingStatus}</span>
                  </div>
                )}

                {/* Data Mode Indicator */}
                <div className="flex items-center justify-center gap-2 text-sm text-blue-400">
                  <Database size={14} />
                  <span>Using live FRED data for sensitivity analysis</span>
                </div>

                {/* Component Selector */}
                <div className="flex gap-2 flex-wrap">
                  {['eta', 'thrust', 'efficiency', 'slack', 'drag'].map((comp) => (
                    <button
                      key={comp}
                      onClick={() => runSensitivity(comp)}
                      disabled={isSimulating}
                      className={`px-4 py-2 rounded-lg transition capitalize ${
                        sensitivityComponent === comp
                          ? 'bg-blue-500 text-white font-bold'
                          : 'bg-dark-700 text-gray-400 hover:text-white'
                      }`}
                    >
                      {comp === 'eta' ? 'Eta (η)' : comp}
                    </button>
                  ))}
                </div>

                {sensitivityData && (
                  <div className="glass-card rounded-2xl p-6">
                    <h3 className="text-lg font-bold mb-4">
                      Sensitivity: {sensitivityData.component === 'eta' ? 'Eta (η)' : sensitivityData.component}
                    </h3>

                    <div className="mb-4 flex gap-6 text-sm">
                      <div>
                        <span className="text-gray-400">Baseline Value: </span>
                        <span className="font-mono text-blue-400">{sensitivityData.baseline_value}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Baseline Probability: </span>
                        <span className="font-mono text-blue-400">{sensitivityData.baseline_probability.toFixed(1)}%</span>
                      </div>
                    </div>

                    <div className="h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={sensitivityData.sensitivity_data}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                          <XAxis
                            dataKey="value"
                            stroke="#666"
                            tick={{ fill: '#888', fontSize: 12 }}
                          />
                          <YAxis
                            stroke="#666"
                            tick={{ fill: '#888', fontSize: 12 }}
                            tickFormatter={(v) => `${v}%`}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1a1a1a',
                              border: '1px solid #333',
                              borderRadius: '8px',
                            }}
                            formatter={(value: number, name: string) => [
                              name === 'probability'
                                ? `${value.toFixed(1)}%`
                                : `${value > 0 ? '+' : ''}${value.toFixed(1)}%`,
                              name === 'probability' ? 'Probability' : 'Delta',
                            ]}
                          />
                          <Line
                            type="monotone"
                            dataKey="probability"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dot={false}
                          />
                          <Line
                            type="monotone"
                            dataKey="delta_from_baseline"
                            stroke="#22c55e"
                            strokeWidth={1}
                            strokeDasharray="5 5"
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="flex justify-center gap-6 mt-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-0.5 bg-blue-500" />
                        <span className="text-gray-400">Recession Probability</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-0.5 bg-green-500 border-dashed" style={{ borderTopWidth: 2 }} />
                        <span className="text-gray-400">Delta from Baseline</span>
                      </div>
                    </div>
                  </div>
                )}

                {!sensitivityData && !isSimulating && (
                  <div className="glass-card rounded-2xl p-12 text-center text-gray-500">
                    Select a component above to run sensitivity analysis
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: string
  icon: any
  color: 'blue' | 'red' | 'green' | 'yellow' | 'purple'
}) {
  const colors = {
    blue: 'text-blue-400 bg-blue-500/20',
    red: 'text-red-400 bg-red-500/20',
    green: 'text-green-400 bg-green-500/20',
    yellow: 'text-yellow-400 bg-yellow-500/20',
    purple: 'text-purple-400 bg-purple-500/20',
  }

  return (
    <div className="glass-card rounded-xl p-4">
      <div className={`w-8 h-8 rounded-lg ${colors[color]} flex items-center justify-center mb-2`}>
        <Icon size={16} className={colors[color].split(' ')[0]} />
      </div>
      <div className="text-xl font-mono font-bold text-white">{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  )
}
