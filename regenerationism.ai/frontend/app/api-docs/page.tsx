'use client'

import { useState } from 'react'
import { Copy, Check, Play, ChevronDown, ChevronRight } from 'lucide-react'

const endpoints = [
  {
    method: 'GET',
    path: '/api/v1/latest',
    description: 'Get current NIV score and crisis probability',
    response: `{
  "date": "2026-01-15",
  "niv_score": 12.4,
  "recession_probability": 32.5,
  "alert_level": "elevated",
  "components": {
    "thrust": 0.234,
    "efficiency": 0.018,
    "slack": 0.215,
    "drag": 0.028
  }
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/history',
    description: 'Get historical NIV data with optional date filters',
    params: [
      { name: 'start', type: 'string', desc: 'Start date (YYYY-MM-DD)' },
      { name: 'end', type: 'string', desc: 'End date (YYYY-MM-DD)' },
      { name: 'limit', type: 'number', desc: 'Max records (default: 1000)' },
    ],
    response: `{
  "count": 240,
  "start_date": "2004-01-01",
  "end_date": "2026-01-01",
  "data": [
    {
      "date": "2004-01-01",
      "niv_score": 18.2,
      "recession_probability": 22.1,
      "is_recession": false
    },
    ...
  ]
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/components',
    description: 'Get detailed component breakdown with interpretations',
    response: `{
  "thrust": 0.234,
  "efficiency": 0.018,
  "slack": 0.215,
  "drag": 0.028,
  "interpretation": {
    "thrust_status": "Moderate growth impulse",
    "efficiency_status": "Healthy investment levels",
    "slack_status": "Elevated slack",
    "drag_status": "Normal friction levels"
  }
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/compare',
    description: 'NIV vs Fed Yield Curve comparison data',
    response: `[
  {
    "date": "2026-01-01",
    "niv_probability": 28.5,
    "fed_probability": 22.1,
    "is_recession": false
  },
  ...
]`,
  },
]

export default function APIDocsPage() {
  return (
    <div className="bg-black min-h-screen pt-24 pb-16">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="mb-16">
          <p className="text-caption uppercase text-gray-500 mb-4">Developer Resources</p>
          <h1 className="section-headline text-white mb-6">API Documentation</h1>
          <p className="text-lg text-gray-400 mb-8 max-w-2xl">
            Access NIV data programmatically. Free for research and personal use.
          </p>

          <div className="border border-white/10 bg-[#0a0a0a] p-6">
            <p className="text-caption uppercase text-gray-500 mb-3">Base URL</p>
            <code className="text-white font-mono text-lg">
              https://api.regenerationism.ai
            </code>
          </div>
        </div>
        
        {/* Quick Start */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Quick Start</h2>
          
          <div className="grid md:grid-cols-3 gap-4">
            <CodeExample
              language="curl"
              code={`curl https://api.regenerationism.ai/api/v1/latest`}
            />
            <CodeExample
              language="python"
              code={`import requests

r = requests.get(
  "https://api.regenerationism.ai/api/v1/latest"
)
print(r.json()["recession_probability"])`}
            />
            <CodeExample
              language="javascript"
              code={`const res = await fetch(
  "https://api.regenerationism.ai/api/v1/latest"
);
const { niv_score } = await res.json();`}
            />
          </div>
        </section>
        
        {/* Endpoints */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Endpoints</h2>
          
          <div className="space-y-6">
            {endpoints.map((endpoint) => (
              <EndpointCard key={endpoint.path} {...endpoint} />
            ))}
          </div>
        </section>
        
        {/* Rate Limits */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold mb-6">Rate Limits</h2>
          
          <div className="border border-white/10 bg-[#0a0a0a] p-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 text-gray-400">Tier</th>
                  <th className="text-left py-2 text-gray-400">Requests/min</th>
                  <th className="text-left py-2 text-gray-400">Daily Limit</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-white/5">
                  <td className="py-3">Free</td>
                  <td className="py-3">10</td>
                  <td className="py-3">1,000</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-3">Research</td>
                  <td className="py-3">60</td>
                  <td className="py-3">10,000</td>
                </tr>
                <tr>
                  <td className="py-3">Enterprise</td>
                  <td className="py-3">Unlimited</td>
                  <td className="py-3">Unlimited</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}

function CodeExample({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false)
  
  const copy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  return (
    <div className="border border-white/10 bg-[#0a0a0a] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-black border-b border-white/10">
        <span className="text-xs text-gray-400 uppercase">{language}</span>
        <button onClick={copy} className="text-gray-400 hover:text-white">
          {copied ? <Check className="w-4 h-4 text-regen-400" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
      <pre className="p-4 text-sm overflow-x-auto">
        <code className="text-gray-300">{code}</code>
      </pre>
    </div>
  )
}

function EndpointCard({
  method,
  path,
  description,
  params,
  response,
}: {
  method: string
  path: string
  description: string
  params?: { name: string; type: string; desc: string }[]
  response: string
}) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  
  const copy = () => {
    navigator.clipboard.writeText(response)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  return (
    <div className="border border-white/10 bg-[#0a0a0a] overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 p-4 hover:bg-black border-b border-white/10 transition text-left"
      >
        <span className="px-2 py-1 bg-regen-500/20 text-regen-400 text-xs font-bold rounded">
          {method}
        </span>
        <span className="font-mono text-sm">{path}</span>
        <span className="text-sm text-gray-400 flex-1">{description}</span>
        {expanded ? (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-400" />
        )}
      </button>
      
      {expanded && (
        <div className="border-t border-white/5 p-4">
          {params && (
            <div className="mb-4">
              <h4 className="text-sm font-bold mb-2">Parameters</h4>
              <table className="w-full text-sm">
                <tbody>
                  {params.map((p) => (
                    <tr key={p.name} className="border-b border-white/5">
                      <td className="py-2 font-mono text-regen-400">{p.name}</td>
                      <td className="py-2 text-gray-400">{p.type}</td>
                      <td className="py-2 text-gray-400">{p.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold">Response</h4>
              <button onClick={copy} className="text-gray-400 hover:text-white text-sm flex items-center gap-1">
                {copied ? <Check className="w-4 h-4 text-regen-400" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="bg-black border-b border-white/10 rounded-lg p-4 text-sm overflow-x-auto">
              <code className="text-gray-300">{response}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
