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
  Brush,
} from 'recharts'
import { Calendar, Download, Filter, ZoomIn, ZoomOut } from 'lucide-react'

// Generate 60+ years of mock data
const generateHistoricalData = () => {
  const data = []
  const recessions = [
    { start: '1969-12', end: '1970-11', name: '1970 Recession' },
    { start: '1973-11', end: '1975-03', name: '1973-75 Recession' },
    { start: '1980-01', end: '1980-07', name: '1980 Recession' },
    { start: '1981-07', end: '1982-11', name: '1981-82 Recession' },
    { start: '1990-07', end: '1991-03', name: '1990-91 Recession' },
    { start: '2001-03', end: '2001-11', name: 'Dot-com Recession' },
    { start: '2007-12', end: '2009-06', name: 'Great Recession' },
    { start: '2020-02', end: '2020-04', name: 'COVID Recession' },
  ]
  
  for (let year = 1960; year <= 2026; year++) {
    for (let month = 1; month <= 12; month++) {
      const date = `${year}-${month.toString().padStart(2, '0')}`
      const isRecession = recessions.some(r => date >= r.start && date <= r.end)
      
      // Base NIV with cycle and trend
      const cycle = Math.sin((year - 1960) * 0.3 + month * 0.1) * 15
      const trend = (year - 1960) * 0.1
      let niv = 20 + cycle + trend + (Math.random() - 0.5) * 10
      
      // Spike before and during recessions
      const beforeRecession = recessions.some(r => {
        const months = (new Date(r.start).getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24 * 30)
        return months > 0 && months < 9
      })
      
      if (beforeRecession) niv += 20
      if (isRecession) niv += 35
      
      const prob = Math.min(95, Math.max(5, niv + 15 + Math.random() * 10))
      
      data.push({
        date,
        niv: Math.round(niv * 10) / 10,
        probability: Math.round(prob),
        isRecession,
      })
    }
  }
  return data
}

const allData = generateHistoricalData()

export default function ExplorerPage() {
  const [data, setData] = useState(allData)
  const [startDate, setStartDate] = useState('2000-01')
  const [endDate, setEndDate] = useState('2026-01')
  const [showRecessions, setShowRecessions] = useState(true)
  
  useEffect(() => {
    const filtered = allData.filter(d => d.date >= startDate && d.date <= endDate)
    setData(filtered)
  }, [startDate, endDate])
  
  const recessionPeriods = [
    { start: '2007-12', end: '2009-06' },
    { start: '2020-02', end: '2020-04' },
    { start: '2001-03', end: '2001-11' },
  ].filter(r => r.start >= startDate && r.end <= endDate)
  
  const exportCSV = () => {
    const csv = [
      'date,niv_score,recession_probability,is_recession',
      ...data.map(d => `${d.date},${d.niv},${d.probability},${d.isRecession}`)
    ].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `niv_data_${startDate}_${endDate}.csv`
    a.click()
  }
  
  return (
    <div className="min-h-screen py-8 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Historical Explorer</h1>
            <p className="text-gray-400">60+ years of NIV data (1960-present)</p>
          </div>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-regen-500 text-black font-bold rounded-lg hover:bg-regen-400 transition"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
        
        {/* Filters */}
        <div className="glass-card rounded-xl p-4 mb-6">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              <input
                type="month"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-dark-600 border border-white/10 rounded-lg px-3 py-2 text-sm"
              />
              <span className="text-gray-400">to</span>
              <input
                type="month"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-dark-600 border border-white/10 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showRecessions}
                onChange={(e) => setShowRecessions(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-gray-400">Show recession periods</span>
            </label>
            
            <div className="flex gap-2 ml-auto">
              <button
                onClick={() => { setStartDate('2020-01'); setEndDate('2026-01') }}
                className="px-3 py-1 text-sm bg-dark-600 rounded-lg hover:bg-dark-500"
              >
                5Y
              </button>
              <button
                onClick={() => { setStartDate('2015-01'); setEndDate('2026-01') }}
                className="px-3 py-1 text-sm bg-dark-600 rounded-lg hover:bg-dark-500"
              >
                10Y
              </button>
              <button
                onClick={() => { setStartDate('2000-01'); setEndDate('2026-01') }}
                className="px-3 py-1 text-sm bg-dark-600 rounded-lg hover:bg-dark-500"
              >
                25Y
              </button>
              <button
                onClick={() => { setStartDate('1960-01'); setEndDate('2026-01') }}
                className="px-3 py-1 text-sm bg-dark-600 rounded-lg hover:bg-dark-500"
              >
                All
              </button>
            </div>
          </div>
        </div>
        
        {/* Main Chart */}
        <div className="glass-card rounded-2xl p-6 mb-6">
          <h3 className="text-lg font-bold mb-4">NIV Score Over Time</h3>
          <div className="h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                
                {showRecessions && recessionPeriods.map((period, i) => (
                  <ReferenceArea
                    key={i}
                    x1={period.start}
                    x2={period.end}
                    fill="#ef4444"
                    fillOpacity={0.15}
                  />
                ))}
                
                <XAxis
                  dataKey="date"
                  stroke="#666"
                  tick={{ fill: '#888', fontSize: 11 }}
                  tickFormatter={(v) => v.split('-')[0]}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="#666"
                  tick={{ fill: '#888', fontSize: 11 }}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number, name: string) => [
                    name === 'niv' ? value.toFixed(1) : `${value}%`,
                    name === 'niv' ? 'NIV Score' : 'Recession Prob'
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="niv"
                  stroke="#22c55e"
                  strokeWidth={1.5}
                  dot={false}
                />
                <Brush
                  dataKey="date"
                  height={30}
                  stroke="#333"
                  fill="#1a1a1a"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Recession Probability Chart */}
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-bold mb-4">Recession Probability</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                
                {showRecessions && recessionPeriods.map((period, i) => (
                  <ReferenceArea
                    key={i}
                    x1={period.start}
                    x2={period.end}
                    fill="#ef4444"
                    fillOpacity={0.15}
                  />
                ))}
                
                <XAxis
                  dataKey="date"
                  stroke="#666"
                  tick={{ fill: '#888', fontSize: 11 }}
                  tickFormatter={(v) => v.split('-')[0]}
                />
                <YAxis
                  stroke="#666"
                  tick={{ fill: '#888', fontSize: 11 }}
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`${value}%`, 'Probability']}
                />
                
                {/* 50% threshold */}
                <Line
                  type="monotone"
                  dataKey={() => 50}
                  stroke="#666"
                  strokeDasharray="5 5"
                  dot={false}
                />
                
                <Line
                  type="monotone"
                  dataKey="probability"
                  stroke="#f97316"
                  strokeWidth={1.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-orange-500" />
              <span className="text-sm text-gray-400">Recession Probability</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 border-t-2 border-dashed border-gray-500" />
              <span className="text-sm text-gray-400">50% Threshold</span>
            </div>
            {showRecessions && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500/20" />
                <span className="text-sm text-gray-400">NBER Recession</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
