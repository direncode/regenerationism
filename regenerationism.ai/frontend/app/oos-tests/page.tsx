'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  ReferenceArea,
  Legend,
} from 'recharts'
import {
  Play,
  Loader2,
  FlaskConical,
  TrendingUp,
  Target,
  Zap,
  CheckCircle,
  XCircle,
  AlertTriangle,
  BarChart3,
  Activity,
  Database,
  Settings,
  Award,
  Key,
  Eye,
  EyeOff,
} from 'lucide-react'
import { useSessionStore } from '@/store/sessionStore'
import { calculateNIVFromFRED } from '@/lib/fredApi'
import {
  runRecessionPredictionTest,
  runGDPForecastTest,
  runOptimizationTest,
  runForensicAnalysis,
  RecessionTestResult,
  GDPForecastResult,
  OptimizationResult,
  ForensicResult,
  RECESSIONS,
} from '@/lib/oosTests'

type TestType = 'recession' | 'gdp' | 'optimization' | 'forensic'

export default function OOSTestsPage() {
  const { params, apiSettings, setApiSettings } = useSessionStore()

  const [activeTest, setActiveTest] = useState<TestType>('recession')
  const [isRunning, setIsRunning] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showApiKey, setShowApiKey] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState(apiSettings.fredApiKey || '')

  // Test results
  const [recessionResult, setRecessionResult] = useState<RecessionTestResult | null>(null)
  const [gdpResult, setGdpResult] = useState<GDPForecastResult | null>(null)
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null)
  const [forensicResult, setForensicResult] = useState<ForensicResult | null>(null)

  const runTest = useCallback(async (testType: TestType) => {
    if (!apiSettings.fredApiKey) {
      setError('Please enter your FRED API key above.')
      return
    }

    setIsRunning(true)
    setError(null)
    setLoadingStatus('Fetching FRED data...')

    try {
      // OOS tests require multi-decade historical data to span multiple recessions
      // Use hardcoded range from 1970 to present, ignoring the session store's 5-year default
      const oosStartDate = '1970-01-01'
      const oosEndDate = new Date().toISOString().split('T')[0]

      // First fetch the NIV data
      const nivData = await calculateNIVFromFRED(
        apiSettings.fredApiKey,
        oosStartDate,
        oosEndDate,
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
        throw new Error('No data available for testing')
      }

      setLoadingStatus(`Running ${testType} test...`)

      switch (testType) {
        case 'recession':
          const recResult = runRecessionPredictionTest(
            nivData,
            params.smoothWindow,
            12,
            (status, progress) => setLoadingStatus(`${status} (${progress.toFixed(0)}%)`)
          )
          setRecessionResult(recResult)
          break

        case 'gdp':
          const gdpRes = runGDPForecastTest(
            nivData,
            params.smoothWindow,
            12,
            (status, progress) => setLoadingStatus(`${status} (${progress.toFixed(0)}%)`)
          )
          setGdpResult(gdpRes)
          break

        case 'optimization':
          const optRes = runOptimizationTest(
            nivData,
            [3, 6, 9, 12, 18],
            [0, 3, 6, 12],
            (status, progress) => setLoadingStatus(`${status} (${progress.toFixed(0)}%)`)
          )
          setOptimizationResult(optRes)
          break

        case 'forensic':
          const forRes = runForensicAnalysis(
            nivData,
            params.smoothWindow,
            12,
            (status, progress) => setLoadingStatus(`${status} (${progress.toFixed(0)}%)`)
          )
          setForensicResult(forRes)
          break
      }
    } catch (err) {
      console.error('Test error:', err)
      setError(err instanceof Error ? err.message : 'Test failed')
    } finally {
      setIsRunning(false)
      setLoadingStatus('')
    }
  }, [apiSettings, params])

  const tests = [
    {
      id: 'recession' as TestType,
      name: 'Recession Prediction',
      description: 'Can NIV predict recessions better than the Fed yield curve?',
      icon: AlertTriangle,
      color: 'red',
    },
    {
      id: 'gdp' as TestType,
      name: 'GDP Forecasting',
      description: 'Compare NIV vs Fed for predicting economic growth',
      icon: TrendingUp,
      color: 'green',
    },
    {
      id: 'optimization' as TestType,
      name: 'Parameter Optimization',
      description: 'Find the best smoothing and lag settings',
      icon: Settings,
      color: 'purple',
    },
    {
      id: 'forensic' as TestType,
      name: 'Forensic Analysis',
      description: 'Deep dive into model weights and contributions',
      icon: FlaskConical,
      color: 'orange',
    },
  ]

  return (
    <div className="min-h-screen bg-dark-900 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold gradient-text flex items-center gap-3">
            <FlaskConical className="w-8 h-8" />
            Out-of-Sample Tests
          </h1>
          <p className="text-gray-400 mt-2">
            Rigorous statistical validation of NIV predictive power using walk-forward analysis
          </p>
        </div>

        {/* Methodology Specification */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-6 bg-dark-800/50 border border-white/10 rounded-xl"
        >
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-regen-400" />
            Test Methodology Specification
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            {/* NIV Engine Specification */}
            <div className="space-y-3">
              <h3 className="font-semibold text-regen-400">NIV Engine</h3>
              <div className="bg-dark-700/50 rounded-lg p-3 font-mono text-xs space-y-1">
                <div className="text-gray-400">// Master Equation</div>
                <div className="text-white">NIV = (u × P²) / (X + F)^η</div>
                <div className="text-gray-500 mt-2">where:</div>
                <div className="text-blue-300">u = tanh(1.0·dG + 1.0·dA - 0.7·dr)</div>
                <div className="text-green-300">P = (Investment × 1.15) / GDP</div>
                <div className="text-yellow-300">X = 1 - (TCU / 100)</div>
                <div className="text-red-300">F = 0.4·YieldPen + 0.4·max(0,RealRate) + 0.2·Vol</div>
                <div className="text-gray-400 mt-2">η = 1.5, ε = 0.001</div>
              </div>
            </div>

            {/* Test Descriptions */}
            <div className="space-y-3">
              <h3 className="font-semibold text-regen-400">Test Procedures</h3>
              <div className="space-y-2 text-gray-300">
                <p><strong className="text-white">Recession Prediction:</strong> Walk-forward ROC-AUC comparison with 12-month warning window. Compares NIV vs Fed yield curve (T10Y3M) as recession predictors.</p>
                <p><strong className="text-white">GDP Forecasting:</strong> RMSE comparison predicting GDP growth direction. Hybrid model combines Fed + NIV signals.</p>
                <p><strong className="text-white">Parameter Optimization:</strong> Grid search over smoothing windows (3-18 months) and lag periods (0-12 months).</p>
                <p><strong className="text-white">Forensic Analysis:</strong> Decomposition of model weights, correlation analysis, and contribution attribution.</p>
              </div>
            </div>

            {/* Data Sources */}
            <div className="space-y-3">
              <h3 className="font-semibold text-regen-400">FRED Data Series (1970-Present)</h3>
              <p className="text-gray-500 text-xs mb-2">
                OOS tests use full historical range (1970-present) to span multiple recession periods.
              </p>
              <div className="bg-dark-700/50 rounded-lg p-3 text-xs space-y-1">
                <div className="flex justify-between"><span className="text-gray-400">GDP Growth:</span><span className="text-white">A191RL1Q225SBEA (quarterly)</span></div>
                <div className="flex justify-between"><span className="text-gray-400">M2 Money Supply:</span><span className="text-white">M2SL (monthly)</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Fed Funds Rate:</span><span className="text-white">FEDFUNDS (monthly)</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Investment:</span><span className="text-white">GPDIC1 (quarterly)</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Real GDP:</span><span className="text-white">GDPC1 (quarterly)</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Capacity Util:</span><span className="text-white">TCU (monthly)</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Yield Spread:</span><span className="text-white">T10Y3M (monthly)</span></div>
                <div className="flex justify-between"><span className="text-gray-400">CPI Inflation:</span><span className="text-white">CPIAUCSL (monthly)</span></div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* API Key Configuration */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-dark-800 border border-white/10 rounded-xl"
        >
          <div className="flex items-center gap-3 mb-3">
            <Key className="w-5 h-5 text-regen-400" />
            <span className="text-white font-medium">FRED API Key</span>
            {apiSettings.fredApiKey && apiSettings.useLiveData && (
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">Connected</span>
            )}
          </div>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="Enter your FRED API key..."
                className="w-full bg-dark-700 border border-white/10 rounded-lg px-4 py-2 pr-10 text-white placeholder-gray-500 focus:outline-none focus:border-regen-500"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              onClick={() => {
                setApiSettings({ fredApiKey: apiKeyInput, useLiveData: true })
              }}
              disabled={!apiKeyInput}
              className="px-4 py-2 bg-regen-500 text-black font-bold rounded-lg hover:bg-regen-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save
            </button>
          </div>
          <p className="text-gray-500 text-sm mt-2">
            Get a free API key from{' '}
            <a
              href="https://fred.stlouisfed.org/docs/api/api_key.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-regen-400 hover:underline"
            >
              FRED
            </a>
          </p>
        </motion.div>

        {/* Error Banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center gap-3"
            >
              <XCircle className="w-5 h-5 text-red-400" />
              <span className="text-red-200">{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Test Selection Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {tests.map((test) => {
            const Icon = test.icon
            const isActive = activeTest === test.id
            const colors = {
              red: 'from-red-600 to-red-400 border-red-500',
              green: 'from-green-600 to-green-400 border-green-500',
              purple: 'from-purple-600 to-purple-400 border-purple-500',
              orange: 'from-orange-600 to-orange-400 border-orange-500',
            }

            return (
              <button
                key={test.id}
                onClick={() => setActiveTest(test.id)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  isActive
                    ? `bg-gradient-to-br ${colors[test.color as keyof typeof colors]} border-opacity-50`
                    : 'bg-dark-800 border-white/10 hover:border-white/30'
                }`}
              >
                <Icon className={`w-6 h-6 mb-2 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                <h3 className={`font-bold ${isActive ? 'text-white' : 'text-gray-200'}`}>
                  {test.name}
                </h3>
                <p className={`text-sm mt-1 ${isActive ? 'text-white/80' : 'text-gray-500'}`}>
                  {test.description}
                </p>
              </button>
            )
          })}
        </div>

        {/* Run Button */}
        <button
          onClick={() => runTest(activeTest)}
          disabled={isRunning || !apiSettings.fredApiKey}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-500 hover:to-blue-300 text-white font-bold rounded-xl transition disabled:opacity-50 mb-8"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {loadingStatus || 'Running Test...'}
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              Run {tests.find(t => t.id === activeTest)?.name} Test
            </>
          )}
        </button>

        {/* Results Display */}
        <div className="space-y-6">
          {/* Recession Prediction Results */}
          {activeTest === 'recession' && recessionResult && (
            <RecessionResults result={recessionResult} />
          )}

          {/* GDP Forecast Results */}
          {activeTest === 'gdp' && gdpResult && (
            <GDPResults result={gdpResult} />
          )}

          {/* Optimization Results */}
          {activeTest === 'optimization' && optimizationResult && (
            <OptimizationResults result={optimizationResult} />
          )}

          {/* Forensic Results */}
          {activeTest === 'forensic' && forensicResult && (
            <ForensicResults result={forensicResult} />
          )}
        </div>
      </div>
    </div>
  )
}

// Recession Prediction Results Component
function RecessionResults({ result }: { result: RecessionTestResult }) {
  const chartData = result.dates.map((date, i) => ({
    date,
    fed: result.predictionsFed[i] * 100,
    niv: result.predictionsNiv[i] * 100,
    hybrid: result.predictionsHybrid[i] * 100,
    actual: result.actuals[i] * 100,
  }))

  const winnerColor = result.winner === 'niv' ? 'text-green-400' : result.winner === 'hybrid' ? 'text-purple-400' : 'text-red-400'
  const winnerLabel = result.winner === 'niv' ? 'NIV Wins!' : result.winner === 'hybrid' ? 'Hybrid Wins!' : 'Fed Wins'

  return (
    <div className="space-y-6">
      {/* Scoreboard */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Award className="w-6 h-6 text-yellow-400" />
          Recession Prediction Scoreboard (AUC)
        </h3>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <ScoreCard
            label="Fed Yield Curve"
            value={result.aucFed.toFixed(4)}
            isWinner={result.winner === 'fed'}
            color="red"
          />
          <ScoreCard
            label="NIV Indicator"
            value={result.aucNiv.toFixed(4)}
            isWinner={result.winner === 'niv'}
            color="green"
          />
          <ScoreCard
            label="Hybrid Model"
            value={result.aucHybrid.toFixed(4)}
            isWinner={result.winner === 'hybrid'}
            color="purple"
          />
        </div>

        <div className={`text-center text-2xl font-bold ${winnerColor}`}>
          {result.winner === 'niv' && <CheckCircle className="inline w-8 h-8 mr-2" />}
          {winnerLabel}
        </div>
      </div>

      {/* Probability Chart */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-lg font-bold mb-4">Recession Probability Over Time (12-Month Warning)</h3>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                dataKey="date"
                stroke="#666"
                tick={{ fill: '#888', fontSize: 11 }}
                tickFormatter={(v) => v.split('-')[0]}
              />
              <YAxis
                stroke="#666"
                tick={{ fill: '#888' }}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }}
                formatter={(value: number) => [`${value.toFixed(1)}%`]}
              />
              <Legend />
              {/* Recession shading */}
              {RECESSIONS.map((r, i) => (
                <ReferenceArea
                  key={i}
                  x1={r.start}
                  x2={r.end}
                  fill="#ef4444"
                  fillOpacity={0.1}
                />
              ))}
              <Line type="monotone" dataKey="fed" name="Fed" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
              <Line type="monotone" dataKey="niv" name="NIV" stroke="#22c55e" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="hybrid" name="Hybrid" stroke="#a855f7" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

// GDP Forecast Results Component
function GDPResults({ result }: { result: GDPForecastResult }) {
  const chartData = result.dates.map((date, i) => ({
    date,
    actual: result.actuals[i],
    fed: result.predictionsFed[i],
    niv: result.predictionsNiv[i],
    hybrid: result.predictionsHybrid[i],
  }))

  // Improvement bars
  const improvementData = result.dates.map((date, i) => {
    const errorFed = Math.abs(result.actuals[i] - result.predictionsFed[i])
    const errorHybrid = Math.abs(result.actuals[i] - result.predictionsHybrid[i])
    return {
      date,
      improvement: errorFed - errorHybrid,
    }
  })

  return (
    <div className="space-y-6">
      {/* RMSE Scoreboard */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-400" />
          GDP Forecast Scoreboard (RMSE - Lower is Better)
        </h3>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <ScoreCard
            label="Fed Yield Curve"
            value={result.rmseFed.toFixed(5)}
            isWinner={result.winner === 'fed'}
            color="red"
            lowerIsBetter
          />
          <ScoreCard
            label="NIV Indicator"
            value={result.rmseNiv.toFixed(5)}
            isWinner={result.winner === 'niv'}
            color="green"
            lowerIsBetter
          />
          <ScoreCard
            label="Hybrid Model"
            value={result.rmseHybrid.toFixed(5)}
            isWinner={result.winner === 'hybrid'}
            color="purple"
            lowerIsBetter
          />
        </div>
      </div>

      {/* Forecast Chart */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-lg font-bold mb-4">GDP Growth Forecast vs Actual</h3>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="date" stroke="#666" tick={{ fill: '#888', fontSize: 11 }} />
              <YAxis stroke="#666" tick={{ fill: '#888' }} />
              <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }} />
              <Legend />
              <Line type="monotone" dataKey="actual" name="Actual" stroke="#fff" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="fed" name="Fed" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
              <Line type="monotone" dataKey="hybrid" name="Hybrid" stroke="#22c55e" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Improvement Chart */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-lg font-bold mb-4">Where NIV Added Value (Green = NIV Fixed Fed Error)</h3>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={improvementData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="date" stroke="#666" tick={{ fill: '#888', fontSize: 10 }} />
              <YAxis stroke="#666" tick={{ fill: '#888' }} />
              <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }} />
              <Bar dataKey="improvement">
                {improvementData.map((entry, index) => (
                  <Cell key={index} fill={entry.improvement > 0 ? '#22c55e' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

// Optimization Results Component
function OptimizationResults({ result }: { result: OptimizationResult }) {
  const gridData = result.allResults.map(r => ({
    config: `S${r.smooth}/L${r.lag}`,
    nivRmse: r.nivRmse,
    fedRmse: r.fedRmse,
    winner: r.winner,
  }))

  return (
    <div className="space-y-6">
      {/* Best Configuration */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Settings className="w-6 h-6 text-purple-400" />
          Optimal Configuration Found
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-purple-500/20 rounded-xl p-4 text-center">
            <div className="text-3xl font-mono font-bold text-purple-400">{result.bestSmooth}</div>
            <div className="text-sm text-gray-400">Best Smoothing</div>
          </div>
          <div className="bg-purple-500/20 rounded-xl p-4 text-center">
            <div className="text-3xl font-mono font-bold text-purple-400">{result.bestLag}</div>
            <div className="text-sm text-gray-400">Best Lag (Months)</div>
          </div>
          <div className="bg-green-500/20 rounded-xl p-4 text-center">
            <div className="text-3xl font-mono font-bold text-green-400">{result.bestRmse.toFixed(5)}</div>
            <div className="text-sm text-gray-400">NIV RMSE</div>
          </div>
          <div className="bg-blue-500/20 rounded-xl p-4 text-center">
            <div className="text-3xl font-mono font-bold text-blue-400">{result.improvement.toFixed(2)}%</div>
            <div className="text-sm text-gray-400">Improvement</div>
          </div>
        </div>
      </div>

      {/* Results Grid */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-lg font-bold mb-4">All Configurations Tested</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2 px-3">Config</th>
                <th className="text-right py-2 px-3">NIV RMSE</th>
                <th className="text-right py-2 px-3">Fed RMSE</th>
                <th className="text-center py-2 px-3">Winner</th>
              </tr>
            </thead>
            <tbody>
              {gridData.map((row, i) => (
                <tr key={i} className="border-b border-white/5">
                  <td className="py-2 px-3 font-mono">{row.config}</td>
                  <td className="py-2 px-3 text-right font-mono">{row.nivRmse.toFixed(5)}</td>
                  <td className="py-2 px-3 text-right font-mono">{row.fedRmse.toFixed(5)}</td>
                  <td className="py-2 px-3 text-center">
                    {row.winner === 'niv' ? (
                      <span className="text-green-400">NIV</span>
                    ) : (
                      <span className="text-red-400">Fed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// Forensic Analysis Results Component
function ForensicResults({ result }: { result: ForensicResult }) {
  return (
    <div className="space-y-6">
      {/* Precision Scoring */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <FlaskConical className="w-6 h-6 text-orange-400" />
          Forensic Analysis Report
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* RMSE Comparison */}
          <div className="bg-dark-700 rounded-xl p-4">
            <h4 className="font-bold text-gray-300 mb-3">Precision Scoring (RMSE)</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Fed Model:</span>
                <span className="font-mono text-red-400">{result.rmseFed.toFixed(9)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Hybrid Model:</span>
                <span className="font-mono text-green-400">{result.rmseHybrid.toFixed(9)}</span>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-2">
                <span className="text-gray-400">Difference:</span>
                <span className={`font-mono ${result.difference > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {result.difference.toFixed(9)}
                </span>
              </div>
            </div>
          </div>

          {/* Clone Factor */}
          <div className="bg-dark-700 rounded-xl p-4">
            <h4 className="font-bold text-gray-300 mb-3">Clone Factor</h4>
            <div className="text-center">
              <div className="text-4xl font-mono font-bold text-orange-400">
                {(result.correlation * 100).toFixed(2)}%
              </div>
              <div className="text-sm text-gray-400 mt-2">Prediction Correlation</div>
              <div className="text-xs text-gray-500 mt-2">
                {result.correlation > 0.99
                  ? '⚠️ Extremely High: NIV may be redundant'
                  : result.correlation > 0.90
                  ? '✅ High: NIV adds nuance'
                  : '🚀 Low: NIV finds different signals'}
              </div>
            </div>
          </div>

          {/* Model Weights */}
          <div className="bg-dark-700 rounded-xl p-4">
            <h4 className="font-bold text-gray-300 mb-3">Model Weights</h4>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Fed Weight</span>
                  <span className="font-mono">{result.fedWeight.toFixed(4)}</span>
                </div>
                <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500"
                    style={{ width: `${(1 - result.nivContribution / 100) * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">NIV Weight</span>
                  <span className="font-mono">{result.nivWeight.toFixed(4)}</span>
                </div>
                <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500"
                    style={{ width: `${result.nivContribution}%` }}
                  />
                </div>
              </div>
              <div className="text-center pt-2 border-t border-white/10">
                <span className="text-green-400 font-bold">{result.nivContribution.toFixed(1)}%</span>
                <span className="text-gray-400 text-sm"> NIV Contribution</span>
              </div>
            </div>
          </div>
        </div>

        {/* Verdict */}
        <div className={`mt-6 p-4 rounded-xl ${result.difference > 0 ? 'bg-green-500/20 border border-green-500/30' : 'bg-red-500/20 border border-red-500/30'}`}>
          <div className="flex items-center gap-2">
            {result.difference > 0 ? (
              <CheckCircle className="w-6 h-6 text-green-400" />
            ) : (
              <XCircle className="w-6 h-6 text-red-400" />
            )}
            <span className={`font-bold ${result.difference > 0 ? 'text-green-400' : 'text-red-400'}`}>
              VERDICT
            </span>
          </div>
          <p className="text-gray-300 mt-2">{result.verdict}</p>
        </div>
      </div>
    </div>
  )
}

// Score Card Component
function ScoreCard({
  label,
  value,
  isWinner,
  color,
  lowerIsBetter = false,
}: {
  label: string
  value: string
  isWinner: boolean
  color: 'red' | 'green' | 'purple'
  lowerIsBetter?: boolean
}) {
  const colors = {
    red: 'text-red-400 bg-red-500/20 border-red-500/30',
    green: 'text-green-400 bg-green-500/20 border-green-500/30',
    purple: 'text-purple-400 bg-purple-500/20 border-purple-500/30',
  }

  return (
    <div className={`p-4 rounded-xl border-2 ${isWinner ? colors[color] : 'bg-dark-700 border-white/10'}`}>
      <div className="text-sm text-gray-400 mb-1">{label}</div>
      <div className={`text-2xl font-mono font-bold ${isWinner ? colors[color].split(' ')[0] : 'text-white'}`}>
        {value}
      </div>
      {isWinner && (
        <div className="flex items-center gap-1 mt-2">
          <Award className="w-4 h-4" />
          <span className="text-sm font-bold">Winner</span>
        </div>
      )}
    </div>
  )
}
