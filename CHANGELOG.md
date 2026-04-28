# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- Relicensed from MIT to Apache License 2.0.
- Reorganized repository for top-tier open-source standards: added
  `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `NOTICE`,
  root `README.md`, CI workflow, Dependabot, issue and PR templates,
  `.editorconfig`, and `rustfmt.toml`.

## [1.0.0] - 2025-01-15

### Added
- Initial public release of the NIV calculation engine.
- Axum-based HTTP API with `/api/v1/latest`, `/history`, `/components`,
  `/compare` endpoints.
- FRED data ingestion with in-memory caching.
- Out-of-sample validation across 1960-present (0.85 AUC).
- Next.js dashboard at regenerationism.ai.

[Unreleased]: https://github.com/direncode/regenerationism/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/direncode/regenerationism/releases/tag/v1.0.0
