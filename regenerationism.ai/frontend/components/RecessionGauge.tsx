'use client'

import { motion } from 'framer-motion'

interface RecessionGaugeProps {
  probability: number // 0-100
  alertLevel: string
}

export default function RecessionGauge({ probability, alertLevel }: RecessionGaugeProps) {
  // Determine color based on probability
  const getColor = () => {
    if (probability < 30) return '#22c55e' // Green
    if (probability < 50) return '#eab308' // Yellow
    if (probability < 70) return '#f97316' // Orange
    return '#ef4444' // Red
  }
  
  const color = getColor()
  
  // SVG gauge parameters
  const size = 300
  const strokeWidth = 20
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const arc = circumference * 0.75 // 270 degrees
  const offset = arc - (arc * probability / 100)
  
  // Glow class based on alert level
  const glowClass = {
    normal: 'glow-normal',
    elevated: 'glow-elevated',
    warning: 'glow-warning',
    critical: 'glow-critical',
  }[alertLevel] || ''
  
  return (
    <div className={`relative ${glowClass} rounded-full`}>
      <svg width={size} height={size} className="transform -rotate-[135deg]">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="gauge-track"
          strokeDasharray={`${arc} ${circumference}`}
        />
        
        {/* Filled arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="gauge-fill"
          stroke={color}
          strokeDasharray={`${arc} ${circumference}`}
          initial={{ strokeDashoffset: arc }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm text-gray-400 uppercase tracking-wider mb-2">
          Recession Risk
        </span>
        <motion.span
          className="big-number"
          style={{ color }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          {probability}%
        </motion.span>
        <span 
          className="text-sm font-bold uppercase tracking-wider mt-2"
          style={{ color }}
        >
          {alertLevel}
        </span>
      </div>
      
      {/* Tick marks */}
      <div className="absolute inset-0">
        {[0, 25, 50, 75, 100].map((tick) => {
          const angle = -135 + (tick / 100) * 270
          const radian = (angle * Math.PI) / 180
          const x = size / 2 + (radius + 25) * Math.cos(radian)
          const y = size / 2 + (radius + 25) * Math.sin(radian)
          
          return (
            <span
              key={tick}
              className="absolute text-xs text-gray-500 font-mono"
              style={{
                left: x - 10,
                top: y - 8,
              }}
            >
              {tick}
            </span>
          )
        })}
      </div>
    </div>
  )
}
