# NIV Out-of-Sample Approach and Results

**Author:** Diren Encode | **Date:** February 2026

---

## 1. Overview

We evaluate the National Impact Velocity (NIV) indicator's ability to predict U.S. recessions out-of-sample using walk-forward validation. NIV is a composite macro indicator computed from seven public FRED series via a fixed, closed-form equation. The OOS test compares NIV against a Fed drag-based model (yield-spread-derived friction) as a baseline.

**Headline result (from live FRED data):**

| Model | AUC-ROC |
|-------|---------|
| Hybrid (Fed + NIV) | **0.729** |
| NIV | 0.718 |
| Fed (drag component) | 0.468 |

NIV and the Hybrid model substantially outperform the Fed drag baseline. The Fed drag model alone scores below 0.5, indicating its monotonically declining predictions lack discriminatory power. The Hybrid model achieves the highest AUC at 0.729.

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
- The walk-forward window produces **509 monthly predictions** containing **40 recession-labelled months** across 4 recession blocks (the 1990--91 recession falls within the walk-forward window but before the OOS cutoff; the 2001, 2007--09, and 2020 recessions are fully OOS).

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
| **Hybrid** | **0.729** | **+55.7%** |
| NIV | 0.718 | +53.3% |
| Fed (drag) | 0.468 | baseline |

The Fed drag model scores below 0.5 (worse than a random classifier). This is because its predicted probabilities decline monotonically from ~19% to ~10% across the sample and barely respond to actual recession events. NIV and the Hybrid model both produce meaningful variation in predicted probabilities that correlates with recessions.

### 7.2 Recession Block Performance

The walk-forward window contains four recession blocks (target = 1 means a recession will occur 12 months hence). The first block (1990--91) falls within the training era; the remaining three are fully out-of-sample.

| Block | Recession | Duration | NIV at onset | NIV max | Fed at onset | Fed max | NIV > Fed? |
|-------|-----------|----------|-------------|---------|-------------|---------|------------|
| 1 | 1990--91 (in-training) | 9 months | 30.0% | 33.8% | 11.4% | 14.6% | Yes |
| 2 | 2001 Dot-Com (OOS) | 9 months | 0.5% | 6.2% | 9.8% | 11.9% | **No** |
| 3 | 2007--09 GFC (OOS) | 19 months | 23.4% | 23.4% | 10.1% | 13.7% | Yes |
| 4 | 2020 COVID (OOS) | 3 months | 11.3% | 12.0% | 10.9% | 11.2% | Marginal |

**Key observations:**

- **Block 1 (1990--91):** Strong NIV signal, building from 13% six months before onset to 30% at start. Clear separation from Fed.
- **Block 2 (2001):** NIV fails to detect. Probabilities remain below 6.2% throughout the recession window, while the Fed model sits at ~10--12%. This is NIV's weakest episode.
- **Block 3 (2007--09):** NIV provides a meaningful signal, building to 25% in the months prior. Peak of 23.4% at onset, well above the Fed's 10%.
- **Block 4 (2020):** NIV and Fed produce near-identical probabilities (~11--12%). NIV offers no advantage.

### 7.3 Classification at Fixed Thresholds

| Threshold | Model | TP | FP | FN | TN | Precision | Recall | F1 |
|-----------|-------|----|----|----|----|-----------|--------|-----|
| 50% | NIV | 0 | 12 | 40 | 457 | 0.00 | 0.00 | 0.00 |
| 50% | Fed | 0 | 0 | 40 | 469 | 0.00 | 0.00 | 0.00 |
| 50% | Hybrid | 0 | 11 | 40 | 458 | 0.00 | 0.00 | 0.00 |
| 10% | NIV | 26 | 117 | 14 | 352 | 0.18 | 0.65 | 0.28 |
| 10% | Fed | 39 | 464 | 1 | 5 | 0.08 | 0.97 | 0.14 |
| 10% | Hybrid | 20 | 88 | 20 | 381 | 0.19 | 0.50 | 0.27 |

At the conventional 50% threshold, **no model detects any recession**. NIV probabilities never exceed 34% during actual recession windows. The 50% threshold only fires during a late-sample false-positive spike (see Section 7.4).

At a 10% threshold, NIV captures 65% of recessions (26/40 months) with 18% precision. The Fed model captures 97% but with only 8% precision (nearly all observations exceed 10%).

**Optimal threshold (maximising F1):** NIV at 14% yields F1 = 0.31 (precision 22%, recall 50%).

### 7.4 False-Positive Spike

The final ~20 observations in the sample show NIV probabilities surging to a peak of **82.3%** with no corresponding recession. This is the largest false positive in the dataset and significantly degrades NIV's precision at any threshold above ~25%. The cause appears to be extreme values in the NIV components during recent economic conditions.

---

## 8. GDP Forecast Test and Forensic Analysis

### 8.1 Parameter Optimisation (Grid Search)

A grid search over 20 configurations evaluates RMSE for 12-month-ahead GDP (investment growth) forecasting:

| Smoothing | Lag=0 | Lag=3 | Lag=6 | Lag=12 |
|-----------|-------|-------|-------|--------|
| 3 mo | **NIV** (0.152 vs 0.166) | **NIV** (0.155 vs 0.156) | Fed (0.158 vs 0.155) | Fed (0.150 vs 0.147) |
| 6 mo | **NIV** (0.151 vs 0.164) | Fed (0.156 vs 0.156) | Fed (0.152 vs 0.148) | Fed (0.151 vs 0.147) |
| 9 mo | **NIV** (0.153 vs 0.162) | **NIV** (0.151 vs 0.153) | Fed (0.151 vs 0.148) | Fed (0.152 vs 0.146) |
| 12 mo | **NIV** (0.149 vs 0.153) | **NIV** (0.151 vs 0.152) | Fed (0.151 vs 0.148) | Fed (0.152 vs 0.146) |
| 18 mo | **NIV** (0.150 vs 0.152) | **NIV** (0.151 vs 0.152) | Fed (0.151 vs 0.148) | Fed (0.150 vs 0.145) |

**NIV wins 9/20 configurations; Fed wins 11/20.** NIV outperforms at shorter lags (0--3 months); the Fed model is better at longer lags (6--12 months). Best overall NIV RMSE: 0.1489 (smooth=12, lag=0).

### 8.2 Forensic Analysis (smooth=12, lag=12)

| Metric | Value |
|--------|-------|
| Fed RMSE | **0.1464** |
| Hybrid RMSE | 0.1488 |
| RMSE difference | **-0.0024** (Fed is better) |
| Prediction correlation (Fed vs. Hybrid) | 0.763 |
| Fed feature weight | 0.6 (60%) |
| NIV feature weight | 0.4 (40%) |

At the 12-month lag, the Fed model produces a **lower RMSE** than the Hybrid, meaning NIV does not add value for GDP forecasting at this horizon. The moderate correlation (0.763) indicates the two models capture partially distinct signals, but the NIV signal introduces noise at this specific configuration.

---

## 9. Limitations

1. **Low predicted probabilities:** NIV never exceeds 34% during actual recessions. At conventional thresholds (50%), the model detects zero recessions. The probability scale requires recalibration or threshold adjustment for practical use.
2. **2001 recession missed:** NIV probabilities remain below 6.2% during the 2001 Dot-Com recession window, well below the Fed model's ~10--12%. This is a clear failure.
3. **Large false positive:** NIV spikes to 82% in the most recent period with no recession, severely damaging precision.
4. **Fed baseline below 0.5 AUC:** The Fed drag model is a weak baseline (AUC 0.468). NIV's relative improvement is inflated by this poor benchmark. A raw T10Y3M spread or a more standard probit model would provide a stronger comparison.
5. **GDP forecasting mixed:** NIV outperforms at short lags but underperforms at longer lags. The forensic analysis at smooth=12/lag=12 shows the Fed model is actually better (lower RMSE by 0.0024).
6. **Small positive sample:** Only 40 recession months across 509 observations (7.9% base rate). Confidence intervals on all metrics are wide.
7. **COVID exogeneity:** The 2020 recession was pandemic-driven. NIV's 11--12% probability at onset offers no meaningful advance warning.

---

## 10. Summary

The NIV indicator, evaluated via walk-forward validation on 509 monthly observations with live FRED data, achieves an AUC of 0.718 for 12-month-ahead recession prediction. The Hybrid model (NIV + Fed drag) achieves 0.729. Both substantially outperform the Fed drag baseline (0.468), though this baseline is weak.

NIV's strength is its ability to produce elevated probabilities ahead of the 2007--09 GFC (23--25% range) and the 1990--91 recession (30--34% range). Its weaknesses include a failure to detect the 2001 recession, a large false-positive spike in the most recent data, and predicted probabilities that never reach conventional decision thresholds during actual recessions.

On GDP forecasting, results are mixed: NIV outperforms at short lags (0--3 months) but underperforms the Fed model at longer lags (6--12 months).

All data are public (FRED), the formula is fixed and transparent, and the tests are reproducible at regenerationism.ai/oos-tests.
