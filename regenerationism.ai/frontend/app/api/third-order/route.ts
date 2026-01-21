/**
 * Third-Order Accounting API Endpoint
 *
 * Provides external access to the NIV third-order computation engine.
 * Designed for integration with external software, SDKs, and plugins.
 *
 * Endpoints:
 * - POST /api/third-order - Compute third-order analysis with provided data
 * - GET  /api/third-order - Get API info and default parameters
 *
 * Rate limiting: 50 requests per minute per IP
 * CORS: Configurable via environment variables
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  computeThirdOrderAPI,
  ThirdOrderAPIRequest,
  ThirdOrderAPIResponse,
  DEFAULT_THIRD_ORDER_PARAMS,
  PRESET_SCENARIOS,
  NIVDataPoint,
  ThirdOrderParams,
  ScenarioInput
} from '@/lib/thirdOrderAccounting'

// ============================================================================
// RATE LIMITING
// ============================================================================

const rateLimitStore = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 50  // requests per minute
const RATE_WINDOW = 60 * 1000  // 1 minute in milliseconds

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const record = rateLimitStore.get(ip)

  if (!record || now > record.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_WINDOW })
    return { allowed: true, remaining: RATE_LIMIT - 1 }
  }

  if (record.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0 }
  }

  record.count++
  return { allowed: true, remaining: RATE_LIMIT - record.count }
}

// ============================================================================
// CORS HANDLING
// ============================================================================

function getCorsHeaders(): Record<string, string> {
  const allowedOrigins = process.env.ALLOWED_ORIGINS || '*'
  return {
    'Access-Control-Allow-Origin': allowedOrigins,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    'Access-Control-Max-Age': '86400',
    'X-Content-Type-Options': 'nosniff'
  }
}

// ============================================================================
// INPUT VALIDATION
// ============================================================================

interface ValidationResult {
  valid: boolean
  errors: string[]
}

function validateNIVDataPoint(point: unknown, index: number): string[] {
  const errors: string[] = []

  if (typeof point !== 'object' || point === null) {
    errors.push(`Data point ${index}: must be an object`)
    return errors
  }

  const p = point as Record<string, unknown>

  if (typeof p.date !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(p.date)) {
    errors.push(`Data point ${index}: invalid date format (expected YYYY-MM-DD)`)
  }

  if (typeof p.niv !== 'number' || isNaN(p.niv)) {
    errors.push(`Data point ${index}: niv must be a number`)
  }

  if (typeof p.thrust !== 'number' || isNaN(p.thrust)) {
    errors.push(`Data point ${index}: thrust must be a number`)
  }

  if (typeof p.efficiency !== 'number' || isNaN(p.efficiency)) {
    errors.push(`Data point ${index}: efficiency must be a number`)
  }

  if (typeof p.slack !== 'number' || isNaN(p.slack)) {
    errors.push(`Data point ${index}: slack must be a number`)
  }

  if (typeof p.drag !== 'number' || isNaN(p.drag)) {
    errors.push(`Data point ${index}: drag must be a number`)
  }

  return errors
}

function validateParams(params: unknown): string[] {
  const errors: string[] = []

  if (params === undefined || params === null) return errors

  if (typeof params !== 'object') {
    errors.push('params must be an object')
    return errors
  }

  const p = params as Record<string, unknown>

  const numericFields = [
    { name: 'alpha', min: 0.5, max: 2.0 },
    { name: 'beta', min: 0.1, max: 2.0 },
    { name: 'gamma', min: 0.5, max: 10.0 },
    { name: 'theta', min: -1.0, max: 1.0 },
    { name: 'lookbackMonths', min: 1, max: 60 },
    { name: 'horizonYears', min: 1, max: 30 },
    { name: 'iterations', min: 100, max: 10000 },
    { name: 'volatilityMultiplier', min: 0.1, max: 5.0 }
  ]

  for (const field of numericFields) {
    if (field.name in p) {
      const val = p[field.name]
      if (typeof val !== 'number' || isNaN(val)) {
        errors.push(`params.${field.name} must be a number`)
      } else if (val < field.min || val > field.max) {
        errors.push(`params.${field.name} must be between ${field.min} and ${field.max}`)
      }
    }
  }

  return errors
}

function validateScenario(scenario: unknown, index: number): string[] {
  const errors: string[] = []

  if (typeof scenario !== 'object' || scenario === null) {
    errors.push(`Scenario ${index}: must be an object`)
    return errors
  }

  const s = scenario as Record<string, unknown>

  if (typeof s.name !== 'string' || s.name.length === 0) {
    errors.push(`Scenario ${index}: name is required`)
  }

  const shockFields = ['thrustShock', 'dragShock', 'efficiencyShock']
  for (const field of shockFields) {
    if (field in s) {
      const val = s[field]
      if (typeof val !== 'number' || isNaN(val)) {
        errors.push(`Scenario ${index}: ${field} must be a number`)
      } else if (val < -100 || val > 100) {
        errors.push(`Scenario ${index}: ${field} must be between -100 and 100`)
      }
    }
  }

  if ('duration' in s) {
    const val = s.duration
    if (typeof val !== 'number' || isNaN(val) || val < 1 || val > 120) {
      errors.push(`Scenario ${index}: duration must be between 1 and 120 months`)
    }
  }

  return errors
}

function validateRequest(body: unknown): ValidationResult {
  const errors: string[] = []

  if (typeof body !== 'object' || body === null) {
    return { valid: false, errors: ['Request body must be a JSON object'] }
  }

  const req = body as Record<string, unknown>

  // Validate data array
  if (!Array.isArray(req.data)) {
    errors.push('data field is required and must be an array')
  } else if (req.data.length < 3) {
    errors.push('data must contain at least 3 data points')
  } else if (req.data.length > 1000) {
    errors.push('data cannot exceed 1000 data points')
  } else {
    // Validate each data point (sample first 5 for performance)
    const sampleSize = Math.min(5, req.data.length)
    for (let i = 0; i < sampleSize; i++) {
      errors.push(...validateNIVDataPoint(req.data[i], i))
    }
    // Always validate last point
    if (req.data.length > sampleSize) {
      errors.push(...validateNIVDataPoint(req.data[req.data.length - 1], req.data.length - 1))
    }
  }

  // Validate params
  if ('params' in req) {
    errors.push(...validateParams(req.params))
  }

  // Validate scenarios
  if ('scenarios' in req) {
    if (!Array.isArray(req.scenarios)) {
      errors.push('scenarios must be an array')
    } else if (req.scenarios.length > 10) {
      errors.push('scenarios cannot exceed 10 items')
    } else {
      for (let i = 0; i < req.scenarios.length; i++) {
        errors.push(...validateScenario(req.scenarios[i], i))
      }
    }
  }

  // Validate boolean flags
  if ('includeHeatmap' in req && typeof req.includeHeatmap !== 'boolean') {
    errors.push('includeHeatmap must be a boolean')
  }

  if ('includeForecastPaths' in req && typeof req.includeForecastPaths !== 'boolean') {
    errors.push('includeForecastPaths must be a boolean')
  }

  return { valid: errors.length === 0, errors }
}

// ============================================================================
// HANDLERS
// ============================================================================

/**
 * GET /api/third-order
 * Returns API information and default parameters
 */
export async function GET(request: NextRequest) {
  const corsHeaders = getCorsHeaders()

  // Get client IP for rate limiting
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
             request.headers.get('x-real-ip') ||
             'unknown'

  const { allowed, remaining } = checkRateLimit(ip)

  if (!allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      {
        status: 429,
        headers: {
          ...corsHeaders,
          'Retry-After': '60',
          'X-RateLimit-Remaining': '0'
        }
      }
    )
  }

  return NextResponse.json({
    name: 'NIV Third-Order Accounting API',
    version: '1.0.0',
    description: 'Forward-looking meta-layer for NIV analysis with exponential compounding and risk-adjusted forecasting',
    documentation: 'https://regenerationism.ai/api-docs#third-order',
    endpoints: {
      'GET /api/third-order': 'Get API info and default parameters',
      'POST /api/third-order': 'Compute third-order analysis'
    },
    defaultParams: DEFAULT_THIRD_ORDER_PARAMS,
    presetScenarios: PRESET_SCENARIOS.map(s => ({
      name: s.name,
      description: s.description
    })),
    dataFormat: {
      required: ['date', 'niv', 'thrust', 'efficiency', 'slack', 'drag'],
      optional: ['isRecession'],
      example: {
        date: '2024-01-01',
        niv: 0.045,
        thrust: 0.15,
        efficiency: 0.08,
        slack: 0.23,
        drag: 0.12,
        isRecession: false
      }
    },
    limits: {
      maxDataPoints: 1000,
      maxScenarios: 10,
      maxIterations: 10000,
      rateLimit: `${RATE_LIMIT} requests per minute`
    }
  }, {
    headers: {
      ...corsHeaders,
      'X-RateLimit-Remaining': String(remaining),
      'Cache-Control': 'public, max-age=3600'
    }
  })
}

/**
 * POST /api/third-order
 * Compute third-order analysis with provided data
 */
export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeaders()

  // Get client IP for rate limiting
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
             request.headers.get('x-real-ip') ||
             'unknown'

  const { allowed, remaining } = checkRateLimit(ip)

  if (!allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      {
        status: 429,
        headers: {
          ...corsHeaders,
          'Retry-After': '60',
          'X-RateLimit-Remaining': '0'
        }
      }
    )
  }

  try {
    // Parse request body
    const body = await request.json()

    // Validate request
    const validation = validateRequest(body)
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.errors },
        { status: 400, headers: corsHeaders }
      )
    }

    // Build API request
    const apiRequest: ThirdOrderAPIRequest = {
      data: body.data as NIVDataPoint[],
      params: body.params as Partial<ThirdOrderParams>,
      scenarios: body.scenarios as ScenarioInput[],
      includeHeatmap: body.includeHeatmap ?? false,
      includeForecastPaths: body.includeForecastPaths ?? true
    }

    // Compute third-order analysis
    const startTime = Date.now()
    const response = computeThirdOrderAPI(apiRequest)
    const computeTime = Date.now() - startTime

    return NextResponse.json({
      success: true,
      ...response,
      meta: {
        ...response.meta,
        computeTimeMs: computeTime,
        requestId: crypto.randomUUID()
      }
    }, {
      headers: {
        ...corsHeaders,
        'X-RateLimit-Remaining': String(remaining),
        'X-Compute-Time-Ms': String(computeTime)
      }
    })

  } catch (error) {
    console.error('Third-order API error:', error)

    // Don't expose internal error details
    return NextResponse.json(
      { error: 'Internal computation error', message: 'An error occurred processing your request' },
      { status: 500, headers: corsHeaders }
    )
  }
}

/**
 * OPTIONS /api/third-order
 * CORS preflight handler
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders()
  })
}
