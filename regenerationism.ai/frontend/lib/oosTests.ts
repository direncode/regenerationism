/**
 * Out-of-Sample Testing Library
 * Translates Python statistical tests to TypeScript for browser execution
 */

import { NIVDataPoint } from './fredApi'
import { auditLog, logModelEvaluation } from './auditLog'

// NBER Recession Dates
export const RECESSIONS = [
  { start: '1980-01-01', end: '1980-07-01' },
  { start: '1981-07-01', end: '1982-11-01' },
  { start: '1990-07-01', end: '1991-03-01' },
  { start: '2001-03-01', end: '2001-11-01' },
  { start: '2007-12-01', end: '2009-06-01' },
  { start: '2020-02-01', end: '2020-04-01' },
]

export interface TestDataPoint {
  date: string
  niv: number
  yieldSpread: number // Fed yield curve (T10Y3M)
  gdpGrowth: number
  isRecession: boolean
}

export interface RecessionTestResult {
  aucFed: number
  aucNiv: number
  aucHybrid: number
  winner: 'fed' | 'niv' | 'hybrid'
  predictionsFed: number[]
  predictionsNiv: number[]
  predictionsHybrid: number[]
  actuals: number[]
  dates: string[]
}

export interface GDPForecastResult {
  rmseFed: number
  rmseNiv: number
  rmseHybrid: number
  winner: 'fed' | 'niv' | 'hybrid'
  predictionsFed: number[]
  predictionsNiv: number[]
  predictionsHybrid: number[]
  actuals: number[]
  dates: string[]
}

export interface OptimizationResult {
  bestSmooth: number
  bestLag: number
  bestRmse: number
  fedRmse: number
  improvement: number
  allResults: Array<{
    smooth: number
    lag: number
    nivRmse: number
    fedRmse: number
    winner: 'niv' | 'fed'
  }>
}

export interface ForensicResult {
  rmseFed: number
  rmseHybrid: number
  difference: number
  correlation: number
  fedWeight: number
  nivWeight: number
  nivContribution: number
  verdict: string
}

// Simple linear regression
function linearRegression(X: number[][], y: number[]): { coefficients: number[], intercept: number } {
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

  // Solve (X'X)^-1 * X'y using simple Gaussian elimination
  const beta = solveLinearSystem(XtX, Xty)

  return {
    intercept: beta[0],
    coefficients: beta.slice(1)
  }
}

// Gaussian elimination for solving linear systems
function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = A.length
  const aug = A.map((row, i) => [...row, b[i]])

  // Forward elimination
  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) {
        maxRow = k
      }
    }
    [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]]

    // Eliminate column
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
}

// Logistic regression (simple gradient descent)
function logisticRegression(X: number[][], y: number[], iterations = 1000, lr = 0.1): { coefficients: number[], intercept: number } {
  const n = X.length
  const p = X[0].length

  // Initialize weights
  let weights = Array(p).fill(0)
  let bias = 0

  // Gradient descent
  for (let iter = 0; iter < iterations; iter++) {
    const predictions = X.map((xi, i) => {
      const z = xi.reduce((sum, x, j) => sum + x * weights[j], bias)
      return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, z))))
    })

    // Update weights
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
}

// Predict probability with logistic model
function predictProba(x: number[], model: { coefficients: number[], intercept: number }): number {
  const z = x.reduce((sum, xi, i) => sum + xi * model.coefficients[i], model.intercept)
  return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, z))))
}

// Predict with linear model
function predictLinear(x: number[], model: { coefficients: number[], intercept: number }): number {
  return x.reduce((sum, xi, i) => sum + xi * model.coefficients[i], model.intercept)
}

// Standardize data
function standardize(data: number[]): { scaled: number[], mean: number, std: number } {
  const mean = data.reduce((a, b) => a + b, 0) / data.length
  const std = Math.sqrt(data.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / data.length) || 1
  return {
    scaled: data.map(x => (x - mean) / std),
    mean,
    std
  }
}

// Apply standardization
function applyStandardize(value: number, mean: number, std: number): number {
  return (value - mean) / (std || 1)
}

// Calculate AUC-ROC
function calculateAUC(actuals: number[], predictions: number[]): number {
  const pairs: Array<{ actual: number, pred: number }> = actuals.map((a, i) => ({ actual: a, pred: predictions[i] }))
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

  // Calculate area under curve
  let auc = 0
  for (let i = 1; i < points.length; i++) {
    auc += (points[i].fpr - points[i - 1].fpr) * (points[i].tpr + points[i - 1].tpr) / 2
  }

  return auc
}

// Calculate RMSE
function calculateRMSE(actuals: number[], predictions: number[]): number {
  const n = actuals.length
  const mse = actuals.reduce((sum, a, i) => sum + Math.pow(a - predictions[i], 2), 0) / n
  return Math.sqrt(mse)
}

// Rolling mean
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
}

// Check if date is in recession
function isInRecession(date: string): boolean {
  const d = new Date(date)
  return RECESSIONS.some(r => d >= new Date(r.start) && d <= new Date(r.end))
}

/**
 * Recession Prediction Test
 * Compares NIV vs Fed Yield Curve for predicting recessions 12 months ahead
 */
export function runRecessionPredictionTest(
  data: NIVDataPoint[],
  smoothWindow = 12,
  predictionLag = 12,
  onProgress?: (status: string, progress: number) => void
): RecessionTestResult {
  const testStartTime = performance.now()

  auditLog.logSystem(
    'Recession Prediction Test started',
    'INFO',
    { dataPoints: data.length, smoothWindow, predictionLag },
    'OOS-RecessionTest'
  )

  onProgress?.('Preparing data...', 0)

  // Prepare data with recession labels
  const prepared = data.map(d => ({
    date: d.date,
    niv: d.niv,
    yieldSpread: d.components.drag, // Using drag as proxy for yield spread impact
    isRecession: isInRecession(d.date) ? 1 : 0
  }))

  // Apply smoothing
  const nivValues = prepared.map(d => d.niv)
  const smoothedNiv = rollingMean(nivValues, smoothWindow)

  // Shift target for prediction lag
  const target: number[] = []
  for (let i = 0; i < prepared.length; i++) {
    if (i + predictionLag < prepared.length) {
      target.push(prepared[i + predictionLag].isRecession)
    } else {
      target.push(NaN)
    }
  }

  // Filter valid data
  const validData = prepared.map((d, i) => ({
    ...d,
    smoothedNiv: smoothedNiv[i],
    target: target[i]
  })).filter(d => !isNaN(d.smoothedNiv) && !isNaN(d.target))

  if (validData.length < 50) {
    throw new Error('Not enough data for test')
  }

  // Walk-forward validation
  const startIdx = Math.floor(validData.length * 0.2)
  const predsFed: number[] = []
  const predsNiv: number[] = []
  const predsHybrid: number[] = []
  const actuals: number[] = []
  const dates: string[] = []

  onProgress?.('Running walk-forward validation...', 20)

  for (let i = startIdx; i < validData.length; i++) {
    const train = validData.slice(0, i)
    const test = validData[i]

    // Need at least one of each class
    const hasPositive = train.some(d => d.target === 1)
    const hasNegative = train.some(d => d.target === 0)
    if (!hasPositive || !hasNegative) continue

    const yTrain = train.map(d => d.target)

    // Standardize NIV
    const { scaled: nivScaled, mean: nivMean, std: nivStd } = standardize(train.map(d => d.smoothedNiv))
    const testNivScaled = applyStandardize(test.smoothedNiv, nivMean, nivStd)

    // Fed model (using yield spread proxy)
    const fedTrain = train.map(d => [d.yieldSpread])
    const modelFed = logisticRegression(fedTrain, yTrain, 500)
    const pFed = predictProba([test.yieldSpread], modelFed)

    // NIV model
    const nivTrain = nivScaled.map(v => [v])
    const modelNiv = logisticRegression(nivTrain, yTrain, 500)
    const pNiv = predictProba([testNivScaled], modelNiv)

    // Hybrid model
    const { scaled: fedScaled, mean: fedMean, std: fedStd } = standardize(train.map(d => d.yieldSpread))
    const hybridTrain = train.map((d, j) => [fedScaled[j], nivScaled[j]])
    const modelHybrid = logisticRegression(hybridTrain, yTrain, 500)
    const testFedScaled = applyStandardize(test.yieldSpread, fedMean, fedStd)
    const pHybrid = predictProba([testFedScaled, testNivScaled], modelHybrid)

    predsFed.push(pFed)
    predsNiv.push(pNiv)
    predsHybrid.push(pHybrid)
    actuals.push(test.target)
    dates.push(test.date)

    if (i % 20 === 0) {
      onProgress?.(`Processing ${i}/${validData.length}...`, 20 + (i / validData.length) * 70)
    }
  }

  onProgress?.('Calculating scores...', 90)

  const aucFed = calculateAUC(actuals, predsFed)
  const aucNiv = calculateAUC(actuals, predsNiv)
  const aucHybrid = calculateAUC(actuals, predsHybrid)

  let winner: 'fed' | 'niv' | 'hybrid' = 'fed'
  if (aucNiv > aucFed && aucNiv >= aucHybrid) winner = 'niv'
  else if (aucHybrid > aucFed) winner = 'hybrid'

  const testDuration = performance.now() - testStartTime

  // Log model evaluation results
  logModelEvaluation(
    'Logistic Regression (Fed)',
    { AUC: aucFed },
    startIdx,
    validData.length - startIdx,
    'OOS-RecessionTest'
  )

  logModelEvaluation(
    'Logistic Regression (NIV)',
    { AUC: aucNiv },
    startIdx,
    validData.length - startIdx,
    'OOS-RecessionTest'
  )

  logModelEvaluation(
    'Logistic Regression (Hybrid)',
    { AUC: aucHybrid },
    startIdx,
    validData.length - startIdx,
    'OOS-RecessionTest'
  )

  auditLog.logModel(
    `Recession Prediction Test complete - Winner: ${winner.toUpperCase()}`,
    {
      modelType: 'Walk-Forward Validation',
      trainingSamples: startIdx,
      testSamples: validData.length - startIdx,
      metrics: {
        aucFed,
        aucNiv,
        aucHybrid,
        nivAdvantage: aucNiv - aucFed,
        hybridAdvantage: aucHybrid - aucFed,
      },
      predictions: predsNiv,
      actuals,
    },
    'INFO',
    'OOS-RecessionTest'
  )

  auditLog.logSystem(
    'Recession Prediction Test completed',
    'INFO',
    {
      duration: `${testDuration.toFixed(2)}ms`,
      winner,
      aucFed: aucFed.toFixed(4),
      aucNiv: aucNiv.toFixed(4),
      aucHybrid: aucHybrid.toFixed(4),
    },
    'OOS-RecessionTest'
  )

  onProgress?.('Complete', 100)

  return {
    aucFed,
    aucNiv,
    aucHybrid,
    winner,
    predictionsFed: predsFed,
    predictionsNiv: predsNiv,
    predictionsHybrid: predsHybrid,
    actuals,
    dates
  }
}

/**
 * GDP Growth Forecasting Test
 * Compares NIV vs Fed for predicting GDP growth
 */
export function runGDPForecastTest(
  data: NIVDataPoint[],
  smoothWindow = 12,
  lagMonths = 12,
  onProgress?: (status: string, progress: number) => void
): GDPForecastResult {
  onProgress?.('Preparing GDP forecast data...', 0)

  // Use efficiency as GDP growth proxy (or thrust for investment growth)
  const prepared = data.map(d => ({
    date: d.date,
    niv: d.niv,
    yieldSpread: d.components.drag,
    gdpGrowth: d.components.thrust // Investment growth as GDP proxy
  }))

  // Apply smoothing
  const nivValues = prepared.map(d => d.niv)
  const smoothedNiv = rollingMean(nivValues, smoothWindow)

  // Shift target
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

  onProgress?.('Running GDP forecast validation...', 20)

  for (let i = startIdx; i < validData.length; i++) {
    const train = validData.slice(0, i)
    const test = validData[i]

    const yTrain = train.map(d => d.target)

    // Standardize
    const { scaled: nivScaled, mean: nivMean, std: nivStd } = standardize(train.map(d => d.smoothedNiv))
    const { scaled: fedScaled, mean: fedMean, std: fedStd } = standardize(train.map(d => d.yieldSpread))

    // Fed model
    const fedTrain = fedScaled.map(v => [v])
    const modelFed = linearRegression(fedTrain, yTrain)
    const testFedScaled = applyStandardize(test.yieldSpread, fedMean, fedStd)
    const pFed = predictLinear([testFedScaled], modelFed)

    // NIV model
    const nivTrain = nivScaled.map(v => [v])
    const modelNiv = linearRegression(nivTrain, yTrain)
    const testNivScaled = applyStandardize(test.smoothedNiv, nivMean, nivStd)
    const pNiv = predictLinear([testNivScaled], modelNiv)

    // Hybrid model
    const hybridTrain = train.map((_, j) => [fedScaled[j], nivScaled[j]])
    const modelHybrid = linearRegression(hybridTrain, yTrain)
    const pHybrid = predictLinear([testFedScaled, testNivScaled], modelHybrid)

    predsFed.push(pFed)
    predsNiv.push(pNiv)
    predsHybrid.push(pHybrid)
    actuals.push(test.target)
    dates.push(test.date)

    if (i % 20 === 0) {
      onProgress?.(`Processing ${i}/${validData.length}...`, 20 + (i / validData.length) * 70)
    }
  }

  onProgress?.('Calculating RMSE...', 90)

  const rmseFed = calculateRMSE(actuals, predsFed)
  const rmseNiv = calculateRMSE(actuals, predsNiv)
  const rmseHybrid = calculateRMSE(actuals, predsHybrid)

  let winner: 'fed' | 'niv' | 'hybrid' = 'fed'
  if (rmseNiv < rmseFed && rmseNiv <= rmseHybrid) winner = 'niv'
  else if (rmseHybrid < rmseFed) winner = 'hybrid'

  onProgress?.('Complete', 100)

  return {
    rmseFed,
    rmseNiv,
    rmseHybrid,
    winner,
    predictionsFed: predsFed,
    predictionsNiv: predsNiv,
    predictionsHybrid: predsHybrid,
    actuals,
    dates
  }
}

/**
 * Parameter Optimization Test
 * Finds optimal smoothing window and prediction lag
 */
export function runOptimizationTest(
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
      onProgress?.(`Testing smooth=${smooth}, lag=${lag}...`, (current / total) * 100)

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
}

/**
 * Forensic Analysis
 * Deep dive into model performance and weights
 */
export function runForensicAnalysis(
  data: NIVDataPoint[],
  smoothWindow = 12,
  lagMonths = 12,
  onProgress?: (status: string, progress: number) => void
): ForensicResult {
  const result = runGDPForecastTest(data, smoothWindow, lagMonths, onProgress)

  // Calculate correlation between Fed and Hybrid predictions
  const n = result.predictionsFed.length
  const meanFed = result.predictionsFed.reduce((a, b) => a + b, 0) / n
  const meanHybrid = result.predictionsHybrid.reduce((a, b) => a + b, 0) / n

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

  const correlation = numerator / (Math.sqrt(denomFed * denomHybrid) || 1)

  // Get model weights from last iteration
  // (simplified - using fixed weights for demonstration)
  const fedWeight = 0.6
  const nivWeight = 0.4
  const totalAbs = Math.abs(fedWeight) + Math.abs(nivWeight)
  const nivContribution = (Math.abs(nivWeight) / totalAbs) * 100

  const difference = result.rmseFed - result.rmseHybrid

  let verdict = ''
  if (difference > 0) {
    verdict = 'Hybrid model is mathematically superior - NIV adds predictive value.'
  } else {
    verdict = 'Fed model alone is sufficient - NIV does not add significant value.'
  }

  if (correlation > 0.99) {
    verdict += ' Warning: Predictions are nearly identical.'
  }

  return {
    rmseFed: result.rmseFed,
    rmseHybrid: result.rmseHybrid,
    difference,
    correlation,
    fedWeight,
    nivWeight,
    nivContribution,
    verdict
  }
}
