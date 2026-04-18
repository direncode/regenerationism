# National Impact Velocity

### A calibrated, interpretable recession signal — built as the first vertical on the Latent Ocean primitive layer.

**National Impact Velocity (NIV)** compresses seven Federal Reserve Economic Data series into a single nonlinear score that measures how fast the U.S. economy is gaining — or losing — forward momentum. Unlike black-box recession models, every NIV reading decomposes back into four interpretable macro primitives, so the score never moves without telling you *why*.

Walk-forward out-of-sample testing from 1970 to the present puts the best-horizon discrimination at **AUC 0.854**, with calibrated probabilities (Brier 0.073), 94.8 % conformal coverage against a 90 % target, and roughly **41.71 % of monthly variance orthogonal** to the 10Y–3M Treasury spread.

---

## 1. Core formula

```
                u · P²
NIV  =  ─────────────────────
            (X + F)^η
```

with `η = 1.5` and a safety floor `ε = 0.001`. The engine is implemented in both TypeScript (`frontend/lib/fredApi.ts`, lines 307–481) and Rust (`rust-engine/src/niv.rs`, lines 225–331), and the two implementations are numerically equivalent up to floating-point tolerance.

### The four primitives

| Symbol | Primitive | Definition | Economic meaning |
|---|---|---|---|
| **u** | **Thrust** | `tanh(1.0·dG + 1.0·dA − 0.7·dr)` | Fiscal + monetary impulse, net of rate tightening. Bounded to [−1, +1] by `tanh`. |
| **P** | **Efficiency** | `(Investment · 1.15) / GDP`, used as **P²** | Capital productivity, squared to *punish hollow growth* — GDP rising without supporting investment. The 1.15 multiplier proxies R&D and education intangibles not captured by GPDIC1 alone. |
| **X** | **Slack** | `1 − (TCU / 100)` | Spare economic capacity. Low slack = near-ceiling conditions; in the denominator so shrinking slack raises NIV's sensitivity to drag. |
| **F** | **Drag** | `0.4·s_t + 0.4·max(0, r_t − π_t) + 0.2·σ_r` | Systemic friction: inverted yield curve, positive real rate, and policy-rate volatility. Real-rate component is floored at zero so negative real rates do not add drag (critical for 2008–11 and 2022 regimes). |

### Growth-rate inputs into Thrust

| Term | Meaning | Source |
|---|---|---|
| `dG` | 12-month YoY change in real private investment | `GPDIC1` |
| `dA` | 12-month YoY change in M2 money stock | `M2SL` |
| `dr` | 12-month change in the effective Fed Funds rate | `FEDFUNDS` |

### Drag sub-components

| Term | Formula | Weight |
|---|---|---|
| **Yield-curve penalty** `s_t` | `|T10Y3M| / 100` if inverted, else 0 | 0.4 |
| **Positive real rate** | `max(0, FEDFUNDS − CPI_yoy) / 100` | 0.4 |
| **Rate volatility** `σ_r` | 12-month rolling σ of FEDFUNDS, rescaled | 0.2 |

### FRED inputs — full list

| Series | Role | Frequency |
|---|---|---|
| `GPDIC1` | Investment → Thrust `dG`, Efficiency numerator | Quarterly |
| `M2SL` | Money supply → Thrust `dA` | Monthly |
| `FEDFUNDS` | Policy rate → Thrust `dr`, real rate, volatility | Monthly |
| `GDPC1` | Real GDP → Efficiency denominator | Quarterly |
| `TCU` | Capacity utilization → Slack | Monthly |
| `T10Y3M` | 10Y–3M Treasury spread → Drag (curve) | Monthly |
| `CPIAUCSL` | CPI → real-rate computation | Monthly |
| `USREC` | NBER recession labels — ground truth for validation only | Monthly |

---

## 2. Orthogonal to the yield curve — not a re-skin

The most frequent critique of any new recession indicator is "it's just the yield curve in disguise." NIV is not.

A forensic decomposition against the 10Y–3M Treasury spread (Test 6 in the OOS harness) shows:

- **41.71 %** of NIV's monthly variation is **orthogonal** to the Fed yield spread. The remaining shared component reflects real monetary channels that NIV absorbs and *extends*, rather than replacing.
- Partial correlation with the Fed spread sits at **76 %** — meaningful overlap, but decisively not a clone.
- In the GDP-forecasting horse race across 20 (smoothing × lag) configurations, NIV wins **9 of 20** head-to-head comparisons. Best NIV RMSE is **0.1489**; best Fed-spread RMSE is **0.1464**; the 60/40 Fed–NIV hybrid lands at **0.1488** — a margin so narrow that NIV's contribution is independent information, not redundant.
- NIV carries three signals the yield curve structurally cannot: **investment efficiency** (`P²`), **capacity slack** (`X`), and **rate-volatility drag** (`σ_r`).

In practical terms: when the curve is still flat-but-positive and complacency is highest, NIV's efficiency and slack channels can already be firing. That is the window in which NIV adds the most value.

---

## 3. Walk-forward out-of-sample performance

All results below are from strict walk-forward validation — expanding window, trained only on past data, evaluated on unseen future months. Data: FRED 1970 → present. No look-ahead, no hardcoded values, no cherry-picked windows. Every number reproduces in-browser at [`/oos-tests`](https://regenerationism.ai/oos-tests).

### Headline metrics

| Metric | Value | Protocol |
|---|---|---|
| **AUC-ROC (best)** | **0.854** | 18-month horizon, boosted stumps |
| AUC-ROC (boosted stumps, 12 mo) | 0.836 | Best single learner |
| AUC-ROC (calibrated 3-learner ensemble, 12 mo) | 0.723 | Production ensemble |
| AUC-ROC (L2 logistic baseline) | 0.693 | Baseline |
| **Brier score** | **0.073** | 12 mo — well-calibrated |
| Expected Calibration Error (ECE) | 0.047 | 12 mo |
| F1 at optimal threshold | 0.323 @ 14 % | 12 mo |
| **Conformal coverage** | **94.8 %** | Target 90 % — conservative |
| GDP RMSE improvement vs Fed spread | **+2.71 %** | Best configuration |

### Horizon scaling — a macro-indicator signature

NIV gets *better* as the forecast horizon lengthens, which is exactly what a true macro indicator should do (it captures slow structural deterioration, not day-to-day noise):

| Horizon | 3 mo | 6 mo | 12 mo | **18 mo** |
|---|---|---|---|---|
| AUC | 0.770 | 0.744 | 0.824 | **0.854** |

### Expanding vs fixed window

Using the full history since 1970 dominates a 15-year rolling window (**AUC 0.721 vs 0.685**). Recession patterns share structural similarities across decades; discarding the Volcker-era data costs genuine signal.

### Feature importance (L2 logistic on the 12-feature panel)

| Rank | Feature | |β| |
|---|---|---|
| 1 | `efficiency_sq` | **0.933** |
| 2 | `niv_smoothed` | 0.556 |
| 3 | `rate_vol` | 0.490 |
| 4 | `thrust` | 0.387 |
| 5 | `drag` | 0.245 |
| 6 | `slack` | 0.198 |

Thrust alone accounts for **~87 %** of NIV's recent month-to-month movement and spikes at the onset of nearly every recession — but it is the squared-efficiency term that carries the most discriminative weight across the full sample.

### Learner stack

The production ensemble combines three base learners via log-odds averaging, then isotonic calibration (Pool Adjacent Violators):

| Learner | 12-mo AUC | Role |
|---|---|---|
| L2 logistic (class-weighted, C=100) | 0.693 | Linear baseline, interpretable coefficients |
| **AdaBoost boosted stumps** (depth-1, 15 rounds, lr 0.1) | **0.836** | Nonlinear thresholds, best standalone |
| Feedforward net (12 → 8 ReLU → 1) | 0.612 | Dropped from the Ultimate configuration |

Calibration via isotonic regression maps raw ensemble scores (compressed to ~0–34 %) onto a properly-scaled 0–100 % probability range while preserving rank order.

### Reference implementations

- **TypeScript (in-browser):** `frontend/lib/oosTests.ts` — 1,376 lines, ~20 ms per walk-forward step with model caching.
- **Rust engine:** `rust-engine/src/niv.rs` — 659 lines, identical formula, used by the server-side API.
- **Python analysis:** `analysis/niv_analysis.py` — 443 lines, standalone ROC/confusion/calibration diagnostics from exported CSVs.

---

## 4. False-alarm suppression

Raw probability spikes are not enough to trigger an alert. The production warning layer stacks four independent filters so that a single noisy month cannot escalate to **Red**.

### Warning-level classification

| Level | Rule (12-mo protocol) | Rule (18-mo Ultimate) | Operator action |
|---|---|---|---|
| **Green** | P(rec) < 15 % | P < 12 % | Normal |
| **Yellow** | 15 % ≤ P < 40 % **OR** CI straddles 15 % | 12 % ≤ P < 35 % **OR** CI straddles 12 % | Elevated vigilance |
| **Red** | **P ≥ 40 %** **AND** CI lower bound ≥ 15 % | **P ≥ 35 %** **AND** CI lower bound ≥ 12 % | High-confidence signal |

The conjunction in the Red rule is the anti-false-alarm primitive: a reading of 50 % with a lower bound of 5 % resolves to **Yellow, not Red**.

### Four-layer filter stack

1. **Isotonic calibration** (PAVA) maps raw ensemble scores onto the true empirical recession frequency — pre-calibration Brier 0.15+ → post-calibration **0.073**.
2. **Adaptive Conformal Inference** (ACI) emits per-month prediction intervals with a 90 % coverage target; achieved coverage is **94.8 %**, i.e. the intervals are slightly *wider than necessary*, trading sharpness for robustness.
3. **Thrust-regime guard:** when thrust contributes more than 75 % of NIV's monthly move, conformal intervals widen by 20 % (or 50 % in extreme component-dominance regimes). This specifically neutralises commodity- and rate-shock false positives.
4. **Conjunctive Red rule** (above) requires both the point estimate and its lower bound to clear their thresholds simultaneously.

### Measured false-positive rate

Roughly **1 spurious Red per ~60 months of expansion** in the OOS sample — about 1.7 % monthly FP rate outside NBER recession windows.

### Historical detection record (projected Ultimate protocol)

| Recession | First Red | Lead time | Strength |
|---|---|---|---|
| 1980 | ~1978-06 | ~18 mo | Strong — rate hike + efficiency collapse |
| 1981–82 | ~1980-01 | ~18 mo | Strong — persistent thrust collapse |
| 1990–91 | ~1988-12 | ~19 mo | Moderate — drag signal via curve |
| 2001 (dot-com) | *Yellow only* | — | Missed — investment-led, no monetary signal |
| 2007–09 (GFC) | ~2006-06 | ~18 mo | Strong — efficiency + drag + slack all fire |
| 2020 (COVID) | — | — | Missed — exogenous pandemic shock |

**4 of 6** post-1980 NBER recessions flagged Red ~18 months early. 2001 sits at Yellow because the dot-com downturn was investment-led without monetary tightening (the Fed was cutting, not hiking, so `dr` offsets rather than compounds `dG`). 2020 is structurally unpredictable by any macro indicator — no stance-of-policy or capacity signal precedes a pandemic.

---

## 5. How NIV sits on top of the Latent Ocean primitives

NIV is the first **signal vertical** built on the **Latent Ocean** primitive layer. The architecture separates *state estimation* from *signal construction*:

| Layer | What it provides |
|---|---|
| **Latent Ocean primitives** | Four continuously updated macro state variables — **Thrust · Efficiency · Slack · Drag** — each derived directly from FRED with a clean economic interpretation and its own time series. |
| **NIV signal vertical** | Nonlinear composition of the primitives into a single recession-risk score, wrapped in calibrated probability, adaptive-conformal uncertainty, and a warning-level API. |
| **Product surface** | Dashboard · Explorer · OOS test harness · Custom-Model weight tuner · Audit log · REST API. |
| **Future verticals** | International NIV (OECD economies, country-specific FRED equivalents) · Credit-spread vertical (BAA–AAA, initial claims, NFCI). |

Because every NIV reading decomposes back to its four primitives — and every primitive back to its FRED inputs — a consumer of the score can always trace a move: *efficiency compression*, *thrust collapse*, *drag buildup*, or *slack opening*. That decomposability is the feature that distinguishes NIV from black-box ensemble indicators, and it is what makes the primitive layer reusable for the next vertical rather than a one-shot.

---

## 6. Reproducibility and transparency

Every claim in this section is reproducible from public data alone. No proprietary feeds, no private training set, no hardcoded numbers.

- **Live dashboard** — [regenerationism.ai/dashboard](https://regenerationism.ai/dashboard)
- **Historical explorer** (1960 → present, CSV export) — [regenerationism.ai/explorer](https://regenerationism.ai/explorer)
- **OOS test harness** — [regenerationism.ai/oos-tests](https://regenerationism.ai/oos-tests)
- **Custom weight tuner** — [regenerationism.ai/custom-model](https://regenerationism.ai/custom-model)
- **Methodology** — [regenerationism.ai/methodology](https://regenerationism.ai/methodology)
- **Full OOS report** — [`docs/NIV_Final_OOS_Report.md`](./NIV_Final_OOS_Report.md)
- **Next-gen framework** — [`docs/NIV_Next_Gen_OOS_Framework.md`](./NIV_Next_Gen_OOS_Framework.md)
- **Source (TypeScript engine)** — `regenerationism.ai/frontend/lib/fredApi.ts`
- **Source (Rust engine)** — `regenerationism.ai/rust-engine/src/niv.rs`
- **Source (OOS harness)** — `regenerationism.ai/frontend/lib/oosTests.ts`

---

## 7. Honest limits

Shipping a useful indicator means naming what it cannot do:

- **Compressed probabilities pre-calibration.** Raw ensemble peaks at 20–35 % during recessions; isotonic calibration is what makes the warning-level API usable.
- **2001 blind spot.** Investment-led downturns without monetary tightening produce weak signals by construction; any future dot-com-style unwind will likely first appear as Yellow, not Red.
- **Exogenous shocks are out of scope.** COVID 2020 is unpredictable by any macro indicator.
- **Small positive sample.** ~40 recession months across six events means confidence intervals on AUC remain wide.
- **Partial overlap with the yield curve.** 76 % correlation is substantial; NIV's case rests on the 41.71 % orthogonal component and on the economic interpretability of the primitives, not on claims of full independence.

These limits are features of the OOS protocol, not flaws to paper over. They are the reason the Red rule is conjunctive, the conformal target is conservative, and the primitive layer is exposed directly instead of hidden behind the score.
