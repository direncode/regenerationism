import { NextRequest, NextResponse } from 'next/server'

// S&P 500 Companies API - Fetches real financial data
// Uses Financial Modeling Prep API (free tier: 250 requests/day)

const FMP_API_KEY = process.env.FMP_API_KEY || 'demo'
const FMP_BASE_URL = 'https://financialmodelingprep.com/api/v3'

// Top S&P 500 companies by market cap (sample set for demo)
const SP500_TICKERS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK-B', 'UNH', 'JNJ',
  'V', 'XOM', 'JPM', 'WMT', 'PG', 'MA', 'HD', 'CVX', 'MRK', 'ABBV',
  'KO', 'PEP', 'COST', 'AVGO', 'TMO', 'MCD', 'CSCO', 'ACN', 'ABT', 'DHR'
]

interface CompanyFinancials {
  symbol: string
  name: string
  sector: string
  marketCap: number

  // Income Statement
  revenue: number
  costOfRevenue: number
  operatingExpenses: number
  interestExpense: number
  depreciationAndAmortization: number
  incomeTaxExpense: number
  netIncome: number

  // Balance Sheet
  cashAndEquivalents: number
  accountsReceivable: number
  inventory: number
  totalCurrentAssets: number
  propertyPlantEquipment: number
  totalAssets: number
  accountsPayable: number
  shortTermDebt: number
  totalCurrentLiabilities: number
  longTermDebt: number
  totalLiabilities: number
  totalEquity: number

  // Cash Flow
  operatingCashFlow: number
  capitalExpenditure: number
  dividendsPaid: number
  freeCashFlow: number

  // Calculated NIV Components
  nivComponents?: {
    thrust: number
    efficiency: number
    slack: number
    drag: number
    niv: number
  }
}

// Calculate NIV components from financial data
function calculateNIVFromFinancials(data: CompanyFinancials, prevRevenue?: number): CompanyFinancials['nivComponents'] {
  const eta = 1.5

  // THRUST: Growth momentum, cash generation
  const revenueGrowth = prevRevenue && prevRevenue > 0 ? (data.revenue - prevRevenue) / prevRevenue : 0.05
  const ocfToRevenue = data.revenue > 0 ? data.operatingCashFlow / data.revenue : 0
  const reinvestmentRate = data.operatingCashFlow > 0 ? Math.abs(data.capitalExpenditure) / data.operatingCashFlow : 0

  const thrust = Math.min(1, Math.max(0,
    Math.max(0, revenueGrowth) * 0.4 +
    Math.max(0, ocfToRevenue) * 0.35 +
    Math.min(1, reinvestmentRate) * 0.25
  ))

  // EFFICIENCY: Asset productivity
  const assetTurnover = data.totalAssets > 0 ? data.revenue / data.totalAssets : 0
  const roa = data.totalAssets > 0 ? data.netIncome / data.totalAssets : 0
  const operatingMargin = data.revenue > 0 ? (data.revenue - data.costOfRevenue - data.operatingExpenses) / data.revenue : 0

  const efficiency = Math.min(1, Math.max(0,
    Math.min(1, assetTurnover / 1.5) * 0.35 +
    Math.max(0, (roa + 0.05) / 0.2) * 0.35 +
    Math.max(0, (operatingMargin + 0.05) / 0.3) * 0.3
  ))

  // SLACK: Liquidity buffer
  const currentRatio = data.totalCurrentLiabilities > 0 ? data.totalCurrentAssets / data.totalCurrentLiabilities : 2
  const cashToRevenue = data.revenue > 0 ? data.cashAndEquivalents / (data.revenue / 4) : 0 // Quarters of cash
  const debtCapacity = data.totalEquity > 0 ? Math.max(0, 1 - (data.shortTermDebt + data.longTermDebt) / (data.totalEquity * 2)) : 0

  const slack = Math.min(1, Math.max(0,
    Math.min(1, Math.max(0, currentRatio - 1) / 2) * 0.35 +
    Math.min(1, cashToRevenue / 2) * 0.4 +
    debtCapacity * 0.25
  ))

  // DRAG: Friction and burden
  const ebitda = data.revenue - data.costOfRevenue - data.operatingExpenses + data.depreciationAndAmortization
  const debtServiceRatio = ebitda > 0 ? (data.interestExpense + data.shortTermDebt * 0.1) / ebitda : 1
  const interestCoverage = data.interestExpense > 0 ? ebitda / data.interestExpense : 10
  const interestBurden = Math.max(0, 1 - (interestCoverage - 1) / 9)
  const grossMargin = data.revenue > 0 ? (data.revenue - data.costOfRevenue) / data.revenue : 0
  const operatingInefficiency = Math.max(0, 0.5 - grossMargin) / 0.5

  const drag = Math.min(1, Math.max(0,
    Math.min(1, debtServiceRatio) * 0.35 +
    interestBurden * 0.3 +
    operatingInefficiency * 0.35
  ))

  // NIV Calculation
  const denominator = Math.pow(Math.max(0.1, slack + drag), eta)
  const nivRaw = (thrust * Math.pow(efficiency, 2)) / denominator
  const niv = Math.min(1, Math.max(-1, nivRaw))

  return { thrust, efficiency, slack, drag, niv }
}

// Simulated data generator for demo mode
function generateSimulatedCompanyData(symbol: string, index: number): CompanyFinancials {
  const sectors = ['Technology', 'Healthcare', 'Finance', 'Consumer', 'Energy', 'Industrial']
  const names: Record<string, string> = {
    'AAPL': 'Apple Inc.', 'MSFT': 'Microsoft Corp.', 'GOOGL': 'Alphabet Inc.',
    'AMZN': 'Amazon.com Inc.', 'NVDA': 'NVIDIA Corp.', 'META': 'Meta Platforms',
    'TSLA': 'Tesla Inc.', 'BRK-B': 'Berkshire Hathaway', 'UNH': 'UnitedHealth',
    'JNJ': 'Johnson & Johnson', 'V': 'Visa Inc.', 'XOM': 'Exxon Mobil',
    'JPM': 'JPMorgan Chase', 'WMT': 'Walmart Inc.', 'PG': 'Procter & Gamble',
    'MA': 'Mastercard', 'HD': 'Home Depot', 'CVX': 'Chevron Corp.',
    'MRK': 'Merck & Co.', 'ABBV': 'AbbVie Inc.', 'KO': 'Coca-Cola Co.',
    'PEP': 'PepsiCo Inc.', 'COST': 'Costco Wholesale', 'AVGO': 'Broadcom Inc.',
    'TMO': 'Thermo Fisher', 'MCD': "McDonald's Corp.", 'CSCO': 'Cisco Systems',
    'ACN': 'Accenture plc', 'ABT': 'Abbott Labs', 'DHR': 'Danaher Corp.'
  }

  // Generate realistic financial data with some variation
  const seed = symbol.charCodeAt(0) + symbol.charCodeAt(1) + index
  const random = (min: number, max: number) => min + ((seed * 9301 + 49297) % 233280) / 233280 * (max - min)

  const marketCap = (300 - index * 8) * 1e9 + random(-50, 50) * 1e9
  const revenue = marketCap * (0.15 + random(0, 0.2))
  const grossMargin = 0.35 + random(0, 0.3)
  const opexRatio = 0.15 + random(0, 0.1)

  const costOfRevenue = revenue * (1 - grossMargin)
  const operatingExpenses = revenue * opexRatio
  const depreciation = revenue * (0.03 + random(0, 0.02))
  const interestExpense = revenue * (0.01 + random(0, 0.02))
  const ebit = revenue - costOfRevenue - operatingExpenses
  const taxRate = 0.21 + random(0, 0.05)
  const incomeTax = Math.max(0, ebit - interestExpense) * taxRate
  const netIncome = ebit - interestExpense - incomeTax

  const totalAssets = revenue * (1.5 + random(0, 1))
  const currentRatio = 1.2 + random(0, 1)
  const debtToEquity = 0.3 + random(0, 0.7)

  const totalEquity = totalAssets / (1 + debtToEquity)
  const totalLiabilities = totalAssets - totalEquity
  const totalCurrentLiabilities = totalLiabilities * (0.3 + random(0, 0.2))
  const totalCurrentAssets = totalCurrentLiabilities * currentRatio

  const data: CompanyFinancials = {
    symbol,
    name: names[symbol] || `${symbol} Corp.`,
    sector: sectors[index % sectors.length],
    marketCap,
    revenue,
    costOfRevenue,
    operatingExpenses,
    interestExpense,
    depreciationAndAmortization: depreciation,
    incomeTaxExpense: incomeTax,
    netIncome,
    cashAndEquivalents: totalCurrentAssets * (0.3 + random(0, 0.3)),
    accountsReceivable: totalCurrentAssets * (0.2 + random(0, 0.15)),
    inventory: totalCurrentAssets * (0.1 + random(0, 0.2)),
    totalCurrentAssets,
    propertyPlantEquipment: totalAssets * (0.3 + random(0, 0.2)),
    totalAssets,
    accountsPayable: totalCurrentLiabilities * (0.4 + random(0, 0.2)),
    shortTermDebt: totalCurrentLiabilities * (0.2 + random(0, 0.2)),
    totalCurrentLiabilities,
    longTermDebt: totalLiabilities - totalCurrentLiabilities,
    totalLiabilities,
    totalEquity,
    operatingCashFlow: netIncome * (1.1 + random(0, 0.3)),
    capitalExpenditure: -revenue * (0.04 + random(0, 0.04)),
    dividendsPaid: -netIncome * (0.2 + random(0, 0.3)),
    freeCashFlow: netIncome * (0.8 + random(0, 0.4))
  }

  data.nivComponents = calculateNIVFromFinancials(data)
  return data
}

// Fetch real data from Financial Modeling Prep API
async function fetchRealCompanyData(symbol: string): Promise<CompanyFinancials | null> {
  try {
    // Fetch income statement, balance sheet, and cash flow in parallel
    const [incomeRes, balanceRes, cashFlowRes, profileRes] = await Promise.all([
      fetch(`${FMP_BASE_URL}/income-statement/${symbol}?limit=1&apikey=${FMP_API_KEY}`),
      fetch(`${FMP_BASE_URL}/balance-sheet-statement/${symbol}?limit=1&apikey=${FMP_API_KEY}`),
      fetch(`${FMP_BASE_URL}/cash-flow-statement/${symbol}?limit=1&apikey=${FMP_API_KEY}`),
      fetch(`${FMP_BASE_URL}/profile/${symbol}?apikey=${FMP_API_KEY}`)
    ])

    if (!incomeRes.ok || !balanceRes.ok || !cashFlowRes.ok || !profileRes.ok) {
      return null
    }

    const [incomeData, balanceData, cashFlowData, profileData] = await Promise.all([
      incomeRes.json(),
      balanceRes.json(),
      cashFlowRes.json(),
      profileRes.json()
    ])

    if (!incomeData[0] || !balanceData[0] || !cashFlowData[0] || !profileData[0]) {
      return null
    }

    const income = incomeData[0]
    const balance = balanceData[0]
    const cashFlow = cashFlowData[0]
    const profile = profileData[0]

    const data: CompanyFinancials = {
      symbol,
      name: profile.companyName || symbol,
      sector: profile.sector || 'Unknown',
      marketCap: profile.mktCap || 0,
      revenue: income.revenue || 0,
      costOfRevenue: income.costOfRevenue || 0,
      operatingExpenses: income.operatingExpenses || 0,
      interestExpense: income.interestExpense || 0,
      depreciationAndAmortization: income.depreciationAndAmortization || 0,
      incomeTaxExpense: income.incomeTaxExpense || 0,
      netIncome: income.netIncome || 0,
      cashAndEquivalents: balance.cashAndCashEquivalents || 0,
      accountsReceivable: balance.netReceivables || 0,
      inventory: balance.inventory || 0,
      totalCurrentAssets: balance.totalCurrentAssets || 0,
      propertyPlantEquipment: balance.propertyPlantEquipmentNet || 0,
      totalAssets: balance.totalAssets || 0,
      accountsPayable: balance.accountPayables || 0,
      shortTermDebt: balance.shortTermDebt || 0,
      totalCurrentLiabilities: balance.totalCurrentLiabilities || 0,
      longTermDebt: balance.longTermDebt || 0,
      totalLiabilities: balance.totalLiabilities || 0,
      totalEquity: balance.totalStockholdersEquity || 0,
      operatingCashFlow: cashFlow.operatingCashFlow || 0,
      capitalExpenditure: cashFlow.capitalExpenditure || 0,
      dividendsPaid: cashFlow.dividendsPaid || 0,
      freeCashFlow: cashFlow.freeCashFlow || 0
    }

    data.nivComponents = calculateNIVFromFinancials(data)
    return data
  } catch (error) {
    console.error(`Error fetching data for ${symbol}:`, error)
    return null
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get('mode') || 'demo' // 'demo' or 'live'
  const symbols = searchParams.get('symbols')?.split(',') || SP500_TICKERS.slice(0, 20)

  try {
    let companies: CompanyFinancials[]

    if (mode === 'live' && FMP_API_KEY !== 'demo') {
      // Fetch real data from API
      const results = await Promise.all(
        symbols.map(symbol => fetchRealCompanyData(symbol.trim().toUpperCase()))
      )
      companies = results.filter((c): c is CompanyFinancials => c !== null)
    } else {
      // Use simulated data for demo
      companies = symbols.map((symbol, index) =>
        generateSimulatedCompanyData(symbol.trim().toUpperCase(), index)
      )
    }

    // Sort by NIV (highest regeneration potential first)
    companies.sort((a, b) => (b.nivComponents?.niv || 0) - (a.nivComponents?.niv || 0))

    // Calculate aggregate statistics
    const aggregates = {
      totalMarketCap: companies.reduce((sum, c) => sum + c.marketCap, 0),
      avgNIV: companies.reduce((sum, c) => sum + (c.nivComponents?.niv || 0), 0) / companies.length,
      avgThrust: companies.reduce((sum, c) => sum + (c.nivComponents?.thrust || 0), 0) / companies.length,
      avgEfficiency: companies.reduce((sum, c) => sum + (c.nivComponents?.efficiency || 0), 0) / companies.length,
      avgSlack: companies.reduce((sum, c) => sum + (c.nivComponents?.slack || 0), 0) / companies.length,
      avgDrag: companies.reduce((sum, c) => sum + (c.nivComponents?.drag || 0), 0) / companies.length,
      topPerformers: companies.slice(0, 5).map(c => c.symbol),
      bottomPerformers: companies.slice(-5).map(c => c.symbol)
    }

    return NextResponse.json({
      success: true,
      mode: mode === 'live' && FMP_API_KEY !== 'demo' ? 'live' : 'demo',
      timestamp: new Date().toISOString(),
      count: companies.length,
      aggregates,
      companies
    })
  } catch (error) {
    console.error('S&P 500 API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch company data' },
      { status: 500 }
    )
  }
}
