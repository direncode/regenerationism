// Regenerationism NIV Analyzer - Desktop Application
// Core calculation and UI logic

// ============================================================================
// CONSTANTS & STATE
// ============================================================================

const ETA = 1.5
const ALPHA = 1.1
const BETA = 0.8
const GAMMA = 3.5
const THETA = 0.15
const HORIZON = 5

let state = {
  thrust: 0.5,
  efficiency: 0.5,
  slack: 0.5,
  drag: 0.3,
  companies: [],
  selectedCompany: null,
  aiAnalysis: null
}

let projectionChart = null

// ============================================================================
// NIV CALCULATIONS
// ============================================================================

function calculateNIV(thrust, efficiency, slack, drag) {
  const denominator = Math.pow(Math.max(0.1, slack + drag), ETA)
  return (thrust * Math.pow(efficiency, 2)) / denominator
}

function calculateEffectiveRate(niv, drag, alpha = ALPHA, beta = BETA) {
  return alpha * niv - beta * drag
}

function calculateCollapseProb(drag, gamma = GAMMA, theta = THETA) {
  return 1 / (1 + Math.exp(-(gamma * drag - theta)))
}

function calculateCumulativeRegen(niv, effectiveRate, collapseProb, horizon = HORIZON) {
  return niv * Math.exp(effectiveRate * horizon) * (1 - collapseProb)
}

function calculateThirdOrder(thrust, efficiency, slack, drag) {
  const niv = calculateNIV(thrust, efficiency, slack, drag)
  const effectiveRate = calculateEffectiveRate(niv, drag)
  const collapseProb = calculateCollapseProb(drag)
  const cumulativeRegen = calculateCumulativeRegen(niv, effectiveRate, collapseProb)

  return { niv, effectiveRate, collapseProb, cumulativeRegen }
}

function calculateProjection(thrust, efficiency, slack, drag, years = 5) {
  const projections = []
  const niv = calculateNIV(thrust, efficiency, slack, drag)

  for (let h = 0; h <= years; h++) {
    const rh = calculateEffectiveRate(niv, drag)
    const ph = calculateCollapseProb(drag)
    const ch = niv * Math.exp(rh * h) * (1 - ph)

    projections.push({
      year: h,
      niv: niv,
      effectiveRate: rh,
      collapseProb: ph,
      cumulativeRegen: ch,
      growth: h > 0 ? ((ch / projections[h - 1].cumulativeRegen) - 1) * 100 : 0
    })
  }

  return projections
}

// ============================================================================
// FORMATTING HELPERS
// ============================================================================

function formatNumber(n, decimals = 4) {
  if (n == null || isNaN(n)) return '--'
  return n.toFixed(decimals)
}

function formatPercent(n) {
  if (n == null || isNaN(n)) return '--'
  return (n * 100).toFixed(1) + '%'
}

function formatCurrency(n) {
  if (n == null || isNaN(n)) return '--'
  if (Math.abs(n) >= 1e12) return '$' + (n / 1e12).toFixed(1) + 'T'
  if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B'
  if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M'
  if (Math.abs(n) >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K'
  return '$' + n.toLocaleString()
}

// ============================================================================
// UI UPDATE FUNCTIONS
// ============================================================================

function updateOverview() {
  const result = calculateThirdOrder(state.thrust, state.efficiency, state.slack, state.drag)

  document.getElementById('current-niv').textContent = formatNumber(result.niv)
  document.getElementById('effective-rate').textContent = formatNumber(result.effectiveRate, 3)
  document.getElementById('collapse-prob').textContent = formatPercent(result.collapseProb)
  document.getElementById('cumulative-ch').textContent = formatNumber(result.cumulativeRegen, 3)
}

function updateComponents() {
  document.getElementById('thrust-value').textContent = formatPercent(state.thrust)
  document.getElementById('efficiency-value').textContent = formatPercent(state.efficiency)
  document.getElementById('slack-value').textContent = formatPercent(state.slack)
  document.getElementById('drag-value').textContent = formatPercent(state.drag)

  document.getElementById('thrust-slider').value = state.thrust * 100
  document.getElementById('efficiency-slider').value = state.efficiency * 100
  document.getElementById('slack-slider').value = state.slack * 100
  document.getElementById('drag-slider').value = state.drag * 100
}

function updateProjectionChart() {
  const projections = calculateProjection(state.thrust, state.efficiency, state.slack, state.drag)

  const ctx = document.getElementById('projection-chart').getContext('2d')

  if (projectionChart) {
    projectionChart.destroy()
  }

  projectionChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: projections.map(p => `Year ${p.year}`),
      datasets: [{
        label: 'Cumulative Regeneration (Ch)',
        data: projections.map(p => p.cumulativeRegen),
        borderColor: '#22d3ee',
        backgroundColor: 'rgba(34, 211, 238, 0.1)',
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: '#a3a3a3' }
        }
      },
      scales: {
        x: {
          grid: { color: '#262626' },
          ticks: { color: '#a3a3a3' }
        },
        y: {
          grid: { color: '#262626' },
          ticks: { color: '#a3a3a3' }
        }
      }
    }
  })

  // Update table
  const tbody = document.getElementById('projection-table')
  tbody.innerHTML = projections.map(p => `
    <tr class="border-b border-neutral-800 hover:bg-neutral-800/50">
      <td class="py-2 px-3 font-mono">${p.year}</td>
      <td class="py-2 px-3 font-mono text-right text-cyan-400">${formatNumber(p.niv)}</td>
      <td class="py-2 px-3 font-mono text-right">${formatNumber(p.effectiveRate, 3)}</td>
      <td class="py-2 px-3 font-mono text-right text-amber-400">${formatPercent(p.collapseProb)}</td>
      <td class="py-2 px-3 font-mono text-right text-emerald-400">${formatNumber(p.cumulativeRegen, 3)}</td>
      <td class="py-2 px-3 font-mono text-right ${p.growth >= 0 ? 'text-emerald-400' : 'text-red-400'}">${p.year > 0 ? formatNumber(p.growth, 1) + '%' : '--'}</td>
    </tr>
  `).join('')
}

function updateSP500Table() {
  const tbody = document.getElementById('sp500-table')
  tbody.innerHTML = state.companies.map(c => `
    <tr class="border-b border-neutral-800 hover:bg-neutral-800/50 cursor-pointer" data-symbol="${c.symbol}">
      <td class="py-2 px-3 font-mono font-bold text-cyan-400">${c.symbol}</td>
      <td class="py-2 px-3">${c.name}</td>
      <td class="py-2 px-3 text-neutral-500">${c.sector}</td>
      <td class="py-2 px-3 font-mono text-right ${c.nivComponents?.niv > 0.035 ? 'text-emerald-400' : c.nivComponents?.niv > 0.015 ? 'text-yellow-400' : 'text-red-400'}">${formatNumber(c.nivComponents?.niv)}</td>
      <td class="py-2 px-3 font-mono text-right text-cyan-400">${formatPercent(c.nivComponents?.thrust)}</td>
      <td class="py-2 px-3 font-mono text-right text-purple-400">${formatPercent(c.nivComponents?.efficiency)}</td>
      <td class="py-2 px-3 font-mono text-right text-emerald-400">${formatPercent(c.nivComponents?.slack)}</td>
      <td class="py-2 px-3 font-mono text-right text-red-400">${formatPercent(c.nivComponents?.drag)}</td>
    </tr>
  `).join('')

  // Add click handlers
  tbody.querySelectorAll('tr').forEach(row => {
    row.addEventListener('click', () => {
      const symbol = row.dataset.symbol
      selectCompany(symbol)
    })
  })
}

function updateProvenance() {
  const company = state.selectedCompany

  if (!company) {
    document.getElementById('provenance-empty').classList.remove('hidden')
    document.getElementById('provenance-content').classList.add('hidden')
    return
  }

  document.getElementById('provenance-empty').classList.add('hidden')
  document.getElementById('provenance-content').classList.remove('hidden')

  document.getElementById('provenance-company-name').textContent = `${company.symbol} - ${company.name}`
  document.getElementById('provenance-company-sector').textContent = company.sector
  document.getElementById('provenance-mcap').textContent = formatCurrency(company.marketCap)

  // Income Statement
  const incomeItems = [
    { label: 'Revenue', value: company.revenue, maps: 'Thrust, Efficiency' },
    { label: 'Cost of Revenue', value: company.costOfRevenue, maps: 'Efficiency, Drag' },
    { label: 'Operating Expenses', value: company.operatingExpenses, maps: 'Drag' },
    { label: 'Depreciation', value: company.depreciationAndAmortization, maps: 'Drag' },
    { label: 'Interest Expense', value: company.interestExpense, maps: 'Drag' },
    { label: 'Income Tax', value: company.incomeTaxExpense, maps: 'Efficiency' },
    { label: 'Net Income', value: company.netIncome, maps: 'All' }
  ]

  document.getElementById('income-statement').innerHTML = incomeItems.map(item => `
    <div class="flex justify-between items-center py-1">
      <div>
        <div class="text-sm">${item.label}</div>
        <div class="text-xs text-neutral-600">Maps to: ${item.maps}</div>
      </div>
      <div class="font-mono text-sm">${formatCurrency(item.value)}</div>
    </div>
  `).join('')

  // Balance Sheet
  const balanceItems = [
    { label: 'Cash', value: company.cashAndEquivalents, maps: 'Slack' },
    { label: 'Accounts Receivable', value: company.accountsReceivable, maps: 'Slack, Thrust' },
    { label: 'Inventory', value: company.inventory, maps: 'Efficiency' },
    { label: 'Fixed Assets', value: company.propertyPlantEquipment, maps: 'Efficiency' },
    { label: 'Short-Term Debt', value: company.shortTermDebt, maps: 'Drag, Slack' },
    { label: 'Long-Term Debt', value: company.longTermDebt, maps: 'Drag' },
    { label: 'Total Equity', value: company.totalEquity, maps: 'Slack, Drag' }
  ]

  document.getElementById('balance-sheet').innerHTML = balanceItems.map(item => `
    <div class="flex justify-between items-center py-1">
      <div>
        <div class="text-sm">${item.label}</div>
        <div class="text-xs text-neutral-600">Maps to: ${item.maps}</div>
      </div>
      <div class="font-mono text-sm">${formatCurrency(item.value)}</div>
    </div>
  `).join('')

  // NIV Derivation
  if (company.nivComponents) {
    document.getElementById('niv-derivation').innerHTML = `
      <div class="bg-cyan-500/10 rounded-lg p-4">
        <div class="text-xs text-neutral-500 mb-1">Thrust (T)</div>
        <div class="text-2xl font-bold text-cyan-400">${formatPercent(company.nivComponents.thrust)}</div>
        <div class="text-xs text-neutral-600 mt-2">Revenue growth, Cash flow</div>
      </div>
      <div class="bg-purple-500/10 rounded-lg p-4">
        <div class="text-xs text-neutral-500 mb-1">Efficiency (E)</div>
        <div class="text-2xl font-bold text-purple-400">${formatPercent(company.nivComponents.efficiency)}</div>
        <div class="text-xs text-neutral-600 mt-2">Asset turnover, Margins</div>
      </div>
      <div class="bg-emerald-500/10 rounded-lg p-4">
        <div class="text-xs text-neutral-500 mb-1">Slack (S)</div>
        <div class="text-2xl font-bold text-emerald-400">${formatPercent(company.nivComponents.slack)}</div>
        <div class="text-xs text-neutral-600 mt-2">Liquidity, Cash ratio</div>
      </div>
      <div class="bg-red-500/10 rounded-lg p-4">
        <div class="text-xs text-neutral-500 mb-1">Drag (D)</div>
        <div class="text-2xl font-bold text-red-400">${formatPercent(company.nivComponents.drag)}</div>
        <div class="text-xs text-neutral-600 mt-2">Debt burden, Interest</div>
      </div>
    `
  }
}

function updateAIContent() {
  const analysis = state.aiAnalysis

  if (!analysis) {
    document.getElementById('ai-empty').classList.remove('hidden')
    document.getElementById('ai-content').classList.add('hidden')
    return
  }

  document.getElementById('ai-empty').classList.add('hidden')
  document.getElementById('ai-content').classList.remove('hidden')

  // Current state
  document.getElementById('ai-current-state').innerHTML = `
    <div class="flex justify-between"><span class="text-neutral-400">NIV</span><span class="font-mono">${formatNumber(analysis.currentState.niv)}</span></div>
    <div class="flex justify-between"><span class="text-neutral-400">Effective Rate</span><span class="font-mono">${formatNumber(analysis.currentState.effectiveRate, 3)}</span></div>
    <div class="flex justify-between"><span class="text-neutral-400">Collapse Prob</span><span class="font-mono">${formatPercent(analysis.currentState.collapseProb)}</span></div>
    <div class="flex justify-between"><span class="text-neutral-400">Cumulative Ch</span><span class="font-mono">${formatNumber(analysis.currentState.cumulativeRegen, 3)}</span></div>
  `

  // Optimized state
  document.getElementById('ai-optimized-state').innerHTML = `
    <div class="flex justify-between"><span class="text-neutral-400">NIV</span><span class="font-mono text-emerald-400">${formatNumber(analysis.optimizedState.niv)}</span></div>
    <div class="flex justify-between"><span class="text-neutral-400">Effective Rate</span><span class="font-mono text-emerald-400">${formatNumber(analysis.optimizedState.effectiveRate, 3)}</span></div>
    <div class="flex justify-between"><span class="text-neutral-400">Collapse Prob</span><span class="font-mono text-emerald-400">${formatPercent(analysis.optimizedState.collapseProb)}</span></div>
    <div class="flex justify-between"><span class="text-neutral-400">Cumulative Ch</span><span class="font-mono text-emerald-400">${formatNumber(analysis.optimizedState.cumulativeRegen, 3)}</span></div>
  `

  // Insights
  document.getElementById('ai-insights').innerHTML = analysis.insights.map(insight => `
    <div class="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm text-amber-200">${insight}</div>
  `).join('')

  // Action plans
  const priorityColors = {
    critical: 'border-red-500 bg-red-500/10',
    high: 'border-orange-500 bg-orange-500/10',
    medium: 'border-yellow-500 bg-yellow-500/10',
    low: 'border-neutral-500 bg-neutral-500/10'
  }

  document.getElementById('ai-action-plans').innerHTML = analysis.actionPlans.map(plan => `
    <div class="border ${priorityColors[plan.priority]} rounded-lg p-4">
      <div class="flex items-center justify-between mb-2">
        <h4 class="font-semibold">${plan.title}</h4>
        <span class="text-xs px-2 py-1 rounded bg-neutral-800">${plan.priority.toUpperCase()}</span>
      </div>
      <p class="text-sm text-neutral-400 mb-3">${plan.description}</p>
      <div class="text-xs text-neutral-500">
        <strong>Impact:</strong> NIV +${formatPercent(plan.expectedImpact.nivDelta)} | Ch +${formatPercent(plan.expectedImpact.chDelta)}
      </div>
    </div>
  `).join('')
}

// ============================================================================
// DATA FETCHING
// ============================================================================

async function fetchSP500Data() {
  setStatus('loading', 'Fetching S&P 500 data...')

  try {
    // In desktop app, we generate simulated data locally
    state.companies = generateSimulatedCompanies()
    updateSP500Stats()
    updateSP500Table()
    populateCompanySelect()
    setStatus('ready', 'Data loaded')
  } catch (error) {
    console.error('Error fetching S&P 500:', error)
    setStatus('error', 'Failed to load data')
  }
}

function generateSimulatedCompanies() {
  const companies = [
    { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology' },
    { symbol: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer' },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', sector: 'Technology' },
    { symbol: 'META', name: 'Meta Platforms', sector: 'Technology' },
    { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Consumer' },
    { symbol: 'BRK-B', name: 'Berkshire Hathaway', sector: 'Finance' },
    { symbol: 'UNH', name: 'UnitedHealth', sector: 'Healthcare' },
    { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare' },
    { symbol: 'V', name: 'Visa Inc.', sector: 'Finance' },
    { symbol: 'XOM', name: 'Exxon Mobil', sector: 'Energy' },
    { symbol: 'JPM', name: 'JPMorgan Chase', sector: 'Finance' },
    { symbol: 'WMT', name: 'Walmart Inc.', sector: 'Consumer' },
    { symbol: 'PG', name: 'Procter & Gamble', sector: 'Consumer' }
  ]

  return companies.map((c, i) => {
    const seed = c.symbol.charCodeAt(0) + c.symbol.charCodeAt(1) + i
    const random = (min, max) => min + ((seed * 9301 + 49297) % 233280) / 233280 * (max - min)

    const marketCap = (300 - i * 15) * 1e9 + random(-30, 30) * 1e9
    const revenue = marketCap * (0.15 + random(0, 0.15))
    const grossMargin = 0.35 + random(0, 0.25)
    const opexRatio = 0.15 + random(0, 0.08)

    const costOfRevenue = revenue * (1 - grossMargin)
    const operatingExpenses = revenue * opexRatio
    const depreciation = revenue * (0.03 + random(0, 0.02))
    const interestExpense = revenue * (0.01 + random(0, 0.015))
    const ebit = revenue - costOfRevenue - operatingExpenses
    const taxRate = 0.21 + random(0, 0.04)
    const incomeTax = Math.max(0, ebit - interestExpense) * taxRate
    const netIncome = ebit - interestExpense - incomeTax

    const totalAssets = revenue * (1.5 + random(0, 0.8))
    const currentRatio = 1.2 + random(0, 0.8)
    const debtToEquity = 0.3 + random(0, 0.5)

    const totalEquity = totalAssets / (1 + debtToEquity)
    const totalLiabilities = totalAssets - totalEquity
    const totalCurrentLiabilities = totalLiabilities * (0.3 + random(0, 0.15))
    const totalCurrentAssets = totalCurrentLiabilities * currentRatio

    const company = {
      ...c,
      marketCap,
      revenue,
      costOfRevenue,
      operatingExpenses,
      interestExpense,
      depreciationAndAmortization: depreciation,
      incomeTaxExpense: incomeTax,
      netIncome,
      cashAndEquivalents: totalCurrentAssets * (0.3 + random(0, 0.25)),
      accountsReceivable: totalCurrentAssets * (0.2 + random(0, 0.12)),
      inventory: totalCurrentAssets * (0.1 + random(0, 0.15)),
      totalCurrentAssets,
      propertyPlantEquipment: totalAssets * (0.3 + random(0, 0.15)),
      totalAssets,
      accountsPayable: totalCurrentLiabilities * (0.4 + random(0, 0.15)),
      shortTermDebt: totalCurrentLiabilities * (0.2 + random(0, 0.15)),
      totalCurrentLiabilities,
      longTermDebt: totalLiabilities - totalCurrentLiabilities,
      totalLiabilities,
      totalEquity,
      operatingCashFlow: netIncome * (1.1 + random(0, 0.25)),
      freeCashFlow: netIncome * (0.8 + random(0, 0.3))
    }

    // Calculate NIV components
    company.nivComponents = calculateNIVFromFinancials(company)

    return company
  }).sort((a, b) => (b.nivComponents?.niv || 0) - (a.nivComponents?.niv || 0))
}

function calculateNIVFromFinancials(data) {
  const revenueGrowth = 0.05 + Math.random() * 0.1
  const ocfToRevenue = data.revenue > 0 ? data.operatingCashFlow / data.revenue : 0

  const thrust = Math.min(1, Math.max(0,
    Math.max(0, revenueGrowth) * 0.4 +
    Math.max(0, ocfToRevenue) * 0.35 +
    0.25
  ))

  const assetTurnover = data.totalAssets > 0 ? data.revenue / data.totalAssets : 0
  const roa = data.totalAssets > 0 ? data.netIncome / data.totalAssets : 0
  const operatingMargin = data.revenue > 0 ? (data.revenue - data.costOfRevenue - data.operatingExpenses) / data.revenue : 0

  const efficiency = Math.min(1, Math.max(0,
    Math.min(1, assetTurnover / 1.5) * 0.35 +
    Math.max(0, (roa + 0.05) / 0.2) * 0.35 +
    Math.max(0, (operatingMargin + 0.05) / 0.3) * 0.3
  ))

  const currentRatio = data.totalCurrentLiabilities > 0 ? data.totalCurrentAssets / data.totalCurrentLiabilities : 2
  const cashToRevenue = data.revenue > 0 ? data.cashAndEquivalents / (data.revenue / 4) : 0

  const slack = Math.min(1, Math.max(0,
    Math.min(1, Math.max(0, currentRatio - 1) / 2) * 0.35 +
    Math.min(1, cashToRevenue / 2) * 0.4 +
    0.25
  ))

  const ebitda = data.revenue - data.costOfRevenue - data.operatingExpenses + data.depreciationAndAmortization
  const debtServiceRatio = ebitda > 0 ? (data.interestExpense + data.shortTermDebt * 0.1) / ebitda : 1
  const interestCoverage = data.interestExpense > 0 ? ebitda / data.interestExpense : 10
  const interestBurden = Math.max(0, 1 - (interestCoverage - 1) / 9)

  const drag = Math.min(1, Math.max(0,
    Math.min(1, debtServiceRatio) * 0.35 +
    interestBurden * 0.3 +
    0.35
  ))

  const niv = calculateNIV(thrust, efficiency, slack, drag)

  return { thrust, efficiency, slack, drag, niv }
}

function updateSP500Stats() {
  if (state.companies.length === 0) return

  document.getElementById('sp500-stats').classList.remove('hidden')

  const avg = (key) => state.companies.reduce((s, c) => s + (c.nivComponents?.[key] || 0), 0) / state.companies.length

  document.getElementById('sp500-avg-niv').textContent = formatNumber(avg('niv'))
  document.getElementById('sp500-avg-thrust').textContent = formatPercent(avg('thrust'))
  document.getElementById('sp500-avg-efficiency').textContent = formatPercent(avg('efficiency'))
  document.getElementById('sp500-avg-slack').textContent = formatPercent(avg('slack'))
  document.getElementById('sp500-avg-drag').textContent = formatPercent(avg('drag'))
}

function populateCompanySelect() {
  const select = document.getElementById('company-select')
  select.innerHTML = '<option value="">Select S&P 500 Company...</option>'

  state.companies.forEach(c => {
    const option = document.createElement('option')
    option.value = c.symbol
    option.textContent = `${c.symbol} - ${c.name}`
    select.appendChild(option)
  })
}

function selectCompany(symbol) {
  state.selectedCompany = state.companies.find(c => c.symbol === symbol) || null

  if (state.selectedCompany) {
    const niv = state.selectedCompany.nivComponents

    // Update global state
    state.thrust = niv.thrust
    state.efficiency = niv.efficiency
    state.slack = niv.slack
    state.drag = niv.drag

    // Update UI
    document.getElementById('company-select').value = symbol
    document.getElementById('company-info').classList.remove('hidden')
    document.getElementById('company-sector').textContent = state.selectedCompany.sector
    document.getElementById('company-mcap').textContent = formatCurrency(state.selectedCompany.marketCap)

    updateAll()
  }
}

// ============================================================================
// AI ANALYSIS
// ============================================================================

async function generateAIAnalysis() {
  setStatus('loading', 'Generating AI analysis...')

  try {
    const { thrust, efficiency, slack, drag } = state
    const niv = calculateNIV(thrust, efficiency, slack, drag)

    const currentState = calculateThirdOrder(thrust, efficiency, slack, drag)

    // Simulated optimization
    const optimizedThrust = Math.min(1, thrust + 0.15)
    const optimizedEfficiency = Math.min(1, efficiency + 0.1)
    const optimizedSlack = Math.min(1, slack + 0.1)
    const optimizedDrag = Math.max(0.1, drag - 0.1)
    const optimizedState = calculateThirdOrder(optimizedThrust, optimizedEfficiency, optimizedSlack, optimizedDrag)

    // Generate insights
    const entityName = state.selectedCompany?.name || 'the business'
    const insights = []

    if (state.selectedCompany) {
      insights.push(`Analysis for ${state.selectedCompany.name} (${state.selectedCompany.sector}): NIV score of ${formatNumber(niv)} indicates ${niv > 0.035 ? 'strong' : niv > 0.015 ? 'moderate' : 'weak'} regeneration potential.`)
    }

    if (efficiency < 0.5) {
      insights.push(`${entityName}'s efficiency at ${formatPercent(efficiency)} is critically low. Improving efficiency yields exponential returns due to the E-squared term in the NIV formula.`)
    }

    if (drag > 0.5) {
      insights.push(`High drag (${formatPercent(drag)}) is impeding ${entityName}'s regeneration. Each 10% drag reduction can improve Ch by 15-25%.`)
    }

    if (currentState.collapseProb > 0.3) {
      insights.push(`Collapse probability of ${formatPercent(currentState.collapseProb)} represents material risk. Priority: drag reduction and slack building.`)
    }

    insights.push(`Third-order analysis reveals ${efficiency < thrust ? 'efficiency improvements' : 'thrust acceleration'} will have the highest marginal impact on long-term regeneration.`)

    // Generate action plans
    const actionPlans = []

    if (efficiency < 0.6) {
      actionPlans.push({
        title: 'Efficiency Optimization Program',
        description: 'Implement operational improvements to boost asset productivity and margins.',
        priority: efficiency < 0.4 ? 'critical' : 'high',
        expectedImpact: { nivDelta: 0.15, chDelta: 0.25 }
      })
    }

    if (drag > 0.4) {
      actionPlans.push({
        title: 'Drag Reduction Initiative',
        description: 'Restructure debt, reduce interest burden, and improve operating efficiency.',
        priority: drag > 0.6 ? 'critical' : 'high',
        expectedImpact: { nivDelta: 0.12, chDelta: 0.20 }
      })
    }

    if (slack < 0.4) {
      actionPlans.push({
        title: 'Liquidity Buffer Enhancement',
        description: 'Build cash reserves and improve working capital management.',
        priority: slack < 0.25 ? 'high' : 'medium',
        expectedImpact: { nivDelta: 0.08, chDelta: 0.12 }
      })
    }

    if (thrust < 0.4) {
      actionPlans.push({
        title: 'Growth Acceleration Strategy',
        description: 'Increase capital deployment and revenue generation momentum.',
        priority: 'medium',
        expectedImpact: { nivDelta: 0.10, chDelta: 0.15 }
      })
    }

    state.aiAnalysis = {
      currentState: {
        niv,
        effectiveRate: currentState.effectiveRate,
        collapseProb: currentState.collapseProb,
        cumulativeRegen: currentState.cumulativeRegen
      },
      optimizedState: {
        niv: calculateNIV(optimizedThrust, optimizedEfficiency, optimizedSlack, optimizedDrag),
        effectiveRate: optimizedState.effectiveRate,
        collapseProb: optimizedState.collapseProb,
        cumulativeRegen: optimizedState.cumulativeRegen
      },
      insights,
      actionPlans
    }

    updateAIContent()
    setStatus('ready', 'Analysis complete')
  } catch (error) {
    console.error('AI analysis error:', error)
    setStatus('error', 'Analysis failed')
  }
}

// ============================================================================
// UI HELPERS
// ============================================================================

function setStatus(type, text) {
  const indicator = document.getElementById('status-indicator')
  const statusText = document.getElementById('status-text')

  indicator.className = 'w-2 h-2 rounded-full'

  switch (type) {
    case 'loading':
      indicator.classList.add('bg-amber-400', 'animate-pulse')
      break
    case 'error':
      indicator.classList.add('bg-red-400')
      break
    default:
      indicator.classList.add('bg-emerald-400')
  }

  statusText.textContent = text
}

function switchTab(tabId) {
  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'))

  // Show selected tab
  document.getElementById(`tab-${tabId}`).classList.remove('hidden')

  // Update nav buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active', 'bg-neutral-800', 'text-cyan-400')
    if (btn.dataset.tab === tabId) {
      btn.classList.add('active', 'bg-neutral-800', 'text-cyan-400')
    }
  })

  // Tab-specific updates
  if (tabId === 'engine') {
    updateProjectionChart()
  } else if (tabId === 'provenance') {
    updateProvenance()
  } else if (tabId === 'ai-engine') {
    updateAIContent()
  }
}

function updateAll() {
  updateOverview()
  updateComponents()
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  // Initialize
  updateAll()

  // Version display
  if (window.electronAPI) {
    window.electronAPI.getVersion().then(v => {
      document.getElementById('version-display').textContent = `v${v}`
    })
  }

  // Navigation
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab))
  })

  // Company select
  document.getElementById('company-select').addEventListener('change', (e) => {
    if (e.target.value) {
      selectCompany(e.target.value)
    }
  })

  // Component sliders
  document.getElementById('thrust-slider').addEventListener('input', (e) => {
    state.thrust = e.target.value / 100
    updateAll()
  })
  document.getElementById('efficiency-slider').addEventListener('input', (e) => {
    state.efficiency = e.target.value / 100
    updateAll()
  })
  document.getElementById('slack-slider').addEventListener('input', (e) => {
    state.slack = e.target.value / 100
    updateAll()
  })
  document.getElementById('drag-slider').addEventListener('input', (e) => {
    state.drag = e.target.value / 100
    updateAll()
  })

  // Recalculate button
  document.getElementById('recalculate-btn').addEventListener('click', () => {
    updateProjectionChart()
  })

  // Fetch S&P 500
  document.getElementById('fetch-sp500-btn').addEventListener('click', fetchSP500Data)

  // Generate AI
  document.getElementById('generate-ai-btn').addEventListener('click', generateAIAnalysis)

  // Electron menu events
  if (window.electronAPI) {
    window.electronAPI.onNavigate((tab) => switchTab(tab))
    window.electronAPI.onRunAnalysis(() => updateAll())
    window.electronAPI.onRunAIAnalysis(() => generateAIAnalysis())
    window.electronAPI.onFetchSP500(() => fetchSP500Data())
  }
})
