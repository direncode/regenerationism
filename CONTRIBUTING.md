# Contributing to Regenerationism

Thanks for your interest in improving NIV. This document explains how to
propose changes effectively.

## Code of Conduct

This project adheres to the [Contributor Covenant](CODE_OF_CONDUCT.md). By
participating you agree to uphold it. Report unacceptable behavior to
`conduct@regenerationism.ai`.

## Ways to contribute

- **Bug reports** — open an issue using the bug template with a reproducer.
- **Feature proposals** — open a feature-request issue first; we'd rather
  discuss design before you write code.
- **Methodology** — improvements to the NIV formula, OOS validation, or new
  FRED series should include a short writeup in `docs/`.
- **Documentation** — typo fixes and clarifications are always welcome.

## Development setup

```bash
git clone https://github.com/direncode/regenerationism.git
cd regenerationism
cargo build
cargo test
```

You'll need a [FRED API key](https://fred.stlouisfed.org/docs/api/api_key.html)
for any code path that hits the data layer:

```bash
export FRED_API_KEY=...
```

### Frontend

```bash
cd regenerationism.ai/frontend
npm install
npm run dev
```

## Pull request checklist

Before requesting review:

- [ ] `cargo fmt --all` is clean
- [ ] `cargo clippy --all-targets --all-features -- -D warnings` passes
- [ ] `cargo test --all` passes
- [ ] New behavior has a test or a reproducer
- [ ] User-visible changes are noted in `CHANGELOG.md` under `## [Unreleased]`
- [ ] Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/)
      (e.g. `fix:`, `feat:`, `docs:`, `refactor:`)

## Commit style

```
<type>(<scope>): <short summary>

<body explaining the why, not the what>

<footer with breaking-change notes or issue refs>
```

Common types: `feat`, `fix`, `docs`, `refactor`, `test`, `perf`, `build`,
`ci`, `chore`.

## Reviews

A maintainer will review within a few business days. We may ask for changes;
please don't take that personally. Once approved, a maintainer will merge.

## Licensing

By submitting a contribution you agree that your work will be licensed under
the [Apache License 2.0](LICENSE). You retain copyright on your contribution.
