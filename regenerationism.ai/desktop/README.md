# Regenerationism NIV Analyzer

Desktop application for Third-Order Accounting and National Impact Velocity (NIV) analysis.

## Features

- **NIV Calculator**: Full formula implementation with real-time component analysis
- **Third-Order Engine**: 5-year projections with customizable parameters
- **S&P 500 Analysis**: Analyze top companies with NIV scoring and financial data
- **AI Decision Engine**: Company-specific insights and optimization recommendations
- **Data Provenance**: Trace NIV components back to financial statement line items
- **Offline Capable**: Works without internet connection

## Installation

### Windows Installer
1. Download `RegenerationismNIV-Setup-1.0.0.exe`
2. Run the installer
3. Follow the installation wizard
4. Launch from Start Menu or Desktop shortcut

### Portable Version
1. Download `RegenerationismNIV-1.0.0-portable.exe`
2. Run directly - no installation required

## Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup
```bash
cd desktop
npm install
```

### Run in Development
```bash
npm start
```

### Build for Production
```bash
# Windows
npm run build:win

# All platforms
npm run build
```

## NIV Formula

```
NIV = (T x E^2) / (S + D)^n
```

Where:
- **T** = Thrust (growth momentum)
- **E** = Efficiency (asset productivity)
- **S** = Slack (liquidity buffer)
- **D** = Drag (friction forces)
- **n** = 1.5 (sensitivity parameter)

## Third-Order Projection

```
Ch = NIV0 x e^(rh x h) x (1 - ph)
```

Where:
- **Ch** = Cumulative regenerated capital after horizon h
- **rh** = Effective rate (a x NIV - b x Drag)
- **ph** = Collapse probability

## License

MIT
