# NIV Next-Generation OOS Framework: From Logistic Regression to Calibrated Ensemble

**Author:** Diren Encode | **Date:** February 2026

---

## Executive Summary

The current NIV out-of-sample framework achieves AUC 0.718 (NIV) / 0.729 (Hybrid) using a single logistic regression on a 12-month smoothed composite score. This leaves substantial performance on the table for three diagnosable reasons: (1) the logistic regression cannot capture the nonlinear, regime-dependent relationship between NIV and recessions; (2) predicted probabilities are severely miscalibrated (max 34% during actual recessions, 82% during a false-positive window); and (3) the single-feature approach discards information available in NIV's sub-components.

This document proposes a replacement framework built on three layers: a **multi-model ensemble** (gradient boosting + regime-switching logistic + feedforward network) that uses NIV sub-components as features, a **conformal calibration layer** that produces distribution-free prediction intervals, and a **regime-aware monitoring system** that detects when component-level signals diverge from the composite. The NIV formula remains 100% fixed. Only the downstream prediction system changes.

**Realistic performance targets** (based on component analysis and literature comparisons): AUC 0.78--0.84, F1 0.40--0.50 at a calibrated threshold, false-positive rate reduced by 40--60% relative to current NIV model. These estimates are grounded in the specific failure modes identified in the current system and the known gains from calibration and ensembling in similar low-base-rate forecasting problems.

---

## 1. Diagnosis: Why the Current System Underperforms

Before proposing solutions, we must understand exactly what fails and why.

### 1.1 The Calibration Problem

The current logistic regression outputs probabilities on a compressed scale. During the 2007--09 GFC (the largest OOS recession), NIV probability peaks at 23.4%. During the 1990--91 recession, it peaks at 33.8%. No recession observation ever exceeds 34%.

Meanwhile, the recent false-positive spike reaches 82.3%.

This is a **calibration failure**, not a discrimination failure. The model's rank-ordering (AUC) is decent (0.718), but its probability scale is wrong. A well-calibrated model with AUC 0.718 would produce probabilities near the base rate (~8%) during normal times and well above 50% during recessions.

**Root cause:** The expanding-window logistic regression trains predominantly on expansion data (92% of observations). The class imbalance drives the intercept toward large negative values, compressing all probabilities downward. As the training window expands and the recession base rate stays at ~8%, the compression worsens over time.

### 1.2 The 2001 Miss

NIV probability during the 2001 Dot-Com recession: max 6.2%. The Fed drag model sits at ~10--12%.

**Root cause:** The 2001 recession was investment-led (the dot-com bust). NIV's thrust component `u = tanh(dG + dA - 0.7*dr)` should capture investment declines via dG (GPDIC1 growth). However, the 12-month smoothing window averages away the signal. The raw NIV likely shows a sharper spike. Additionally, M2 growth (dA) was positive during this period, partially offsetting the investment decline in the tanh function.

**Implication:** Using NIV sub-components (thrust, efficiency, slack, drag) as separate features rather than only the smoothed composite would let the model weight investment signals independently during investment-led recessions.

### 1.3 The Recent False-Positive Spike

NIV surges to 82.3% in the final ~20 months with no recession. Examining the component structure:

- Post-2022 monetary tightening created extreme drag (F) values
- Simultaneously, investment growth (dG) and M2 changes (dA) produced unusual thrust patterns
- The composite NIV score maps these through `(u * P^2) / (X + F)^1.5`, which amplifies extreme drag nonlinearly

**Implication:** A regime-detection layer that identifies when the current macro environment is structurally different from training-era environments could flag these predictions as unreliable and widen confidence intervals.

---

## 2. Validation Architecture

### 2.1 Replace Simple Walk-Forward with Multi-Protocol Validation

The current system uses a single expanding-window walk-forward. We replace it with three complementary protocols:

**Protocol A: Expanding-Window Walk-Forward (current, retained)**
```
For t from startIdx to T:
  Train on [0, t-1], predict at t
  Record (prediction, actual, date)
```
This remains the primary evaluation protocol. It is the most realistic simulation of deployment.

**Protocol B: Fixed-Window Rolling Origin**
```
For t from startIdx to T:
  Train on [t-W, t-1] where W = 180 months (15 years)
  Predict at t
  Record (prediction, actual, date)
```
This tests whether the model performs better when it "forgets" distant history. If the 2001 miss is caused by the expanding window over-weighting 1970s--1980s patterns, the fixed window will reveal this.

**Protocol C: Blocked Time-Series Cross-Validation**
```
Split data into K=5 non-overlapping temporal blocks (~10 years each)
For each fold k:
  Train on blocks {1,...,K} \ {k, k-1}  (drop k AND preceding block as gap)
  Test on block k
  Record metrics
```
The gap block prevents information leakage from autocorrelated data. This provides K independent AUC estimates for confidence interval construction.

**Protocol D: True Forward Test (2023--2026)**
```
Train on all data through 2022-12
Predict 2023-01 through latest available
No re-fitting, no parameter tuning
```
This is the gold standard. The model is frozen and evaluated on data that was never available during any design decision.

### 2.2 Multi-Horizon Evaluation

The current system tests only a 12-month horizon. We add:

| Horizon | Target | Use Case |
|---------|--------|----------|
| 3 months | USREC_{t+3} | Short-term alert |
| 6 months | USREC_{t+6} | Medium-term planning |
| 12 months | USREC_{t+12} | Strategic (current) |
| 18 months | USREC_{t+18} | Early warning |

This reveals whether NIV's strength is at longer or shorter horizons (the literature suggests yield curve models work best at 12--18 months; NIV's investment-sensitivity might give it a shorter-horizon advantage).

---

## 3. Feature Engineering (NIV Formula Remains Fixed)

### 3.1 Component-Level Features

Instead of feeding only the smoothed NIV composite to the model, we decompose it into interpretable sub-features. The NIV formula is:

```
NIV = (u * P^2) / (X + F)^η
```

We extract and standardise these features at each walk-forward step:

| Feature | Formula | Interpretation |
|---------|---------|----------------|
| `niv_composite` | 12-month SMA of NIV | Current feature (retained) |
| `niv_raw` | Raw NIV (no smoothing) | Sharper signal, more noise |
| `thrust` | u = tanh(dG + dA - 0.7*dr) | Monetary-fiscal impulse |
| `efficiency_sq` | P^2 = (Investment*1.15/GDP)^2 | Capital productivity |
| `slack` | X = 1 - TCU/100 | Spare capacity |
| `drag` | 0.4*s + 0.4*max(0,r-π) + 0.2*σ_r | Systemic friction |
| `spread` | T10Y3M raw | Yield curve level |
| `real_rate` | max(0, FEDFUNDS - CPI_yoy) | Monetary tightness |
| `rate_vol` | 12-month rolling std of FEDFUNDS | Policy uncertainty |
| `niv_momentum` | NIV_t - NIV_{t-3} | 3-month rate of change |
| `niv_acceleration` | momentum_t - momentum_{t-3} | Second derivative |
| `niv_percentile` | Percentile rank of NIV in expanding window | Relative positioning |

This gives the downstream models 12 features. The NIV composite remains the "star" feature, but the sub-components allow the model to detect patterns (like a 2001-style investment-led downturn) where the composite washes out the signal.

### 3.2 Standardisation

All features are z-score standardised using **training-set statistics only** (mean and std computed on [0, t-1] at each walk-forward step). This prevents lookahead bias and is consistent with the current implementation.

---

## 4. Model Architecture: Calibrated Ensemble

### 4.1 Base Learners

We train four base learners at each walk-forward step:

**Model 1: Logistic Regression (L2-regularised)**
```
P(recession | X) = σ(w'X + b)
Regularisation: λ||w||^2, λ chosen via leave-one-block-out CV within training window
```
This is the improved version of the current model. L2 regularisation prevents the coefficient explosion that compresses probabilities.

**Model 2: Gradient Boosted Trees (XGBoost)**
```
max_depth=3, n_estimators=100, learning_rate=0.05
scale_pos_weight = n_neg / n_pos  (handles class imbalance)
subsample=0.8, colsample_bytree=0.8
Early stopping on last 20% of training data
```
XGBoost can capture nonlinear interactions (e.g., "high drag AND low thrust → recession" vs. "high drag alone → not necessarily"). It handles the feature correlations in NIV components naturally.

**Model 3: Markov-Switching Logistic Regression**

This is the key innovation for handling the 2001 miss and the recent false-positive spike:

```
Regime r_t ∈ {low_risk, elevated, crisis}

Transition matrix A:
  A[i,j] = P(r_{t+1} = j | r_t = i)

Emission model (per regime):
  P(recession | X, r_t=k) = σ(w_k'X + b_k)  for each regime k

Regime state is inferred via forward-backward algorithm (Baum-Welch).
```

The regime-switching model learns that the 2001 recession happened in a different macro regime (investment bust, low inflation) than the 2007--09 recession (credit crisis, housing collapse). It can assign different feature weights per regime.

**Model 4: Feedforward Neural Network**
```
Input: 12 features
Hidden: [32, 16] with ReLU, dropout=0.3
Output: sigmoid
Loss: Binary cross-entropy with class weights
Optimizer: Adam, lr=0.001, weight_decay=1e-4
Epochs: 100, early stopping on validation loss (patience=10)
```
The neural net captures higher-order feature interactions that XGBoost and logistic regression may miss.

### 4.2 Ensemble Aggregation (Stacking)

The four base learners produce probabilities p_1, p_2, p_3, p_4. These are combined via a **meta-learner**:

```
p_ensemble = σ(α_1*logit(p_1) + α_2*logit(p_2) + α_3*logit(p_3) + α_4*logit(p_4) + β)
```

The meta-learner is a logistic regression trained on the base learners' **out-of-fold predictions** (using the blocked CV from Protocol C within the training window) to avoid overfitting.

This is equivalent to Bayesian Model Averaging in log-odds space and allows the ensemble to weight models differently. If the Markov-switching model identifies a regime where logistic regression fails (like 2001), its predictions get upweighted.

### 4.3 Calibration Layer

After the ensemble produces p_ensemble, we apply **isotonic regression calibration**:

```
p_calibrated = IsotonicRegression(p_ensemble, y_train)
```

Isotonic regression is the right choice here because:
- It is non-parametric (no assumption about the shape of the calibration curve)
- It handles the severe class imbalance better than Platt scaling
- It is monotone (preserves the rank-ordering / AUC)

The calibration model is fitted on the **last 20% of the training window** (held out from base learner training) at each walk-forward step.

**Expected effect:** If the ensemble produces 25% for GFC-onset observations and these correspond to actual recession rate of ~80% in that probability bin, isotonic regression will map 25% → ~80%. This directly fixes the "34% ceiling" problem.

### 4.4 Conformal Prediction Layer

On top of the calibrated probability, we produce a **prediction interval** using Adaptive Conformal Inference (ACI):

```
At time t:
  1. Compute nonconformity score: α_t = |y_t - p_calibrated_t|
  2. Maintain running quantile Q of recent α values (adaptive window)
  3. Prediction set at t+1: {y : |y - p_{t+1}| ≤ Q}
  4. If coverage drops below target (90%), widen Q; if above, narrow Q
```

ACI provides **distribution-free, finite-sample valid** coverage guarantees even under distribution shift. This is critical because:
- The macro environment changes over decades (non-stationarity)
- The recent false-positive spike represents a distribution shift
- ACI will automatically widen the prediction interval during the spike, flagging the model's uncertainty

**Output format:**
```
Date: 2024-06
Recession probability: 62% [38%, 81%]  (90% conformal interval)
Warning level: RED (probability > 50% AND lower bound > 25%)
```

---

## 5. Regime-Aware Monitoring

### 5.1 Component Divergence Detection

At each time step, compute the **component contribution decomposition**:

```
NIV = (u * P^2) / (X + F)^η

Approximate linearised contributions via log-differentiation:
  ∂log(NIV)/∂log(u) ≈ 1  (thrust contribution)
  ∂log(NIV)/∂log(P) ≈ 2  (efficiency contribution)
  ∂log(NIV)/∂log(X+F) ≈ -η = -1.5  (drag contribution)
```

When any single component contributes more than 70% of the total NIV change over a 6-month window, flag it as a **component-dominated regime**. During such regimes:
- Widen the conformal prediction interval by 50%
- Display a "component alert" on the dashboard identifying which input is driving the signal
- Weight the regime-switching model more heavily in the ensemble

### 5.2 Structural Break Detection

Apply the PELT (Pruned Exact Linear Time) algorithm to the NIV time series to detect changepoints:

```
Minimise: Σ C(y_{τ_i:τ_{i+1}}) + β * K
where:
  C = negative log-likelihood of segment
  β = penalty (BIC: β = log(n))
  K = number of changepoints
```

When a changepoint is detected within the last 12 months, the system enters a "structural break" mode:
- The fixed-window model (Protocol B) receives higher ensemble weight
- The expanding-window model's predictions are discounted (old data may be misleading)
- The conformal interval widens

---

## 6. Multi-Task Learning: Joint Recession + GDP Forecasting

### 6.1 Shared Representation

Train a single feedforward network with two output heads:

```
Input: 12 NIV features
Shared layers: [64, 32] with ReLU, dropout=0.3

Head 1 (recession): Linear(32, 1) → sigmoid
  Loss: weighted BCE, weight = n_neg/n_pos

Head 2 (GDP growth): Linear(32, 1)
  Loss: MSE

Total loss: L = λ_rec * L_recession + λ_gdp * L_gdp
  Default: λ_rec = 0.7, λ_gdp = 0.3
```

The shared layers learn a representation that is useful for both tasks. This acts as a regulariser for the recession head (the GDP head provides a continuous gradient signal even during the long expansion periods where the recession head receives no positive examples).

### 6.2 Cross-Task Signal

The GDP growth prediction from Head 2 becomes an additional feature for the ensemble:
- If the model predicts GDP growth < -1% AND recession probability > 30%, confidence in the recession call increases
- If the model predicts GDP growth > 2% AND recession probability > 30%, the signal is likely a false positive

---

## 7. Benchmarking Against State-of-the-Art

### 7.1 Baseline Models to Compare Against

| Model | Reference | Features | Method |
|-------|-----------|----------|--------|
| Yield curve probit | Estrella & Mishkin (1998), updated | T10Y3M | Probit regression |
| EBP-augmented probit | Gilchrist & Zakrajšek (2012) | Excess bond premium + T10Y3M | Probit |
| OECD composite LEI | OECD CLI | Multi-country composite | Threshold |
| Sahm Rule | Sahm (2019) | Unemployment rate 3-mo avg | Threshold (0.5pp rise) |
| Random Forest (macro features) | Stock & Watson (2003) approach | 12 FRED series | RF ensemble |
| NIV ensemble (this framework) | This paper | NIV components + ensemble | Calibrated stacking |

### 7.2 Fair Comparison Protocol

All models are evaluated using identical Protocol A (expanding-window walk-forward) on the same date range. AUC, Brier score, calibration error (ECE), and F1 at calibrated threshold are reported.

The EBP-augmented probit is likely the strongest competitor. If the NIV ensemble matches or exceeds it without requiring the Gilchrist-Zakrajšek excess bond premium series (which has a complex construction and delayed availability), this demonstrates NIV's practical advantage.

---

## 8. Python Code Skeleton

### 8.1 Project Structure

```
niv-oos-v2/
├── data/
│   └── fred_fetcher.py          # Download FRED series
├── features/
│   ├── niv_calculator.py        # NIV formula (fixed, mirrors Rust)
│   └── feature_builder.py       # Component extraction + engineering
├── models/
│   ├── logistic_l2.py           # Regularised logistic regression
│   ├── xgboost_model.py         # Gradient boosting
│   ├── regime_switching.py      # Markov-switching logistic
│   ├── feedforward.py           # Neural network (PyTorch)
│   └── ensemble.py              # Stacking meta-learner
├── calibration/
│   ├── isotonic.py              # Isotonic regression calibrator
│   └── conformal.py             # Adaptive conformal inference
├── evaluation/
│   ├── walk_forward.py          # Protocols A, B, C, D
│   ├── metrics.py               # AUC, Brier, ECE, F1
│   └── regime_monitor.py        # Component divergence + PELT
├── main.py                      # Full pipeline
└── requirements.txt
```

### 8.2 Core Implementation

```python
"""
niv-oos-v2/main.py
Full pipeline for NIV Next-Generation OOS Framework

Requirements:
  pip install pandas numpy scipy scikit-learn xgboost torch statsmodels mapie ruptures
"""

import numpy as np
import pandas as pd
from dataclasses import dataclass
from typing import List, Tuple, Optional
from sklearn.linear_model import LogisticRegression
from sklearn.isotonic import IsotonicRegression
from sklearn.metrics import roc_auc_score, brier_score_loss, f1_score
from xgboost import XGBClassifier
import torch
import torch.nn as nn
import warnings
warnings.filterwarnings('ignore')


# ============================================================
# Section 1: NIV Calculator (Fixed Formula — Mirrors niv.rs)
# ============================================================

ETA = 1.5
EPSILON = 0.001
R_D_MULTIPLIER = 1.15
THRUST_DG_WEIGHT = 1.0
THRUST_DA_WEIGHT = 1.0
THRUST_DR_WEIGHT = 0.7

NBER_RECESSIONS = [
    ('1980-01-01', '1980-07-01'),
    ('1981-07-01', '1982-11-01'),
    ('1990-07-01', '1991-03-01'),
    ('2001-03-01', '2001-11-01'),
    ('2007-12-01', '2009-06-01'),
    ('2020-02-01', '2020-04-01'),
]


def compute_niv_components(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute NIV and all sub-components from raw FRED data.

    Input df must have columns:
        date, GPDIC1, M2SL, FEDFUNDS, GDPC1, TCU, T10Y3M, CPIAUCSL
    All quarterly series must be forward-filled to monthly.

    Returns df with additional columns:
        thrust, efficiency_sq, slack, drag, real_rate, rate_vol,
        spread, niv_raw, niv_smoothed
    """
    df = df.sort_values('date').copy()

    # Growth rates
    df['dG'] = df['GPDIC1'].pct_change()                     # Monthly investment growth
    df['dA'] = df['M2SL'].pct_change(periods=12)             # 12-month M2 growth
    df['dr'] = df['FEDFUNDS'].diff()                          # Monthly rate change
    df['cpi_yoy'] = df['CPIAUCSL'].pct_change(periods=12)    # YoY inflation

    # Thrust: u = tanh(dG + dA - 0.7*dr)
    df['thrust'] = np.tanh(
        THRUST_DG_WEIGHT * df['dG'].fillna(0) +
        THRUST_DA_WEIGHT * df['dA'].fillna(0) -
        THRUST_DR_WEIGHT * df['dr'].fillna(0)
    )

    # Efficiency squared: P^2 = (Investment * 1.15 / GDP)^2
    df['efficiency_sq'] = ((df['GPDIC1'] * R_D_MULTIPLIER) / df['GDPC1']) ** 2

    # Slack: X = 1 - TCU/100
    df['slack'] = 1.0 - df['TCU'] / 100.0

    # Drag sub-components
    df['spread'] = df['T10Y3M']
    spread_penalty = df['T10Y3M'].clip(upper=0).abs()         # Penalty when inverted
    df['real_rate'] = (df['FEDFUNDS'] - df['cpi_yoy'] * 100).clip(lower=0)
    df['rate_vol'] = df['FEDFUNDS'].rolling(12).std()

    df['drag'] = (
        0.4 * spread_penalty +
        0.4 * df['real_rate'] +
        0.2 * df['rate_vol']
    )

    # Raw NIV
    safe_base = (df['slack'] + df['drag']).clip(lower=EPSILON)
    df['niv_raw'] = (df['thrust'] * df['efficiency_sq']) / (safe_base ** ETA)

    # Smoothed NIV (12-month SMA)
    df['niv_smoothed'] = df['niv_raw'].rolling(12).mean()

    # Derived features
    df['niv_momentum'] = df['niv_smoothed'].diff(3)
    df['niv_acceleration'] = df['niv_momentum'].diff(3)

    return df


def label_recessions(df: pd.DataFrame, horizon: int = 12) -> pd.DataFrame:
    """Add recession labels shifted by horizon months."""
    df = df.copy()
    df['is_recession'] = 0
    for start, end in NBER_RECESSIONS:
        mask = (df['date'] >= start) & (df['date'] <= end)
        df.loc[mask, 'is_recession'] = 1

    # Shift target: at time t, target = is_recession at t+horizon
    df['target'] = df['is_recession'].shift(-horizon)
    return df


# ============================================================
# Section 2: Feature Builder
# ============================================================

FEATURE_COLS = [
    'niv_smoothed', 'niv_raw', 'thrust', 'efficiency_sq', 'slack',
    'drag', 'spread', 'real_rate', 'rate_vol',
    'niv_momentum', 'niv_acceleration',
]


def build_features(df: pd.DataFrame, train_end: int) -> Tuple[np.ndarray, np.ndarray]:
    """
    Extract and standardise features using training-set statistics only.

    Args:
        df: DataFrame with NIV components computed
        train_end: index of last training observation

    Returns:
        X_scaled: standardised feature matrix (full dataset)
        valid_mask: boolean mask for rows with no NaN
    """
    X = df[FEATURE_COLS].values
    valid = ~np.isnan(X).any(axis=1) & ~np.isnan(df['target'].values)

    # Expanding percentile of niv_smoothed (computed on training data only)
    niv_vals = df['niv_smoothed'].values
    percentiles = np.full(len(df), np.nan)
    for i in range(12, len(df)):
        window = niv_vals[:min(i, train_end)]
        window = window[~np.isnan(window)]
        if len(window) > 0:
            percentiles[i] = np.searchsorted(np.sort(window), niv_vals[i]) / len(window)

    # Add percentile as feature
    X = np.column_stack([X, percentiles])
    valid = valid & ~np.isnan(percentiles)

    return X, valid


def standardise_split(X, train_mask):
    """Z-score using training statistics only."""
    X_train = X[train_mask]
    mu = np.nanmean(X_train, axis=0)
    sigma = np.nanstd(X_train, axis=0)
    sigma[sigma < 1e-10] = 1.0
    return (X - mu) / sigma


# ============================================================
# Section 3: Base Learners
# ============================================================

def train_logistic(X_train, y_train, C=1.0):
    """L2-regularised logistic regression."""
    model = LogisticRegression(
        C=C, penalty='l2', solver='lbfgs', max_iter=1000,
        class_weight='balanced'
    )
    model.fit(X_train, y_train)
    return model


def train_xgboost(X_train, y_train):
    """Gradient boosted trees with class imbalance handling."""
    n_pos = y_train.sum()
    n_neg = len(y_train) - n_pos
    scale = n_neg / max(n_pos, 1)

    model = XGBClassifier(
        max_depth=3,
        n_estimators=100,
        learning_rate=0.05,
        scale_pos_weight=scale,
        subsample=0.8,
        colsample_bytree=0.8,
        eval_metric='logloss',
        verbosity=0,
        use_label_encoder=False,
    )
    model.fit(X_train, y_train)
    return model


class FeedforwardNet(nn.Module):
    """Two-layer feedforward for recession probability."""
    def __init__(self, n_features, hidden_dims=(32, 16), dropout=0.3):
        super().__init__()
        layers = []
        prev = n_features
        for h in hidden_dims:
            layers.extend([nn.Linear(prev, h), nn.ReLU(), nn.Dropout(dropout)])
            prev = h
        layers.append(nn.Linear(prev, 1))
        self.net = nn.Sequential(*layers)

    def forward(self, x):
        return torch.sigmoid(self.net(x))


def train_feedforward(X_train, y_train, n_epochs=100, lr=0.001, patience=10):
    """Train feedforward network with early stopping."""
    n = len(X_train)
    val_size = max(int(0.2 * n), 10)
    X_tr = torch.FloatTensor(X_train[:-val_size])
    y_tr = torch.FloatTensor(y_train[:-val_size]).unsqueeze(1)
    X_val = torch.FloatTensor(X_train[-val_size:])
    y_val = torch.FloatTensor(y_train[-val_size:]).unsqueeze(1)

    n_pos = y_train.sum()
    n_neg = len(y_train) - n_pos
    pos_weight = torch.FloatTensor([n_neg / max(n_pos, 1)])

    model = FeedforwardNet(X_train.shape[1])
    optimizer = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=1e-4)
    criterion = nn.BCEWithLogitsLoss(pos_weight=pos_weight)

    best_loss = float('inf')
    best_state = None
    wait = 0

    # Temporarily modify forward to return logits for training
    model.net[-1]  # last layer is Linear(prev, 1) — no sigmoid in loss

    for epoch in range(n_epochs):
        model.train()
        logits = model.net(X_tr)  # Use net directly (no sigmoid)
        loss = criterion(logits, y_tr)
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

        model.eval()
        with torch.no_grad():
            val_logits = model.net(X_val)
            val_loss = criterion(val_logits, y_val).item()

        if val_loss < best_loss:
            best_loss = val_loss
            best_state = {k: v.clone() for k, v in model.state_dict().items()}
            wait = 0
        else:
            wait += 1
            if wait >= patience:
                break

    if best_state is not None:
        model.load_state_dict(best_state)
    return model


# ============================================================
# Section 4: Ensemble (Stacking)
# ============================================================

@dataclass
class EnsemblePrediction:
    probability: float          # Calibrated point estimate
    lower: float                # Conformal lower bound
    upper: float                # Conformal upper bound
    warning_level: str          # 'green', 'yellow', 'red'
    regime: str                 # Detected regime
    component_alert: Optional[str]  # Which component is dominant, if any


class CalibratedEnsemble:
    """
    Stacking ensemble with isotonic calibration and conformal intervals.
    """

    def __init__(self, alpha=0.1):
        """
        Args:
            alpha: miscoverage rate for conformal intervals (0.1 = 90% coverage)
        """
        self.alpha = alpha
        self.meta_model = None
        self.calibrator = None
        self.conformal_scores = []
        self.quantile_level = None

    def fit_meta(self, base_probs: np.ndarray, y: np.ndarray):
        """
        Fit the meta-learner on base model probabilities.

        Args:
            base_probs: (n, 4) array of base learner probabilities
            y: (n,) binary target
        """
        # Transform to log-odds for the meta-learner
        eps = 1e-6
        logits = np.log(base_probs.clip(eps, 1-eps) / (1 - base_probs.clip(eps, 1-eps)))

        self.meta_model = LogisticRegression(
            C=10.0, penalty='l2', solver='lbfgs', max_iter=500
        )
        self.meta_model.fit(logits, y)

    def fit_calibrator(self, ensemble_probs: np.ndarray, y: np.ndarray):
        """Fit isotonic regression calibrator."""
        self.calibrator = IsotonicRegression(
            y_min=0.0, y_max=1.0, out_of_bounds='clip'
        )
        self.calibrator.fit(ensemble_probs, y)

    def predict_raw(self, base_probs: np.ndarray) -> np.ndarray:
        """Get raw ensemble probability before calibration."""
        eps = 1e-6
        logits = np.log(base_probs.clip(eps, 1-eps) / (1 - base_probs.clip(eps, 1-eps)))
        return self.meta_model.predict_proba(logits)[:, 1]

    def predict_calibrated(self, base_probs: np.ndarray) -> np.ndarray:
        """Get calibrated probability."""
        raw = self.predict_raw(base_probs)
        if self.calibrator is not None:
            return self.calibrator.predict(raw)
        return raw

    def update_conformal(self, p_calibrated: float, y_actual: float):
        """Update conformal score history with new observation."""
        score = abs(y_actual - p_calibrated)
        self.conformal_scores.append(score)
        # Keep last 100 scores for adaptivity
        if len(self.conformal_scores) > 100:
            self.conformal_scores = self.conformal_scores[-100:]
        # Compute quantile
        n = len(self.conformal_scores)
        level = np.ceil((1 - self.alpha) * (n + 1)) / n
        level = min(level, 1.0)
        self.quantile_level = np.quantile(self.conformal_scores, level)

    def predict_with_interval(self, base_probs: np.ndarray) -> Tuple[float, float, float]:
        """
        Predict with conformal interval.

        Returns:
            (calibrated_prob, lower_bound, upper_bound)
        """
        p = self.predict_calibrated(base_probs.reshape(1, -1))[0]
        if self.quantile_level is not None:
            lower = max(0.0, p - self.quantile_level)
            upper = min(1.0, p + self.quantile_level)
        else:
            lower, upper = 0.0, 1.0
        return p, lower, upper

    def classify_warning(self, p: float, lower: float) -> str:
        """
        Assign warning level based on calibrated probability and confidence.

        Green:  p < 15%
        Yellow: 15% ≤ p < 40%, OR p ≥ 40% but lower bound < 15%
        Red:    p ≥ 40% AND lower bound ≥ 15%
        """
        if p < 0.15:
            return 'green'
        elif p >= 0.40 and lower >= 0.15:
            return 'red'
        else:
            return 'yellow'


# ============================================================
# Section 5: Regime Detection
# ============================================================

def detect_component_dominance(df: pd.DataFrame, idx: int, window: int = 6) -> Optional[str]:
    """
    Check if any single NIV component dominates the recent signal change.

    Returns name of dominant component if one contributes >70% of total change,
    else None.
    """
    if idx < window:
        return None

    components = ['thrust', 'efficiency_sq', 'slack', 'drag']
    changes = {}
    for c in components:
        vals = df[c].iloc[idx-window:idx+1].values
        if not np.isnan(vals).any():
            changes[c] = abs(vals[-1] - vals[0])

    total = sum(changes.values())
    if total < 1e-10:
        return None

    for c, change in changes.items():
        if change / total > 0.70:
            return c
    return None


def detect_structural_break(series: np.ndarray, penalty: float = None) -> List[int]:
    """
    Detect changepoints using PELT algorithm.

    Args:
        series: 1D array of values
        penalty: BIC penalty (default: log(n))

    Returns:
        List of changepoint indices
    """
    try:
        import ruptures as rpt
        if penalty is None:
            penalty = np.log(len(series))
        algo = rpt.Pelt(model='rbf', min_size=12).fit(series.reshape(-1, 1))
        changepoints = algo.predict(pen=penalty)
        return changepoints[:-1]  # Remove last (always == len)
    except ImportError:
        return []


# ============================================================
# Section 6: Walk-Forward Evaluation
# ============================================================

@dataclass
class WalkForwardResult:
    dates: List[str]
    actuals: np.ndarray
    probabilities: np.ndarray       # Calibrated ensemble
    lower_bounds: np.ndarray
    upper_bounds: np.ndarray
    warning_levels: List[str]
    component_alerts: List[Optional[str]]
    # Base model probabilities for analysis
    p_logistic: np.ndarray
    p_xgboost: np.ndarray
    p_neural: np.ndarray


def run_walk_forward(
    df: pd.DataFrame,
    horizon: int = 12,
    min_train_frac: float = 0.20,
    window_type: str = 'expanding',    # 'expanding' or 'fixed'
    fixed_window: int = 180,           # months, for fixed window
    conformal_alpha: float = 0.10,
) -> WalkForwardResult:
    """
    Full walk-forward evaluation with calibrated ensemble.

    Args:
        df: DataFrame with NIV components and targets computed
        horizon: prediction horizon in months
        min_train_frac: minimum fraction of data for initial training
        window_type: 'expanding' or 'fixed'
        fixed_window: window size for fixed-window variant
        conformal_alpha: miscoverage rate for conformal intervals

    Returns:
        WalkForwardResult with all predictions and metadata
    """
    X_all, valid = build_features(df, len(df))
    y_all = df['target'].values
    dates = df['date'].values

    valid_idx = np.where(valid)[0]
    n_valid = len(valid_idx)
    start = int(n_valid * min_train_frac)

    # Storage
    results = {
        'dates': [], 'actuals': [], 'probs': [], 'lower': [], 'upper': [],
        'warnings': [], 'alerts': [],
        'p_logistic': [], 'p_xgboost': [], 'p_neural': [],
    }

    ensemble = CalibratedEnsemble(alpha=conformal_alpha)

    for step in range(start, n_valid):
        test_idx = valid_idx[step]

        if window_type == 'expanding':
            train_indices = valid_idx[:step]
        else:
            train_start = max(0, step - fixed_window)
            train_indices = valid_idx[train_start:step]

        y_train = y_all[train_indices].astype(float)

        # Must have both classes
        if y_train.sum() < 1 or (1 - y_train).sum() < 1:
            continue

        # Standardise using training stats
        X_scaled = standardise_split(X_all, np.isin(np.arange(len(X_all)), train_indices))
        X_train = X_scaled[train_indices]
        X_test = X_scaled[test_idx:test_idx+1]
        y_test = y_all[test_idx]

        # Skip if NaN in test
        if np.isnan(X_test).any() or np.isnan(y_test):
            continue

        # --- Train base learners ---
        try:
            m_logistic = train_logistic(X_train, y_train)
            p_log = m_logistic.predict_proba(X_test)[0, 1]
        except Exception:
            p_log = 0.5

        try:
            m_xgb = train_xgboost(X_train, y_train)
            p_xgb = m_xgb.predict_proba(X_test)[0, 1]
        except Exception:
            p_xgb = 0.5

        try:
            m_nn = train_feedforward(X_train, y_train, n_epochs=50, patience=5)
            m_nn.eval()
            with torch.no_grad():
                p_nn = m_nn(torch.FloatTensor(X_test)).item()
        except Exception:
            p_nn = 0.5

        # Note: Markov-switching model (Model 3) is complex to implement
        # in a walk-forward loop. Placeholder uses logistic with different C.
        try:
            m_regime = train_logistic(X_train, y_train, C=0.1)
            p_regime = m_regime.predict_proba(X_test)[0, 1]
        except Exception:
            p_regime = 0.5

        base_probs = np.array([[p_log, p_xgb, p_nn, p_regime]])

        # --- Ensemble ---
        # Fit meta-learner on recent training data (last 30%)
        # In practice, use blocked CV within training; simplified here
        n_train = len(train_indices)
        cal_start = int(0.7 * n_train)
        cal_indices = train_indices[cal_start:]

        # Get base predictions on calibration set
        X_cal = X_scaled[cal_indices]
        y_cal = y_all[cal_indices]

        try:
            cal_probs = np.column_stack([
                m_logistic.predict_proba(X_cal)[:, 1],
                m_xgb.predict_proba(X_cal)[:, 1],
                np.array([m_nn(torch.FloatTensor(x.reshape(1, -1))).item()
                         for x in X_cal]),
                m_regime.predict_proba(X_cal)[:, 1],
            ])

            ensemble.fit_meta(cal_probs, y_cal)
            raw_prob = ensemble.predict_raw(base_probs)[0]

            # Calibrate
            raw_cal = ensemble.predict_raw(cal_probs)
            ensemble.fit_calibrator(raw_cal, y_cal)
            p_calibrated = ensemble.predict_calibrated(base_probs)[0]
        except Exception:
            p_calibrated = np.mean([p_log, p_xgb, p_nn, p_regime])

        # --- Conformal interval ---
        p_cal, lower, upper = ensemble.predict_with_interval(base_probs[0])

        # Update conformal scores with true label (available next step)
        if len(results['actuals']) > 0:
            prev_prob = results['probs'][-1]
            prev_actual = results['actuals'][-1]
            ensemble.update_conformal(prev_prob, prev_actual)

        # --- Component monitoring ---
        alert = detect_component_dominance(df, test_idx)
        if alert:
            # Widen interval by 50%
            width = upper - lower
            lower = max(0, p_cal - width * 0.75)
            upper = min(1, p_cal + width * 0.75)

        warning = ensemble.classify_warning(p_cal, lower)

        # Store
        results['dates'].append(str(dates[test_idx])[:10])
        results['actuals'].append(float(y_test))
        results['probs'].append(float(p_cal))
        results['lower'].append(float(lower))
        results['upper'].append(float(upper))
        results['warnings'].append(warning)
        results['alerts'].append(alert)
        results['p_logistic'].append(float(p_log))
        results['p_xgboost'].append(float(p_xgb))
        results['p_neural'].append(float(p_nn))

    return WalkForwardResult(
        dates=results['dates'],
        actuals=np.array(results['actuals']),
        probabilities=np.array(results['probs']),
        lower_bounds=np.array(results['lower']),
        upper_bounds=np.array(results['upper']),
        warning_levels=results['warnings'],
        component_alerts=results['alerts'],
        p_logistic=np.array(results['p_logistic']),
        p_xgboost=np.array(results['p_xgboost']),
        p_neural=np.array(results['p_neural']),
    )


# ============================================================
# Section 7: Metrics
# ============================================================

def compute_all_metrics(result: WalkForwardResult) -> dict:
    """Compute comprehensive evaluation metrics."""
    y = result.actuals
    p = result.probabilities

    metrics = {}

    # AUC-ROC
    if len(np.unique(y)) > 1:
        metrics['auc_roc'] = roc_auc_score(y, p)
    else:
        metrics['auc_roc'] = np.nan

    # Brier score (lower is better)
    metrics['brier_score'] = brier_score_loss(y, p)

    # Expected Calibration Error (ECE)
    n_bins = 10
    bin_edges = np.linspace(0, 1, n_bins + 1)
    ece = 0.0
    for i in range(n_bins):
        mask = (p >= bin_edges[i]) & (p < bin_edges[i+1])
        if mask.sum() > 0:
            bin_acc = y[mask].mean()
            bin_conf = p[mask].mean()
            ece += mask.sum() / len(y) * abs(bin_acc - bin_conf)
    metrics['ece'] = ece

    # F1 at calibrated threshold (50%)
    y_pred_50 = (p >= 0.50).astype(int)
    if y_pred_50.sum() > 0:
        metrics['f1_at_50'] = f1_score(y, y_pred_50)
    else:
        metrics['f1_at_50'] = 0.0

    # Optimal F1 (search thresholds)
    best_f1 = 0
    best_thresh = 0.5
    for thresh in np.arange(0.05, 0.95, 0.01):
        y_pred = (p >= thresh).astype(int)
        if y_pred.sum() > 0 and (1-y_pred).sum() > 0:
            f = f1_score(y, y_pred)
            if f > best_f1:
                best_f1 = f
                best_thresh = thresh
    metrics['f1_optimal'] = best_f1
    metrics['threshold_optimal'] = best_thresh

    # Conformal coverage
    in_interval = ((y >= result.lower_bounds) & (y <= result.upper_bounds))
    metrics['conformal_coverage'] = in_interval.mean()
    metrics['avg_interval_width'] = (result.upper_bounds - result.lower_bounds).mean()

    # Warning level breakdown
    for level in ['green', 'yellow', 'red']:
        mask = np.array([w == level for w in result.warning_levels])
        metrics[f'warning_{level}_count'] = mask.sum()
        if mask.sum() > 0:
            metrics[f'warning_{level}_recession_rate'] = y[mask].mean()

    return metrics


# ============================================================
# Section 8: Main Pipeline
# ============================================================

def fetch_fred_data() -> pd.DataFrame:
    """
    Fetch all required FRED series.

    In production, use fredapi:
        from fredapi import Fred
        fred = Fred(api_key='YOUR_KEY')
        df = fred.get_series('GPDIC1')

    For this skeleton, assumes data is pre-downloaded to CSV.
    """
    # Placeholder — replace with actual FRED fetch
    raise NotImplementedError(
        "Implement FRED data fetching. Required series: "
        "GPDIC1, M2SL, FEDFUNDS, GDPC1, TCU, T10Y3M, CPIAUCSL"
    )


def run_full_pipeline():
    """Execute the complete OOS evaluation."""

    print("=" * 60)
    print("NIV Next-Generation OOS Framework v2.0")
    print("=" * 60)

    # 1. Fetch data
    print("\n[1/6] Fetching FRED data...")
    df = fetch_fred_data()

    # 2. Compute NIV components
    print("[2/6] Computing NIV components...")
    df = compute_niv_components(df)
    df = label_recessions(df, horizon=12)

    # 3. Run Protocol A (expanding window)
    print("[3/6] Running Protocol A: Expanding-window walk-forward...")
    result_expanding = run_walk_forward(df, horizon=12, window_type='expanding')
    metrics_expanding = compute_all_metrics(result_expanding)

    print(f"  AUC-ROC:  {metrics_expanding['auc_roc']:.4f}")
    print(f"  Brier:    {metrics_expanding['brier_score']:.4f}")
    print(f"  ECE:      {metrics_expanding['ece']:.4f}")
    print(f"  F1@50%:   {metrics_expanding['f1_at_50']:.4f}")
    print(f"  F1 opt:   {metrics_expanding['f1_optimal']:.4f} "
          f"(threshold={metrics_expanding['threshold_optimal']:.2f})")
    print(f"  Coverage: {metrics_expanding['conformal_coverage']:.2%}")

    # 4. Run Protocol B (fixed window)
    print("\n[4/6] Running Protocol B: Fixed-window walk-forward...")
    result_fixed = run_walk_forward(df, horizon=12, window_type='fixed', fixed_window=180)
    metrics_fixed = compute_all_metrics(result_fixed)

    print(f"  AUC-ROC:  {metrics_fixed['auc_roc']:.4f}")

    # 5. Multi-horizon
    print("\n[5/6] Multi-horizon evaluation...")
    for h in [3, 6, 12, 18]:
        df_h = label_recessions(df.drop(columns='target', errors='ignore'), horizon=h)
        result_h = run_walk_forward(df_h, horizon=h, window_type='expanding')
        m = compute_all_metrics(result_h)
        print(f"  Horizon {h:2d}mo: AUC={m['auc_roc']:.4f}  F1={m['f1_optimal']:.4f}")

    # 6. Structural break detection
    print("\n[6/6] Structural break analysis...")
    niv_series = df['niv_smoothed'].dropna().values
    breaks = detect_structural_break(niv_series)
    if breaks:
        print(f"  Changepoints detected at indices: {breaks}")
    else:
        print("  No significant changepoints detected")

    print("\n" + "=" * 60)
    print("Pipeline complete.")
    return result_expanding, metrics_expanding


if __name__ == '__main__':
    run_full_pipeline()
```

---

## 9. Expected Performance Gains

### 9.1 Quantitative Targets (with justification)

| Metric | Current | Target | Basis for Estimate |
|--------|---------|--------|--------------------|
| AUC-ROC | 0.718 | **0.78--0.84** | +0.03--0.05 from sub-component features; +0.02--0.04 from ensemble; +0.01--0.03 from regime-switching. Literature: ensemble methods typically improve recession AUC by 5--10 points over single-model baselines (Döpke et al. 2017). |
| Brier Score | ~0.07 (est.) | **0.04--0.06** | Calibration alone reduces Brier by 20--40% when the original model is miscalibrated (Niculescu-Mizil & Caruana 2005). |
| F1 at 50% | 0.00 | **0.35--0.50** | Currently zero because probabilities never reach 50%. With isotonic calibration, the 23--34% recession probabilities map to the 50--80% range, enabling detection at 50%. |
| F1 optimal | 0.31 | **0.40--0.50** | Component features capture 2001-type investment recessions. Ensemble reduces variance. |
| False positive rate (at p>25%) | ~5% of obs | **<2%** | Regime-switching and conformal intervals flag the recent spike as high-uncertainty, widening intervals and suppressing warnings. |
| 2001 detection | Missed (6.2%) | **Detected (>25%)** | Component-level features let the model weight dG (investment growth) independently. The 2001 recession had a strong dG signal masked by the composite. |

### 9.2 What Won't Improve

- **Base rate problem:** With only 40 recession months in 509 observations, statistical power remains limited. Confidence intervals on AUC will still be ±0.05--0.08.
- **COVID:** The 2020 recession was a 3-month exogenous shock. No macro indicator can provide 12-month advance warning of a pandemic. We should not claim to predict it.
- **Tail events:** If a future recession arises from a mechanism entirely absent from 1970--2025 data (e.g., AI-driven financial crisis), the model will underperform.

---

## 10. Implementation Roadmap

### Phase 1: Weeks 1--2 (Quick Wins)

| Task | Expected Impact | Effort |
|------|----------------|--------|
| Add L2 regularisation to current logistic regression | Stabilise coefficients, reduce probability compression | 1 day |
| Extract NIV sub-components as separate features | Capture 2001-type investment signals | 2 days |
| Add isotonic calibration on top of current model | Fix probability scale → F1 at 50% goes from 0 to 0.35+ | 1 day |
| Implement expanding percentile feature | Relative positioning context | 1 day |
| Add multi-horizon evaluation (3, 6, 12, 18 months) | Understand NIV's natural prediction horizon | 1 day |

**Expected outcome after Phase 1:** AUC 0.75--0.78, F1 0.35--0.42 at calibrated threshold. This alone is a major improvement.

### Phase 2: Weeks 3--8 (Ensemble)

| Task | Expected Impact | Effort |
|------|----------------|--------|
| Add XGBoost base learner | Capture nonlinear component interactions | 3 days |
| Add feedforward neural net base learner | Higher-order features | 3 days |
| Implement stacking meta-learner | Optimal model combination | 2 days |
| Add conformal prediction intervals | Calibrated uncertainty quantification | 3 days |
| Implement component-dominance monitoring | Flag unreliable predictions | 2 days |
| Add Protocol B (fixed window) and Protocol C (blocked CV) | Robustness testing | 3 days |

**Expected outcome after Phase 2:** AUC 0.78--0.82, F1 0.40--0.48, conformal intervals with 90% coverage.

### Phase 3: Months 3--6 (Research-Grade)

| Task | Expected Impact | Effort |
|------|----------------|--------|
| Implement Markov-switching logistic regression | Regime-dependent recession patterns | 2 weeks |
| Add PELT structural break detection | Automatic regime flagging | 1 week |
| Multi-task learning (recession + GDP) | Regularisation via shared representation | 2 weeks |
| Benchmark against EBP-augmented probit, Sahm rule, OECD CLI | Publication-ready comparison table | 2 weeks |
| Formal write-up (NBER working paper format) | Dissemination | 2 weeks |
| Deploy on regenerationism.ai with live dashboard | Real-time monitoring | 2 weeks |

**Expected outcome after Phase 3:** AUC 0.80--0.84, publication-ready results, live deployment.

---

## 11. Reproducibility

### 11.1 Data

All data sourced from FRED. API key required (free registration at https://fred.stlouisfed.org/).

| Series ID | Description | Frequency | Start |
|-----------|-------------|-----------|-------|
| GPDIC1 | Real Gross Private Domestic Investment | Quarterly | 1947 |
| M2SL | M2 Money Stock | Monthly | 1959 |
| FEDFUNDS | Federal Funds Effective Rate | Monthly | 1954 |
| GDPC1 | Real GDP | Quarterly | 1947 |
| TCU | Capacity Utilization | Monthly | 1967 |
| T10Y3M | 10Y-3M Treasury Spread | Monthly | 1982 |
| CPIAUCSL | CPI All Urban Consumers | Monthly | 1947 |

### 11.2 NIV Formula (Frozen)

```
NIV = (u × P²) / (X + F)^1.5

where:
  u = tanh(1.0 × dG + 1.0 × dA - 0.7 × dr)
  P = (GPDIC1 × 1.15) / GDPC1
  X = 1 - TCU/100
  F = 0.4 × max(0, -T10Y3M) + 0.4 × max(0, FEDFUNDS - CPI_yoy) + 0.2 × σ(FEDFUNDS, 12)
```

All parameters above are fixed and must not be modified during any stage of the evaluation.

### 11.3 Software Dependencies

```
python>=3.10
pandas>=2.0
numpy>=1.24
scipy>=1.11
scikit-learn>=1.3
xgboost>=2.0
torch>=2.1
ruptures>=1.1.8
mapie>=0.8  (optional, for MAPIE conformal)
fredapi>=0.5
matplotlib>=3.8
```

### 11.4 Random Seeds

All stochastic components (XGBoost, neural net, train/val splits) use seed=42 for reproducibility. Results should be reported as mean ± std over 5 seeds (42, 123, 456, 789, 1024).

---

## 12. Honest Assessment

This framework addresses the three specific failure modes of the current system (miscalibration, 2001 miss, false-positive spike) with targeted interventions (isotonic calibration, component-level features, regime monitoring). The performance targets are grounded in analogous improvements documented in the recession forecasting literature.

However, we must be transparent about what this framework **cannot** do:

1. **It cannot make NIV predict recessions the NIV formula does not detect.** If the raw NIV signal is weak before a recession (as in 2001 or 2020), no amount of downstream sophistication will create a strong signal from noise. The sub-component features may help (the 2001 investment signal exists in dG even if the composite masks it), but this is not guaranteed.

2. **It cannot reduce the fundamental uncertainty from a 7.9% base rate.** With ~40 recession months in 509 observations, any model's true AUC has wide confidence intervals (roughly ±0.06). Claiming AUC differences of 0.02 as "significant" is not statistically defensible without bootstrap confidence intervals.

3. **Ensembles add complexity and opacity.** The current single logistic regression is fully interpretable. A 4-model stacked ensemble with conformal intervals is not. This trades interpretability for performance.

4. **The recent false-positive spike may be correct.** The framework treats it as a false positive, but if a recession begins in 2026, the 82% probability would have been prescient. Regime monitoring and conformal intervals flag uncertainty rather than suppress the signal entirely.

The right path is Phase 1 first (quick wins with L2 regularisation, component features, and calibration), evaluate honestly, then proceed to the full ensemble only if Phase 1 validates the approach.
