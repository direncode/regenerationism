# Regenerationism

**National Impact Velocity (NIV) — macro crisis detection engine.**

[![CI](https://github.com/direncode/regenerationism/actions/workflows/ci.yml/badge.svg)](https://github.com/direncode/regenerationism/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Rust](https://img.shields.io/badge/rust-1.75%2B-orange.svg)](https://www.rust-lang.org)

NIV measures the economy's "kinetic throughput" — how fast capital regenerates
versus friction losses — to detect liquidity shocks before they become
recessions. Out-of-sample, NIV reaches **0.85 AUC** for recession prediction,
ahead of the Fed yield curve (0.72) on the 2008 and 2020 cycles.

## Repository layout

| Path                      | Purpose                                              |
|---------------------------|------------------------------------------------------|
| `src/`                    | NIV calculation engine (Rust + Axum) — API server    |
| `regenerationism.ai/`     | Production deployment bundle (Rust engine + Next.js) |
| `docs/`                   | Methodology and out-of-sample reports                |
| `Dockerfile`, `fly.toml`  | Container + Fly.io deployment config                 |
| `vercel.json`             | Frontend deployment config                           |

## Quick start

### Run the engine locally

```bash
cargo run --release
# API listens on http://localhost:8080
```

### Hit the public API

```bash
curl https://api.regenerationism.ai/api/v1/latest
```

| Endpoint                  | Description                                   |
|---------------------------|-----------------------------------------------|
| `GET /api/v1/latest`      | Current NIV score, probability, components    |
| `GET /api/v1/history`     | Historical series with date filters           |
| `GET /api/v1/components`  | Component breakdown (thrust/efficiency/drag)  |
| `GET /api/v1/compare`     | NIV vs. Fed yield curve                       |
| `GET /health`             | Health check                                  |

Full docs: [regenerationism.ai/api-docs](https://regenerationism.ai/api-docs).

## The formula

```
NIV_t = (u_t · P_t²) / (X_t + F_t)^η
```

- **u** (Thrust) — `tanh(Fiscal + Monetary − Rates)`
- **P** (Efficiency) — `(Investment / GDP)²`
- **X** (Slack) — `1 − Capacity Utilization`
- **F** (Drag) — `Spread + Real Rates + Volatility`

See [`docs/NIV_Out_of_Sample_Methodology_and_Results.md`](docs/NIV_Out_of_Sample_Methodology_and_Results.md)
for the full derivation and validation.

## Data sources

All inputs come from [FRED](https://fred.stlouisfed.org/). A FRED API key is
required for live ingestion:

```bash
export FRED_API_KEY=your_key_here
```

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) and
the [Code of Conduct](CODE_OF_CONDUCT.md) before opening a pull request.

## Security

Report vulnerabilities privately per [SECURITY.md](SECURITY.md).

## License

Licensed under the [Apache License 2.0](LICENSE). See [NOTICE](NOTICE) for
attribution.
