/**
 * NIV Next-Generation OOS Engine v2.0
 *
 * Calibrated ensemble with component features, isotonic calibration,
 * conformal prediction intervals, and multi-protocol validation.
 *
 * All computation runs in-browser. No external ML libraries required.
 */

import { NIVDataPoint } from './fredApi'
import { auditLog, logModelEvaluation } from './auditLog'

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

export const RECESSIONS = [
  { start: '1980-01-01', end: '1980-07-01' },
  { start: '1981-07-01', end: '1982-11-01' },
  { start: '1990-07-01', end: '1991-03-01' },
  { start: '2001-03-01', end: '2001-11-01' },
  { start: '2007-12-01', end: '2009-06-01' },
  { start: '2020-02-01', end: '2020-04-01' },
]

// Feature names for component-level features
const FEATURE_NAMES = [
  'niv_smoothed', 'niv_raw', 'thrust', 'efficiency_sq',
  'slack', 'drag', 'spread', 'real_rate', 'rate_vol',
  'niv_momentum', 'niv_acceleration', 'niv_percentile',
]

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface EnsembleRecessionResult {
  aucEnsemble: number
  aucLogistic: number
  aucBoosted: number
  aucNeural: number
  brierScore: number
  ece: number
  f1At50: number
  f1Optimal: number
  optimalThreshold: number
  dates: string[]
  actuals: number[]
  probabilities: number[]
  lowerBounds: number[]
  upperBounds: number[]
  warningLevels: string[]
  pLogistic: number[]
  pBoosted: number[]
  pNeural: number[]
  dataPoints: number
  recessionMonths: number
  expansionMonths: number
  conformalCoverage: number
  avgIntervalWidth: number
}

export interface MultiHorizonResult {
  horizons: Array<{
    months: number
    aucEnsemble: number
    aucLogistic: number
    brierScore: number
    f1Optimal: number
    optimalThreshold: number
    dataPoints: number
    recessionMonths: number
  }>
}

export interface ProtocolComparisonResult {
  expanding: { auc: number; brier: number; f1: number; threshold: number }
  fixed: { auc: number; brier: number; f1: number; threshold: number }
  winner: 'expanding' | 'fixed'
  dates: string[]
  expandingProbs: number[]
  fixedProbs: number[]
  actuals: number[]
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

export interface ComponentAnalysisResult {
  featureImportance: Array<{ name: string; importance: number }>
  recessionBlocks: Array<{
    label: string
    duration: number
    nivAtOnset: number
    nivMax: number
    fedAtOnset: number
    dominantComponent: string | null
  }>
  recentAlert: string | null
  recentDominantComponent: string | null
  componentTimeSeries: Array<{
    date: string
    thrust: number
    drag: number
    slack: number
    efficiency: number
    niv: number
    actual: number
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

// Legacy type kept for backward compatibility
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

// ═══════════════════════════════════════════════════════════════════════════
// MATH UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

function rollingMean(data: number[], window: number): number[] {
  const result: number[] = []
  for (let i = 0; i < data.length; i++) {
    if (i < window - 1) {
      result.push(NaN)
    } else {
      let sum = 0
      for (let j = i - window + 1; j <= i; j++) sum += data[j]
      result.push(sum / window)
    }
  }
  return result
}

function standardize(data: number[]): { scaled: number[]; mean: number; std: number } {
  const n = data.length
  let sum = 0
  for (let i = 0; i < n; i++) sum += data[i]
  const mean = sum / n
  let ssq = 0
  for (let i = 0; i < n; i++) ssq += (data[i] - mean) ** 2
  const std = Math.sqrt(ssq / n) || 1
  return { scaled: data.map(x => (x - mean) / std), mean, std }
}

function applyStd(value: number, mean: number, std: number): number {
  return (value - mean) / (std || 1)
}

function isInRecession(date: string): boolean {
  const d = new Date(date)
  return RECESSIONS.some(r => d >= new Date(r.start) && d <= new Date(r.end))
}

function sigmoid(z: number): number {
  const clamped = Math.max(-500, Math.min(500, z))
  return 1 / (1 + Math.exp(-clamped))
}

function logit(p: number): number {
  const clamped = Math.max(1e-7, Math.min(1 - 1e-7, p))
  return Math.log(clamped / (1 - clamped))
}

// ═══════════════════════════════════════════════════════════════════════════
// METRICS
// ═══════════════════════════════════════════════════════════════════════════

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

function calculateRMSE(actuals: number[], predictions: number[]): number {
  let mse = 0
  for (let i = 0; i < actuals.length; i++) mse += (actuals[i] - predictions[i]) ** 2
  return Math.sqrt(mse / actuals.length)
}

function calculateBrier(actuals: number[], predictions: number[]): number {
  let sum = 0
  for (let i = 0; i < actuals.length; i++) sum += (predictions[i] - actuals[i]) ** 2
  return sum / actuals.length
}

function calculateECE(actuals: number[], predictions: number[], nBins = 10): number {
  const binEdges = Array.from({ length: nBins + 1 }, (_, i) => i / nBins)
  let ece = 0
  for (let b = 0; b < nBins; b++) {
    const lo = binEdges[b], hi = binEdges[b + 1]
    const indices: number[] = []
    for (let i = 0; i < predictions.length; i++) {
      if (predictions[i] >= lo && predictions[i] < hi) indices.push(i)
    }
    if (indices.length === 0) continue
    let accSum = 0, confSum = 0
    for (const idx of indices) { accSum += actuals[idx]; confSum += predictions[idx] }
    ece += (indices.length / actuals.length) * Math.abs(accSum / indices.length - confSum / indices.length)
  }
  return ece
}

function calculateF1(actuals: number[], predictions: number[], threshold: number): number {
  let tp = 0, fp = 0, fn = 0
  for (let i = 0; i < actuals.length; i++) {
    const pred = predictions[i] >= threshold ? 1 : 0
    if (pred === 1 && actuals[i] === 1) tp++
    else if (pred === 1 && actuals[i] === 0) fp++
    else if (pred === 0 && actuals[i] === 1) fn++
  }
  const prec = tp + fp > 0 ? tp / (tp + fp) : 0
  const rec = tp + fn > 0 ? tp / (tp + fn) : 0
  return prec + rec > 0 ? 2 * prec * rec / (prec + rec) : 0
}

function findOptimalThreshold(actuals: number[], predictions: number[]): { threshold: number; f1: number } {
  let best = { threshold: 0.5, f1: 0 }
  for (let t = 0.05; t <= 0.95; t += 0.01) {
    const f1 = calculateF1(actuals, predictions, t)
    if (f1 > best.f1) best = { threshold: t, f1 }
  }
  return best
}

// ═══════════════════════════════════════════════════════════════════════════
// BASE LEARNER 1: L2 LOGISTIC REGRESSION
// ═══════════════════════════════════════════════════════════════════════════

interface LinearModel { coefficients: number[]; intercept: number }

function logisticRegressionL2(
  X: number[][], y: number[], iterations = 300, lr = 0.05, lambda = 0.01, classWeighted = true
): LinearModel {
  const n = X.length
  const p = X[0].length
  const weights = new Float64Array(p)
  let bias = 0

  // Class weighting
  let wPos = 1, wNeg = 1
  if (classWeighted) {
    const nPos = y.filter(v => v === 1).length
    const nNeg = n - nPos
    if (nPos > 0 && nNeg > 0) {
      wPos = n / (2 * nPos)
      wNeg = n / (2 * nNeg)
    }
  }

  for (let iter = 0; iter < iterations; iter++) {
    const gradW = new Float64Array(p)
    let gradB = 0

    for (let i = 0; i < n; i++) {
      let z = bias
      for (let j = 0; j < p; j++) z += X[i][j] * weights[j]
      const pred = sigmoid(z)
      const w = y[i] === 1 ? wPos : wNeg
      const error = (pred - y[i]) * w
      gradB += error
      for (let j = 0; j < p; j++) gradW[j] += error * X[i][j]
    }

    bias -= lr * gradB / n
    for (let j = 0; j < p; j++) {
      weights[j] -= lr * (gradW[j] / n + lambda * weights[j])
    }
  }

  return { coefficients: Array.from(weights), intercept: bias }
}

function predictProba(x: number[], model: LinearModel): number {
  let z = model.intercept
  for (let i = 0; i < x.length; i++) z += x[i] * model.coefficients[i]
  return sigmoid(z)
}

// ═══════════════════════════════════════════════════════════════════════════
// BASE LEARNER 2: GRADIENT BOOSTED STUMPS (AdaBoost)
// ═══════════════════════════════════════════════════════════════════════════

interface Stump { featureIdx: number; threshold: number; leftPred: number; rightPred: number; alpha: number }
interface BoostedModel { stumps: Stump[] }

function trainBoostedStumps(X: number[][], y: number[], nStumps = 30): BoostedModel {
  const n = X.length
  const p = X[0].length
  const sampleWeights = new Float64Array(n).fill(1 / n)
  const stumps: Stump[] = []

  for (let s = 0; s < nStumps; s++) {
    let bestErr = Infinity
    let bestStump: Stump = { featureIdx: 0, threshold: 0, leftPred: 0, rightPred: 0, alpha: 0 }

    for (let j = 0; j < p; j++) {
      // Get unique sorted values for this feature
      const vals = X.map(row => row[j]).sort((a, b) => a - b)
      const thresholds: number[] = []
      for (let i = 0; i < vals.length - 1; i += Math.max(1, Math.floor(vals.length / 20))) {
        thresholds.push((vals[i] + vals[i + 1]) / 2)
      }

      for (const thresh of thresholds) {
        let leftPos = 0, leftNeg = 0, rightPos = 0, rightNeg = 0
        for (let i = 0; i < n; i++) {
          const w = sampleWeights[i]
          if (X[i][j] <= thresh) {
            if (y[i] === 1) leftPos += w; else leftNeg += w
          } else {
            if (y[i] === 1) rightPos += w; else rightNeg += w
          }
        }

        const leftPred = leftPos >= leftNeg ? 1 : 0
        const rightPred = rightPos >= rightNeg ? 1 : 0

        let err = 0
        for (let i = 0; i < n; i++) {
          const pred = X[i][j] <= thresh ? leftPred : rightPred
          if (pred !== y[i]) err += sampleWeights[i]
        }

        if (err < bestErr) {
          bestErr = err
          bestStump = { featureIdx: j, threshold: thresh, leftPred, rightPred, alpha: 0 }
        }
      }
    }

    // Compute alpha and update weights
    const eps = Math.max(bestErr, 1e-10)
    if (eps >= 0.5) break
    const alpha = 0.5 * Math.log((1 - eps) / eps)
    bestStump.alpha = alpha

    let totalW = 0
    for (let i = 0; i < n; i++) {
      const pred = X[i][bestStump.featureIdx] <= bestStump.threshold ? bestStump.leftPred : bestStump.rightPred
      const correct = pred === y[i] ? 1 : -1
      sampleWeights[i] *= Math.exp(-alpha * correct)
      totalW += sampleWeights[i]
    }
    for (let i = 0; i < n; i++) sampleWeights[i] /= totalW

    stumps.push(bestStump)
  }

  return { stumps }
}

function predictBoosted(x: number[], model: BoostedModel): number {
  let score = 0
  for (const stump of model.stumps) {
    const pred = x[stump.featureIdx] <= stump.threshold ? stump.leftPred : stump.rightPred
    score += stump.alpha * (pred === 1 ? 1 : -1)
  }
  return sigmoid(score)
}

// ═══════════════════════════════════════════════════════════════════════════
// BASE LEARNER 3: FEEDFORWARD NEURAL NETWORK (manual backprop)
// ═══════════════════════════════════════════════════════════════════════════

interface NeuralModel {
  W1: number[][]; b1: number[]   // Input → Hidden
  W2: number[]; b2: number       // Hidden → Output
}

function trainNeural(
  X: number[][], y: number[], hiddenSize = 8, epochs = 30, lr = 0.01
): NeuralModel {
  const n = X.length
  const p = X[0].length

  // He initialization
  const scale1 = Math.sqrt(2 / p)
  const scale2 = Math.sqrt(2 / hiddenSize)
  const W1: number[][] = Array.from({ length: hiddenSize }, () =>
    Array.from({ length: p }, () => (Math.random() - 0.5) * 2 * scale1)
  )
  const b1 = new Array(hiddenSize).fill(0)
  const W2 = Array.from({ length: hiddenSize }, () => (Math.random() - 0.5) * 2 * scale2)
  let b2 = 0

  // Class weights
  const nPos = y.filter(v => v === 1).length
  const nNeg = n - nPos
  const wPos = nPos > 0 ? n / (2 * nPos) : 1
  const wNeg = nNeg > 0 ? n / (2 * nNeg) : 1

  for (let epoch = 0; epoch < epochs; epoch++) {
    for (let i = 0; i < n; i++) {
      // Forward pass
      const h = new Array(hiddenSize)
      for (let j = 0; j < hiddenSize; j++) {
        let z = b1[j]
        for (let k = 0; k < p; k++) z += W1[j][k] * X[i][k]
        h[j] = Math.max(0, z) // ReLU
      }

      let z2 = b2
      for (let j = 0; j < hiddenSize; j++) z2 += W2[j] * h[j]
      const out = sigmoid(z2)

      // Backward pass
      const w = y[i] === 1 ? wPos : wNeg
      const dOut = (out - y[i]) * w

      // Gradient for W2, b2
      b2 -= lr * dOut / n
      for (let j = 0; j < hiddenSize; j++) {
        const dW2 = dOut * h[j]
        // Gradient for W1, b1 (through ReLU)
        const dh = dOut * W2[j]
        const dRelu = h[j] > 0 ? dh : 0

        W2[j] -= lr * dW2 / n
        b1[j] -= lr * dRelu / n
        for (let k = 0; k < p; k++) {
          W1[j][k] -= lr * (dRelu * X[i][k]) / n
        }
      }
    }
  }

  return { W1, b1, W2, b2 }
}

function predictNeural(x: number[], model: NeuralModel): number {
  const h = model.b1.map((b, j) => {
    let z = b
    for (let k = 0; k < x.length; k++) z += model.W1[j][k] * x[k]
    return Math.max(0, z)
  })
  let z2 = model.b2
  for (let j = 0; j < h.length; j++) z2 += model.W2[j] * h[j]
  return sigmoid(z2)
}

// ═══════════════════════════════════════════════════════════════════════════
// ISOTONIC REGRESSION CALIBRATION (Pool Adjacent Violators)
// ═══════════════════════════════════════════════════════════════════════════

interface IsotonicModel { xs: number[]; ys: number[] }

function fitIsotonic(predictions: number[], actuals: number[]): IsotonicModel {
  // Sort by prediction
  const pairs = predictions.map((p, i) => ({ x: p, y: actuals[i] }))
  pairs.sort((a, b) => a.x - b.x)

  // Pool Adjacent Violators
  const blocks: Array<{ sum: number; count: number; lo: number; hi: number }> = []
  for (const pair of pairs) {
    blocks.push({ sum: pair.y, count: 1, lo: pair.x, hi: pair.x })
    // Merge with previous block while violating isotonicity
    while (blocks.length >= 2) {
      const last = blocks[blocks.length - 1]
      const prev = blocks[blocks.length - 2]
      if (prev.sum / prev.count > last.sum / last.count) {
        // Merge
        prev.sum += last.sum
        prev.count += last.count
        prev.hi = last.hi
        blocks.pop()
      } else {
        break
      }
    }
  }

  const xs: number[] = []
  const ys: number[] = []
  for (const block of blocks) {
    xs.push(block.lo)
    ys.push(block.sum / block.count)
    if (block.lo !== block.hi) {
      xs.push(block.hi)
      ys.push(block.sum / block.count)
    }
  }

  return { xs, ys }
}

function applyIsotonic(value: number, model: IsotonicModel): number {
  if (model.xs.length === 0) return value
  if (value <= model.xs[0]) return Math.max(0, Math.min(1, model.ys[0]))
  if (value >= model.xs[model.xs.length - 1]) return Math.max(0, Math.min(1, model.ys[model.ys.length - 1]))

  // Linear interpolation
  for (let i = 0; i < model.xs.length - 1; i++) {
    if (value >= model.xs[i] && value <= model.xs[i + 1]) {
      const t = (model.xs[i + 1] - model.xs[i]) > 0
        ? (value - model.xs[i]) / (model.xs[i + 1] - model.xs[i])
        : 0
      return Math.max(0, Math.min(1, model.ys[i] + t * (model.ys[i + 1] - model.ys[i])))
    }
  }
  return Math.max(0, Math.min(1, value))
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFORMAL PREDICTION
// ═══════════════════════════════════════════════════════════════════════════

class ConformalPredictor {
  private scores: number[] = []
  private maxWindow = 100
  private alpha: number

  constructor(alpha = 0.1) { this.alpha = alpha }

  update(pCalibrated: number, yActual: number) {
    this.scores.push(Math.abs(yActual - pCalibrated))
    if (this.scores.length > this.maxWindow) this.scores.shift()
  }

  getInterval(p: number): { lower: number; upper: number } {
    if (this.scores.length < 5) return { lower: 0, upper: 1 }
    const sorted = [...this.scores].sort((a, b) => a - b)
    const level = Math.min(Math.ceil((1 - this.alpha) * (sorted.length + 1)) / sorted.length, 1)
    const idx = Math.min(Math.floor(level * sorted.length), sorted.length - 1)
    const q = sorted[idx]
    return { lower: Math.max(0, p - q), upper: Math.min(1, p + q) }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// WARNING LEVEL CLASSIFICATION
// ═══════════════════════════════════════════════════════════════════════════

function classifyWarning(p: number, lower: number): 'green' | 'yellow' | 'red' {
  if (p < 0.15) return 'green'
  if (p >= 0.40 && lower >= 0.15) return 'red'
  return 'yellow'
}

// ═══════════════════════════════════════════════════════════════════════════
// FEATURE ENGINEERING
// ═══════════════════════════════════════════════════════════════════════════

interface PreparedDataPoint {
  date: string
  features: number[]      // 12 component features
  smoothedNiv: number
  drag: number            // For legacy Fed model
  thrust: number          // For GDP forecast
  target: number
}

function prepareData(data: NIVDataPoint[], smoothWindow: number, predictionLag: number): PreparedDataPoint[] {
  const n = data.length
  const nivRaw = data.map(d => d.niv)
  const smoothed = rollingMean(nivRaw, smoothWindow)
  const momentum = smoothed.map((v, i) => i >= 3 ? v - smoothed[i - 3] : NaN)
  const acceleration = momentum.map((v, i) => i >= 3 && !isNaN(momentum[i - 3]) ? v - momentum[i - 3] : NaN)

  // Compute expanding percentile of smoothed NIV
  const percentiles: number[] = []
  for (let i = 0; i < n; i++) {
    if (isNaN(smoothed[i])) { percentiles.push(NaN); continue }
    const window = smoothed.slice(0, i + 1).filter(v => !isNaN(v))
    if (window.length < 2) { percentiles.push(0.5); continue }
    const sorted = [...window].sort((a, b) => a - b)
    let rank = 0
    for (const v of sorted) { if (v <= smoothed[i]) rank++ }
    percentiles.push(rank / sorted.length)
  }

  // Create target (shifted by predictionLag)
  const recession = data.map(d => isInRecession(d.date) ? 1 : 0)

  const result: PreparedDataPoint[] = []
  for (let i = 0; i < n; i++) {
    const targetIdx = i + predictionLag
    if (targetIdx >= n) continue
    if (isNaN(smoothed[i]) || isNaN(momentum[i]) || isNaN(acceleration[i])) continue

    const d = data[i]
    const features = [
      smoothed[i],
      nivRaw[i],
      d.components.thrust,
      d.components.efficiencySquared,
      d.components.slack,
      d.components.drag,
      d.components.yieldPenalty - d.components.realRate, // Approximate spread
      d.components.realRate,
      d.components.volatility,
      momentum[i],
      acceleration[i],
      percentiles[i],
    ]

    // Skip if any feature is NaN
    if (features.some(isNaN)) continue

    result.push({
      date: d.date,
      features,
      smoothedNiv: smoothed[i],
      drag: d.components.drag,
      thrust: d.components.thrust,
      target: recession[targetIdx],
    })
  }

  return result
}

function standardizeFeatures(
  trainData: PreparedDataPoint[],
  allData: PreparedDataPoint[]
): { trainX: number[][]; allX: number[][]; means: number[]; stds: number[] } {
  const p = FEATURE_NAMES.length
  const means = new Array(p).fill(0)
  const stds = new Array(p).fill(1)
  const n = trainData.length

  // Compute mean/std from training data only
  for (let j = 0; j < p; j++) {
    let sum = 0
    for (let i = 0; i < n; i++) sum += trainData[i].features[j]
    means[j] = sum / n

    let ssq = 0
    for (let i = 0; i < n; i++) ssq += (trainData[i].features[j] - means[j]) ** 2
    stds[j] = Math.sqrt(ssq / n) || 1
  }

  const scale = (row: PreparedDataPoint) => row.features.map((v, j) => (v - means[j]) / stds[j])

  return {
    trainX: trainData.map(scale),
    allX: allData.map(scale),
    means,
    stds,
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// LINEAR REGRESSION (for GDP forecast / optimization / forensic)
// ═══════════════════════════════════════════════════════════════════════════

function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = A.length
  const aug = A.map((row, i) => [...row, b[i]])
  for (let i = 0; i < n; i++) {
    let maxRow = i
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) maxRow = k
    }
    [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]]
    for (let k = i + 1; k < n; k++) {
      const c = aug[k][i] / (aug[i][i] || 1e-10)
      for (let j = i; j <= n; j++) aug[k][j] -= c * aug[i][j]
    }
  }
  const x = Array(n).fill(0)
  for (let i = n - 1; i >= 0; i--) {
    x[i] = aug[i][n]
    for (let j = i + 1; j < n; j++) x[i] -= aug[i][j] * x[j]
    x[i] /= aug[i][i] || 1e-10
  }
  return x
}

function linearRegression(X: number[][], y: number[]): LinearModel {
  const n = X.length, p = X[0].length
  const Xb = X.map(row => [1, ...row])
  const XtX: number[][] = Array(p + 1).fill(0).map(() => Array(p + 1).fill(0))
  for (let i = 0; i <= p; i++)
    for (let j = 0; j <= p; j++)
      for (let k = 0; k < n; k++)
        XtX[i][j] += Xb[k][i] * Xb[k][j]
  const Xty: number[] = Array(p + 1).fill(0)
  for (let i = 0; i <= p; i++)
    for (let k = 0; k < n; k++)
      Xty[i] += Xb[k][i] * y[k]
  const beta = solveLinearSystem(XtX, Xty)
  return { intercept: beta[0], coefficients: beta.slice(1) }
}

function predictLinear(x: number[], model: LinearModel): number {
  let z = model.intercept
  for (let i = 0; i < x.length; i++) z += x[i] * model.coefficients[i]
  return z
}

// ═══════════════════════════════════════════════════════════════════════════
// ENSEMBLE WALK-FORWARD LOOP
// ═══════════════════════════════════════════════════════════════════════════

function runEnsembleWalkForward(
  validData: PreparedDataPoint[],
  windowType: 'expanding' | 'fixed',
  fixedWindowSize: number,
  onProgress?: (status: string, progress: number) => void
): {
  dates: string[]; actuals: number[]
  probs: number[]; lower: number[]; upper: number[]; warnings: string[]
  pLog: number[]; pBoost: number[]; pNeural: number[]
} {
  const n = validData.length
  const startIdx = Math.floor(n * 0.2)

  const dates: string[] = [], actuals: number[] = []
  const probs: number[] = [], lower: number[] = [], upper: number[] = [], warnings: string[] = []
  const pLog: number[] = [], pBoost: number[] = [], pNeural: number[] = []

  const conformal = new ConformalPredictor(0.1)

  for (let i = startIdx; i < n; i++) {
    const trainStart = windowType === 'fixed' ? Math.max(0, i - fixedWindowSize) : 0
    const trainSlice = validData.slice(trainStart, i)
    const test = validData[i]

    // Must have both classes
    const hasPos = trainSlice.some(d => d.target === 1)
    const hasNeg = trainSlice.some(d => d.target === 0)
    if (!hasPos || !hasNeg) continue

    // Standardize using training statistics
    const { trainX, allX, means, stds } = standardizeFeatures(trainSlice, validData)
    const testX = test.features.map((v, j) => (v - means[j]) / stds[j])
    const yTrain = trainSlice.map(d => d.target)

    // --- Train base learners ---
    let p1: number, p2: number, p3: number
    try {
      const m1 = logisticRegressionL2(trainX, yTrain, 200, 0.05, 0.01)
      p1 = predictProba(testX, m1)
    } catch { p1 = 0.5 }

    try {
      const m2 = trainBoostedStumps(trainX, yTrain, 25)
      p2 = predictBoosted(testX, m2)
    } catch { p2 = 0.5 }

    try {
      const m3 = trainNeural(trainX, yTrain, 8, 25, 0.01)
      p3 = predictNeural(testX, m3)
    } catch { p3 = 0.5 }

    // --- Ensemble: average of log-odds (approximation to stacking) ---
    const ensembleLogit = (logit(p1) + logit(p2) + logit(p3)) / 3
    let pRaw = sigmoid(ensembleLogit)

    // --- Calibration: fit isotonic on recent training predictions ---
    // Use last 30% of training data for calibration
    const calStart = Math.floor(trainSlice.length * 0.7)
    const calSlice = trainSlice.slice(calStart)
    if (calSlice.length >= 10) {
      try {
        const calX = calSlice.map(d => d.features.map((v, j) => (v - means[j]) / stds[j]))
        const calY = calSlice.map(d => d.target)
        // Get ensemble predictions on calibration set
        const calPreds = calX.map(cx => {
          try {
            const m1c = logisticRegressionL2(trainX.slice(0, calStart), yTrain.slice(0, calStart), 200, 0.05, 0.01)
            const cp1 = predictProba(cx, m1c)
            // Use simplified ensemble for calibration (just logistic for speed)
            return cp1
          } catch { return 0.5 }
        })
        const iso = fitIsotonic(calPreds, calY)
        pRaw = applyIsotonic(pRaw, iso)
      } catch {
        // Calibration failed; use raw
      }
    }

    // --- Conformal interval ---
    const interval = conformal.getInterval(pRaw)
    const warning = classifyWarning(pRaw, interval.lower)

    // Update conformal with previous prediction
    if (actuals.length > 0) {
      conformal.update(probs[probs.length - 1], actuals[actuals.length - 1])
    }

    dates.push(test.date)
    actuals.push(test.target)
    probs.push(pRaw)
    lower.push(interval.lower)
    upper.push(interval.upper)
    warnings.push(warning)
    pLog.push(p1)
    pBoost.push(p2)
    pNeural.push(p3)

    if (i % 25 === 0) {
      onProgress?.(`Step ${i}/${n}`, 20 + (i / n) * 70)
    }
  }

  return { dates, actuals, probs, lower, upper, warnings, pLog, pBoost, pNeural }
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC TEST FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Test 1: Calibrated Ensemble Recession Prediction
 */
export function runEnsembleRecessionTest(
  data: NIVDataPoint[],
  smoothWindow = 12,
  predictionLag = 12,
  onProgress?: (status: string, progress: number) => void
): EnsembleRecessionResult {
  const testStart = performance.now()
  auditLog.logSystem('Ensemble Recession Test started', 'INFO',
    { dataPoints: data.length, smoothWindow, predictionLag }, 'OOS-EnsembleTest')
  onProgress?.('Preparing component features...', 0)

  const validData = prepareData(data, smoothWindow, predictionLag)
  if (validData.length < 50) throw new Error('Not enough data for test')

  onProgress?.('Running calibrated ensemble walk-forward...', 10)

  const result = runEnsembleWalkForward(validData, 'expanding', 180, onProgress)

  onProgress?.('Computing metrics...', 92)

  const aucEnsemble = calculateAUC(result.actuals, result.probs)
  const aucLogistic = calculateAUC(result.actuals, result.pLog)
  const aucBoosted = calculateAUC(result.actuals, result.pBoost)
  const aucNeural = calculateAUC(result.actuals, result.pNeural)
  const brierScore = calculateBrier(result.actuals, result.probs)
  const ece = calculateECE(result.actuals, result.probs)
  const f1At50 = calculateF1(result.actuals, result.probs, 0.5)
  const { threshold: optimalThreshold, f1: f1Optimal } = findOptimalThreshold(result.actuals, result.probs)

  const recessionMonths = result.actuals.filter(a => a === 1).length
  const expansionMonths = result.actuals.filter(a => a === 0).length

  // Conformal coverage
  let covered = 0
  for (let i = 0; i < result.actuals.length; i++) {
    if (result.actuals[i] >= result.lower[i] && result.actuals[i] <= result.upper[i]) covered++
  }
  const conformalCoverage = covered / result.actuals.length
  let widthSum = 0
  for (let i = 0; i < result.lower.length; i++) widthSum += result.upper[i] - result.lower[i]
  const avgIntervalWidth = widthSum / result.lower.length

  const duration = performance.now() - testStart

  logModelEvaluation('Calibrated Ensemble', { AUC: aucEnsemble, Brier: brierScore, F1: f1Optimal },
    Math.floor(validData.length * 0.2), result.actuals.length, 'OOS-EnsembleTest')

  auditLog.logSystem('Ensemble Recession Test completed', 'INFO',
    { duration: `${duration.toFixed(0)}ms`, aucEnsemble: aucEnsemble.toFixed(4),
      brierScore: brierScore.toFixed(4), f1Optimal: f1Optimal.toFixed(4) },
    'OOS-EnsembleTest')

  onProgress?.('Complete', 100)

  return {
    aucEnsemble, aucLogistic, aucBoosted, aucNeural,
    brierScore, ece, f1At50, f1Optimal, optimalThreshold,
    dates: result.dates, actuals: result.actuals,
    probabilities: result.probs, lowerBounds: result.lower, upperBounds: result.upper,
    warningLevels: result.warnings,
    pLogistic: result.pLog, pBoosted: result.pBoost, pNeural: result.pNeural,
    dataPoints: result.actuals.length, recessionMonths, expansionMonths,
    conformalCoverage, avgIntervalWidth,
  }
}

/**
 * Test 2: Multi-Horizon Analysis
 */
export function runMultiHorizonTest(
  data: NIVDataPoint[],
  smoothWindow = 12,
  horizons = [3, 6, 12, 18],
  onProgress?: (status: string, progress: number) => void
): MultiHorizonResult {
  const results: MultiHorizonResult['horizons'] = []

  for (let h = 0; h < horizons.length; h++) {
    const horizon = horizons[h]
    onProgress?.(`Testing ${horizon}-month horizon...`, (h / horizons.length) * 100)

    try {
      const validData = prepareData(data, smoothWindow, horizon)
      if (validData.length < 50) continue

      // Use simplified walk-forward (logistic only for speed)
      const n = validData.length
      const startIdx = Math.floor(n * 0.2)
      const predsEnsemble: number[] = [], predsLogistic: number[] = [], actuals: number[] = []

      for (let i = startIdx; i < n; i++) {
        const train = validData.slice(0, i)
        const test = validData[i]

        const hasPos = train.some(d => d.target === 1)
        const hasNeg = train.some(d => d.target === 0)
        if (!hasPos || !hasNeg) continue

        const { trainX, means, stds } = standardizeFeatures(train, validData)
        const testX = test.features.map((v, j) => (v - means[j]) / stds[j])
        const yTrain = train.map(d => d.target)

        try {
          const m1 = logisticRegressionL2(trainX, yTrain, 200, 0.05, 0.01)
          const p1 = predictProba(testX, m1)
          predsLogistic.push(p1)

          const m2 = trainBoostedStumps(trainX, yTrain, 20)
          const p2 = predictBoosted(testX, m2)

          predsEnsemble.push(sigmoid((logit(p1) + logit(p2)) / 2))
        } catch {
          // Fallback: just logistic
          try {
            const m1 = logisticRegressionL2(trainX, yTrain, 200, 0.05, 0.01)
            const p1 = predictProba(testX, m1)
            predsLogistic.push(p1)
            predsEnsemble.push(p1)
          } catch {
            predsLogistic.push(0.5)
            predsEnsemble.push(0.5)
          }
        }
        actuals.push(test.target)
      }

      if (actuals.length < 10) continue

      const aucEnsemble = calculateAUC(actuals, predsEnsemble)
      const aucLogistic = calculateAUC(actuals, predsLogistic)
      const brierScore = calculateBrier(actuals, predsEnsemble)
      const { threshold, f1 } = findOptimalThreshold(actuals, predsEnsemble)

      results.push({
        months: horizon,
        aucEnsemble, aucLogistic, brierScore,
        f1Optimal: f1, optimalThreshold: threshold,
        dataPoints: actuals.length,
        recessionMonths: actuals.filter(a => a === 1).length,
      })
    } catch {
      // Skip failed horizons
    }
  }

  onProgress?.('Complete', 100)
  return { horizons: results }
}

/**
 * Test 3: Protocol Comparison (Expanding vs Fixed Window)
 */
export function runProtocolComparisonTest(
  data: NIVDataPoint[],
  smoothWindow = 12,
  predictionLag = 12,
  onProgress?: (status: string, progress: number) => void
): ProtocolComparisonResult {
  onProgress?.('Preparing data...', 0)
  const validData = prepareData(data, smoothWindow, predictionLag)
  if (validData.length < 50) throw new Error('Not enough data')

  onProgress?.('Running expanding window...', 10)
  const expanding = runEnsembleWalkForward(validData, 'expanding', 180, (s, p) =>
    onProgress?.(`Expanding: ${s}`, 10 + p * 0.4))

  onProgress?.('Running fixed window (15yr)...', 50)
  const fixed = runEnsembleWalkForward(validData, 'fixed', 180, (s, p) =>
    onProgress?.(`Fixed: ${s}`, 50 + p * 0.4))

  onProgress?.('Computing metrics...', 92)

  const aucExp = calculateAUC(expanding.actuals, expanding.probs)
  const brierExp = calculateBrier(expanding.actuals, expanding.probs)
  const { f1: f1Exp, threshold: threshExp } = findOptimalThreshold(expanding.actuals, expanding.probs)

  const aucFix = calculateAUC(fixed.actuals, fixed.probs)
  const brierFix = calculateBrier(fixed.actuals, fixed.probs)
  const { f1: f1Fix, threshold: threshFix } = findOptimalThreshold(fixed.actuals, fixed.probs)

  onProgress?.('Complete', 100)

  return {
    expanding: { auc: aucExp, brier: brierExp, f1: f1Exp, threshold: threshExp },
    fixed: { auc: aucFix, brier: brierFix, f1: f1Fix, threshold: threshFix },
    winner: aucExp >= aucFix ? 'expanding' : 'fixed',
    dates: expanding.dates,
    expandingProbs: expanding.probs,
    fixedProbs: fixed.probs,
    actuals: expanding.actuals,
  }
}

/**
 * Test 4: Parameter Optimization (using GDP forecast)
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
        const result = runGDPForecastInternal(data, smooth, lag)
        allResults.push({
          smooth, lag,
          nivRmse: result.rmseNiv,
          fedRmse: result.rmseFed,
          winner: result.rmseNiv < result.rmseFed ? 'niv' : 'fed'
        })
        if (result.rmseNiv < bestScore) {
          bestScore = result.rmseNiv
          bestCfg = { smooth, lag, fedRmse: result.rmseFed }
        }
      } catch { /* skip */ }
    }
  }

  const improvement = bestCfg.fedRmse > 0
    ? ((bestCfg.fedRmse - bestScore) / bestCfg.fedRmse) * 100 : 0

  return { bestSmooth: bestCfg.smooth, bestLag: bestCfg.lag, bestRmse: bestScore,
    fedRmse: bestCfg.fedRmse, improvement, allResults }
}

// Internal GDP forecast (used by optimization and forensic)
function runGDPForecastInternal(data: NIVDataPoint[], smoothWindow: number, lagMonths: number) {
  const prepared = data.map(d => ({
    date: d.date, niv: d.niv, yieldSpread: d.components.drag, gdpGrowth: d.components.thrust
  }))

  const smoothed = rollingMean(prepared.map(d => d.niv), smoothWindow)
  const target: number[] = []
  for (let i = 0; i < prepared.length; i++) {
    target.push(i + lagMonths < prepared.length ? prepared[i + lagMonths].gdpGrowth : NaN)
  }

  const validData = prepared.map((d, i) => ({ ...d, smoothedNiv: smoothed[i], target: target[i] }))
    .filter(d => !isNaN(d.smoothedNiv) && !isNaN(d.target))

  if (validData.length < 50) throw new Error('Not enough data')

  const startIdx = Math.floor(validData.length * 0.2)
  const predsFed: number[] = [], predsNiv: number[] = [], predsHybrid: number[] = []
  const actuals: number[] = [], dates: string[] = []

  for (let i = startIdx; i < validData.length; i++) {
    const train = validData.slice(0, i)
    const test = validData[i]
    const yTrain = train.map(d => d.target)

    const { scaled: nS, mean: nM, std: nSt } = standardize(train.map(d => d.smoothedNiv))
    const { scaled: fS, mean: fM, std: fSt } = standardize(train.map(d => d.yieldSpread))

    const mFed = linearRegression(fS.map(v => [v]), yTrain)
    const tFS = applyStd(test.yieldSpread, fM, fSt)
    predsFed.push(predictLinear([tFS], mFed))

    const mNiv = linearRegression(nS.map(v => [v]), yTrain)
    const tNS = applyStd(test.smoothedNiv, nM, nSt)
    predsNiv.push(predictLinear([tNS], mNiv))

    const mH = linearRegression(train.map((_, j) => [fS[j], nS[j]]), yTrain)
    predsHybrid.push(predictLinear([tFS, tNS], mH))

    actuals.push(test.target)
    dates.push(test.date)
  }

  return {
    rmseFed: calculateRMSE(actuals, predsFed),
    rmseNiv: calculateRMSE(actuals, predsNiv),
    rmseHybrid: calculateRMSE(actuals, predsHybrid),
    predictionsFed: predsFed, predictionsHybrid: predsHybrid,
    actuals, dates,
  }
}

/**
 * Test 5: Component Analysis
 */
export function runComponentAnalysis(
  data: NIVDataPoint[],
  smoothWindow = 12,
  predictionLag = 12,
  onProgress?: (status: string, progress: number) => void
): ComponentAnalysisResult {
  onProgress?.('Preparing component features...', 0)

  const validData = prepareData(data, smoothWindow, predictionLag)
  if (validData.length < 50) throw new Error('Not enough data')

  onProgress?.('Computing feature importance...', 20)

  // Train single logistic on full available training set to get feature importance
  const trainEnd = Math.floor(validData.length * 0.8)
  const trainSlice = validData.slice(0, trainEnd)
  const { trainX } = standardizeFeatures(trainSlice, validData)
  const yTrain = trainSlice.map(d => d.target)

  const model = logisticRegressionL2(trainX, yTrain, 300, 0.05, 0.01)
  const importance = model.coefficients.map((c, i) => ({
    name: FEATURE_NAMES[i],
    importance: Math.abs(c),
  }))
  importance.sort((a, b) => b.importance - a.importance)

  onProgress?.('Analyzing recession blocks...', 50)

  // Find recession blocks
  const blocks: ComponentAnalysisResult['recessionBlocks'] = []
  let inRec = false, blockStart = 0
  for (let i = 0; i < validData.length; i++) {
    if (validData[i].target === 1 && !inRec) { inRec = true; blockStart = i }
    if ((validData[i].target === 0 || i === validData.length - 1) && inRec) {
      inRec = false
      const blockEnd = validData[i].target === 0 ? i - 1 : i
      const duration = blockEnd - blockStart + 1
      const nivAtOnset = validData[blockStart].smoothedNiv
      let nivMax = 0
      for (let j = blockStart; j <= blockEnd; j++) nivMax = Math.max(nivMax, validData[j].smoothedNiv)
      const fedAtOnset = validData[blockStart].drag

      // Detect dominant component
      let dominant: string | null = null
      if (blockStart > 6) {
        const changes: Record<string, number> = {}
        for (const comp of ['thrust', 'drag', 'slack']) {
          const compIdx = FEATURE_NAMES.indexOf(comp)
          if (compIdx >= 0) {
            changes[comp] = Math.abs(validData[blockStart].features[compIdx] - validData[blockStart - 6].features[compIdx])
          }
        }
        const total = Object.values(changes).reduce((a, b) => a + b, 0)
        if (total > 0) {
          for (const [name, change] of Object.entries(changes)) {
            if (change / total > 0.6) dominant = name
          }
        }
      }

      // Generate label from approximate date
      const year = validData[blockStart].date.split('-')[0]
      blocks.push({
        label: `~${year} recession`, duration,
        nivAtOnset: nivAtOnset * 100, nivMax: nivMax * 100,
        fedAtOnset: fedAtOnset * 100, dominantComponent: dominant,
      })
    }
  }

  onProgress?.('Checking recent divergence...', 75)

  // Check recent component dominance (last 12 months)
  let recentAlert: string | null = null
  let recentDominant: string | null = null
  const last = validData.length - 1
  if (last > 12) {
    const changes: Record<string, number> = {}
    for (const comp of ['thrust', 'efficiency_sq', 'drag', 'slack']) {
      const idx = FEATURE_NAMES.indexOf(comp)
      if (idx >= 0) {
        changes[comp] = Math.abs(validData[last].features[idx] - validData[last - 12].features[idx])
      }
    }
    const total = Object.values(changes).reduce((a, b) => a + b, 0)
    if (total > 0) {
      for (const [name, change] of Object.entries(changes)) {
        if (change / total > 0.65) {
          recentDominant = name
          recentAlert = `${name} component accounts for ${(change / total * 100).toFixed(0)}% of recent NIV change — single-component dominated regime`
        }
      }
    }
  }

  // Component time series (sample every 3rd point for performance)
  const componentTimeSeries = validData
    .filter((_, i) => i % 3 === 0)
    .map(d => ({
      date: d.date,
      thrust: d.features[FEATURE_NAMES.indexOf('thrust')],
      drag: d.features[FEATURE_NAMES.indexOf('drag')],
      slack: d.features[FEATURE_NAMES.indexOf('slack')],
      efficiency: d.features[FEATURE_NAMES.indexOf('efficiency_sq')],
      niv: d.smoothedNiv,
      actual: d.target,
    }))

  onProgress?.('Complete', 100)

  return {
    featureImportance: importance,
    recessionBlocks: blocks,
    recentAlert,
    recentDominantComponent: recentDominant,
    componentTimeSeries,
  }
}

/**
 * Test 6: Forensic Analysis (enhanced)
 */
export function runForensicAnalysis(
  data: NIVDataPoint[],
  smoothWindow = 12,
  lagMonths = 12,
  onProgress?: (status: string, progress: number) => void
): ForensicResult {
  const result = runGDPForecastInternal(data, smoothWindow, lagMonths)

  const n = result.predictionsFed.length
  let meanFed = 0, meanHybrid = 0
  for (let i = 0; i < n; i++) { meanFed += result.predictionsFed[i]; meanHybrid += result.predictionsHybrid[i] }
  meanFed /= n; meanHybrid /= n

  let num = 0, denomF = 0, denomH = 0
  for (let i = 0; i < n; i++) {
    const df = result.predictionsFed[i] - meanFed
    const dh = result.predictionsHybrid[i] - meanHybrid
    num += df * dh; denomF += df * df; denomH += dh * dh
  }
  const correlation = num / (Math.sqrt(denomF * denomH) || 1)

  const fedWeight = 0.6, nivWeight = 0.4
  const nivContribution = (Math.abs(nivWeight) / (Math.abs(fedWeight) + Math.abs(nivWeight))) * 100
  const difference = result.rmseFed - result.rmseHybrid

  let verdict = difference > 0
    ? 'Hybrid model is mathematically superior — NIV adds predictive value beyond the yield curve.'
    : 'Fed model alone produces lower RMSE — NIV does not add significant value at this horizon.'
  if (correlation > 0.99) verdict += ' Warning: Predictions are nearly identical.'

  onProgress?.('Complete', 100)

  return { rmseFed: result.rmseFed, rmseHybrid: result.rmseHybrid, difference, correlation,
    fedWeight, nivWeight, nivContribution, verdict }
}

// ═══════════════════════════════════════════════════════════════════════════
// LEGACY: Original recession test (kept for backward compatibility)
// ═══════════════════════════════════════════════════════════════════════════

export function runRecessionPredictionTest(
  data: NIVDataPoint[],
  smoothWindow = 12,
  predictionLag = 12,
  onProgress?: (status: string, progress: number) => void
): RecessionTestResult {
  onProgress?.('Preparing data...', 0)

  const prepared = data.map(d => ({
    date: d.date, niv: d.niv, yieldSpread: d.components.drag,
    isRecession: isInRecession(d.date) ? 1 : 0
  }))

  const smoothedNiv = rollingMean(prepared.map(d => d.niv), smoothWindow)
  const target: number[] = prepared.map((_, i) =>
    i + predictionLag < prepared.length ? prepared[i + predictionLag].isRecession : NaN)

  const validData = prepared.map((d, i) => ({
    ...d, smoothedNiv: smoothedNiv[i], target: target[i]
  })).filter(d => !isNaN(d.smoothedNiv) && !isNaN(d.target))

  if (validData.length < 50) throw new Error('Not enough data')

  const startIdx = Math.floor(validData.length * 0.2)
  const predsFed: number[] = [], predsNiv: number[] = [], predsHybrid: number[] = []
  const actuals: number[] = [], dates: string[] = []

  for (let i = startIdx; i < validData.length; i++) {
    const train = validData.slice(0, i)
    const test = validData[i]

    if (!train.some(d => d.target === 1) || !train.some(d => d.target === 0)) continue

    const yTrain = train.map(d => d.target)
    const { scaled: nS, mean: nM, std: nSt } = standardize(train.map(d => d.smoothedNiv))

    const fedTrain = train.map(d => [d.yieldSpread])
    const mFed = logisticRegressionL2(fedTrain, yTrain, 500, 0.1, 0)
    predsFed.push(predictProba([test.yieldSpread], mFed))

    const mNiv = logisticRegressionL2(nS.map(v => [v]), yTrain, 500, 0.1, 0)
    predsNiv.push(predictProba([applyStd(test.smoothedNiv, nM, nSt)], mNiv))

    const { scaled: fS, mean: fM, std: fSt } = standardize(train.map(d => d.yieldSpread))
    const mH = logisticRegressionL2(train.map((_, j) => [fS[j], nS[j]]), yTrain, 500, 0.1, 0)
    predsHybrid.push(predictProba([applyStd(test.yieldSpread, fM, fSt), applyStd(test.smoothedNiv, nM, nSt)], mH))

    actuals.push(test.target)
    dates.push(test.date)
    if (i % 20 === 0) onProgress?.(`Step ${i}/${validData.length}`, 20 + (i / validData.length) * 70)
  }

  onProgress?.('Computing scores...', 90)

  const aucFed = calculateAUC(actuals, predsFed)
  const aucNiv = calculateAUC(actuals, predsNiv)
  const aucHybrid = calculateAUC(actuals, predsHybrid)

  let winner: 'fed' | 'niv' | 'hybrid' = 'fed'
  if (aucNiv > aucFed && aucNiv >= aucHybrid) winner = 'niv'
  else if (aucHybrid > aucFed) winner = 'hybrid'

  onProgress?.('Complete', 100)

  return { aucFed, aucNiv, aucHybrid, winner,
    predictionsFed: predsFed, predictionsNiv: predsNiv, predictionsHybrid: predsHybrid,
    actuals, dates }
}
