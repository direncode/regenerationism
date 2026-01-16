import { NextRequest, NextResponse } from 'next/server'

const FRED_API_BASE = 'https://api.stlouisfed.org/fred'

/**
 * Proxy endpoint for FRED API requests
 * This bypasses CORS restrictions by making server-side requests
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const seriesId = searchParams.get('series_id')
  const apiKey = searchParams.get('api_key')
  const startDate = searchParams.get('observation_start')
  const endDate = searchParams.get('observation_end')
  const endpoint = searchParams.get('endpoint') || 'observations'

  if (!seriesId || !apiKey) {
    return NextResponse.json(
      { error: 'Missing required parameters: series_id and api_key' },
      { status: 400 }
    )
  }

  try {
    // Build FRED API URL
    const fredUrl = new URL(`${FRED_API_BASE}/series/${endpoint}`)
    fredUrl.searchParams.set('series_id', seriesId)
    fredUrl.searchParams.set('api_key', apiKey)
    fredUrl.searchParams.set('file_type', 'json')

    if (startDate) {
      fredUrl.searchParams.set('observation_start', startDate)
    }
    if (endDate) {
      fredUrl.searchParams.set('observation_end', endDate)
    }
    if (endpoint === 'observations') {
      fredUrl.searchParams.set('frequency', 'm') // Monthly
    }

    console.log(`Proxying FRED request for ${seriesId}`)

    const response = await fetch(fredUrl.toString(), {
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`FRED API error for ${seriesId}:`, response.status, errorText)
      return NextResponse.json(
        { error: `FRED API error: ${response.status}`, details: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Return with CORS headers
    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  } catch (error) {
    console.error(`Failed to proxy FRED request for ${seriesId}:`, error)
    return NextResponse.json(
      { error: 'Failed to fetch from FRED API', details: String(error) },
      { status: 500 }
    )
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
