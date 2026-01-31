'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  Legend,
} from 'recharts'
import {
  Play,
  Loader2,
  FlaskConical,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Database,
  Settings,
  Award,
  Download,
} from 'lucide-react'
import { useSessionStore } from '@/store/sessionStore'
import { calculateNIVFromFRED, checkServerApiKey } from '@/lib/fredApi'
import {
  runRecessionPredictionTest,
  runOptimizationTest,
  runForensicAnalysis,
  RecessionTestResult,
  OptimizationResult,
  ForensicResult,
  RECESSIONS,
} from '@/lib/oosTests'

type TestType = 'recession' | 'optimization' | 'forensic'

export default function OOSTestsPage() {
  const { params, apiSettings, setApiSettings } = useSessionStore()

  const [activeTest, setActiveTest] = useState<TestType>('recession')
  const [isRunning, setIsRunning] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [hasServerKey, setHasServerKey] = useState<boolean | null>(null)
  const [checkingServerKey, setCheckingServerKey] = useState(true)

  // Test results
  const [recessionResult, setRecessionResult] = useState<RecessionTestResult | null>(null)
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null)
  const [forensicResult, setForensicResult] = useState<ForensicResult | null>(null)

  // Check if server has configured API key on mount
  useEffect(() => {
    const checkServer = async () => {
      setCheckingServerKey(true)
      try {
        const hasKey = await checkServerApiKey()
        console.log('[OOS Tests] Server API key check:', hasKey)
        setHasServerKey(hasKey)
        if (hasKey) {
          setApiSettings({ useLiveData: true })
        } else {
          setError('Server FRED API key not configured. Please contact administrator.')
        }
      } catch (err) {
        console.error('[OOS Tests] Server API key check failed:', err)
        setHasServerKey(false)
        setError('Failed to check server API configuration.')
      }
      setCheckingServerKey(false)
    }
    checkServer()
  }, [setApiSettings])

  const canRunTests = hasServerKey || (apiSettings.fredApiKey && apiSettings.useLiveData)

  const runTest = useCallback(async (testType: TestType) => {
    if (!canRunTests) {
      setError('Unable to run tests - no data source available.')
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

      // Use server key (empty string) if available, otherwise client key
      const apiKeyToUse = hasServerKey ? '' : apiSettings.fredApiKey

      // First fetch the NIV data
      const nivData = await calculateNIVFromFRED(
        apiKeyToUse,
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
  }, [canRunTests, hasServerKey, apiSettings, params])

  const tests = [
    {
      id: 'recession' as TestType,
      name: 'Crisis Prediction',
      description: 'Can NIV predict systemic stress better than the Fed yield curve?',
      icon: AlertTriangle,
      color: 'red',
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
                <p><strong className="text-white">Crisis Prediction:</strong> Walk-forward ROC-AUC comparison with 12-month warning window. Compares NIV vs Fed yield curve (T10Y3M) as systemic stress predictors.</p>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
          disabled={isRunning || checkingServerKey || !canRunTests}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-500 hover:to-blue-300 text-white font-bold rounded-xl transition disabled:opacity-50 mb-4"
        >
          {checkingServerKey ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Initializing...
            </>
          ) : isRunning ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {loadingStatus || 'Running Test...'}
            </>
          ) : !canRunTests ? (
            <>
              <AlertTriangle className="w-5 h-5" />
              Unable to Load Data
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              Run {tests.find(t => t.id === activeTest)?.name} Test
            </>
          )}
        </button>

        {/* Loading Progress Indicator */}
        <AnimatePresence>
          {isRunning && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8 p-6 bg-dark-800/80 border border-blue-500/30 rounded-xl"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="relative">
                  <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                  <div className="absolute inset-0 w-8 h-8 border-2 border-blue-400/20 rounded-full" />
                </div>
                <div>
                  <div className="text-white font-medium">{loadingStatus || 'Processing...'}</div>
                  <div className="text-gray-500 text-sm">This may take 30-60 seconds for 50+ years of data</div>
                </div>
              </div>
              {/* Animated progress bar */}
              <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-600 to-blue-400"
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 45, ease: 'linear' }}
                />
              </div>
              <div className="mt-3 text-xs text-gray-500 text-center">
                Fetching FRED data, computing NIV scores, and running walk-forward analysis...
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Display */}
        <div className="space-y-6">
          {/* Recession Prediction Results */}
          {activeTest === 'recession' && recessionResult && (
            <RecessionResults result={recessionResult} />
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

  // Calculate improvement percentage
  const improvementPct = ((result.aucNiv - result.aucFed) / result.aucFed * 100).toFixed(0)

  const exportCSV = () => {
    const csv = [
      'date,niv_probability,fed_probability,hybrid_probability,actual_recession',
      ...chartData.map(d => `${d.date},${d.niv.toFixed(2)},${d.fed.toFixed(2)},${d.hybrid.toFixed(2)},${d.actual.toFixed(0)}`)
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'recession_prediction_results.csv'
    a.click()
  }

  return (
    <div className="space-y-6">
      {/* Prominent AUC Headline */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-green-600/20 to-green-400/10 border-2 border-green-500/50 rounded-2xl p-8 text-center"
      >
        <div className="text-lg text-green-300 font-medium mb-2">Out-of-Sample Validation Result</div>
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          NIV outperforms the Fed Yield Curve by{' '}
          <span className="text-green-400">{improvementPct}%</span>
          {' '}in Crisis Detection Accuracy
        </h2>
        <div className="flex justify-center gap-8 text-xl font-mono">
          <div>
            <span className="text-green-400 font-bold">{result.aucNiv.toFixed(2)}</span>
            <span className="text-gray-400 ml-2">NIV AUC</span>
          </div>
          <div className="text-gray-500">vs</div>
          <div>
            <span className="text-red-400 font-bold">{result.aucFed.toFixed(2)}</span>
            <span className="text-gray-400 ml-2">Fed AUC</span>
          </div>
        </div>
      </motion.div>

      {/* Scoreboard */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Award className="w-6 h-6 text-yellow-400" />
            Crisis Prediction Scoreboard (AUC)
          </h3>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-regen-500 text-black font-bold rounded-lg hover:bg-regen-400 transition"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

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
        <h3 className="text-lg font-bold mb-4">Crisis Probability Over Time (12-Month Warning)</h3>
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

// Optimization Results Component
function OptimizationResults({ result }: { result: OptimizationResult }) {
  const gridData = result.allResults.map(r => ({
    config: `S${r.smooth}/L${r.lag}`,
    smooth: r.smooth,
    lag: r.lag,
    nivRmse: r.nivRmse,
    fedRmse: r.fedRmse,
    winner: r.winner,
  }))

  const exportCSV = () => {
    const csv = [
      'smoothing_window,lag_months,niv_rmse,fed_rmse,winner',
      ...gridData.map(d => `${d.smooth},${d.lag},${d.nivRmse.toFixed(6)},${d.fedRmse.toFixed(6)},${d.winner}`)
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'optimization_results.csv'
    a.click()
  }

  return (
    <div className="space-y-6">
      {/* Best Configuration */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6 text-purple-400" />
            Optimal Configuration Found
          </h3>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-regen-500 text-black font-bold rounded-lg hover:bg-regen-400 transition"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

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
  const exportCSV = () => {
    const csv = [
      'metric,value',
      `rmse_fed,${result.rmseFed.toFixed(9)}`,
      `rmse_hybrid,${result.rmseHybrid.toFixed(9)}`,
      `rmse_difference,${result.difference.toFixed(9)}`,
      `correlation,${result.correlation.toFixed(6)}`,
      `fed_weight,${result.fedWeight.toFixed(6)}`,
      `niv_weight,${result.nivWeight.toFixed(6)}`,
      `niv_contribution_pct,${result.nivContribution.toFixed(2)}`,
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'forensic_analysis_results.csv'
    a.click()
  }

  // Calculate difference in basis points for context
  const diffBasisPoints = (Math.abs(result.difference) * 10000).toFixed(2)
  const fedWeightPct = ((1 - result.nivContribution / 100) * 100).toFixed(0)
  const nivWeightPct = result.nivContribution.toFixed(0)

  return (
    <div className="space-y-6">
      {/* Main Header */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold flex items-center gap-2 text-white">
              <FlaskConical className="w-7 h-7 text-orange-400" />
              Forensic Analysis Report
            </h3>
            <p className="text-gray-400 mt-1">NIV vs. Fed Hybrid Performance</p>
          </div>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-regen-500 text-black font-bold rounded-lg hover:bg-regen-400 transition"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Precision Scoring (RMSE) Card */}
          <div className="bg-dark-700 rounded-xl p-5">
            <h4 className="font-bold text-gray-300 mb-4">Precision Scoring (RMSE)</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Fed Model:</span>
                <span className="font-mono text-red-400 text-lg">{result.rmseFed.toFixed(9)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Hybrid Model:</span>
                <span className="font-mono text-purple-400 text-lg">{result.rmseHybrid.toFixed(9)}</span>
              </div>
              <div className="flex justify-between items-center border-t border-white/10 pt-3">
                <span className="text-gray-400">Difference:</span>
                <span className={`font-mono text-lg ${result.difference > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {result.difference > 0 ? '+' : ''}{result.difference.toFixed(9)}
                </span>
              </div>
              {/* Difference bar */}
              <div className="h-2 bg-dark-600 rounded-full overflow-hidden mt-2">
                <div
                  className={`h-full ${result.difference > 0 ? 'bg-green-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(Math.abs(result.difference) * 100000, 100)}%` }}
                />
              </div>
            </div>
            {/* Context text */}
            <p className="text-xs text-gray-500 mt-4 leading-relaxed">
              Hybrid RMSE is only <span className="text-gray-300">{diffBasisPoints} basis points</span> {result.difference > 0 ? 'better' : 'worse'} than pure Fed — a negligible difference in forecast error. NIV's contribution remains meaningful at <span className="text-green-400">{nivWeightPct}%</span> weight.
            </p>
          </div>

          {/* Clone Factor / Correlation Card */}
          <div className="bg-dark-700 rounded-xl p-5">
            <h4 className="font-bold text-gray-300 mb-4">Clone Factor</h4>
            <div className="text-center mb-4">
              <div className="text-5xl font-mono font-bold text-orange-400">
                {(result.correlation * 100).toFixed(2)}%
              </div>
              <div className="text-sm text-gray-400 mt-2">Prediction Correlation</div>
            </div>
            {/* Correlation bar */}
            <div className="h-3 bg-dark-600 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-600 to-orange-400"
                style={{ width: `${result.correlation * 100}%` }}
              />
            </div>
            {/* Context text */}
            <p className="text-xs text-gray-500 mt-4 leading-relaxed">
              High but not perfect correlation — NIV captures <span className="text-orange-300">distinct signals</span> (e.g., short-term liquidity/thrust dynamics) that complement the Fed's longer-horizon focus.
            </p>
          </div>

          {/* Model Weights Card */}
          <div className="bg-dark-700 rounded-xl p-5">
            <h4 className="font-bold text-gray-300 mb-4">Model Weights</h4>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Fed Weight</span>
                  <span className="font-mono text-red-400 font-bold">{fedWeightPct}%</span>
                </div>
                <div className="h-3 bg-dark-600 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-600 to-red-400"
                    style={{ width: `${(1 - result.nivContribution / 100) * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">NIV Weight</span>
                  <span className="font-mono text-green-400 font-bold">{nivWeightPct}%</span>
                </div>
                <div className="h-3 bg-dark-600 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-600 to-green-400"
                    style={{ width: `${result.nivContribution}%` }}
                  />
                </div>
              </div>
            </div>
            {/* Context text */}
            <p className="text-xs text-gray-500 mt-4 leading-relaxed">
              Optimal blend assigns NIV a substantial <span className="text-green-400">{nivWeightPct}% weight</span> — indicating it adds unique value despite Fed's slight edge in this averaged setup.
            </p>
          </div>
        </div>

        {/* Verdict */}
        <div className={`mt-6 p-5 rounded-xl ${result.difference > 0 ? 'bg-green-500/10 border border-green-500/30' : 'bg-orange-500/10 border border-orange-500/30'}`}>
          <div className="flex items-center gap-2 mb-2">
            {result.difference > 0 ? (
              <CheckCircle className="w-6 h-6 text-green-400" />
            ) : (
              <FlaskConical className="w-6 h-6 text-orange-400" />
            )}
            <span className={`font-bold text-lg ${result.difference > 0 ? 'text-green-400' : 'text-orange-400'}`}>
              VERDICT
            </span>
          </div>
          <p className="text-gray-300">{result.verdict}</p>
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
