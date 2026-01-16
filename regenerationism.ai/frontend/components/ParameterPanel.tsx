'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Settings2,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Zap,
  Gauge,
  Activity,
  Anchor,
  Info,
  Save,
  Play,
  Loader2
} from 'lucide-react'
import { useSessionStore } from '@/store/sessionStore'

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  icon: React.ReactNode
  tooltip: string
  unit?: string
  color?: string
}

function ParameterSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  icon,
  tooltip,
  unit = '',
  color = 'regen'
}: SliderProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const percentage = ((value - min) / (max - min)) * 100

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-gray-400">{icon}</span>
          <span className="text-sm font-medium text-gray-200">{label}</span>
          <button
            className="text-gray-500 hover:text-gray-300 transition"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <Info size={14} />
          </button>
        </div>
        <span className="text-sm font-mono text-regen-400">
          {value.toFixed(step < 1 ? 2 : 0)}{unit}
        </span>
      </div>

      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-xs text-gray-400 bg-dark-700 rounded px-2 py-1 mb-2"
          >
            {tooltip}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative">
        <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
          <motion.div
            className={`h-full bg-gradient-to-r from-${color}-600 to-${color}-400`}
            style={{ width: `${percentage}%` }}
            initial={false}
            animate={{ width: `${percentage}%` }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <motion.div
          className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-${color}-500 rounded-full shadow-lg border-2 border-white/20`}
          style={{ left: `calc(${percentage}% - 8px)` }}
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
        />
      </div>

      <div className="flex justify-between text-xs text-gray-500">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  )
}

export default function ParameterPanel() {
  const {
    params,
    setEta,
    setWeights,
    setSmoothWindow,
    setDateRange,
    showAdvancedParams,
    toggleAdvancedParams,
    resetToDefaults,
    isSimulating,
    setIsSimulating,
  } = useSessionStore()

  const [showSaveModal, setShowSaveModal] = useState(false)

  const handleRunSimulation = async () => {
    setIsSimulating(true)
    // Simulation will be handled by parent component or API call
    // This just sets the UI state
    setTimeout(() => setIsSimulating(false), 2000) // Placeholder
  }

  return (
    <div className="glass-card rounded-2xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-regen-500/20 rounded-lg">
            <Settings2 className="w-5 h-5 text-regen-400" />
          </div>
          <div>
            <h3 className="font-bold text-white">Model Parameters</h3>
            <p className="text-xs text-gray-400">Adjust NIV formula settings</p>
          </div>
        </div>
        <button
          onClick={resetToDefaults}
          className="p-2 text-gray-400 hover:text-white hover:bg-dark-600 rounded-lg transition"
          title="Reset to defaults"
        >
          <RotateCcw size={18} />
        </button>
      </div>

      {/* Primary Parameter: Eta */}
      <div className="p-4 bg-dark-700/50 rounded-xl border border-white/5">
        <ParameterSlider
          label="Friction Exponent (η)"
          value={params.eta}
          min={0.5}
          max={3.0}
          step={0.1}
          onChange={setEta}
          icon={<Anchor size={16} />}
          tooltip="Controls how strongly friction (slack + drag) affects NIV. Higher = more sensitive to economic stress."
          color="regen"
        />
        <div className="mt-3 flex gap-2">
          {[1.0, 1.5, 2.0, 2.5].map((preset) => (
            <button
              key={preset}
              onClick={() => setEta(preset)}
              className={`px-3 py-1 text-xs rounded-lg transition ${
                params.eta === preset
                  ? 'bg-regen-500 text-black font-bold'
                  : 'bg-dark-600 text-gray-400 hover:text-white'
              }`}
            >
              η={preset}
            </button>
          ))}
        </div>
      </div>

      {/* Date Range */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Start Date</label>
          <input
            type="date"
            value={params.startDate}
            onChange={(e) => setDateRange(e.target.value, params.endDate)}
            className="w-full bg-dark-700 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-regen-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">End Date</label>
          <input
            type="date"
            value={params.endDate}
            onChange={(e) => setDateRange(params.startDate, e.target.value)}
            className="w-full bg-dark-700 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-regen-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Advanced Parameters Toggle */}
      <button
        onClick={toggleAdvancedParams}
        className="w-full flex items-center justify-between p-3 bg-dark-700/50 rounded-lg hover:bg-dark-600/50 transition"
      >
        <span className="text-sm text-gray-300">Advanced Parameters</span>
        {showAdvancedParams ? (
          <ChevronUp size={18} className="text-gray-400" />
        ) : (
          <ChevronDown size={18} className="text-gray-400" />
        )}
      </button>

      {/* Advanced Parameters */}
      <AnimatePresence>
        {showAdvancedParams && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-6 overflow-hidden"
          >
            {/* Component Weights */}
            <div className="space-y-4 p-4 bg-dark-700/30 rounded-xl border border-white/5">
              <h4 className="text-sm font-medium text-gray-300">Component Weights</h4>

              <ParameterSlider
                label="Thrust Weight"
                value={params.weights.thrust}
                min={0}
                max={2}
                step={0.1}
                onChange={(v) => setWeights({ thrust: v })}
                icon={<Zap size={16} />}
                tooltip="Weight for monetary/fiscal impulse component"
              />

              <ParameterSlider
                label="Efficiency Weight"
                value={params.weights.efficiency}
                min={0}
                max={2}
                step={0.1}
                onChange={(v) => setWeights({ efficiency: v })}
                icon={<Gauge size={16} />}
                tooltip="Weight for investment efficiency (squared in formula)"
              />

              <ParameterSlider
                label="Slack Weight"
                value={params.weights.slack}
                min={0}
                max={2}
                step={0.1}
                onChange={(v) => setWeights({ slack: v })}
                icon={<Activity size={16} />}
                tooltip="Weight for unused capacity component"
              />

              <ParameterSlider
                label="Drag Weight"
                value={params.weights.drag}
                min={0}
                max={2}
                step={0.1}
                onChange={(v) => setWeights({ drag: v })}
                icon={<Anchor size={16} />}
                tooltip="Weight for economic friction component"
              />
            </div>

            {/* Smoothing Window */}
            <div className="p-4 bg-dark-700/30 rounded-xl border border-white/5">
              <ParameterSlider
                label="Smoothing Window"
                value={params.smoothWindow}
                min={1}
                max={24}
                step={1}
                onChange={setSmoothWindow}
                icon={<Activity size={16} />}
                tooltip="Number of months for rolling average smoothing"
                unit=" mo"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t border-white/5">
        <button
          onClick={() => setShowSaveModal(true)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-dark-600 hover:bg-dark-500 text-gray-300 rounded-xl transition"
        >
          <Save size={18} />
          <span>Save Scenario</span>
        </button>
        <button
          onClick={handleRunSimulation}
          disabled={isSimulating}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-regen-500 hover:bg-regen-400 text-black font-bold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSimulating ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Running...</span>
            </>
          ) : (
            <>
              <Play size={18} />
              <span>Run Simulation</span>
            </>
          )}
        </button>
      </div>

      {/* Formula Preview */}
      <div className="p-3 bg-dark-800 rounded-lg font-mono text-xs text-gray-400">
        <span className="text-regen-400">NIV</span> = (
        <span className="text-blue-400">{params.weights.thrust.toFixed(1)}</span>u ×
        <span className="text-purple-400">{params.weights.efficiency.toFixed(1)}</span>P²) / (
        <span className="text-yellow-400">{params.weights.slack.toFixed(1)}</span>X +
        <span className="text-red-400">{params.weights.drag.toFixed(1)}</span>F)
        <sup className="text-orange-400">{params.eta.toFixed(1)}</sup>
      </div>

      {/* Save Scenario Modal */}
      <AnimatePresence>
        {showSaveModal && (
          <SaveScenarioModal onClose={() => setShowSaveModal(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}

function SaveScenarioModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const { saveScenario } = useSessionStore()

  const handleSave = () => {
    if (name.trim()) {
      saveScenario(name.trim(), description.trim())
      onClose()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-dark-800 rounded-2xl p-6 w-full max-w-md border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold mb-4">Save Scenario</h3>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., High Sensitivity Model"
              className="w-full bg-dark-700 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-regen-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this scenario..."
              rows={3}
              className="w-full bg-dark-700 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-regen-500 focus:outline-none resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-dark-600 hover:bg-dark-500 text-gray-300 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="flex-1 px-4 py-2 bg-regen-500 hover:bg-regen-400 text-black font-bold rounded-lg transition disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
