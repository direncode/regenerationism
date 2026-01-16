'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FolderOpen,
  Play,
  Trash2,
  Clock,
  Star,
  ChevronRight,
  Search,
  Filter
} from 'lucide-react'
import { useSessionStore, Scenario } from '@/store/sessionStore'

export default function ScenarioLibrary() {
  const { scenarios, activeScenarioId, loadScenario, deleteScenario } = useSessionStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [showPresetsOnly, setShowPresetsOnly] = useState(false)

  const filteredScenarios = scenarios.filter((scenario) => {
    const matchesSearch =
      scenario.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scenario.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = showPresetsOnly ? scenario.isPreset : true
    return matchesSearch && matchesFilter
  })

  const presetScenarios = filteredScenarios.filter((s) => s.isPreset)
  const customScenarios = filteredScenarios.filter((s) => !s.isPreset)

  return (
    <div className="glass-card rounded-2xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <FolderOpen className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="font-bold text-white">Scenario Library</h3>
            <p className="text-xs text-gray-400">
              {scenarios.length} scenarios available
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search scenarios..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-dark-700 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
          />
        </div>
        <button
          onClick={() => setShowPresetsOnly(!showPresetsOnly)}
          className={`px-3 py-2 rounded-lg transition flex items-center gap-2 ${
            showPresetsOnly
              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
              : 'bg-dark-700 text-gray-400 hover:text-white border border-white/10'
          }`}
        >
          <Filter size={16} />
          <span className="text-sm">Presets</span>
        </button>
      </div>

      {/* Preset Scenarios */}
      {presetScenarios.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-400 flex items-center gap-2">
            <Star size={14} className="text-yellow-500" />
            Preset Scenarios
          </h4>
          <div className="space-y-2">
            {presetScenarios.map((scenario) => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                isActive={activeScenarioId === scenario.id}
                onLoad={() => loadScenario(scenario.id)}
                onDelete={() => {}} // Can't delete presets
              />
            ))}
          </div>
        </div>
      )}

      {/* Custom Scenarios */}
      {customScenarios.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-400 flex items-center gap-2">
            <Clock size={14} />
            Your Scenarios
          </h4>
          <div className="space-y-2">
            {customScenarios.map((scenario) => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                isActive={activeScenarioId === scenario.id}
                onLoad={() => loadScenario(scenario.id)}
                onDelete={() => deleteScenario(scenario.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredScenarios.length === 0 && (
        <div className="text-center py-8">
          <FolderOpen className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No scenarios found</p>
          <p className="text-sm text-gray-500">
            {searchQuery
              ? 'Try a different search term'
              : 'Save your first scenario to get started'}
          </p>
        </div>
      )}
    </div>
  )
}

function ScenarioCard({
  scenario,
  isActive,
  onLoad,
  onDelete,
}: {
  scenario: Scenario
  isActive: boolean
  onLoad: () => void
  onDelete: () => void
}) {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <motion.div
      layout
      className={`p-4 rounded-xl border transition cursor-pointer ${
        isActive
          ? 'bg-purple-500/10 border-purple-500/30'
          : 'bg-dark-700/50 border-white/5 hover:border-white/10'
      }`}
    >
      <div
        className="flex items-start justify-between gap-3"
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h5 className="font-medium text-white truncate">{scenario.name}</h5>
            {scenario.isPreset && (
              <span className="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded">
                Preset
              </span>
            )}
            {isActive && (
              <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded">
                Active
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400 truncate mt-1">
            {scenario.description || 'No description'}
          </p>
        </div>
        <ChevronRight
          className={`w-5 h-5 text-gray-500 transition-transform ${
            showDetails ? 'rotate-90' : ''
          }`}
        />
      </div>

      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-white/5 space-y-3"
          >
            {/* Parameter Summary */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Eta (η):</span>
                <span className="font-mono text-regen-400">
                  {scenario.params.eta.toFixed(1)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Window:</span>
                <span className="font-mono text-gray-300">
                  {scenario.params.smoothWindow}mo
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Start:</span>
                <span className="font-mono text-gray-300">
                  {scenario.params.startDate}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">End:</span>
                <span className="font-mono text-gray-300">
                  {scenario.params.endDate}
                </span>
              </div>
            </div>

            {/* Weights */}
            <div className="flex flex-wrap gap-2">
              {Object.entries(scenario.params.weights).map(([key, value]) => (
                <span
                  key={key}
                  className="px-2 py-1 text-xs bg-dark-600 rounded font-mono"
                >
                  {key}: {value.toFixed(1)}
                </span>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onLoad()
                }}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-500 hover:bg-purple-400 text-white rounded-lg transition text-sm font-medium"
              >
                <Play size={14} />
                Load Scenario
              </button>
              {!scenario.isPreset && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete()
                  }}
                  className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
