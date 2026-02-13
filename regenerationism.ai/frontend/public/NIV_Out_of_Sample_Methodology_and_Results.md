# NIV Out-of-Sample Validation: Methodology and Results

**Author:** Diren Encode | **Date:** February 2026 | **Version:** 2.0

---

## 1. Overview

We evaluate the National Impact Velocity (NIV) indicator's ability to predict U.S. recessions out-of-sample using a next-generation validation framework. The system employs a **calibrated ensemble** of three base learners, **conformal prediction intervals**, and **six complementary test protocols** — all running in-browser with no external ML libraries.

### Framework Architecture

| Component | Implementation |
|-----------|---------------|
| **Base Learner 1** | L2-regularized logistic regression (class-weighted, λ=0.01) |
| **Base Learner 2** | Gradient boosted decision stumps (AdaBoost, 15 rounds) |
| **Base Learner 3** | Feedforward neural network (12→8→1, ReLU, manual backprop) |
| **Ensemble** | Log-odds averaging (approximation to stacking) |
| **Calibration** | Isotonic regression (Pool Adjacent Violators Algorithm) |
| **Uncertainty** | Adaptive conformal prediction (90% target coverage) |
| **Features** | 12 component-level features extracted from NIV sub-components |
| **Validation** | Walk-forward expanding window, retrain every 5 steps |

---

## 2. Data

All inputs are from FRED (Federal Reserve Economic Data). Seven series enter the NIV calculation; NBER recession dates provide ground-truth labels.

| Series | Role | Frequency |
|--------|------|-----------|
| GPDIC1 | Investment growth, efficiency | Quarterly (forward-filled) |
| M2SL | Money supply growth | Monthly |
| FEDFUNDS | Rate changes, real rate, volatility | Monthly |
| GDPC1 | GDP (efficiency denominator) | Quarterly (forward-filled) |
| TCU | Capacity utilisation (slack) | Monthly |
| T10Y3M | Yield curve inversion (drag) | Monthly |
| CPIAUCSL | Inflation (real rate calc) | Monthly |

**Sample:** January 1970 – present (~660 monthly observations).

**NBER Recession Periods Used:**
- 1980-01 → 1980-07
- 1981-07 → 1982-11
- 1990-07 → 1991-03
- 2001-03 → 2001-11
- 2007-12 → 2009-06
- 2020-02 → 2020-04

---

## 3. Feature Engineering

The ensemble uses 12 component-level features extracted from each NIV data point, rather than a single aggregate NIV score:

| Feature | Source | Description |
|---------|--------|-------------|
| `niv_smoothed` | NIV | 12-month simple moving average of NIV |
| `niv_raw` | NIV | Unsmoothed NIV score |
| `thrust` | `components.thrust` | Economic momentum (tanh of GDP/investment/rate changes) |
| `efficiency_sq` | `components.efficiencySquared` | Investment efficiency squared (P²) |
| `slack` | `components.slack` | Capacity utilisation gap (1 - TCU/100) |
| `drag` | `components.drag` | Yield curve friction |
| `spread` | Derived | Yield penalty minus real rate |
| `real_rate` | `components.realRate` | Real interest rate (Fed funds - inflation) |
| `rate_vol` | `components.volatility` | Fed funds rate volatility |
| `niv_momentum` | Derived | 3-month change in smoothed NIV |
| `niv_acceleration` | Derived | 3-month change in momentum |
| `niv_percentile` | Derived | Expanding-window percentile rank of smoothed NIV |

All features are z-score standardised at each walk-forward step using training-set statistics only (no future data leak).

---

## 4. Walk-Forward Procedure

We use an expanding-window walk-forward design with model caching for performance:

```
For each month t from ~1983 to present:
  1. If first step OR step % 5 == 0:
     a. Train all 3 base learners on data [1970, t-1]
     b. Fit isotonic calibration on holdout portion
     c. Cache models and standardisation parameters
  2. Else: reuse cached models
  3. Predict recession probability at t+12
  4. Apply isotonic calibration
  5. Compute conformal prediction interval
  6. Classify warning level (green/yellow/red)
  7. Record prediction, bounds, and true label
  8. Advance t by one month
```

**Key properties:**
- The loop starts at 20% of total data (~1983), ensuring ~156 months minimum training
- Models are retrained every 5 steps (cached between retrains for performance)
- Both classes (recession, expansion) must be present in training
- Features standardised with training mean/std only — no future leak
- Async execution with main-thread yielding every 10 steps to prevent browser freezing

---

## 5. Six Test Protocols

### Test 1: Calibrated Ensemble Recession Prediction

The primary test. Runs the full 3-learner ensemble with isotonic calibration and conformal intervals using expanding-window walk-forward at a 12-month prediction horizon.

**Metrics reported:** AUC-ROC (ensemble and per-learner), Brier score, Expected Calibration Error (ECE), F1 at 50% threshold, F1 at optimal threshold, conformal coverage, average interval width.

**Outputs:** Time series of ensemble probability with 90% conformal bands, warning level timeline (green/yellow/red classification).

### Test 2: Multi-Horizon Analysis

Runs a simplified ensemble (logistic + boosted stumps, no neural net) at four prediction horizons: 3, 6, 12, and 18 months. This reveals the optimal warning lead time.

**Metrics reported:** AUC, Brier score, optimal F1 and threshold per horizon.

### Test 3: Protocol Comparison (Expanding vs Fixed Window)

Runs the full ensemble twice: once with an expanding window (all data from 1970) and once with a fixed 15-year rolling window. Tests whether recent data is more relevant than full history.

**Metrics reported:** AUC, Brier, F1, and optimal threshold for each protocol. Side-by-side probability chart.

### Test 4: Parameter Optimisation (Grid Search)

Grid search over smoothing windows (3, 6, 9, 12, 18 months) and lag periods (0, 3, 6, 12 months) using walk-forward linear regression for GDP forecasting. Evaluates NIV vs. Fed yield spread across 20 configurations.

**Metrics reported:** RMSE per configuration, NIV vs Fed winner counts, best configuration.

### Test 5: Component Analysis

Trains a single L2 logistic regression on 80% of data to extract feature importance (absolute coefficient magnitudes). Analyses each recession block for NIV signal at onset, peak, and dominant component. Detects single-component-dominated regimes in recent data.

**Outputs:** Feature importance ranking, recession block table, component decomposition time series, recent divergence alerts.

### Test 6: Forensic Analysis

Runs GDP forecast test (walk-forward linear regression) and decomposes: RMSE comparison (Fed vs Hybrid), prediction correlation (clone factor), model weight attribution, and verdict.

**Metrics reported:** Fed RMSE, Hybrid RMSE, difference, correlation, weight attribution, verdict.

---

## 6. Warning Level Classification

The ensemble output is classified into three warning levels:

| Level | Criteria | Interpretation |
|-------|----------|---------------|
| **Green** | P(recession) < 15% | Normal expansion conditions |
| **Yellow** | 15% ≤ P < 40%, or CI lower bound < 15% | Elevated risk, monitor closely |
| **Red** | P ≥ 40% AND CI lower bound ≥ 15% | High confidence recession signal |

The red level requires both high probability AND a conformal lower bound above 15%, reducing false alarms from noisy spikes.

---

## 7. Performance Optimisations

The tests run entirely in-browser on the main thread. To prevent "page not responding" warnings:

1. **Model caching:** Base learners retrained every 5 walk-forward steps instead of every step (5× reduction in training calls)
2. **Reduced hyperparameters:** Logistic regression 100 iterations (vs 500 in legacy), neural net 10 epochs, boosted stumps 15 rounds
3. **Async yielding:** Walk-forward loop yields to the browser event loop every 10 steps via `setTimeout(0)`
4. **Multi-horizon speedup:** Uses 2 learners (logistic + boosted) instead of 3, retrained every 5 steps

Typical run times: ensemble test ~10-20s, multi-horizon ~15-30s, protocol comparison ~20-40s.

---

## 8. Known Limitations

1. **Low predicted probabilities:** NIV probabilities during actual recessions typically peak at 20-35%, well below a 50% threshold. The warning level system addresses this with lower thresholds.
2. **2001 recession weakness:** The 2001 Dot-Com recession is historically difficult for NIV because the downturn was investment-led rather than credit/monetary-driven, and 12-month smoothing masks the signal.
3. **False positive sensitivity:** Extreme values in NIV components (particularly drag) can produce elevated probabilities during non-recession periods.
4. **Small positive sample:** Only ~40 recession months across ~500 OOS observations (7.9% base rate). All metrics have wide confidence intervals.
5. **Model caching trade-off:** Retraining every 5 steps instead of every step slightly reduces theoretical accuracy for a 5× speed improvement.
6. **Browser computation limits:** No GPU acceleration. Neural network and boosted stumps are implemented in pure TypeScript.
7. **COVID exogeneity:** The 2020 recession was pandemic-driven. No economic indicator can predict exogenous shocks.

---

## 9. Reproducibility

All tests are fully reproducible:

- **Data:** Public FRED series, fetched live via API
- **Formula:** NIV equation is fixed with transparent, published parameters
- **Code:** Complete source in `frontend/lib/oosTests.ts` (TypeScript, no external ML libraries)
- **Interactive:** Run tests at [regenerationism.ai/oos-tests](https://regenerationism.ai/oos-tests)
- **Export:** CSV export available for all 6 test types
- **Documents:** Methodology framework available for download from the OOS tests page

---

## 10. Summary

The NIV Next-Gen OOS framework replaces the previous single-model approach with a calibrated 3-learner ensemble evaluated across 6 complementary protocols. The system provides:

- **Discrimination:** AUC-ROC from walk-forward ensemble with conformal uncertainty bounds
- **Calibration:** Isotonic regression addresses the probability scale issue (raw probabilities too low)
- **Multi-scale analysis:** 3, 6, 12, and 18-month horizons reveal optimal prediction lead time
- **Robustness:** Expanding vs fixed window comparison tests protocol sensitivity
- **Interpretability:** Component analysis reveals which NIV sub-components drive predictions
- **Transparency:** All computation in-browser, full CSV export, downloadable methodology

Results are computed live from FRED data and will vary as new data becomes available. The system is designed for honest evaluation — no hardcoded results, no cherry-picked thresholds, no fabricated metrics.
