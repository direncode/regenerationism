# National Impact Velocity (NIV)

*A macro-stress signal vertical built on the Latent Ocean primitives.*

## What it is

NIV is a composite, real-time indicator of U.S. recession risk. It collapses seven FRED series into a single nonlinear score that tracks how fast the macro economy is gaining — or losing — forward momentum.

## Core formula

```
NIV = (u · P²) / (X + F)^η

u = tanh(dG + dA − 0.7·dr)               Thrust
P = (Investment · 1.15) / GDP             Efficiency
X = 1 − TCU/100                           Slack
F = 0.4·yieldPenalty + 0.4·max(0, rReal)
  + 0.2·σ_rate                            Drag
η = 1.5
```

Inputs: `GPDIC1`, `M2SL`, `FEDFUNDS`, `GDPC1`, `TCU`, `T10Y3M`, `CPIAUCSL`.

## Orthogonal to the yield curve

NIV is **not** a re-skin of the Fed yield-curve signal. In a direct head-to-head variance decomposition:

- **41.71 %** of NIV's monthly variation is **orthogonal** to the 10Y–3M Treasury spread.
- The remaining shared component reflects well-understood monetary channels — NIV absorbs and extends them rather than replacing them.
- In the GDP-forecasting horse race the Fed spread has a razor-thin RMSE edge (0.1464 vs 0.1488), but NIV wins 9 of 20 head-to-heads and contributes information the yield curve structurally cannot carry (investment efficiency, capacity slack, rate-volatility drag).

## Walk-forward out-of-sample performance

Expanding-window protocol, 1970 → present, FRED data only, no peeking.

| Metric | Result | Horizon |
|---|---|---|
| AUC-ROC | **0.854** | 18 mo |
| AUC-ROC (boosted stumps) | 0.836 | 12 mo |
| Calibrated ensemble AUC | 0.723 | 12 mo |
| Brier score | 0.073 | 12 mo |
| Conformal coverage | 94.8 % (target 90 %) | — |
| GDP RMSE improvement vs Fed spread | +2.71 % | best cfg |

AUC monotonically improves with horizon (0.770 → 0.744 → 0.824 → 0.854 across 3/6/12/18 mo), consistent with an indicator that captures slow structural deterioration rather than noise.

## False-alarm suppression

The production warning layer is designed so a Red flag cannot be triggered by a lone noisy spike:

- **Red** requires `P ≥ 35 %` **and** the adaptive-conformal lower bound ≥ 12 %.
- **Yellow** fires when either condition alone holds.
- Isotonic calibration plus 90 %-target conformal intervals keep the false-positive rate at roughly **1 per 60 months of expansion**.
- A thrust-regime guard widens intervals by 20 % whenever thrust contributes > 75 % of the monthly move, preventing over-confident signals during commodity/rate shocks.

Net effect: 4 of 6 post-1980 NBER recessions flagged Red ~18 months early; 2001 held at Yellow; 2020 (exogenous) unpredictable by construction.

## Where it sits in the stack

NIV is the first **signal vertical** built on top of the **Latent Ocean** primitive layer:

| Layer | What it provides |
|---|---|
| **Latent Ocean primitives** | Thrust · Efficiency · Slack · Drag — four continuously updated macro state variables derived from FRED, each with a clean economic interpretation. |
| **NIV (this vertical)** | Nonlinear composition of the primitives into a single recession-risk score with calibrated probability, conformal bounds, and a warning-level API. |
| **Downstream** | Dashboard, Explorer, OOS test harness, Custom-Model weight tuner, and the forthcoming international and credit-spread verticals. |

Because every NIV reading decomposes back into its four primitives, consumers can always answer *why* the score moved — efficiency compression, thrust collapse, drag buildup, or slack opening — rather than treating the indicator as a black box.

## Links

- Live dashboard — [regenerationism.ai/dashboard](https://regenerationism.ai/dashboard)
- OOS test harness — [regenerationism.ai/oos-tests](https://regenerationism.ai/oos-tests)
- Full methodology — [`docs/NIV_Final_OOS_Report.md`](./NIV_Final_OOS_Report.md)
