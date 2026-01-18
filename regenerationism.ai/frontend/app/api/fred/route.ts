import { NextRequest, NextResponse } from 'next/server'

const FRED_API_BASE = 'https://api.stlouisfed.org/fred'

// Server-side FRED API key from environment variable
// This allows the app to work without users needing to input their own key
// Trim whitespace to prevent issues with env var formatting
const SERVER_FRED_API_KEY = process.env.FRED_API_KEY?.trim()

// Allowed origin for CORS - defaults to same-origin behavior
// Set ALLOWED_ORIGIN env var for production domain
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || ''

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100 // 100 requests per minute

// In-memory rate limit store (resets on serverless cold start)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Input validation patterns
const VALID_SERIES_ID = /^[A-Z0-9_]+$/i // FRED series IDs are alphanumeric with underscores
const VALID_ENDPOINT = /^[a-z]+$/i // Endpoints like 'observations', 'search'
const VALID_DATE = /^\d{4}-\d{2}-\d{2}$/ // YYYY-MM-DD format

/**
 * Get CORS headers based on environment configuration
 */
function getCorsHeaders(request: NextRequest): HeadersInit {
  const origin = request.headers.get('origin')

  // In development or if ALLOWED_ORIGIN is not set, allow same-origin requests
  if (!ALLOWED_ORIGIN) {
    return {
      'Access-Control-Allow-Origin': origin || '',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin',
    }
  }

  // In production, only allow specific origin
  if (origin === ALLOWED_ORIGIN) {
    return {
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  }

  // Return empty headers for disallowed origins
  return {}
}

/**
 * Check rate limit for IP address
 */
function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const record = rateLimitStore.get(ip)

  // Clean up old entries periodically
  if (rateLimitStore.size > 10000) {
    const keysToDelete: string[] = []
    rateLimitStore.forEach((value, key) => {
      if (value.resetTime < now) {
        keysToDelete.push(key)
      }
    })
    keysToDelete.forEach(key => rateLimitStore.delete(key))
  }

  if (!record || record.resetTime < now) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS })
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1 }
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0 }
  }

  record.count++
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - record.count }
}

/**
 * Validate input parameters
 */
function validateParams(seriesId: string | null, endpoint: string | null, startDate: string | null, endDate: string | null): string | null {
  if (!seriesId) {
    return 'Missing required parameter: series_id'
  }

  if (!VALID_SERIES_ID.test(seriesId) || seriesId.length > 50) {
    return 'Invalid series_id format'
  }

  if (endpoint && (!VALID_ENDPOINT.test(endpoint) || endpoint.length > 20)) {
    return 'Invalid endpoint format'
  }

  if (startDate && !VALID_DATE.test(startDate)) {
    return 'Invalid observation_start date format (use YYYY-MM-DD)'
  }

  if (endDate && !VALID_DATE.test(endDate)) {
    return 'Invalid observation_end date format (use YYYY-MM-DD)'
  }

  return null
}

/**
 * Proxy endpoint for FRED API requests (v2)
 * This bypasses CORS restrictions by making server-side requests
 * v2: Removed forced monthly frequency - quarterly series now work
 * v3: Added server-side API key support via FRED_API_KEY env var
 * v4: Added security improvements - rate limiting, input validation, CORS restrictions
 */
export async function GET(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request)

  // Check rate limit
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
             request.headers.get('x-real-ip') ||
             'unknown'
  const rateLimit = checkRateLimit(ip)

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please try again later.' },
      {
        status: 429,
        headers: {
          ...corsHeaders,
          'Retry-After': '60',
        },
      }
    )
  }

  const searchParams = request.nextUrl.searchParams
  const seriesId = searchParams.get('series_id')
  const clientApiKey = searchParams.get('api_key')
  const startDate = searchParams.get('observation_start')
  const endDate = searchParams.get('observation_end')
  const endpoint = searchParams.get('endpoint')

  // Validate input parameters
  const validationError = validateParams(seriesId, endpoint, startDate, endDate)
  if (validationError) {
    return NextResponse.json(
      { error: validationError },
      { status: 400, headers: corsHeaders }
    )
  }

  // Use server-side key if available, otherwise fall back to client-provided key
  const apiKey = SERVER_FRED_API_KEY || clientApiKey

  if (!apiKey) {
    return NextResponse.json(
      { error: 'API key not configured' },
      { status: 400, headers: corsHeaders }
    )
  }

  try {
    // Build FRED API URL
    // If endpoint is empty or not provided, use /series (for metadata)
    // Otherwise use /series/{endpoint} (e.g., /series/observations)
    const fredPath = endpoint ? `/series/${endpoint}` : '/series'
    const fredUrl = new URL(`${FRED_API_BASE}${fredPath}`)
    fredUrl.searchParams.set('series_id', seriesId!)
    fredUrl.searchParams.set('api_key', apiKey)
    fredUrl.searchParams.set('file_type', 'json')

    if (startDate) {
      fredUrl.searchParams.set('observation_start', startDate)
    }
    if (endDate) {
      fredUrl.searchParams.set('observation_end', endDate)
    }
    // Note: Don't force monthly frequency - some series (like GDP, Investment)
    // are only available quarterly. Let FRED return native frequency.

    const response = await fetch(fredUrl.toString(), {
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      // Log full error server-side for debugging
      const errorText = await response.text()
      console.error(`FRED API error for ${seriesId}:`, response.status, errorText)

      // Return sanitized error to client
      return NextResponse.json(
        { error: 'Failed to fetch data from FRED' },
        { status: response.status >= 500 ? 502 : response.status, headers: corsHeaders }
      )
    }

    const data = await response.json()

    return NextResponse.json(data, {
      headers: {
        ...corsHeaders,
        'X-RateLimit-Remaining': String(rateLimit.remaining),
      },
    })
  } catch (error) {
    // Log full error server-side
    console.error(`Failed to proxy FRED request for ${seriesId}:`, error)

    // Return sanitized error to client
    return NextResponse.json(
      { error: 'Service temporarily unavailable' },
      { status: 503, headers: corsHeaders }
    )
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request)
  return NextResponse.json({}, { headers: corsHeaders })
}

// POST endpoint to check if server-side API key is configured
export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request)

  return NextResponse.json({
    hasServerKey: !!SERVER_FRED_API_KEY,
  }, {
    headers: corsHeaders,
  })
}
