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
  Area,
  ComposedChart,
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
  ChevronRight,
  ChevronDown,
  BarChart3,
  Layers,
  GitBranch,
  Activity,
  FileText,
  Clock,
  Shield,
} from 'lucide-react'
import { useSessionStore } from '@/store/sessionStore'
import { calculateNIVFromFRED, checkServerApiKey } from '@/lib/fredApi'
import {
  runEnsembleRecessionTest,
  runMultiHorizonTest,
  runProtocolComparisonTest,
  runOptimizationTest,
  runComponentAnalysis,
  runForensicAnalysis,
  EnsembleRecessionResult,
  MultiHorizonResult,
  ProtocolComparisonResult,
  OptimizationResult,
  ComponentAnalysisResult,
  ForensicResult,
  RECESSIONS,
} from '@/lib/oosTests'

type TestType = 'ensemble' | 'multiHorizon' | 'protocol' | 'optimization' | 'component' | 'forensic'

export default function OOSTestsPage() {
  const { params, apiSettings, setApiSettings } = useSessionStore()

  const [activeTest, setActiveTest] = useState<TestType>('ensemble')
  const [isRunning, setIsRunning] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [hasServerKey, setHasServerKey] = useState<boolean | null>(null)
  const [checkingServerKey, setCheckingServerKey] = useState(true)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  // Test results
  const [ensembleResult, setEnsembleResult] = useState<EnsembleRecessionResult | null>(null)
  const [multiHorizonResult, setMultiHorizonResult] = useState<MultiHorizonResult | null>(null)
  const [protocolResult, setProtocolResult] = useState<ProtocolComparisonResult | null>(null)
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null)
  const [componentResult, setComponentResult] = useState<ComponentAnalysisResult | null>(null)
  const [forensicResult, setForensicResult] = useState<ForensicResult | null>(null)

  useEffect(() => {
    const checkServer = async () => {
      setCheckingServerKey(true)
      try {
        const hasKey = await checkServerApiKey()
        setHasServerKey(hasKey)
        if (hasKey) {
          setApiSettings({ useLiveData: true })
        } else {
          setError('Server FRED API key not configured. Please contact administrator.')
        }
      } catch {
        setHasServerKey(false)
        setError('Failed to check server API configuration.')
      }
      setCheckingServerKey(false)
    }
    checkServer()
  }, [setApiSettings])

  const canRunTests = hasServerKey || (apiSettings.fredApiKey && apiSettings.useLiveData)

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) newExpanded.delete(section)
    else newExpanded.add(section)
    setExpandedSections(newExpanded)
  }

  const runTest = useCallback(async (testType: TestType) => {
    if (!canRunTests) {
      setError('Unable to run tests - no data source available.')
      return
    }

    setIsRunning(true)
    setError(null)
    setLoadingStatus('Fetching FRED data...')

    try {
      const oosStartDate = '1970-01-01'
      const oosEndDate = new Date().toISOString().split('T')[0]
      const apiKeyToUse = hasServerKey ? '' : apiSettings.fredApiKey

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
        case 'ensemble': {
          const res = await runEnsembleRecessionTest(
            nivData, params.smoothWindow, 12,
            (status, progress) => setLoadingStatus(`${status} (${progress.toFixed(0)}%)`)
          )
          setEnsembleResult(res)
          break
        }
        case 'multiHorizon': {
          const res = await runMultiHorizonTest(
            nivData, params.smoothWindow, [3, 6, 12, 18],
            (status, progress) => setLoadingStatus(`${status} (${progress.toFixed(0)}%)`)
          )
          setMultiHorizonResult(res)
          break
        }
        case 'protocol': {
          const res = await runProtocolComparisonTest(
            nivData, params.smoothWindow, 12,
            (status, progress) => setLoadingStatus(`${status} (${progress.toFixed(0)}%)`)
          )
          setProtocolResult(res)
          break
        }
        case 'optimization': {
          const res = runOptimizationTest(
            nivData, [3, 6, 9, 12, 18], [0, 3, 6, 12],
            (status, progress) => setLoadingStatus(`${status} (${progress.toFixed(0)}%)`)
          )
          setOptimizationResult(res)
          break
        }
        case 'component': {
          const res = runComponentAnalysis(
            nivData, params.smoothWindow, 12,
            (status, progress) => setLoadingStatus(`${status} (${progress.toFixed(0)}%)`)
          )
          setComponentResult(res)
          break
        }
        case 'forensic': {
          const res = runForensicAnalysis(
            nivData, params.smoothWindow, 12,
            (status, progress) => setLoadingStatus(`${status} (${progress.toFixed(0)}%)`)
          )
          setForensicResult(res)
          break
        }
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
      id: 'ensemble' as TestType,
      name: 'Calibrated Ensemble',
      description: 'L2 logistic + boosted stumps + neural net with conformal intervals',
      icon: Layers,
      color: 'green',
    },
    {
      id: 'multiHorizon' as TestType,
      name: 'Multi-Horizon',
      description: 'Compare 3, 6, 12, and 18-month prediction horizons',
      icon: Clock,
      color: 'blue',
    },
    {
      id: 'protocol' as TestType,
      name: 'Protocol Comparison',
      description: 'Expanding window vs. fixed 15-year window validation',
      icon: GitBranch,
      color: 'cyan',
    },
    {
      id: 'optimization' as TestType,
      name: 'Parameter Optimization',
      description: 'Grid search over smoothing and lag settings',
      icon: Settings,
      color: 'purple',
    },
    {
      id: 'component' as TestType,
      name: 'Component Analysis',
      description: 'Feature importance, recession blocks, and regime detection',
      icon: Activity,
      color: 'orange',
    },
    {
      id: 'forensic' as TestType,
      name: 'Forensic Analysis',
      description: 'GDP forecast decomposition and model weight attribution',
      icon: FlaskConical,
      color: 'red',
    },
  ]

  return (
    <div className="bg-black min-h-screen pt-24 pb-16">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <p className="text-caption uppercase text-gray-500 mb-4">Statistical Validation</p>
          <h1 className="section-headline text-white flex items-center gap-4">
            <FlaskConical className="w-10 h-10" />
            Out-of-Sample Tests
          </h1>
          <p className="text-lg text-gray-400 mt-4 max-w-3xl">
            Next-generation OOS validation with calibrated ensemble, conformal prediction intervals,
            and multi-protocol walk-forward analysis. All computation runs in-browser.
          </p>
          <div className="mt-4 flex gap-3">
            <a
              href="/NIV_Next_Gen_OOS_Framework.md"
              download
              className="inline-flex items-center gap-2 px-4 py-2 bg-regen-500/20 border border-regen-500/40 text-regen-400 rounded-lg hover:bg-regen-500/30 transition text-sm font-medium"
            >
              <FileText className="w-4 h-4" />
              Download Methodology
            </a>
            <a
              href="/NIV_Out_of_Sample_Methodology_and_Results.md"
              download
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-gray-400 rounded-lg hover:bg-white/10 transition text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              Results Document
            </a>
          </div>
        </div>

        {/* Methodology Specification */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-6 bg-[#0a0a0a]/50 border border-white/10 rounded-xl"
        >
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-regen-400" />
            Test Methodology Specification
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="space-y-3">
              <h3 className="font-semibold text-regen-400">NIV Engine</h3>
              <div className="bg-black border border-white/10 rounded-lg p-3 font-mono text-xs space-y-1">
                <div className="text-gray-400">// Master Equation</div>
                <div className="text-white">NIV = (u &times; P&sup2;) / (X + F)^&eta;</div>
                <div className="text-gray-500 mt-2">where:</div>
                <div className="text-blue-300">u = tanh(1.0&middot;dG + 1.0&middot;dA - 0.7&middot;dr)</div>
                <div className="text-green-300">P = (Investment &times; 1.15) / GDP</div>
                <div className="text-yellow-300">X = 1 - (TCU / 100)</div>
                <div className="text-red-300">F = 0.4&middot;YieldPen + 0.4&middot;max(0,RealRate) + 0.2&middot;Vol</div>
                <div className="text-gray-400 mt-2">&eta; = 1.5, &epsilon; = 0.001</div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-regen-400">Ensemble Architecture</h3>
              <div className="space-y-2 text-gray-300">
                <p><strong className="text-white">Base Learner 1:</strong> L2-regularized logistic regression with class weighting (handles 7.9% base rate)</p>
                <p><strong className="text-white">Base Learner 2:</strong> Gradient boosted decision stumps (AdaBoost, 25 rounds)</p>
                <p><strong className="text-white">Base Learner 3:</strong> Feedforward neural network (12&rarr;8&rarr;1, ReLU, manual backprop)</p>
                <p><strong className="text-white">Calibration:</strong> Isotonic regression (Pool Adjacent Violators)</p>
                <p><strong className="text-white">Uncertainty:</strong> Adaptive conformal prediction (90% coverage)</p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-regen-400">12 Component Features</h3>
              <div className="bg-black border border-white/10 rounded-lg p-3 text-xs space-y-1 font-mono">
                <div className="flex justify-between"><span className="text-gray-400">niv_smoothed</span><span className="text-white">12-month SMA of NIV</span></div>
                <div className="flex justify-between"><span className="text-gray-400">niv_raw</span><span className="text-white">Raw NIV score</span></div>
                <div className="flex justify-between"><span className="text-gray-400">thrust</span><span className="text-white">NIV thrust component</span></div>
                <div className="flex justify-between"><span className="text-gray-400">efficiency_sq</span><span className="text-white">Efficiency squared (P&sup2;)</span></div>
                <div className="flex justify-between"><span className="text-gray-400">slack</span><span className="text-white">Capacity utilisation gap</span></div>
                <div className="flex justify-between"><span className="text-gray-400">drag</span><span className="text-white">Yield curve friction</span></div>
                <div className="flex justify-between"><span className="text-gray-400">spread</span><span className="text-white">Yield penalty - real rate</span></div>
                <div className="flex justify-between"><span className="text-gray-400">real_rate</span><span className="text-white">Real interest rate</span></div>
                <div className="flex justify-between"><span className="text-gray-400">rate_vol</span><span className="text-white">Rate volatility</span></div>
                <div className="flex justify-between"><span className="text-gray-400">niv_momentum</span><span className="text-white">3-month NIV change</span></div>
                <div className="flex justify-between"><span className="text-gray-400">niv_acceleration</span><span className="text-white">Momentum change</span></div>
                <div className="flex justify-between"><span className="text-gray-400">niv_percentile</span><span className="text-white">Expanding percentile rank</span></div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-regen-400">FRED Data Series (1970-Present)</h3>
              <div className="bg-black border border-white/10 rounded-lg p-3 text-xs space-y-1">
                <div className="flex justify-between"><span className="text-gray-400">GDP Growth:</span><span className="text-white">A191RL1Q225SBEA</span></div>
                <div className="flex justify-between"><span className="text-gray-400">M2 Money Supply:</span><span className="text-white">M2SL</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Fed Funds Rate:</span><span className="text-white">FEDFUNDS</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Investment:</span><span className="text-white">GPDIC1</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Real GDP:</span><span className="text-white">GDPC1</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Capacity Util:</span><span className="text-white">TCU</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Yield Spread:</span><span className="text-white">T10Y3M</span></div>
                <div className="flex justify-between"><span className="text-gray-400">CPI Inflation:</span><span className="text-white">CPIAUCSL</span></div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* NBER Recession Dates */}
        <CollapsibleSection
          title="NBER Recession Dates Used in Validation"
          icon={<BarChart3 className="w-5 h-5" />}
          isExpanded={expandedSections.has('recessions')}
          onToggle={() => toggleSection('recessions')}
        >
          <div className="space-y-4">
            <p className="text-gray-400 text-sm">
              NBER-defined recession periods used as ground truth labels for all OOS tests.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {RECESSIONS.map((r, i) => (
                <div key={i} className="bg-black border border-white/10 rounded-lg p-3">
                  <div className="text-red-400 font-mono text-sm font-bold">
                    {r.start.slice(0, 7)} &rarr; {r.end.slice(0, 7)}
                  </div>
                  <div className="text-gray-500 text-xs mt-1">
                    {Math.round((new Date(r.end).getTime() - new Date(r.start).getTime()) / (1000 * 60 * 60 * 24 * 30))} months
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CollapsibleSection>

        {/* Divider before interactive tests */}
        <div className="my-10 border-t border-white/10 pt-6">
          <p className="text-caption uppercase text-gray-500 mb-4">Interactive Testing</p>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Play className="w-6 h-6 text-regen-400" />
            Run Tests
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Execute validation tests against live FRED data. All computation runs in-browser.
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
            const colorMap: Record<string, string> = {
              green: 'from-green-600 to-green-400 border-green-500',
              blue: 'from-blue-600 to-blue-400 border-blue-500',
              cyan: 'from-cyan-600 to-cyan-400 border-cyan-500',
              purple: 'from-purple-600 to-purple-400 border-purple-500',
              orange: 'from-orange-600 to-orange-400 border-orange-500',
              red: 'from-red-600 to-red-400 border-red-500',
            }

            return (
              <button
                key={test.id}
                onClick={() => setActiveTest(test.id)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  isActive
                    ? `bg-gradient-to-br ${colorMap[test.color]} border-opacity-50`
                    : 'bg-[#0a0a0a] border-white/10 hover:border-white/30'
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
          className="w-full flex items-center justify-center gap-3 px-8 py-5 bg-white text-black font-medium uppercase tracking-wider hover:bg-gray-100 transition disabled:opacity-50 mb-8"
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

        {/* Loading Progress */}
        <AnimatePresence>
          {isRunning && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8 p-6 bg-[#0a0a0a]/80 border border-blue-500/30 rounded-xl"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="relative">
                  <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                  <div className="absolute inset-0 w-8 h-8 border-2 border-blue-400/20 rounded-full" />
                </div>
                <div>
                  <div className="text-white font-medium">{loadingStatus || 'Processing...'}</div>
                  <div className="text-gray-500 text-sm">This may take 30-90 seconds for ensemble methods</div>
                </div>
              </div>
              <div className="h-2 bg-[#111] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-600 to-blue-400"
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 60, ease: 'linear' }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Display */}
        <div className="space-y-6">
          {activeTest === 'ensemble' && ensembleResult && (
            <EnsembleResults result={ensembleResult} />
          )}
          {activeTest === 'multiHorizon' && multiHorizonResult && (
            <MultiHorizonResults result={multiHorizonResult} />
          )}
          {activeTest === 'protocol' && protocolResult && (
            <ProtocolResults result={protocolResult} />
          )}
          {activeTest === 'optimization' && optimizationResult && (
            <OptimizationResults result={optimizationResult} />
          )}
          {activeTest === 'component' && componentResult && (
            <ComponentResults result={componentResult} />
          )}
          {activeTest === 'forensic' && forensicResult && (
            <ForensicResults result={forensicResult} />
          )}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// ENSEMBLE RESULTS (with conformal interval chart)
// ═══════════════════════════════════════════════════════════════════════════

function EnsembleResults({ result }: { result: EnsembleRecessionResult }) {
  const chartData = result.dates.map((date, i) => ({
    date,
    ensemble: +(result.probabilities[i] * 100).toFixed(2),
    lower: +(result.lowerBounds[i] * 100).toFixed(2),
    upper: +(result.upperBounds[i] * 100).toFixed(2),
    actual: result.actuals[i] * 100,
  }))

  const exportCSV = () => {
    const csv = [
      'date,ensemble_probability,lower_bound,upper_bound,logistic,boosted,neural,warning_level,actual_recession',
      ...result.dates.map((date, i) =>
        `${date},${result.probabilities[i].toFixed(4)},${result.lowerBounds[i].toFixed(4)},${result.upperBounds[i].toFixed(4)},${result.pLogistic[i].toFixed(4)},${result.pBoosted[i].toFixed(4)},${result.pNeural[i].toFixed(4)},${result.warningLevels[i]},${result.actuals[i]}`
      )
    ].join('\n')
    downloadCSV(csv, 'ensemble_recession_results.csv')
  }

  return (
    <div className="space-y-6">
      {/* Headline AUC */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-green-600/20 to-green-400/10 border-2 border-green-500/50 rounded-2xl p-8 text-center"
      >
        <div className="text-lg text-green-300 font-medium mb-2">Calibrated Ensemble — Out-of-Sample</div>
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          AUC-ROC: <span className="text-green-400">{result.aucEnsemble.toFixed(3)}</span>
        </h2>
        <div className="flex flex-wrap justify-center gap-6 text-sm font-mono">
          <div>
            <span className="text-blue-400">{result.aucLogistic.toFixed(3)}</span>
            <span className="text-gray-500 ml-1">Logistic</span>
          </div>
          <div>
            <span className="text-yellow-400">{result.aucBoosted.toFixed(3)}</span>
            <span className="text-gray-500 ml-1">Boosted</span>
          </div>
          <div>
            <span className="text-purple-400">{result.aucNeural.toFixed(3)}</span>
            <span className="text-gray-500 ml-1">Neural</span>
          </div>
        </div>
      </motion.div>

      {/* Metrics Grid */}
      <div className="border border-white/10 bg-[#0a0a0a] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-green-400" />
            Ensemble Metrics
          </h3>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-regen-500 text-black font-bold rounded-lg hover:bg-regen-400 transition"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <MetricCard label="Brier Score" value={result.brierScore.toFixed(4)} description="Lower is better" />
          <MetricCard label="ECE" value={result.ece.toFixed(4)} description="Calibration error" />
          <MetricCard label="F1 at 50%" value={result.f1At50.toFixed(3)} description="Standard threshold" />
          <MetricCard
            label={`F1 Optimal (${(result.optimalThreshold * 100).toFixed(0)}%)`}
            value={result.f1Optimal.toFixed(3)}
            description="Best threshold"
            highlight
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Data Points" value={result.dataPoints.toString()} />
          <MetricCard label="Recession Months" value={result.recessionMonths.toString()} />
          <MetricCard label="Conformal Coverage" value={`${(result.conformalCoverage * 100).toFixed(1)}%`} description="Target: 90%" />
          <MetricCard label="Avg Interval Width" value={`${(result.avgIntervalWidth * 100).toFixed(1)}%`} />
        </div>
      </div>

      {/* Probability Chart with Conformal Bands */}
      <div className="border border-white/10 bg-[#0a0a0a] p-6">
        <h3 className="text-lg font-bold mb-2">Recession Probability with 90% Conformal Interval</h3>
        <p className="text-gray-500 text-sm mb-4">
          Shaded band shows 90% prediction interval. Red background = NBER recession periods.
        </p>
        <div className="h-[450px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
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
                formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]}
              />
              <Legend />
              {RECESSIONS.map((r, i) => (
                <ReferenceArea key={i} x1={r.start} x2={r.end} fill="#ef4444" fillOpacity={0.1} />
              ))}
              <Area
                type="monotone"
                dataKey="upper"
                stroke="none"
                fill="#22c55e"
                fillOpacity={0.15}
                name="90% CI Upper"
              />
              <Area
                type="monotone"
                dataKey="lower"
                stroke="none"
                fill="#000000"
                fillOpacity={1}
                name="90% CI Lower"
              />
              <Line type="monotone" dataKey="ensemble" name="Ensemble" stroke="#22c55e" strokeWidth={2.5} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Warning Level Timeline */}
      <div className="border border-white/10 bg-[#0a0a0a] p-6">
        <h3 className="text-lg font-bold mb-4">Warning Level Timeline (Last 60 Months)</h3>
        <div className="flex flex-wrap gap-1">
          {result.warningLevels.slice(-60).map((level, i) => {
            const idx = result.warningLevels.length - 60 + i
            const colors = { green: 'bg-green-500', yellow: 'bg-yellow-500', red: 'bg-red-500' }
            return (
              <div
                key={i}
                className={`w-3 h-8 rounded-sm ${colors[level as keyof typeof colors] || 'bg-gray-700'}`}
                title={`${result.dates[idx]}: ${(result.probabilities[idx] * 100).toFixed(1)}% (${level})`}
              />
            )
          })}
        </div>
        <div className="flex gap-4 mt-3 text-xs text-gray-400">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-500" /> Green: &lt;15%</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-yellow-500" /> Yellow: 15-40%</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-500" /> Red: &ge;40% with CI &ge;15%</span>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MULTI-HORIZON RESULTS
// ═══════════════════════════════════════════════════════════════════════════

function MultiHorizonResults({ result }: { result: MultiHorizonResult }) {
  const exportCSV = () => {
    const csv = [
      'horizon_months,auc_ensemble,auc_logistic,brier_score,f1_optimal,optimal_threshold,data_points,recession_months',
      ...result.horizons.map(h =>
        `${h.months},${h.aucEnsemble.toFixed(4)},${h.aucLogistic.toFixed(4)},${h.brierScore.toFixed(4)},${h.f1Optimal.toFixed(4)},${h.optimalThreshold.toFixed(4)},${h.dataPoints},${h.recessionMonths}`
      )
    ].join('\n')
    downloadCSV(csv, 'multi_horizon_results.csv')
  }

  const bestHorizon = result.horizons.reduce((best, h) => h.aucEnsemble > best.aucEnsemble ? h : best, result.horizons[0])

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600/20 to-blue-400/10 border-2 border-blue-500/50 rounded-2xl p-8 text-center"
      >
        <div className="text-lg text-blue-300 font-medium mb-2">Multi-Horizon Comparison</div>
        <h2 className="text-3xl md:text-4xl font-bold text-white">
          Best: <span className="text-blue-400">{bestHorizon.months}-month</span> horizon
          (AUC {bestHorizon.aucEnsemble.toFixed(3)})
        </h2>
      </motion.div>

      <div className="border border-white/10 bg-[#0a0a0a] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Clock className="w-6 h-6 text-blue-400" />
            Horizon Comparison
          </h3>
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-regen-500 text-black font-bold rounded-lg hover:bg-regen-400 transition">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-3">Horizon</th>
                <th className="text-right py-3 px-3">AUC Ensemble</th>
                <th className="text-right py-3 px-3">AUC Logistic</th>
                <th className="text-right py-3 px-3">Brier</th>
                <th className="text-right py-3 px-3">F1 Optimal</th>
                <th className="text-right py-3 px-3">Threshold</th>
                <th className="text-right py-3 px-3">Points</th>
                <th className="text-right py-3 px-3">Rec. Months</th>
              </tr>
            </thead>
            <tbody>
              {result.horizons.map((h, i) => (
                <tr key={i} className={`border-b border-white/5 ${h.months === bestHorizon.months ? 'bg-blue-500/10' : ''}`}>
                  <td className="py-3 px-3 font-mono font-bold text-blue-400">{h.months} months</td>
                  <td className="py-3 px-3 text-right font-mono">{h.aucEnsemble.toFixed(4)}</td>
                  <td className="py-3 px-3 text-right font-mono text-gray-400">{h.aucLogistic.toFixed(4)}</td>
                  <td className="py-3 px-3 text-right font-mono text-gray-400">{h.brierScore.toFixed(4)}</td>
                  <td className="py-3 px-3 text-right font-mono text-green-400">{h.f1Optimal.toFixed(3)}</td>
                  <td className="py-3 px-3 text-right font-mono text-gray-400">{(h.optimalThreshold * 100).toFixed(0)}%</td>
                  <td className="py-3 px-3 text-right font-mono text-gray-400">{h.dataPoints}</td>
                  <td className="py-3 px-3 text-right font-mono text-red-400">{h.recessionMonths}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Visual AUC comparison */}
        <div className="mt-6 space-y-3">
          {result.horizons.map((h, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-sm font-mono text-gray-400 w-20">{h.months}mo</span>
              <div className="flex-1 h-6 bg-[#111] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full flex items-center justify-end pr-2"
                  style={{ width: `${h.aucEnsemble * 100}%` }}
                >
                  <span className="text-xs font-mono text-white">{h.aucEnsemble.toFixed(3)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// PROTOCOL COMPARISON RESULTS
// ═══════════════════════════════════════════════════════════════════════════

function ProtocolResults({ result }: { result: ProtocolComparisonResult }) {
  const chartData = result.dates.map((date, i) => ({
    date,
    expanding: +(result.expandingProbs[i] * 100).toFixed(2),
    fixed: +(result.fixedProbs[i] * 100).toFixed(2),
    actual: result.actuals[i] * 100,
  }))

  const exportCSV = () => {
    const csv = [
      'date,expanding_probability,fixed_probability,actual_recession',
      ...result.dates.map((date, i) =>
        `${date},${result.expandingProbs[i].toFixed(4)},${result.fixedProbs[i].toFixed(4)},${result.actuals[i]}`
      )
    ].join('\n')
    downloadCSV(csv, 'protocol_comparison_results.csv')
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-cyan-600/20 to-cyan-400/10 border-2 border-cyan-500/50 rounded-2xl p-8 text-center"
      >
        <div className="text-lg text-cyan-300 font-medium mb-2">Protocol Comparison</div>
        <h2 className="text-3xl md:text-4xl font-bold text-white">
          <span className="text-cyan-400">{result.winner === 'expanding' ? 'Expanding Window' : 'Fixed Window'}</span> Wins
        </h2>
      </motion.div>

      <div className="border border-white/10 bg-[#0a0a0a] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <GitBranch className="w-6 h-6 text-cyan-400" />
            Protocol Metrics
          </h3>
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-regen-500 text-black font-bold rounded-lg hover:bg-regen-400 transition">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className={`p-5 rounded-xl border-2 ${result.winner === 'expanding' ? 'bg-cyan-500/10 border-cyan-500/50' : 'bg-black border-white/10'}`}>
            <h4 className="font-bold text-cyan-400 mb-3">Expanding Window</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-gray-400">AUC:</span> <span className="font-mono">{result.expanding.auc.toFixed(4)}</span></div>
              <div><span className="text-gray-400">Brier:</span> <span className="font-mono">{result.expanding.brier.toFixed(4)}</span></div>
              <div><span className="text-gray-400">F1:</span> <span className="font-mono">{result.expanding.f1.toFixed(3)}</span></div>
              <div><span className="text-gray-400">Threshold:</span> <span className="font-mono">{(result.expanding.threshold * 100).toFixed(0)}%</span></div>
            </div>
            {result.winner === 'expanding' && (
              <div className="mt-3 flex items-center gap-1 text-cyan-400 text-sm">
                <Award className="w-4 h-4" /> <span className="font-bold">Winner</span>
              </div>
            )}
          </div>

          <div className={`p-5 rounded-xl border-2 ${result.winner === 'fixed' ? 'bg-cyan-500/10 border-cyan-500/50' : 'bg-black border-white/10'}`}>
            <h4 className="font-bold text-orange-400 mb-3">Fixed Window (15yr)</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-gray-400">AUC:</span> <span className="font-mono">{result.fixed.auc.toFixed(4)}</span></div>
              <div><span className="text-gray-400">Brier:</span> <span className="font-mono">{result.fixed.brier.toFixed(4)}</span></div>
              <div><span className="text-gray-400">F1:</span> <span className="font-mono">{result.fixed.f1.toFixed(3)}</span></div>
              <div><span className="text-gray-400">Threshold:</span> <span className="font-mono">{(result.fixed.threshold * 100).toFixed(0)}%</span></div>
            </div>
            {result.winner === 'fixed' && (
              <div className="mt-3 flex items-center gap-1 text-orange-400 text-sm">
                <Award className="w-4 h-4" /> <span className="font-bold">Winner</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Comparison Chart */}
      <div className="border border-white/10 bg-[#0a0a0a] p-6">
        <h3 className="text-lg font-bold mb-4">Expanding vs Fixed Window Probabilities</h3>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="date" stroke="#666" tick={{ fill: '#888', fontSize: 11 }} tickFormatter={(v) => v.split('-')[0]} />
              <YAxis stroke="#666" tick={{ fill: '#888' }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }} formatter={(value: number) => [`${value.toFixed(1)}%`]} />
              <Legend />
              {RECESSIONS.map((r, i) => (
                <ReferenceArea key={i} x1={r.start} x2={r.end} fill="#ef4444" fillOpacity={0.1} />
              ))}
              <Line type="monotone" dataKey="expanding" name="Expanding" stroke="#22d3ee" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="fixed" name="Fixed (15yr)" stroke="#f97316" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// OPTIMIZATION RESULTS
// ═══════════════════════════════════════════════════════════════════════════

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
    downloadCSV(csv, 'optimization_results.csv')
  }

  const nivWins = gridData.filter(d => d.winner === 'niv').length
  const fedWins = gridData.filter(d => d.winner === 'fed').length

  return (
    <div className="space-y-6">
      <div className="border border-white/10 bg-[#0a0a0a] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6 text-purple-400" />
            Optimal Configuration Found
          </h3>
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-regen-500 text-black font-bold rounded-lg hover:bg-regen-400 transition">
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

        <div className="mt-4 flex justify-center gap-6 text-sm">
          <span className="text-green-400">NIV wins: <strong>{nivWins}/{gridData.length}</strong> configs</span>
          <span className="text-red-400">Fed wins: <strong>{fedWins}/{gridData.length}</strong> configs</span>
        </div>
      </div>

      <div className="border border-white/10 bg-[#0a0a0a] p-6">
        <h3 className="text-lg font-bold mb-4">All Configurations</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2 px-3">Config</th>
                <th className="text-right py-2 px-3">Smooth</th>
                <th className="text-right py-2 px-3">Lag</th>
                <th className="text-right py-2 px-3">NIV RMSE</th>
                <th className="text-right py-2 px-3">Fed RMSE</th>
                <th className="text-right py-2 px-3">Delta</th>
                <th className="text-center py-2 px-3">Winner</th>
              </tr>
            </thead>
            <tbody>
              {gridData.map((row, i) => (
                <tr key={i} className={`border-b border-white/5 ${row.config === `S${result.bestSmooth}/L${result.bestLag}` ? 'bg-purple-500/10' : ''}`}>
                  <td className="py-2 px-3 font-mono">{row.config}</td>
                  <td className="py-2 px-3 text-right font-mono text-gray-400">{row.smooth}</td>
                  <td className="py-2 px-3 text-right font-mono text-gray-400">{row.lag}</td>
                  <td className="py-2 px-3 text-right font-mono">{row.nivRmse.toFixed(5)}</td>
                  <td className="py-2 px-3 text-right font-mono">{row.fedRmse.toFixed(5)}</td>
                  <td className={`py-2 px-3 text-right font-mono ${row.nivRmse < row.fedRmse ? 'text-green-400' : 'text-red-400'}`}>
                    {(row.fedRmse - row.nivRmse).toFixed(5)}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span className={row.winner === 'niv' ? 'text-green-400' : 'text-red-400'}>
                      {row.winner === 'niv' ? 'NIV' : 'Fed'}
                    </span>
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

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT ANALYSIS RESULTS
// ═══════════════════════════════════════════════════════════════════════════

function ComponentResults({ result }: { result: ComponentAnalysisResult }) {
  const COLORS = ['#22c55e', '#3b82f6', '#a855f7', '#f97316', '#ef4444', '#06b6d4', '#eab308', '#ec4899', '#14b8a6', '#f43f5e', '#8b5cf6', '#84cc16']

  const exportCSV = () => {
    const csv = [
      'feature_name,importance_score',
      ...result.featureImportance.map(f => `${f.name},${f.importance.toFixed(6)}`),
      '',
      'recession_block,duration,niv_at_onset,niv_max,fed_at_onset,dominant_component',
      ...result.recessionBlocks.map(b =>
        `${b.label},${b.duration},${b.nivAtOnset.toFixed(2)},${b.nivMax.toFixed(2)},${b.fedAtOnset.toFixed(2)},${b.dominantComponent || 'none'}`
      ),
    ].join('\n')
    downloadCSV(csv, 'component_analysis_results.csv')
  }

  const maxImportance = result.featureImportance.length > 0
    ? result.featureImportance[0].importance
    : 1

  return (
    <div className="space-y-6">
      {/* Alert if present */}
      {result.recentAlert && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-xl flex items-center gap-3"
        >
          <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
          <span className="text-yellow-200">{result.recentAlert}</span>
        </motion.div>
      )}

      {/* Feature Importance */}
      <div className="border border-white/10 bg-[#0a0a0a] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-orange-400" />
            Feature Importance (L2 Logistic Coefficients)
          </h3>
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-regen-500 text-black font-bold rounded-lg hover:bg-regen-400 transition">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        <div className="space-y-2">
          {result.featureImportance.map((f, i) => (
            <div key={f.name} className="flex items-center gap-3">
              <span className="text-sm font-mono text-gray-400 w-36 text-right">{f.name}</span>
              <div className="flex-1 h-6 bg-[#111] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(f.importance / maxImportance) * 100}%`,
                    backgroundColor: COLORS[i % COLORS.length],
                  }}
                />
              </div>
              <span className="text-sm font-mono text-gray-300 w-16">{f.importance.toFixed(3)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recession Blocks */}
      <div className="border border-white/10 bg-[#0a0a0a] p-6">
        <h3 className="text-lg font-bold mb-4">Recession Block Analysis</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2 px-3">Block</th>
                <th className="text-right py-2 px-3">Duration</th>
                <th className="text-right py-2 px-3">NIV at Onset</th>
                <th className="text-right py-2 px-3">NIV Max</th>
                <th className="text-right py-2 px-3">Fed at Onset</th>
                <th className="text-left py-2 px-3">Dominant</th>
              </tr>
            </thead>
            <tbody>
              {result.recessionBlocks.map((b, i) => (
                <tr key={i} className="border-b border-white/5">
                  <td className="py-2 px-3 font-bold text-red-400">{b.label}</td>
                  <td className="py-2 px-3 text-right font-mono text-gray-400">{b.duration} mo</td>
                  <td className="py-2 px-3 text-right font-mono">{b.nivAtOnset.toFixed(1)}%</td>
                  <td className="py-2 px-3 text-right font-mono text-green-400">{b.nivMax.toFixed(1)}%</td>
                  <td className="py-2 px-3 text-right font-mono text-red-400">{b.fedAtOnset.toFixed(1)}%</td>
                  <td className="py-2 px-3 text-orange-400">{b.dominantComponent || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Component Time Series */}
      <div className="border border-white/10 bg-[#0a0a0a] p-6">
        <h3 className="text-lg font-bold mb-4">Component Decomposition Over Time</h3>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={result.componentTimeSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="date" stroke="#666" tick={{ fill: '#888', fontSize: 11 }} tickFormatter={(v) => v.split('-')[0]} />
              <YAxis stroke="#666" tick={{ fill: '#888' }} />
              <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }} />
              <Legend />
              <Line type="monotone" dataKey="thrust" name="Thrust" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="drag" name="Drag" stroke="#ef4444" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="slack" name="Slack" stroke="#eab308" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="efficiency" name="Efficiency" stroke="#a855f7" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="niv" name="NIV (smoothed)" stroke="#22c55e" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// FORENSIC RESULTS
// ═══════════════════════════════════════════════════════════════════════════

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
    downloadCSV(csv, 'forensic_analysis_results.csv')
  }

  const diffBasisPoints = (Math.abs(result.difference) * 10000).toFixed(2)
  const fedWeightPct = ((1 - result.nivContribution / 100) * 100).toFixed(0)
  const nivWeightPct = result.nivContribution.toFixed(0)

  return (
    <div className="space-y-6">
      <div className="border border-white/10 bg-[#0a0a0a] p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold flex items-center gap-2 text-white">
              <FlaskConical className="w-7 h-7 text-orange-400" />
              Forensic Analysis Report
            </h3>
            <p className="text-gray-400 mt-1">NIV vs. Fed Hybrid Performance</p>
          </div>
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-regen-500 text-black font-bold rounded-lg hover:bg-regen-400 transition">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* RMSE Card */}
          <div className="bg-black border border-white/10 rounded-xl p-5">
            <h4 className="font-bold text-gray-300 mb-4">Precision Scoring (RMSE)</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Fed Model:</span>
                <span className="font-mono text-red-400 text-lg">{result.rmseFed.toFixed(9)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Hybrid Model:</span>
                <span className="font-mono text-purple-400 text-lg">{result.rmseHybrid.toFixed(9)}</span>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-3">
                <span className="text-gray-400">Difference:</span>
                <span className={`font-mono text-lg ${result.difference > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {result.difference > 0 ? '+' : ''}{result.difference.toFixed(9)}
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              Difference: <span className="text-gray-300">{diffBasisPoints} basis points</span>
            </p>
          </div>

          {/* Correlation Card */}
          <div className="bg-black border border-white/10 rounded-xl p-5">
            <h4 className="font-bold text-gray-300 mb-4">Clone Factor</h4>
            <div className="text-center mb-4">
              <div className="text-5xl font-mono font-bold text-orange-400">
                {(result.correlation * 100).toFixed(2)}%
              </div>
              <div className="text-sm text-gray-400 mt-2">Prediction Correlation</div>
            </div>
            <div className="h-3 bg-[#111] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-600 to-orange-400"
                style={{ width: `${result.correlation * 100}%` }}
              />
            </div>
          </div>

          {/* Weights Card */}
          <div className="bg-black border border-white/10 rounded-xl p-5">
            <h4 className="font-bold text-gray-300 mb-4">Model Weights</h4>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Fed Weight</span>
                  <span className="font-mono text-red-400 font-bold">{fedWeightPct}%</span>
                </div>
                <div className="h-3 bg-[#111] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-red-600 to-red-400" style={{ width: `${(1 - result.nivContribution / 100) * 100}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">NIV Weight</span>
                  <span className="font-mono text-green-400 font-bold">{nivWeightPct}%</span>
                </div>
                <div className="h-3 bg-[#111] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-green-600 to-green-400" style={{ width: `${result.nivContribution}%` }} />
                </div>
              </div>
            </div>
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

// ═══════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function MetricCard({ label, value, description, highlight }: {
  label: string; value: string; description?: string; highlight?: boolean
}) {
  return (
    <div className={`bg-black border rounded-lg p-3 text-center ${highlight ? 'border-green-500/30' : 'border-white/10'}`}>
      <div className="text-gray-400 text-xs">{label}</div>
      <div className={`font-mono font-bold text-lg ${highlight ? 'text-green-400' : 'text-white'}`}>{value}</div>
      {description && <div className="text-gray-600 text-xs mt-1">{description}</div>}
    </div>
  )
}

function CollapsibleSection({
  title, icon, isExpanded, onToggle, children,
}: {
  title: string; icon: React.ReactNode; isExpanded: boolean; onToggle: () => void; children: React.ReactNode
}) {
  return (
    <div className="mb-4 border border-white/10 rounded-xl overflow-hidden bg-[#0a0a0a]/50">
      <button onClick={onToggle} className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition">
        <div className="flex items-center gap-3">
          <span className="text-gray-400">{icon}</span>
          <span className="font-bold text-white">{title}</span>
        </div>
        {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 border-t border-white/10">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
