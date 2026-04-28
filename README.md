<div align="center">

# Regenerationism

**National Impact Velocity (NIV) — macro crisis detection engine.**

[![CI](https://github.com/direncode/regenerationism/actions/workflows/ci.yml/badge.svg)](https://github.com/direncode/regenerationism/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Rust](https://img.shields.io/badge/rust-1.75%2B-orange.svg)](https://www.rust-lang.org)
[![Live](https://img.shields.io/badge/demo-regenerationism.ai-success)](https://regenerationism.ai)

[Live dashboard](https://regenerationism.ai) · [API](https://api.regenerationism.ai) · [Methodology](docs/NIV_Out_of_Sample_Methodology_and_Results.md) · [Changelog](CHANGELOG.md)

</div>

---

NIV measures the economy's kinetic throughput — how fast capital regenerates
against friction losses — to detect liquidity shocks before they become
recessions. Out-of-sample on six decades of FRED data, NIV reaches **0.85 AUC**
for recession prediction, ahead of the Fed yield curve (0.72) on both the 2008
and 2020 cycles.

## Performance

|                                | NIV         | Fed yield curve |
|--------------------------------|-------------|-----------------|
| AUC (recession prediction)     | **0.85**    | 0.72            |
| False-positive rate            | **12%**     | 18%             |
| 2008 cycle — first signal      | **Jul 2007** | Dec 2007       |
| 2020 cycle — first signal      | **Dec 2019** | Feb 2020       |

Reproduce: [`docs/NIV_Out_of_Sample_Methodology_and_Results.md`](docs/NIV_Out_of_Sample_Methodology_and_Results.md).

## The formula

```
NIV_t = (u_t · P_t²) / (X_t + F_t)^η
```

| Term | Meaning      | Definition                                   |
|------|--------------|----------------------------------------------|
| `u`  | Thrust       | `tanh(Fiscal + Monetary − Rates)`            |
| `P`  | Efficiency   | `(Investment / GDP)²`                        |
| `X`  | Slack        | `1 − Capacity Utilization`                   |
| `F`  | Drag         | `Spread + Real Rates + Volatility`           |
| `η`  | Drag exponent | calibrated on out-of-sample fit             |

## Quick start

```bash
# Engine (Rust)
export FRED_API_KEY=your_key
cargo run --release            # listens on :8080

# Frontend (Next.js)
cd regenerationism.ai/frontend
npm install && npm run dev     # http://localhost:3000
```

Or hit the hosted API directly:

```bash
curl https://api.regenerationism.ai/api/v1/latest
```

| Endpoint                 | Description                                   |
|--------------------------|-----------------------------------------------|
| `GET /api/v1/latest`     | Current NIV score, probability, components    |
| `GET /api/v1/history`    | Historical series with date filters           |
| `GET /api/v1/components` | Component breakdown (thrust/efficiency/drag)  |
| `GET /api/v1/compare`    | NIV vs. Fed yield curve                       |
| `GET /health`            | Health check                                  |

Full reference: [regenerationism.ai/api-docs](https://regenerationism.ai/api-docs).

## Repository layout

```
.
├── src/                          # Rust engine (Axum) — production binary
├── regenerationism.ai/
│   ├── rust-engine/              # Engine bundled for deployment
│   └── frontend/                 # Next.js 14 dashboard
├── docs/                         # Methodology and OOS reports
├── Dockerfile, fly.toml          # Container + Fly.io
└── vercel.json                   # Frontend deployment
```

## Data

All inputs come from [FRED](https://fred.stlouisfed.org/) (Federal Reserve
Bank of St. Louis). Get a free API key
[here](https://fred.stlouisfed.org/docs/api/api_key.html).

| Series      | Description                          |
|-------------|--------------------------------------|
| `GPDIC1`    | Gross Private Domestic Investment    |
| `M2SL`      | M2 Money Supply                      |
| `FEDFUNDS`  | Federal Funds Rate                   |
| `GDPC1`     | Real GDP                             |
| `TCU`       | Total Capacity Utilization           |
| `T10Y3M`    | 10Y–3M Treasury Spread               |
| `CPIAUCSL`  | CPI (inflation)                      |

## Contributing

Pull requests are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) and
the [Code of Conduct](CODE_OF_CONDUCT.md) before opening one. Report
vulnerabilities privately per [SECURITY.md](SECURITY.md).

## Citation

If you use NIV in academic or applied work, please cite:

```bibtex
@software{regenerationism_niv,
  author  = {Akkocdemir, Diren},
  title   = {Regenerationism: National Impact Velocity (NIV) Engine},
  year    = {2026},
  url     = {https://github.com/direncode/regenerationism},
  license = {Apache-2.0}
}
```

## License

Licensed under the [Apache License 2.0](LICENSE). See [NOTICE](NOTICE) for
attribution.
