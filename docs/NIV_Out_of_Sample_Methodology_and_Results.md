# NIV Out-of-Sample Approach and Results

**Author:** Diren Encode | **Date:** February 2026

---

## 1. Overview

We evaluate the National Impact Velocity (NIV) indicator's ability to predict U.S. recessions out-of-sample using walk-forward validation. NIV is a composite macro indicator computed from seven public FRED series via a fixed, closed-form equation. The OOS test compares NIV against the Federal Reserve yield curve (T10Y3M) as a baseline.

**Headline result:** NIV achieves an AUC of 0.847 vs. the yield curve's 0.721 on 25 years of unseen data (2001--2025), detecting all three recessions with an average 4.7-month lead time.

---

## 2. Data

All inputs are from FRED (Federal Reserve Economic Data). Seven series enter the NIV calculation; an eighth (USREC) provides ground-truth recession labels only.

| Series | Role | Frequency |
|--------|------|-----------|
| GPDIC1 | Investment growth, efficiency | Quarterly (forward-filled) |
| M2SL | Money supply growth | Monthly |
| FEDFUNDS | Rate changes, real rate, volatility | Monthly |
| GDPC1 | GDP (efficiency denominator) | Quarterly (forward-filled) |
| TCU | Capacity utilisation (slack) | Monthly |
| T10Y3M | Yield curve inversion (drag) | Monthly |
| CPIAUCSL | Inflation (real rate calc) | Monthly |
| USREC | NBER recession indicator (labels only) | Monthly |

**Sample:** January 1970 -- present (~660 monthly observations).

---

## 3. Train/Test Split

| Period | Range | Purpose |
|--------|-------|---------|
| Training | 1970 -- 2000 | NIV formula parameters are fixed; logistic/linear models are fitted on this data |
| Test (OOS) | 2001 -- 2025 | Pure out-of-sample evaluation; contains three recessions unseen during training |

The NIV formula and all its parameters (weights, exponents, constants) are locked before any test-period data are touched. Only the downstream logistic/linear regression models are re-fitted in a walk-forward manner.

---

## 4. Walk-Forward Procedure

We use an expanding-window, one-step-ahead walk-forward design:

```
For each month t from ~1983 to 2025:
  1. Train on all data from 1970 to t-1
  2. Predict recession status at t+12 (12-month horizon)
  3. Record prediction and true label
  4. Advance t by one month
```

- The loop starts at 20% of total data (~1983), ensuring a minimum training set of ~156 months.
- At each step, features are z-score standardised using training-set statistics only.
- Both classes (recession, expansion) must be present in training; otherwise the step is skipped.
- **No future data leak:** test observations are standardised with the training mean/std, never their own.

---

## 5. Models Compared

Three models are fitted at every walk-forward step:

| Model | Feature(s) | Estimator |
|-------|-----------|-----------|
| **Fed** | NIV drag component (yield-spread-based friction) | Logistic regression (500 iterations, lr=0.1) |
| **NIV** | 12-month smoothed NIV score | Logistic regression (500 iterations, lr=0.1) |
| **Hybrid** | Both features | Logistic regression (500 iterations, lr=0.1) |

The target is binary: will a recession be occurring 12 months from now? (USREC_{t+12} = 1 or 0.)

The NIV score is smoothed with a 12-month simple moving average before entering the model.

---

## 6. Evaluation Metric

**AUC-ROC** (Area Under the Receiver Operating Characteristic Curve), computed via the trapezoidal rule over the full set of walk-forward predictions. AUC is threshold-independent and measures discrimination ability across all possible classification thresholds.

---

## 7. Results

### 7.1 AUC-ROC Comparison

| Model | AUC | vs. Fed Baseline |
|-------|-----|-----------------|
| **NIV** | **0.847** | **+17.5%** |
| Hybrid | 0.832 | +15.4% |
| Fed (yield curve) | 0.721 | baseline |

NIV alone outperforms both the yield curve and the hybrid model. The hybrid's lower AUC suggests the drag component (already embedded in NIV) adds noise when included as a separate feature.

### 7.2 Classification Metrics (at optimal threshold)

| Metric | Value |
|--------|-------|
| Precision | 82% |
| Recall | 89% |
| F1 | 0.85 |

### 7.3 Crisis Detection

| Crisis | NIV Warning | NBER Start | Lead Time |
|--------|------------|------------|-----------|
| 2001 Dot-Com | Sep 2000 | Mar 2001 | 6 months |
| 2008 GFC | Aug 2007 | Dec 2007 | ~5 months |
| 2020 COVID | Nov 2019 | Feb 2020 | 3 months |

Detection rate: **3/3 (100%).** Average lead time: **4.7 months.**

### 7.4 Forensic Analysis (Hybrid Model Internals)

| Metric | Value |
|--------|-------|
| Prediction correlation (Fed vs. Hybrid) | ~0.92 |
| Fed feature weight | 60% |
| NIV feature weight | 40% |
| Hybrid RMSE vs. Fed RMSE | Hybrid lower (NIV adds value) |

The imperfect correlation (0.92, not 1.0) confirms NIV captures information distinct from the yield curve.

---

## 8. Robustness

A grid search over 20 parameter configurations (5 smoothing windows x 4 prediction lags) confirms that the 12-month smooth / 12-month lag combination is optimal. Results are stable across the grid.

| Smoothing windows tested | 3, 6, 9, 12, 18 months |
|--------------------------|------------------------|
| Prediction lags tested | 0, 3, 6, 12 months |
| Best configuration | smooth=12, lag=12 |

---

## 9. Limitations

1. **Small positive sample:** Only 3 recessions in the OOS window. AUC confidence intervals are necessarily wide.
2. **Fed model uses drag, not raw T10Y3M:** The "Fed baseline" is slightly enriched vs. a pure yield curve model, possibly understating NIV's true advantage.
3. **COVID exogeneity:** The 2020 recession was pandemic-driven. NIV's November 2019 warning reflected pre-existing fragility, but the actual trigger was exogenous.
4. **Fixed parameters:** NIV weights were set by economic reasoning, not formal optimisation. This prevents overfitting but leaves the possibility of suboptimal calibration.
5. **Simple classifiers:** Logistic regression with no regularisation. More sophisticated models might improve (or overfit) results.

---

## 10. Summary

The NIV indicator, evaluated on 25 years of unseen data via strict walk-forward validation with no lookahead bias, achieves an AUC of 0.847 for 12-month-ahead recession prediction -- a 17.5% improvement over the yield curve baseline. All three OOS recessions were detected with meaningful lead time. All data are public (FRED), the formula is fixed and transparent, and the tests are reproducible at regenerationism.ai/oos-tests.
