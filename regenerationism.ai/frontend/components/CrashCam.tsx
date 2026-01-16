'use client'

import { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  Legend,
} from 'recharts'

// Generate historical comparison data
const generateMockData = () => {
  const data = []
  const recessions = [
    { start: '2007-12', end: '2009-06' },
    { start: '2020-02', end: '2020-04' },
  ]
  
  for (let year = 2005; year <= 2026; year++) {
    for (let month = 1; month <= 12; month++) {
      const date = `${year}-${month.toString().padStart(2, '0')}`
      const inRecession = recessions.some(r => date >= r.start && date <= r.end)
      
      const monthsBeforeRecession = recessions.reduce((acc, r) => {
        const diff = (new Date(r.start).getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24 * 30)
        if (diff > 0 && diff < 12) return Math.round(diff)
        return acc
      }, 0)
      
      let nivProb = 20 + Math.random() * 15
      if (monthsBeforeRecession > 0) nivProb = 30 + (12 - monthsBeforeRecession) * 6
      if (inRecession) nivProb = 70 + Math.random() * 20
      
      let fedProb = 15 + Math.random() * 10
      if (monthsBeforeRecession > 0 && monthsBeforeRecession < 6) fedProb = 25 + (6 - monthsBeforeRecession) * 8
      if (inRecession) fedProb = 60 + Math.random() * 25
      
      data.push({
        date,
        niv: Math.min(95, Math.max(5, nivProb)),
        fed: Math.min(90, Math.max(5, fedProb)),
        recession: inRecession,
      })
    }
  }
  return data
}

export default function CrashCam() {
  const [data, setData] = useState<any[]>([])
  const [timeRange, setTimeRange] = useState<'5y' | '10y' | 'all'>('10y')
  
  useEffect(() => {
    const allData = generateMockData()
    const now = new Date()
    let filtered = allData
    
    if (timeRange === '5y') {
      filtered = allData.filter(d => d.date >= `${now.getFullYear() - 5}-01`)
    } else if (timeRange === '10y') {
      filtered = allData.filter(d => d.date >= `${now.getFullYear() - 10}-01`)
    }
    setData(filtered)
  }, [timeRange])
  
  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold">NIV vs Fed Yield Curve</h3>
          <p className="text-sm text-gray-400">Recession probability comparison</p>
        </div>
        <div className="flex gap-2">
          {(['5y', '10y', 'all'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-sm rounded-lg transition ${
                timeRange === range ? 'bg-regen-500 text-black font-bold' : 'bg-dark-600 text-gray-400 hover:text-white'
              }`}
            >
              {range === 'all' ? 'All' : range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis 
              dataKey="date" 
              stroke="#666"
              tick={{ fill: '#888', fontSize: 12 }}
              tickFormatter={(v) => v.split('-')[1] === '01' ? v.split('-')[0] : ''}
            />
            <YAxis 
              stroke="#666"
              tick={{ fill: '#888', fontSize: 12 }}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }}
              formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name === 'niv' ? 'NIV' : 'Fed']}
            />
            <Line type="monotone" dataKey="niv" stroke="#22c55e" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="fed" stroke="#3b82f6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="flex items-center justify-center gap-6 mt-6 pt-6 border-t border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-regen-500 rounded" />
          <span className="text-sm text-gray-400">NIV (Leads ~6mo)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-blue-500 rounded" />
          <span className="text-sm text-gray-400">Fed Yield Curve</span>
        </div>
      </div>
    </div>
  )
}
