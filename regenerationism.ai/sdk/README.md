# @regenerationism/third-order-sdk

Third-Order Accounting SDK for NIV (National Impact Velocity) economic analysis. Provides exponential compounding and risk-adjusted forecasting capabilities.

## What is Third-Order Accounting?

Third-order accounting is a forward-looking meta-layer that applies exponential compounding and risk-adjusted growth forecasting on top of the NIV time-series:

- **First-order**: NIVₜ = current regeneration velocity
- **Second-order**: dNIV/dt = acceleration/deceleration
- **Third-order**: Cₕ = NIV₀ × e^(rₕ×h) × (1 − ρₕ) = projected cumulative regeneration

Where:
- `Cₕ` = cumulative regenerated capital after horizon h (years)
- `NIV₀` = baseline NIV velocity
- `rₕ` = α × (avg NIV) − β × (avg Drag) = effective compounding rate
- `ρₕ` = logistic(γ × avg Drag − θ) = collapse probability

## Installation

```bash
npm install @regenerationism/third-order-sdk
# or
yarn add @regenerationism/third-order-sdk
# or
pnpm add @regenerationism/third-order-sdk
```

## Quick Start

```typescript
import { computeThirdOrder, DEFAULT_PARAMS } from '@regenerationism/third-order-sdk'

// Your NIV time series data
const data = [
  { date: '2024-01-01', niv: 0.045, thrust: 0.15, efficiency: 0.08, slack: 0.23, drag: 0.12 },
  { date: '2024-02-01', niv: 0.048, thrust: 0.16, efficiency: 0.082, slack: 0.22, drag: 0.11 },
  // ... at least 6 data points for default lookback window
]

// Compute third-order analysis
const result = computeThirdOrder(data, DEFAULT_PARAMS)

console.log(`Current NIV: ${result.currentNIV}`)
console.log(`Risk Level: ${result.riskLevel}`)
console.log(`Cumulative Regeneration (5Y): ${result.cumulativeRegeneration}`)
console.log(`Collapse Probability: ${(result.collapseProb * 100).toFixed(1)}%`)
```

## API Client

Use the API client to call the regenerationism.ai API:

```typescript
import { ThirdOrderClient } from '@regenerationism/third-order-sdk'

const client = new ThirdOrderClient({
  baseUrl: 'https://regenerationism.ai',  // optional, this is default
  timeout: 30000  // optional, 30s default
})

// Compute via API
const response = await client.compute({
  data: nivDataPoints,
  params: { horizonYears: 10 },
  includeForecastPaths: true,
  includeHeatmap: false
})

console.log(response.result.riskLevel)
console.log(response.forecastPaths)
```

## Local Computation

For offline or low-latency use cases, compute locally:

```typescript
import {
  computeThirdOrder,
  generateForecastPaths,
  DEFAULT_PARAMS,
  PRESET_SCENARIOS
} from '@regenerationism/third-order-sdk'

// Full analysis
const result = computeThirdOrder(data, {
  ...DEFAULT_PARAMS,
  horizonYears: 10,
  iterations: 5000  // more Monte Carlo paths for accuracy
})

// Generate forecast paths at multiple horizons
const forecasts = generateForecastPaths(data, DEFAULT_PARAMS, [1, 2, 3, 5, 7, 10])

forecasts.forEach(f => {
  console.log(`${f.horizon}Y: ${f.median.toFixed(4)} [${f.lower5.toFixed(4)} - ${f.upper95.toFixed(4)}]`)
})
```

## Quick Analysis

For simple use cases:

```typescript
import { quickAnalysis } from '@regenerationism/third-order-sdk'

const { riskLevel, cumulativeRegeneration, collapseProb, confidenceRange } = quickAnalysis(data, 5)

console.log(`Risk: ${riskLevel}`)
console.log(`Cₕ: ${cumulativeRegeneration}`)
console.log(`95% CI: [${confidenceRange[0]}, ${confidenceRange[1]}]`)
```

## Scenario Analysis

Run what-if scenarios:

```typescript
import { ThirdOrderClient, PRESET_SCENARIOS } from '@regenerationism/third-order-sdk'

const client = new ThirdOrderClient()

// Use preset scenario
const result = await client.computeWithScenario(data, 'Fiscal Stimulus')

// Or define custom scenario
const response = await client.compute({
  data,
  scenarios: [
    {
      name: 'Custom Shock',
      description: 'My custom scenario',
      thrustShock: 20,      // +20% thrust
      dragShock: -10,       // -10% drag
      efficiencyShock: 5,   // +5% efficiency
      duration: 12          // for 12 months
    }
  ],
  includeForecastPaths: true
})

response.scenarioResults?.forEach(sr => {
  console.log(`${sr.scenario.name}: ${sr.impactDelta.toFixed(1)}% impact on Cₕ`)
})
```

## Available Preset Scenarios

| Name | Description |
|------|-------------|
| Fiscal Stimulus | +15% thrust, -5% drag for 12 months |
| Monetary Tightening | -10% thrust, +25% drag for 18 months |
| Productivity Boom | +5% thrust, -10% drag, +15% efficiency for 24 months |
| Supply Chain Crisis | -5% thrust, +30% drag, -10% efficiency for 12 months |
| Stagflation | -15% thrust, +20% drag for 24 months |
| Financial Crisis | -25% thrust, +40% drag, -20% efficiency for 18 months |
| Labor Liberation | +20% thrust, -15% drag, +5% efficiency for 24 months |

## Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `alpha` | 1.1 | Efficiency multiplier for compounding rate |
| `beta` | 0.8 | Friction penalty for compounding rate |
| `gamma` | 3.5 | Drag sensitivity for collapse probability |
| `theta` | 0.15 | Tipping threshold (calibrated to crisis peaks) |
| `lookbackMonths` | 6 | Window for averaging recent data |
| `horizonYears` | 5 | Forecast horizon |
| `iterations` | 1000 | Monte Carlo simulation paths |
| `volatilityMultiplier` | 1.0 | Scales stochastic shocks |

## Data Format

Each data point must include:

```typescript
interface NIVDataPoint {
  date: string        // ISO format: YYYY-MM-DD
  niv: number         // National Impact Velocity
  thrust: number      // Policy/liquidity impulse
  efficiency: number  // Capital productivity
  slack: number       // Economic headroom (0-1)
  drag: number        // Systemic friction
  isRecession?: boolean  // Optional recession flag
}
```

## Risk Levels

| Level | Collapse Probability | Interpretation |
|-------|---------------------|----------------|
| `low` | < 10% | Safe regeneration conditions |
| `moderate` | 10-25% | Some friction, monitor closely |
| `elevated` | 25-50% | Significant headwinds |
| `high` | 50-75% | Crisis conditions likely |
| `critical` | > 75% | Imminent collapse risk |

## TypeScript Support

This package is written in TypeScript and includes full type definitions:

```typescript
import type {
  NIVDataPoint,
  ThirdOrderParams,
  ThirdOrderResult,
  ForecastPath,
  ScenarioInput,
  ScenarioResult,
  RiskHeatmapCell
} from '@regenerationism/third-order-sdk'
```

## License

MIT

## Links

- [regenerationism.ai](https://regenerationism.ai) - Live dashboard
- [API Documentation](https://regenerationism.ai/api-docs) - Full API reference
- [GitHub](https://github.com/direncode/regenerationism) - Source code
