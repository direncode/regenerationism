# Security Policy

## Supported versions

Only the latest minor release on `main` receives security fixes.

| Version | Supported |
|---------|-----------|
| 1.x     | Yes       |
| < 1.0   | No        |

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security problems.

Email `security@regenerationism.ai` with:

- A description of the issue and its impact
- Steps to reproduce (PoC code, requests, or configuration)
- Affected versions or commit SHAs
- Your name and a link if you'd like credit

You can expect:

- An acknowledgment within **3 business days**
- A triage assessment within **7 business days**
- A fix or mitigation timeline communicated within **30 days**

We follow coordinated disclosure: please give us a reasonable window to
ship a fix before publishing details. We're happy to credit reporters in
the release notes.

## Scope

In scope:

- The Rust API server (`src/`, `regenerationism.ai/rust-engine/`)
- The Next.js frontend (`regenerationism.ai/frontend/`)
- Container and deployment configuration in this repository

Out of scope:

- Issues that require a compromised host or browser
- Denial of service via raw resource exhaustion
- Findings against third-party services (FRED, Fly.io, Vercel)
