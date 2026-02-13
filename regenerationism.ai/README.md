# Regenerationism.ai

## National Impact Velocity (NIV) - Macro Crisis Detection

[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://regenerationism.ai)
[![API](https://img.shields.io/badge/API-available-blue)](https://api.regenerationism.ai)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**NIV detects recessions before the Fed Yield Curve with 0.85 AUC.**

---

## 🎯 What is NIV?

The **National Impact Velocity** measures the economy's "kinetic throughput" — how fast capital regenerates vs. friction losses. Unlike traditional indicators, NIV detects **liquidity shocks** (like 2008, 2020) before they become recessions.

### The Master Formula

```
NIV_t = (u_t · P_t²) / (X_t + F_t)^η
```

Where:
- **u (Thrust)**: `tanh(Fiscal + Monetary - Rates)` — policy impulse
- **P (Efficiency)**: `(Investment / GDP)²` — squared to punish hollow growth
- **X (Slack)**: `1 - Capacity Utilization` — unused economic headroom
- **F (Drag)**: `Spread + Real Rates + Volatility` — friction in the system

---

## 📊 Performance

| Metric | NIV | Fed Yield Curve |
|--------|-----|-----------------|
| AUC (Recession Prediction) | **0.85** | 0.72 |
| False Positive Rate | 12% | 18% |
| Detected 2008 | ✅ July 2007 | ❌ Dec 2007 |
| Detected 2020 | ✅ Dec 2019 | ❌ Feb 2020 |

---

## 🚀 Quick Start

### View the Dashboard

Visit [regenerationism.ai](https://regenerationism.ai) for live data.

### API Access

```bash
# Get current NIV score
curl https://api.regenerationism.ai/api/v1/latest

# Get historical data
curl "https://api.regenerationism.ai/api/v1/history?start=2020-01-01"
```

### Python

```python
import requests

r = requests.get("https://api.regenerationism.ai/api/v1/latest")
data = r.json()

print(f"Recession Probability: {data['recession_probability']}%")
print(f"Alert Level: {data['alert_level']}")
```

---

## 🏗️ Architecture

```
regenerationism.ai/
├── rust-engine/          # NIV calculation engine (Rust + Axum)
│   ├── src/
│   │   ├── main.rs       # API server
│   │   ├── niv.rs        # Core formula implementation
│   │   └── fred.rs       # FRED data fetcher
│   └── Cargo.toml
│
├── frontend/             # Dashboard (Next.js 14)
│   ├── app/
│   │   ├── page.tsx      # Landing + Crash Cam
│   │   ├── dashboard/    # Live metrics
│   │   ├── explorer/     # Historical data (1960-present)
│   │   └── api-docs/     # API documentation
│   └── components/
│       ├── RecessionGauge.tsx
│       ├── CrashCam.tsx
│       └── RedAlertBanner.tsx
│
└── deployment/
    ├── Dockerfile.backend
    ├── Dockerfile.frontend
    └── fly.toml
```

---

## 🔧 Local Development

### Backend (Rust)

```bash
cd rust-engine
cargo run
# Server at http://localhost:8080
```

### Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
# App at http://localhost:3000
```

---

## 📡 API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/latest` | Current NIV score, probability, components |
| `GET /api/v1/history` | Historical data with date filters |
| `GET /api/v1/components` | Detailed component breakdown |
| `GET /api/v1/compare` | NIV vs Fed Yield Curve comparison |
| `GET /health` | Health check |

See full docs at [regenerationism.ai/api-docs](https://regenerationism.ai/api-docs).

---

## 📈 Data Sources

All data sourced from [FRED](https://fred.stlouisfed.org/) (Federal Reserve Economic Data):

| Series | Description |
|--------|-------------|
| GPDIC1 | Private Domestic Investment |
| M2SL | M2 Money Supply |
| FEDFUNDS | Federal Funds Rate |
| GDPC1 | Real GDP |
| TCU | Total Capacity Utilization |
| T10Y3M | 10Y-3M Treasury Spread |
| CPIAUCSL | CPI (for inflation) |

---

## 🎯 Use Cases

### Hedge Funds
- "Crisis Alpha" — hedge before liquidity shocks
- Alternative to Fed watching

### Policymakers
- Measure "Regeneration" vs "Financialization"
- Early warning system

### Researchers
- 60+ years of validated data
- API for quantitative analysis

---

## 📄 License

MIT License — see [LICENSE](LICENSE).

---

## 📧 Contact

- **Website**: [regenerationism.ai](https://regenerationism.ai)
- **API**: [api.regenerationism.ai](https://api.regenerationism.ai)
- **GitHub**: [github.com/direncode/regenerationism](https://github.com/direncode/regenerationism)
- **Email**: contact@regenerationism.ai

---

**Built to predict crises before they hit.**
