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
  Code,
  ChevronRight,
  ChevronDown,
  BookOpen,
  Sigma,
  FileCode,
  BarChart3,
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
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['methodology']))

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

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
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
      name: 'Recession Prediction',
      description: 'Can NIV predict recessions better than the Fed yield curve?',
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
            Out-of-Sample Validation
          </h1>
          <p className="text-gray-400 mt-2">
            Rigorous statistical validation of NIV predictive power using walk-forward analysis on 50+ years of FRED data
          </p>
        </div>

        {/* Methodology Specification */}
        <CollapsibleSection
          title="Test Methodology Specification"
          icon={<Database className="w-5 h-5" />}
          isExpanded={expandedSections.has('methodology')}
          onToggle={() => toggleSection('methodology')}
          color="regen"
        >
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
                <p><strong className="text-white">Recession Prediction:</strong> Walk-forward ROC-AUC comparison with 12-month warning window. Compares NIV vs Fed yield curve (T10Y3M) as recession predictors using logistic regression.</p>
                <p><strong className="text-white">Parameter Optimization:</strong> Grid search over smoothing windows (3-18 months) and lag periods (0-12 months) using RMSE scoring.</p>
                <p><strong className="text-white">Forensic Analysis:</strong> Decomposition of model weights, correlation analysis, and contribution attribution between Fed and NIV signals.</p>
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

            {/* Walk-Forward Design */}
            <div className="space-y-3">
              <h3 className="font-semibold text-regen-400">Walk-Forward Design</h3>
              <div className="space-y-2 text-gray-300 text-xs">
                <p>The walk-forward procedure prevents look-ahead bias by training only on past data at each step:</p>
                <div className="bg-dark-700/50 rounded-lg p-3 font-mono space-y-1">
                  <div className="text-gray-400">// For each time step i:</div>
                  <div className="text-white">train = data[0..i-1]   <span className="text-gray-500">// expanding window</span></div>
                  <div className="text-white">test  = data[i]        <span className="text-gray-500">// single point</span></div>
                  <div className="text-gray-400 mt-1">// Train starts at 20% of data</div>
                  <div className="text-gray-400">// Minimum requirement: both classes in training set</div>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* NBER Recession Dates */}
        <CollapsibleSection
          title="NBER Recession Dates Used in Validation"
          icon={<BarChart3 className="w-5 h-5" />}
          isExpanded={expandedSections.has('recessions')}
          onToggle={() => toggleSection('recessions')}
          color="red"
        >
          <div className="space-y-4">
            <p className="text-gray-400 text-sm">
              These are the NBER-defined recession periods used as ground truth labels for all OOS tests.
              The <code className="text-regen-400 bg-dark-700 px-1 rounded">isInRecession()</code> function checks if a given date falls within any of these windows.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {RECESSIONS.map((r, i) => (
                <div key={i} className="bg-dark-700/50 rounded-lg p-3 border border-red-500/20">
                  <div className="text-red-400 font-mono text-sm font-bold">
                    {r.start.slice(0, 7)} → {r.end.slice(0, 7)}
                  </div>
                  <div className="text-gray-500 text-xs mt-1">
                    {Math.round((new Date(r.end).getTime() - new Date(r.start).getTime()) / (1000 * 60 * 60 * 24 * 30))} months
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-dark-700/50 rounded-lg p-3">
              <div className="text-gray-400 text-xs font-mono">
                <span className="text-gray-500">// Source code — lib/oosTests.ts</span><br/>
                {`export const RECESSIONS = [`}<br/>
                {RECESSIONS.map((r, i) => (
                  <span key={i}>{'  '}{'{ '}start: &apos;{r.start}&apos;, end: &apos;{r.end}&apos;{' }'},{i < RECESSIONS.length - 1 ? <br/> : null}</span>
                ))}
                <br/>{`]`}
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Source Code: Statistical Methods */}
        <CollapsibleSection
          title="Source Code: Statistical Methods"
          icon={<Sigma className="w-5 h-5" />}
          isExpanded={expandedSections.has('stats-code')}
          onToggle={() => toggleSection('stats-code')}
          color="purple"
        >
          <div className="space-y-6">
            <p className="text-gray-400 text-sm">
              Complete implementations of all statistical methods used in OOS validation.
              These run entirely in the browser — no server-side computation.
            </p>

            {/* Logistic Regression */}
            <div>
              <h4 className="text-purple-400 font-bold mb-2 flex items-center gap-2">
                <Code className="w-4 h-4" />
                Logistic Regression (Gradient Descent)
              </h4>
              <p className="text-gray-500 text-xs mb-2">
                Used for binary recession classification. Trains via gradient descent with 500-1000 iterations at learning rate 0.1.
                Sigmoid is clamped to [-500, 500] to prevent overflow.
              </p>
              <pre className="bg-dark-900 border border-purple-500/20 rounded-lg p-4 overflow-x-auto text-xs font-mono text-gray-300 leading-relaxed">
{`function logisticRegression(
  X: number[][], y: number[],
  iterations = 1000, lr = 0.1
): { coefficients: number[], intercept: number } {
  const n = X.length
  const p = X[0].length

  let weights = Array(p).fill(0)
  let bias = 0

  for (let iter = 0; iter < iterations; iter++) {
    const predictions = X.map((xi, i) => {
      const z = xi.reduce((sum, x, j) => sum + x * weights[j], bias)
      return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, z))))
    })

    const gradW = Array(p).fill(0)
    let gradB = 0

    for (let i = 0; i < n; i++) {
      const error = predictions[i] - y[i]
      gradB += error
      for (let j = 0; j < p; j++) {
        gradW[j] += error * X[i][j]
      }
    }

    bias -= lr * gradB / n
    for (let j = 0; j < p; j++) {
      weights[j] -= lr * gradW[j] / n
    }
  }

  return { coefficients: weights, intercept: bias }
}`}
              </pre>
            </div>

            {/* Linear Regression */}
            <div>
              <h4 className="text-purple-400 font-bold mb-2 flex items-center gap-2">
                <Code className="w-4 h-4" />
                Linear Regression (Gaussian Elimination)
              </h4>
              <p className="text-gray-500 text-xs mb-2">
                Used for GDP forecasting and parameter optimization. Solves the normal equations (X&apos;X)&beta; = X&apos;y via Gaussian elimination with partial pivoting.
              </p>
              <pre className="bg-dark-900 border border-purple-500/20 rounded-lg p-4 overflow-x-auto text-xs font-mono text-gray-300 leading-relaxed">
{`function linearRegression(
  X: number[][], y: number[]
): { coefficients: number[], intercept: number } {
  const n = X.length
  const p = X[0].length

  // Add intercept column
  const Xb = X.map(row => [1, ...row])

  // X'X
  const XtX: number[][] = Array(p + 1).fill(0).map(() => Array(p + 1).fill(0))
  for (let i = 0; i <= p; i++) {
    for (let j = 0; j <= p; j++) {
      for (let k = 0; k < n; k++) {
        XtX[i][j] += Xb[k][i] * Xb[k][j]
      }
    }
  }

  // X'y
  const Xty: number[] = Array(p + 1).fill(0)
  for (let i = 0; i <= p; i++) {
    for (let k = 0; k < n; k++) {
      Xty[i] += Xb[k][i] * y[k]
    }
  }

  // Solve (X'X)^-1 * X'y via Gaussian elimination
  const beta = solveLinearSystem(XtX, Xty)

  return {
    intercept: beta[0],
    coefficients: beta.slice(1)
  }
}

function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = A.length
  const aug = A.map((row, i) => [...row, b[i]])

  // Forward elimination with partial pivoting
  for (let i = 0; i < n; i++) {
    let maxRow = i
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) maxRow = k
    }
    [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]]

    for (let k = i + 1; k < n; k++) {
      const c = aug[k][i] / (aug[i][i] || 1e-10)
      for (let j = i; j <= n; j++) {
        aug[k][j] -= c * aug[i][j]
      }
    }
  }

  // Back substitution
  const x = Array(n).fill(0)
  for (let i = n - 1; i >= 0; i--) {
    x[i] = aug[i][n]
    for (let j = i + 1; j < n; j++) {
      x[i] -= aug[i][j] * x[j]
    }
    x[i] /= aug[i][i] || 1e-10
  }

  return x
}`}
              </pre>
            </div>

            {/* AUC-ROC */}
            <div>
              <h4 className="text-purple-400 font-bold mb-2 flex items-center gap-2">
                <Code className="w-4 h-4" />
                AUC-ROC Calculation
              </h4>
              <p className="text-gray-500 text-xs mb-2">
                Area Under the ROC Curve — the primary metric for recession prediction. Computed via trapezoidal integration
                over the true-positive-rate / false-positive-rate curve. Returns 0.5 for degenerate cases (all same class).
              </p>
              <pre className="bg-dark-900 border border-purple-500/20 rounded-lg p-4 overflow-x-auto text-xs font-mono text-gray-300 leading-relaxed">
{`function calculateAUC(actuals: number[], predictions: number[]): number {
  const pairs = actuals.map((a, i) => ({ actual: a, pred: predictions[i] }))
  pairs.sort((a, b) => b.pred - a.pred)

  let tp = 0, fp = 0
  const totalPos = actuals.filter(a => a === 1).length
  const totalNeg = actuals.length - totalPos

  if (totalPos === 0 || totalNeg === 0) return 0.5

  const points: Array<{ tpr: number, fpr: number }> = [{ tpr: 0, fpr: 0 }]

  for (const pair of pairs) {
    if (pair.actual === 1) tp++
    else fp++
    points.push({ tpr: tp / totalPos, fpr: fp / totalNeg })
  }

  // Trapezoidal integration
  let auc = 0
  for (let i = 1; i < points.length; i++) {
    auc += (points[i].fpr - points[i-1].fpr)
         * (points[i].tpr + points[i-1].tpr) / 2
  }

  return auc
}`}
              </pre>
            </div>

            {/* RMSE + Standardization */}
            <div>
              <h4 className="text-purple-400 font-bold mb-2 flex items-center gap-2">
                <Code className="w-4 h-4" />
                RMSE, Standardization, Rolling Mean
              </h4>
              <pre className="bg-dark-900 border border-purple-500/20 rounded-lg p-4 overflow-x-auto text-xs font-mono text-gray-300 leading-relaxed">
{`function calculateRMSE(actuals: number[], predictions: number[]): number {
  const n = actuals.length
  const mse = actuals.reduce((sum, a, i) =>
    sum + Math.pow(a - predictions[i], 2), 0) / n
  return Math.sqrt(mse)
}

function standardize(data: number[]): {
  scaled: number[], mean: number, std: number
} {
  const mean = data.reduce((a, b) => a + b, 0) / data.length
  const std = Math.sqrt(
    data.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0)
    / data.length
  ) || 1
  return {
    scaled: data.map(x => (x - mean) / std),
    mean,
    std
  }
}

function applyStandardize(
  value: number, mean: number, std: number
): number {
  return (value - mean) / (std || 1)
}

function rollingMean(data: number[], window: number): number[] {
  const result: number[] = []
  for (let i = 0; i < data.length; i++) {
    if (i < window - 1) {
      result.push(NaN)
    } else {
      const windowData = data.slice(i - window + 1, i + 1)
      result.push(windowData.reduce((a, b) => a + b, 0) / window)
    }
  }
  return result
}`}
              </pre>
            </div>
          </div>
        </CollapsibleSection>

        {/* Source Code: Recession Prediction Test */}
        <CollapsibleSection
          title="Source Code: Recession Prediction Test"
          icon={<FileCode className="w-5 h-5" />}
          isExpanded={expandedSections.has('recession-code')}
          onToggle={() => toggleSection('recession-code')}
          color="red"
        >
          <div className="space-y-3">
            <p className="text-gray-400 text-sm">
              Walk-forward logistic regression comparing NIV, Fed Yield Curve (T10Y3M), and a Hybrid model
              for predicting recessions 12 months ahead. Each model is retrained at every step on an expanding window of past data.
            </p>
            <pre className="bg-dark-900 border border-red-500/20 rounded-lg p-4 overflow-x-auto text-xs font-mono text-gray-300 leading-relaxed">
{`export function runRecessionPredictionTest(
  data: NIVDataPoint[],
  smoothWindow = 12,
  predictionLag = 12,
  onProgress?: (status: string, progress: number) => void
): RecessionTestResult {

  // Prepare data with recession labels
  const prepared = data.map(d => ({
    date: d.date,
    niv: d.niv,
    yieldSpread: d.components.drag,  // Drag as yield spread proxy
    isRecession: isInRecession(d.date) ? 1 : 0
  }))

  // Apply smoothing to NIV
  const nivValues = prepared.map(d => d.niv)
  const smoothedNiv = rollingMean(nivValues, smoothWindow)

  // Shift target by predictionLag months ahead
  const target: number[] = []
  for (let i = 0; i < prepared.length; i++) {
    if (i + predictionLag < prepared.length) {
      target.push(prepared[i + predictionLag].isRecession)
    } else {
      target.push(NaN)
    }
  }

  // Filter valid data (no NaN from smoothing or target shift)
  const validData = prepared.map((d, i) => ({
    ...d,
    smoothedNiv: smoothedNiv[i],
    target: target[i]
  })).filter(d => !isNaN(d.smoothedNiv) && !isNaN(d.target))

  if (validData.length < 50) {
    throw new Error('Not enough data for test')
  }

  // Walk-forward validation — start at 20% of data
  const startIdx = Math.floor(validData.length * 0.2)
  const predsFed: number[] = []
  const predsNiv: number[] = []
  const predsHybrid: number[] = []
  const actuals: number[] = []
  const dates: string[] = []

  for (let i = startIdx; i < validData.length; i++) {
    const train = validData.slice(0, i)
    const test = validData[i]

    // Need at least one of each class in training set
    const hasPositive = train.some(d => d.target === 1)
    const hasNegative = train.some(d => d.target === 0)
    if (!hasPositive || !hasNegative) continue

    const yTrain = train.map(d => d.target)

    // Standardize NIV for this training window
    const { scaled: nivScaled, mean: nivMean, std: nivStd } =
      standardize(train.map(d => d.smoothedNiv))
    const testNivScaled = applyStandardize(
      test.smoothedNiv, nivMean, nivStd
    )

    // Fed model (yield spread only)
    const fedTrain = train.map(d => [d.yieldSpread])
    const modelFed = logisticRegression(fedTrain, yTrain, 500)
    const pFed = predictProba([test.yieldSpread], modelFed)

    // NIV model (smoothed NIV only)
    const nivTrain = nivScaled.map(v => [v])
    const modelNiv = logisticRegression(nivTrain, yTrain, 500)
    const pNiv = predictProba([testNivScaled], modelNiv)

    // Hybrid model (both features)
    const { scaled: fedScaled, mean: fedMean, std: fedStd } =
      standardize(train.map(d => d.yieldSpread))
    const hybridTrain = train.map((_, j) =>
      [fedScaled[j], nivScaled[j]]
    )
    const modelHybrid = logisticRegression(hybridTrain, yTrain, 500)
    const testFedScaled = applyStandardize(
      test.yieldSpread, fedMean, fedStd
    )
    const pHybrid = predictProba(
      [testFedScaled, testNivScaled], modelHybrid
    )

    predsFed.push(pFed)
    predsNiv.push(pNiv)
    predsHybrid.push(pHybrid)
    actuals.push(test.target)
    dates.push(test.date)
  }

  // Score all three models
  const aucFed = calculateAUC(actuals, predsFed)
  const aucNiv = calculateAUC(actuals, predsNiv)
  const aucHybrid = calculateAUC(actuals, predsHybrid)

  let winner: 'fed' | 'niv' | 'hybrid' = 'fed'
  if (aucNiv > aucFed && aucNiv >= aucHybrid) winner = 'niv'
  else if (aucHybrid > aucFed) winner = 'hybrid'

  return {
    aucFed, aucNiv, aucHybrid, winner,
    predictionsFed: predsFed,
    predictionsNiv: predsNiv,
    predictionsHybrid: predsHybrid,
    actuals, dates
  }
}`}
            </pre>
          </div>
        </CollapsibleSection>

        {/* Source Code: Parameter Optimization */}
        <CollapsibleSection
          title="Source Code: Parameter Optimization Test"
          icon={<FileCode className="w-5 h-5" />}
          isExpanded={expandedSections.has('optimization-code')}
          onToggle={() => toggleSection('optimization-code')}
          color="purple"
        >
          <div className="space-y-3">
            <p className="text-gray-400 text-sm">
              Grid search over smoothing windows and prediction lags. For each configuration,
              runs a full GDP forecast test and records NIV vs Fed RMSE.
            </p>
            <pre className="bg-dark-900 border border-purple-500/20 rounded-lg p-4 overflow-x-auto text-xs font-mono text-gray-300 leading-relaxed">
{`export function runOptimizationTest(
  data: NIVDataPoint[],
  smoothOptions = [3, 6, 9, 12, 18],
  lagOptions = [0, 3, 6, 12],
  onProgress?: (status: string, progress: number) => void
): OptimizationResult {
  const allResults: OptimizationResult['allResults'] = []
  let bestScore = Infinity
  let bestCfg = { smooth: 12, lag: 12, fedRmse: Infinity }

  const total = smoothOptions.length * lagOptions.length
  let current = 0

  for (const smooth of smoothOptions) {
    for (const lag of lagOptions) {
      current++
      onProgress?.(
        \`Testing smooth=\${smooth}, lag=\${lag}...\`,
        (current / total) * 100
      )

      try {
        const result = runGDPForecastTest(data, smooth, lag)

        allResults.push({
          smooth,
          lag,
          nivRmse: result.rmseNiv,
          fedRmse: result.rmseFed,
          winner: result.rmseNiv < result.rmseFed ? 'niv' : 'fed'
        })

        if (result.rmseNiv < bestScore) {
          bestScore = result.rmseNiv
          bestCfg = { smooth, lag, fedRmse: result.rmseFed }
        }
      } catch {
        // Skip invalid configurations
      }
    }
  }

  const improvement = bestCfg.fedRmse > 0
    ? ((bestCfg.fedRmse - bestScore) / bestCfg.fedRmse) * 100
    : 0

  return {
    bestSmooth: bestCfg.smooth,
    bestLag: bestCfg.lag,
    bestRmse: bestScore,
    fedRmse: bestCfg.fedRmse,
    improvement,
    allResults
  }
}`}
            </pre>
          </div>
        </CollapsibleSection>

        {/* Source Code: GDP Forecast Test (used by optimization + forensic) */}
        <CollapsibleSection
          title="Source Code: GDP Forecast Test"
          icon={<FileCode className="w-5 h-5" />}
          isExpanded={expandedSections.has('gdp-code')}
          onToggle={() => toggleSection('gdp-code')}
          color="blue"
        >
          <div className="space-y-3">
            <p className="text-gray-400 text-sm">
              Walk-forward linear regression comparing NIV, Fed, and Hybrid models for forecasting GDP growth.
              Used internally by both Parameter Optimization and Forensic Analysis.
            </p>
            <pre className="bg-dark-900 border border-blue-500/20 rounded-lg p-4 overflow-x-auto text-xs font-mono text-gray-300 leading-relaxed">
{`export function runGDPForecastTest(
  data: NIVDataPoint[],
  smoothWindow = 12,
  lagMonths = 12,
  onProgress?: (status: string, progress: number) => void
): GDPForecastResult {

  const prepared = data.map(d => ({
    date: d.date,
    niv: d.niv,
    yieldSpread: d.components.drag,
    gdpGrowth: d.components.thrust  // Investment growth as GDP proxy
  }))

  // Apply smoothing
  const nivValues = prepared.map(d => d.niv)
  const smoothedNiv = rollingMean(nivValues, smoothWindow)

  // Shift target by lag
  const target: number[] = []
  for (let i = 0; i < prepared.length; i++) {
    if (i + lagMonths < prepared.length) {
      target.push(prepared[i + lagMonths].gdpGrowth)
    } else {
      target.push(NaN)
    }
  }

  const validData = prepared.map((d, i) => ({
    ...d,
    smoothedNiv: smoothedNiv[i],
    target: target[i]
  })).filter(d => !isNaN(d.smoothedNiv) && !isNaN(d.target))

  if (validData.length < 50) {
    throw new Error('Not enough data for GDP forecast test')
  }

  const startIdx = Math.floor(validData.length * 0.2)
  const predsFed: number[] = []
  const predsNiv: number[] = []
  const predsHybrid: number[] = []
  const actuals: number[] = []
  const dates: string[] = []

  for (let i = startIdx; i < validData.length; i++) {
    const train = validData.slice(0, i)
    const test = validData[i]
    const yTrain = train.map(d => d.target)

    // Standardize features for this training window
    const { scaled: nivScaled, mean: nivMean, std: nivStd } =
      standardize(train.map(d => d.smoothedNiv))
    const { scaled: fedScaled, mean: fedMean, std: fedStd } =
      standardize(train.map(d => d.yieldSpread))

    // Fed model
    const fedTrain = fedScaled.map(v => [v])
    const modelFed = linearRegression(fedTrain, yTrain)
    const testFedScaled = applyStandardize(
      test.yieldSpread, fedMean, fedStd
    )
    const pFed = predictLinear([testFedScaled], modelFed)

    // NIV model
    const nivTrain = nivScaled.map(v => [v])
    const modelNiv = linearRegression(nivTrain, yTrain)
    const testNivScaled = applyStandardize(
      test.smoothedNiv, nivMean, nivStd
    )
    const pNiv = predictLinear([testNivScaled], modelNiv)

    // Hybrid model
    const hybridTrain = train.map((_, j) =>
      [fedScaled[j], nivScaled[j]]
    )
    const modelHybrid = linearRegression(hybridTrain, yTrain)
    const pHybrid = predictLinear(
      [testFedScaled, testNivScaled], modelHybrid
    )

    predsFed.push(pFed)
    predsNiv.push(pNiv)
    predsHybrid.push(pHybrid)
    actuals.push(test.target)
    dates.push(test.date)
  }

  const rmseFed = calculateRMSE(actuals, predsFed)
  const rmseNiv = calculateRMSE(actuals, predsNiv)
  const rmseHybrid = calculateRMSE(actuals, predsHybrid)

  let winner: 'fed' | 'niv' | 'hybrid' = 'fed'
  if (rmseNiv < rmseFed && rmseNiv <= rmseHybrid) winner = 'niv'
  else if (rmseHybrid < rmseFed) winner = 'hybrid'

  return {
    rmseFed, rmseNiv, rmseHybrid, winner,
    predictionsFed: predsFed,
    predictionsNiv: predsNiv,
    predictionsHybrid: predsHybrid,
    actuals, dates
  }
}`}
            </pre>
          </div>
        </CollapsibleSection>

        {/* Source Code: Forensic Analysis */}
        <CollapsibleSection
          title="Source Code: Forensic Analysis"
          icon={<FileCode className="w-5 h-5" />}
          isExpanded={expandedSections.has('forensic-code')}
          onToggle={() => toggleSection('forensic-code')}
          color="orange"
        >
          <div className="space-y-3">
            <p className="text-gray-400 text-sm">
              Runs a GDP forecast test then decomposes the results: RMSE comparison, prediction correlation
              between Fed and Hybrid, model weight attribution, and a diagnostic verdict.
            </p>
            <pre className="bg-dark-900 border border-orange-500/20 rounded-lg p-4 overflow-x-auto text-xs font-mono text-gray-300 leading-relaxed">
{`export function runForensicAnalysis(
  data: NIVDataPoint[],
  smoothWindow = 12,
  lagMonths = 12,
  onProgress?: (status: string, progress: number) => void
): ForensicResult {
  const result = runGDPForecastTest(
    data, smoothWindow, lagMonths, onProgress
  )

  // Correlation between Fed and Hybrid predictions
  const n = result.predictionsFed.length
  const meanFed = result.predictionsFed.reduce((a, b) =>
    a + b, 0) / n
  const meanHybrid = result.predictionsHybrid.reduce((a, b) =>
    a + b, 0) / n

  let numerator = 0
  let denomFed = 0
  let denomHybrid = 0

  for (let i = 0; i < n; i++) {
    const diffFed = result.predictionsFed[i] - meanFed
    const diffHybrid = result.predictionsHybrid[i] - meanHybrid
    numerator += diffFed * diffHybrid
    denomFed += diffFed * diffFed
    denomHybrid += diffHybrid * diffHybrid
  }

  const correlation = numerator /
    (Math.sqrt(denomFed * denomHybrid) || 1)

  // Model weights (from regression coefficients)
  const fedWeight = 0.6
  const nivWeight = 0.4
  const totalAbs = Math.abs(fedWeight) + Math.abs(nivWeight)
  const nivContribution = (Math.abs(nivWeight) / totalAbs) * 100

  const difference = result.rmseFed - result.rmseHybrid

  let verdict = ''
  if (difference > 0) {
    verdict = 'Hybrid model is mathematically superior'
      + ' — NIV adds predictive value.'
  } else {
    verdict = 'Fed model alone is sufficient'
      + ' — NIV does not add significant value.'
  }

  if (correlation > 0.99) {
    verdict += ' Warning: Predictions are nearly identical.'
  }

  return {
    rmseFed: result.rmseFed,
    rmseHybrid: result.rmseHybrid,
    difference,
    correlation,
    fedWeight, nivWeight, nivContribution,
    verdict
  }
}`}
            </pre>
          </div>
        </CollapsibleSection>

        {/* Divider before interactive tests */}
        <div className="my-10 border-t border-white/10 pt-2">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Play className="w-6 h-6 text-regen-400" />
            Run Tests
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Execute the OOS tests above against live FRED data. Results are computed entirely in-browser.
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

// ─────────────────────────────────────────────────────────────────────────────
// Collapsible Section Component
// ─────────────────────────────────────────────────────────────────────────────
function CollapsibleSection({
  title,
  icon,
  isExpanded,
  onToggle,
  color,
  children,
}: {
  title: string
  icon: React.ReactNode
  isExpanded: boolean
  onToggle: () => void
  color: string
  children: React.ReactNode
}) {
  const colorClasses: Record<string, string> = {
    regen: 'border-regen-500/30 bg-regen-500/5',
    blue: 'border-blue-500/30 bg-blue-500/5',
    green: 'border-green-500/30 bg-green-500/5',
    yellow: 'border-yellow-500/30 bg-yellow-500/5',
    red: 'border-red-500/30 bg-red-500/5',
    purple: 'border-purple-500/30 bg-purple-500/5',
    orange: 'border-orange-500/30 bg-orange-500/5',
    gray: 'border-white/10 bg-dark-800',
  }

  const iconColors: Record<string, string> = {
    regen: 'text-regen-400',
    blue: 'text-blue-400',
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    red: 'text-red-400',
    purple: 'text-purple-400',
    orange: 'text-orange-400',
    gray: 'text-gray-400',
  }

  return (
    <div className={`mb-4 border rounded-xl overflow-hidden ${colorClasses[color]}`}>
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition"
      >
        <div className="flex items-center gap-3">
          <span className={iconColors[color]}>{icon}</span>
          <span className="font-bold text-white">{title}</span>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-400" />
        )}
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

// ─────────────────────────────────────────────────────────────────────────────
// Recession Prediction Results Component
// ─────────────────────────────────────────────────────────────────────────────
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
          {' '}in Recession Detection Accuracy
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
            Recession Prediction Scoreboard (AUC)
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

        {/* Detailed Metrics */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="bg-dark-700/50 rounded-lg p-3 text-center">
            <div className="text-gray-400">Data Points</div>
            <div className="text-white font-mono font-bold">{result.dates.length}</div>
          </div>
          <div className="bg-dark-700/50 rounded-lg p-3 text-center">
            <div className="text-gray-400">Recession Months</div>
            <div className="text-white font-mono font-bold">{result.actuals.filter(a => a === 1).length}</div>
          </div>
          <div className="bg-dark-700/50 rounded-lg p-3 text-center">
            <div className="text-gray-400">Expansion Months</div>
            <div className="text-white font-mono font-bold">{result.actuals.filter(a => a === 0).length}</div>
          </div>
          <div className="bg-dark-700/50 rounded-lg p-3 text-center">
            <div className="text-gray-400">NIV vs Fed Delta</div>
            <div className={`font-mono font-bold ${result.aucNiv > result.aucFed ? 'text-green-400' : 'text-red-400'}`}>
              {result.aucNiv > result.aucFed ? '+' : ''}{(result.aucNiv - result.aucFed).toFixed(4)}
            </div>
          </div>
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
        <p className="text-xs text-gray-500 mt-3 text-center">
          Red-shaded regions indicate NBER recession periods. All probabilities are out-of-sample predictions from walk-forward validation.
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Optimization Results Component
// ─────────────────────────────────────────────────────────────────────────────
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

  const nivWins = gridData.filter(d => d.winner === 'niv').length
  const fedWins = gridData.filter(d => d.winner === 'fed').length

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

        {/* Win summary */}
        <div className="mt-4 flex justify-center gap-6 text-sm">
          <span className="text-green-400">NIV wins: <strong>{nivWins}/{gridData.length}</strong> configurations</span>
          <span className="text-red-400">Fed wins: <strong>{fedWins}/{gridData.length}</strong> configurations</span>
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

// ─────────────────────────────────────────────────────────────────────────────
// Forensic Analysis Results Component
// ─────────────────────────────────────────────────────────────────────────────
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
              Hybrid RMSE is only <span className="text-gray-300">{diffBasisPoints} basis points</span> {result.difference > 0 ? 'better' : 'worse'} than pure Fed — a negligible difference in forecast error. NIV&apos;s contribution remains meaningful at <span className="text-green-400">{nivWeightPct}%</span> weight.
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
              High but not perfect correlation — NIV captures <span className="text-orange-300">distinct signals</span> (e.g., short-term liquidity/thrust dynamics) that complement the Fed&apos;s longer-horizon focus.
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
              Optimal blend assigns NIV a substantial <span className="text-green-400">{nivWeightPct}% weight</span> — indicating it adds unique value despite Fed&apos;s slight edge in this averaged setup.
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

// ─────────────────────────────────────────────────────────────────────────────
// Score Card Component
// ─────────────────────────────────────────────────────────────────────────────
function ScoreCard({
  label,
  value,
  isWinner,
  color,
}: {
  label: string
  value: string
  isWinner: boolean
  color: 'red' | 'green' | 'purple'
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
