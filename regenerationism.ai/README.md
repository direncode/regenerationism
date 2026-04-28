# Regenerationism.ai — deployment bundle

This directory packages the production deployment of the NIV engine and the
Next.js dashboard served at [regenerationism.ai](https://regenerationism.ai).

For project overview, methodology, formula, and contribution guide, see the
[root README](../README.md).

## Layout

```
regenerationism.ai/
├── rust-engine/    # API server (Rust + Axum)
├── frontend/       # Dashboard (Next.js 14)
└── analysis/       # Notebooks and supporting analysis
```

## Run locally

```bash
# Engine
cd rust-engine
cargo run --release           # http://localhost:8080

# Frontend
cd ../frontend
npm install && npm run dev    # http://localhost:3000
```

## License

Licensed under the [Apache License 2.0](../LICENSE).
