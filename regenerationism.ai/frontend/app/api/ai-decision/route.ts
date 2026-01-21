import { NextRequest, NextResponse } from 'next/server'

/**
 * AI Decision Engine API
 *
 * Generates optimal decision trees and organic regeneration plans
 * based on NIV third-order accounting analysis.
 *
 * Core Logic:
 * - Analyzes NIV components (Thrust, Efficiency, Slack, Drag)
 * - Identifies optimization paths with highest Cₕ impact
 * - Generates decision trees showing cause-effect relationships
 * - Produces organic action plans prioritized by regeneration potential
 */

interface NIVInput {
  thrust: number
  efficiency: number
  slack: number
  drag: number
  niv: number
  companyName?: string
  sector?: string
}

interface DecisionNode {
  id: string
  type: 'root' | 'decision' | 'action' | 'outcome'
  label: string
  description: string
  metric?: string
  currentValue?: number
  targetValue?: number
  impact: number // Expected Cₕ delta
  probability: number // Success probability
  timeframe: string
  children?: DecisionNode[]
}

interface ActionPlan {
  id: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  category: 'thrust' | 'efficiency' | 'slack' | 'drag'
  title: string
  description: string
  rationale: string
  expectedImpact: {
    nivDelta: number
    chDelta: number
    riskReduction: number
  }
  implementation: {
    steps: string[]
    resources: string[]
    metrics: string[]
  }
  timeframe: string
  dependencies: string[]
}

interface DecisionAnalysis {
  timestamp: string
  input: NIVInput
  currentState: {
    niv: number
    effectiveRate: number
    collapseProb: number
    cumulativeRegen: number
    riskLevel: string
  }
  optimizedState: {
    niv: number
    effectiveRate: number
    collapseProb: number
    cumulativeRegen: number
    riskLevel: string
  }
  decisionTree: DecisionNode
  actionPlans: ActionPlan[]
  insights: string[]
}

// NIV Parameters
const PARAMS = {
  eta: 1.5,
  alpha: 1.1,
  beta: 0.8,
  gamma: 3.5,
  theta: 0.15,
  horizonYears: 5
}

function calculateNIV(t: number, e: number, s: number, d: number): number {
  const denominator = Math.pow(Math.max(0.1, s + d), PARAMS.eta)
  return (t * Math.pow(e, 2)) / denominator
}

function calculateThirdOrder(niv: number, drag: number): { effectiveRate: number; collapseProb: number; cumulativeRegen: number } {
  const effectiveRate = PARAMS.alpha * niv - PARAMS.beta * drag
  const collapseProb = 1 / (1 + Math.exp(-(PARAMS.gamma * drag - PARAMS.theta)))
  const cumulativeRegen = niv * Math.exp(effectiveRate * PARAMS.horizonYears) * (1 - collapseProb)
  return { effectiveRate, collapseProb, cumulativeRegen }
}

function getRiskLevel(collapseProb: number): string {
  if (collapseProb >= 0.7) return 'critical'
  if (collapseProb >= 0.5) return 'high'
  if (collapseProb >= 0.3) return 'elevated'
  if (collapseProb >= 0.15) return 'moderate'
  return 'low'
}

function generateDecisionTree(input: NIVInput): DecisionNode {
  const { thrust, efficiency, slack, drag } = input

  // Identify weakest component
  const components = [
    { name: 'thrust', value: thrust, target: 0.6 },
    { name: 'efficiency', value: efficiency, target: 0.7 },
    { name: 'slack', value: slack, target: 0.5 },
    { name: 'drag', value: drag, target: 0.3, inverse: true }
  ]

  // Sort by improvement potential
  const priorities = components
    .map(c => ({
      ...c,
      gap: c.inverse ? c.value - c.target : c.target - c.value,
      potential: c.inverse ? c.value - c.target : c.target - c.value
    }))
    .filter(c => c.gap > 0)
    .sort((a, b) => b.potential - a.potential)

  const rootNode: DecisionNode = {
    id: 'root',
    type: 'root',
    label: 'Regeneration Optimization',
    description: `Current NIV: ${input.niv.toFixed(4)} | Target: Maximize Cₕ`,
    impact: 0,
    probability: 1,
    timeframe: 'Strategic',
    children: []
  }

  // Generate decision branches for each priority
  priorities.forEach((priority, idx) => {
    const branch = generateComponentBranch(priority, input, idx)
    rootNode.children?.push(branch)
  })

  return rootNode
}

function generateComponentBranch(
  priority: { name: string; value: number; target: number; gap: number; inverse?: boolean },
  input: NIVInput,
  index: number
): DecisionNode {
  const { name, value, target, gap, inverse } = priority
  const improvedValue = inverse ? Math.max(0.1, value - gap * 0.5) : Math.min(1, value + gap * 0.5)

  // Calculate impact of improvement
  const newInput = { ...input }
  if (name === 'thrust') newInput.thrust = improvedValue
  if (name === 'efficiency') newInput.efficiency = improvedValue
  if (name === 'slack') newInput.slack = improvedValue
  if (name === 'drag') newInput.drag = improvedValue

  const currentCh = calculateThirdOrder(input.niv, input.drag).cumulativeRegen
  const newNiv = calculateNIV(newInput.thrust, newInput.efficiency, newInput.slack, newInput.drag)
  const newCh = calculateThirdOrder(newNiv, newInput.drag).cumulativeRegen
  const impact = newCh - currentCh

  const componentLabels: Record<string, string> = {
    thrust: 'Capital Momentum',
    efficiency: 'Productivity',
    slack: 'Liquidity Buffer',
    drag: 'Friction Reduction'
  }

  const branchNode: DecisionNode = {
    id: `branch-${name}`,
    type: 'decision',
    label: `Optimize ${componentLabels[name]}`,
    description: inverse
      ? `Reduce ${name} from ${(value * 100).toFixed(1)}% to ${(improvedValue * 100).toFixed(1)}%`
      : `Increase ${name} from ${(value * 100).toFixed(1)}% to ${(improvedValue * 100).toFixed(1)}%`,
    metric: name,
    currentValue: value,
    targetValue: improvedValue,
    impact,
    probability: 0.7 - index * 0.1,
    timeframe: index === 0 ? 'Immediate' : index === 1 ? 'Short-term' : 'Medium-term',
    children: generateActionNodes(name, value, improvedValue, impact)
  }

  return branchNode
}

function generateActionNodes(component: string, current: number, target: number, impact: number): DecisionNode[] {
  const actions: Record<string, DecisionNode[]> = {
    thrust: [
      {
        id: 'thrust-revenue',
        type: 'action',
        label: 'Accelerate Revenue Growth',
        description: 'Expand market share through product innovation or market penetration',
        impact: impact * 0.4,
        probability: 0.65,
        timeframe: '6-12 months',
        children: [{
          id: 'thrust-revenue-outcome',
          type: 'outcome',
          label: 'Revenue Growth +15-25%',
          description: 'Increased thrust component drives higher NIV velocity',
          impact: impact * 0.4,
          probability: 0.65,
          timeframe: 'Realized'
        }]
      },
      {
        id: 'thrust-ocf',
        type: 'action',
        label: 'Optimize Cash Conversion',
        description: 'Improve working capital management to increase operating cash flow',
        impact: impact * 0.35,
        probability: 0.75,
        timeframe: '3-6 months',
        children: [{
          id: 'thrust-ocf-outcome',
          type: 'outcome',
          label: 'OCF/Revenue +5-10%',
          description: 'Stronger cash generation fuels reinvestment capacity',
          impact: impact * 0.35,
          probability: 0.75,
          timeframe: 'Realized'
        }]
      },
      {
        id: 'thrust-reinvest',
        type: 'action',
        label: 'Strategic Reinvestment',
        description: 'Allocate capital to high-ROI projects and growth initiatives',
        impact: impact * 0.25,
        probability: 0.7,
        timeframe: '12-18 months',
        children: [{
          id: 'thrust-reinvest-outcome',
          type: 'outcome',
          label: 'CapEx Efficiency +20%',
          description: 'Higher reinvestment rate with better capital allocation',
          impact: impact * 0.25,
          probability: 0.7,
          timeframe: 'Realized'
        }]
      }
    ],
    efficiency: [
      {
        id: 'efficiency-asset',
        type: 'action',
        label: 'Asset Utilization Improvement',
        description: 'Optimize asset deployment and reduce underutilized capital',
        impact: impact * 0.35,
        probability: 0.8,
        timeframe: '3-6 months',
        children: [{
          id: 'efficiency-asset-outcome',
          type: 'outcome',
          label: 'Asset Turnover +0.2x',
          description: 'More revenue per dollar of assets deployed',
          impact: impact * 0.35,
          probability: 0.8,
          timeframe: 'Realized'
        }]
      },
      {
        id: 'efficiency-margin',
        type: 'action',
        label: 'Margin Expansion',
        description: 'Cost optimization and pricing power enhancement',
        impact: impact * 0.4,
        probability: 0.7,
        timeframe: '6-12 months',
        children: [{
          id: 'efficiency-margin-outcome',
          type: 'outcome',
          label: 'Operating Margin +3-5%',
          description: 'Higher profitability per revenue dollar',
          impact: impact * 0.4,
          probability: 0.7,
          timeframe: 'Realized'
        }]
      },
      {
        id: 'efficiency-inventory',
        type: 'action',
        label: 'Inventory Optimization',
        description: 'Lean inventory management and supply chain efficiency',
        impact: impact * 0.25,
        probability: 0.85,
        timeframe: '3-9 months',
        children: [{
          id: 'efficiency-inventory-outcome',
          type: 'outcome',
          label: 'Inventory Turns +2x',
          description: 'Faster inventory cycling releases working capital',
          impact: impact * 0.25,
          probability: 0.85,
          timeframe: 'Realized'
        }]
      }
    ],
    slack: [
      {
        id: 'slack-liquidity',
        type: 'action',
        label: 'Liquidity Position Strengthening',
        description: 'Build cash reserves and improve current ratio',
        impact: impact * 0.4,
        probability: 0.85,
        timeframe: '3-6 months',
        children: [{
          id: 'slack-liquidity-outcome',
          type: 'outcome',
          label: 'Current Ratio +0.5x',
          description: 'Enhanced buffer against operational shocks',
          impact: impact * 0.4,
          probability: 0.85,
          timeframe: 'Realized'
        }]
      },
      {
        id: 'slack-credit',
        type: 'action',
        label: 'Credit Facility Expansion',
        description: 'Secure additional credit lines for contingency capacity',
        impact: impact * 0.3,
        probability: 0.75,
        timeframe: '1-3 months',
        children: [{
          id: 'slack-credit-outcome',
          type: 'outcome',
          label: 'Available Credit +50%',
          description: 'Increased financial flexibility and headroom',
          impact: impact * 0.3,
          probability: 0.75,
          timeframe: 'Realized'
        }]
      },
      {
        id: 'slack-cash',
        type: 'action',
        label: 'Cash Runway Extension',
        description: 'Increase cash reserves relative to operating needs',
        impact: impact * 0.3,
        probability: 0.8,
        timeframe: '6-12 months',
        children: [{
          id: 'slack-cash-outcome',
          type: 'outcome',
          label: 'Cash Runway +3 months',
          description: 'Extended operational runway reduces collapse probability',
          impact: impact * 0.3,
          probability: 0.8,
          timeframe: 'Realized'
        }]
      }
    ],
    drag: [
      {
        id: 'drag-debt',
        type: 'action',
        label: 'Debt Restructuring',
        description: 'Reduce debt service burden through refinancing or paydown',
        impact: impact * 0.4,
        probability: 0.7,
        timeframe: '6-12 months',
        children: [{
          id: 'drag-debt-outcome',
          type: 'outcome',
          label: 'Interest Coverage +2x',
          description: 'Lower debt service frees cash for regeneration',
          impact: impact * 0.4,
          probability: 0.7,
          timeframe: 'Realized'
        }]
      },
      {
        id: 'drag-costs',
        type: 'action',
        label: 'Fixed Cost Reduction',
        description: 'Restructure operations to reduce fixed cost leverage',
        impact: impact * 0.35,
        probability: 0.75,
        timeframe: '6-18 months',
        children: [{
          id: 'drag-costs-outcome',
          type: 'outcome',
          label: 'Fixed Costs -15%',
          description: 'Lower operating leverage reduces systemic friction',
          impact: impact * 0.35,
          probability: 0.75,
          timeframe: 'Realized'
        }]
      },
      {
        id: 'drag-efficiency',
        type: 'action',
        label: 'Operational Streamlining',
        description: 'Eliminate inefficiencies and improve gross margin',
        impact: impact * 0.25,
        probability: 0.8,
        timeframe: '3-12 months',
        children: [{
          id: 'drag-efficiency-outcome',
          type: 'outcome',
          label: 'Gross Margin +3%',
          description: 'Reduced operating inefficiency component',
          impact: impact * 0.25,
          probability: 0.8,
          timeframe: 'Realized'
        }]
      }
    ]
  }

  return actions[component] || []
}

function generateActionPlans(input: NIVInput, decisionTree: DecisionNode): ActionPlan[] {
  const plans: ActionPlan[] = []
  const { thrust, efficiency, slack, drag, niv } = input

  // Analyze gaps and generate prioritized plans
  const gaps = [
    { component: 'thrust' as const, gap: 0.6 - thrust, value: thrust },
    { component: 'efficiency' as const, gap: 0.7 - efficiency, value: efficiency },
    { component: 'slack' as const, gap: 0.5 - slack, value: slack },
    { component: 'drag' as const, gap: drag - 0.25, value: drag, inverse: true }
  ].filter(g => g.gap > 0.05)
   .sort((a, b) => b.gap - a.gap)

  gaps.forEach((gap, idx) => {
    const priority = idx === 0 ? 'critical' : idx === 1 ? 'high' : idx === 2 ? 'medium' : 'low'
    const plan = createPlanForComponent(gap.component, gap.value, gap.gap, priority, input)
    plans.push(plan)
  })

  return plans
}

function createPlanForComponent(
  component: 'thrust' | 'efficiency' | 'slack' | 'drag',
  currentValue: number,
  gap: number,
  priority: ActionPlan['priority'],
  input: NIVInput
): ActionPlan {
  const planTemplates: Record<string, Omit<ActionPlan, 'id' | 'priority' | 'category' | 'expectedImpact'>> = {
    thrust: {
      title: 'Capital Momentum Acceleration Program',
      description: 'Systematic approach to increasing capital injection velocity through revenue growth, cash flow optimization, and strategic reinvestment.',
      rationale: `Current thrust at ${(currentValue * 100).toFixed(1)}% is below optimal. Increasing capital momentum will directly amplify NIV through the numerator of the regeneration formula.`,
      implementation: {
        steps: [
          'Conduct market opportunity analysis for expansion targets',
          'Optimize pricing strategy and revenue mix',
          'Implement cash conversion cycle improvements',
          'Develop capital allocation framework for reinvestment',
          'Establish growth KPIs and monitoring system'
        ],
        resources: [
          'Financial planning team',
          'Market research capabilities',
          'Working capital management tools',
          'Capital budgeting framework'
        ],
        metrics: [
          'Revenue growth rate (target: +15%)',
          'OCF/Revenue ratio (target: +5pp)',
          'Reinvestment rate (target: 25-35%)',
          'Thrust component (target: 0.55-0.65)'
        ]
      },
      timeframe: '6-12 months',
      dependencies: ['Market conditions', 'Capital availability', 'Operational capacity']
    },
    efficiency: {
      title: 'Capital Productivity Enhancement Initiative',
      description: 'Comprehensive program to maximize output per unit of deployed capital through asset optimization, margin improvement, and operational excellence.',
      rationale: `Efficiency at ${(currentValue * 100).toFixed(1)}% has multiplicative impact on NIV (squared in formula). Small improvements yield outsized regeneration gains.`,
      implementation: {
        steps: [
          'Asset utilization audit and optimization plan',
          'Cost structure analysis and reduction roadmap',
          'Pricing power assessment and strategy',
          'Inventory management system enhancement',
          'Operational efficiency benchmarking program'
        ],
        resources: [
          'Operations excellence team',
          'Financial analysis capabilities',
          'Process improvement tools',
          'Benchmarking data sources'
        ],
        metrics: [
          'Asset turnover ratio (target: +0.2x)',
          'Operating margin (target: +3-5pp)',
          'ROA (target: +2pp)',
          'Efficiency component (target: 0.65-0.75)'
        ]
      },
      timeframe: '6-18 months',
      dependencies: ['Operational buy-in', 'Technology investments', 'Market pricing dynamics']
    },
    slack: {
      title: 'Financial Resilience Building Program',
      description: 'Strategic initiative to expand economic headroom and liquidity buffers, reducing vulnerability to shocks and enabling opportunistic capital deployment.',
      rationale: `Slack at ${(currentValue * 100).toFixed(1)}% provides insufficient buffer. Higher slack reduces denominator sensitivity and lowers collapse probability.`,
      implementation: {
        steps: [
          'Liquidity position assessment and target setting',
          'Cash reserve accumulation strategy',
          'Credit facility negotiation and expansion',
          'Working capital optimization for cash release',
          'Contingency planning and stress testing'
        ],
        resources: [
          'Treasury management team',
          'Banking relationships',
          'Cash flow forecasting tools',
          'Risk management framework'
        ],
        metrics: [
          'Current ratio (target: 1.8-2.2x)',
          'Cash runway (target: 6+ months)',
          'Available credit lines (target: +50%)',
          'Slack component (target: 0.45-0.55)'
        ]
      },
      timeframe: '3-9 months',
      dependencies: ['Cash flow generation', 'Credit market conditions', 'Board approval']
    },
    drag: {
      title: 'Systemic Friction Reduction Program',
      description: 'Targeted initiative to reduce capital regeneration friction through debt optimization, cost structure improvement, and operational streamlining.',
      rationale: `Drag at ${(currentValue * 100).toFixed(1)}% creates excessive friction. Reduction directly improves effective rate and lowers collapse probability.`,
      implementation: {
        steps: [
          'Debt structure analysis and refinancing assessment',
          'Interest expense reduction opportunities',
          'Fixed cost structure review and right-sizing',
          'Gross margin improvement initiatives',
          'Operating leverage optimization'
        ],
        resources: [
          'Corporate finance team',
          'Debt capital markets access',
          'Operations restructuring capabilities',
          'Cost management tools'
        ],
        metrics: [
          'Interest coverage ratio (target: 8x+)',
          'Debt service/EBITDA (target: <15%)',
          'Fixed cost ratio (target: <10%)',
          'Drag component (target: 0.20-0.30)'
        ]
      },
      timeframe: '6-18 months',
      dependencies: ['Debt covenants', 'Refinancing markets', 'Operational flexibility']
    }
  }

  const template = planTemplates[component]

  // Calculate expected impact
  const improvedValue = component === 'drag'
    ? Math.max(0.1, currentValue - gap * 0.5)
    : Math.min(1, currentValue + gap * 0.5)

  const newInput = { ...input }
  if (component === 'thrust') newInput.thrust = improvedValue
  if (component === 'efficiency') newInput.efficiency = improvedValue
  if (component === 'slack') newInput.slack = improvedValue
  if (component === 'drag') newInput.drag = improvedValue

  const currentCh = calculateThirdOrder(input.niv, input.drag)
  const newNiv = calculateNIV(newInput.thrust, newInput.efficiency, newInput.slack, newInput.drag)
  const newCh = calculateThirdOrder(newNiv, newInput.drag)

  return {
    id: `plan-${component}`,
    priority,
    category: component,
    ...template,
    expectedImpact: {
      nivDelta: newNiv - input.niv,
      chDelta: newCh.cumulativeRegen - currentCh.cumulativeRegen,
      riskReduction: currentCh.collapseProb - newCh.collapseProb
    }
  }
}

function generateInsights(input: NIVInput, currentState: DecisionAnalysis['currentState'], optimizedState: DecisionAnalysis['optimizedState']): string[] {
  const insights: string[] = []
  const { thrust, efficiency, slack, drag, niv } = input

  // Component-specific insights
  if (efficiency < 0.5) {
    insights.push(`Efficiency at ${(efficiency * 100).toFixed(1)}% is critically low. Because efficiency is squared in the NIV formula, improving it yields exponential returns on regeneration velocity.`)
  }

  if (drag > 0.5) {
    insights.push(`High drag (${(drag * 100).toFixed(1)}%) is significantly impeding regeneration. Each 10% reduction in drag can improve Cₕ by 15-25% through both direct NIV improvement and collapse probability reduction.`)
  }

  if (slack < 0.3) {
    insights.push(`Limited slack (${(slack * 100).toFixed(1)}%) exposes the business to regeneration collapse risk. Building liquidity buffers provides both downside protection and optionality for growth investments.`)
  }

  if (thrust < 0.3) {
    insights.push(`Low thrust (${(thrust * 100).toFixed(1)}%) indicates insufficient capital momentum. Without adequate growth impulse, even efficient operations cannot achieve meaningful regeneration.`)
  }

  // Third-order insights
  const chImprovement = ((optimizedState.cumulativeRegen - currentState.cumulativeRegen) / Math.abs(currentState.cumulativeRegen || 0.01)) * 100
  if (chImprovement > 50) {
    insights.push(`Optimization potential is substantial: implementing recommended actions could improve 5-year cumulative regeneration (Cₕ) by ${chImprovement.toFixed(0)}%.`)
  }

  if (currentState.collapseProb > 0.3) {
    insights.push(`Current collapse probability of ${(currentState.collapseProb * 100).toFixed(1)}% represents material risk to capital continuity. Priority should be given to drag reduction and slack building.`)
  }

  // Strategic insight
  insights.push(`Third-order accounting reveals that ${efficiency < thrust ? 'efficiency improvements' : 'thrust acceleration'} will have the highest marginal impact on long-term regeneration due to the compounding nature of the Cₕ projection formula.`)

  return insights
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { thrust, efficiency, slack, drag, companyName, sector } = body

    // Validate inputs
    if (typeof thrust !== 'number' || typeof efficiency !== 'number' ||
        typeof slack !== 'number' || typeof drag !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Invalid input: thrust, efficiency, slack, and drag are required numbers' },
        { status: 400 }
      )
    }

    const input: NIVInput = {
      thrust: Math.max(0, Math.min(1, thrust)),
      efficiency: Math.max(0, Math.min(1, efficiency)),
      slack: Math.max(0, Math.min(1, slack)),
      drag: Math.max(0, Math.min(1, drag)),
      niv: calculateNIV(thrust, efficiency, slack, drag),
      companyName,
      sector
    }

    // Current state analysis
    const current = calculateThirdOrder(input.niv, input.drag)
    const currentState = {
      niv: input.niv,
      effectiveRate: current.effectiveRate,
      collapseProb: current.collapseProb,
      cumulativeRegen: current.cumulativeRegen,
      riskLevel: getRiskLevel(current.collapseProb)
    }

    // Generate decision tree
    const decisionTree = generateDecisionTree(input)

    // Generate action plans
    const actionPlans = generateActionPlans(input, decisionTree)

    // Calculate optimized state (assuming all plans executed)
    const optimizedInput = {
      thrust: Math.min(1, input.thrust + 0.15),
      efficiency: Math.min(1, input.efficiency + 0.1),
      slack: Math.min(1, input.slack + 0.1),
      drag: Math.max(0.1, input.drag - 0.1)
    }
    const optimizedNiv = calculateNIV(optimizedInput.thrust, optimizedInput.efficiency, optimizedInput.slack, optimizedInput.drag)
    const optimized = calculateThirdOrder(optimizedNiv, optimizedInput.drag)
    const optimizedState = {
      niv: optimizedNiv,
      effectiveRate: optimized.effectiveRate,
      collapseProb: optimized.collapseProb,
      cumulativeRegen: optimized.cumulativeRegen,
      riskLevel: getRiskLevel(optimized.collapseProb)
    }

    // Generate insights
    const insights = generateInsights(input, currentState, optimizedState)

    const analysis: DecisionAnalysis = {
      timestamp: new Date().toISOString(),
      input,
      currentState,
      optimizedState,
      decisionTree,
      actionPlans,
      insights
    }

    return NextResponse.json({
      success: true,
      analysis
    })
  } catch (error) {
    console.error('AI Decision Engine error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate decision analysis' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    name: 'AI Decision Engine',
    version: '1.0.0',
    description: 'Generates optimal decision trees and organic regeneration plans based on NIV third-order accounting analysis',
    endpoints: {
      POST: {
        description: 'Generate decision analysis',
        body: {
          thrust: 'number (0-1)',
          efficiency: 'number (0-1)',
          slack: 'number (0-1)',
          drag: 'number (0-1)',
          companyName: 'string (optional)',
          sector: 'string (optional)'
        }
      }
    }
  })
}
