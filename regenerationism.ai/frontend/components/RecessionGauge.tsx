'use client'

import { motion } from 'framer-motion'

interface RecessionGaugeProps {
  probability: number // 0-100
  alertLevel: string
}

export default function RecessionGauge({ probability, alertLevel }: RecessionGaugeProps) {
  // Determine color based on probability - Bloomberg style
  const getColor = () => {
    if (probability < 30) return '#00d26a' // BB Green
    if (probability < 50) return '#ffd60a' // BB Yellow
    if (probability < 70) return '#ff9500' // BB Amber/Orange
    return '#ff3b30' // BB Red
  }

  const color = getColor()

  // SVG gauge parameters
  const size = 280
  const strokeWidth = 16
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
    <div className={`relative ${glowClass} rounded-full bg-terminal-panel p-4`}>
      <svg width={size} height={size} className="transform -rotate-[135deg]">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#21262d"
          strokeWidth={strokeWidth}
          strokeDasharray={`${arc} ${circumference}`}
        />

        {/* Filled arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${arc} ${circumference}`}
          initial={{ strokeDashoffset: arc }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xxs font-mono text-bb-muted uppercase tracking-widest mb-2">
          RECESSION RISK
        </span>
        <motion.span
          className="font-mono text-5xl font-bold"
          style={{ color }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          {probability}%
        </motion.span>
        <span
          className="text-xs font-mono font-bold uppercase tracking-wider mt-2 px-2 py-0.5"
          style={{ color, backgroundColor: `${color}20` }}
        >
          {alertLevel.toUpperCase()}
        </span>
      </div>

      {/* Tick marks */}
      <div className="absolute inset-0">
        {[0, 25, 50, 75, 100].map((tick) => {
          const angle = -135 + (tick / 100) * 270
          const radian = (angle * Math.PI) / 180
          const x = size / 2 + (radius + 28) * Math.cos(radian) + 16 // offset for padding
          const y = size / 2 + (radius + 28) * Math.sin(radian) + 16

          return (
            <span
              key={tick}
              className="absolute text-xxs font-mono text-bb-muted"
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
