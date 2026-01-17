'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// NIV component weights
export interface ComponentWeights {
  thrust: number    // Default: 1.0
  efficiency: number // Default: 1.0 (squared in formula)
  slack: number     // Default: 1.0
  drag: number      // Default: 1.0
}

// Simulation parameters
export interface SimulationParams {
  eta: number                    // Friction exponent (default: 1.5)
  weights: ComponentWeights      // Component weights
  smoothWindow: number           // Smoothing window in months (default: 12)
  startDate: string             // Simulation start date
  endDate: string               // Simulation end date
}

// Stress test scenario
export interface Scenario {
  id: string
  name: string
  description: string
  params: SimulationParams
  createdAt: string
  isPreset?: boolean
}

// Monte Carlo configuration
export interface MonteCarloConfig {
  numDraws: number              // Number of random draws (default: 1000)
  windowSize: number            // Size of historical window to sample (months)
  confidenceLevel: number       // Confidence interval (e.g., 0.95 for 95%)
}

// Simulation result
export interface SimulationResult {
  date: string
  nivScore: number
  recessionProbability: number
  alertLevel: 'normal' | 'elevated' | 'warning' | 'critical'
  components: {
    thrust: number
    efficiency: number
    slack: number
    drag: number
  }
}

// API Settings
export interface ApiSettings {
  fredApiKey: string
  useLiveData: boolean
}

// Full session state
interface SessionState {
  // Current parameters
  params: SimulationParams

  // Saved scenarios
  scenarios: Scenario[]
  activeScenarioId: string | null

  // Monte Carlo settings
  monteCarloConfig: MonteCarloConfig

  // API settings
  apiSettings: ApiSettings

  // Results cache
  lastSimulation: SimulationResult[] | null
  lastMonteCarloResults: {
    mean: number
    median: number
    p5: number
    p95: number
    distribution: number[]
  } | null

  // UI state
  isSimulating: boolean
  showAdvancedParams: boolean

  // Actions
  setEta: (eta: number) => void
  setWeights: (weights: Partial<ComponentWeights>) => void
  setSmoothWindow: (window: number) => void
  setDateRange: (start: string, end: string) => void
  setParams: (params: Partial<SimulationParams>) => void

  saveScenario: (name: string, description: string) => void
  loadScenario: (id: string) => void
  deleteScenario: (id: string) => void

  setMonteCarloConfig: (config: Partial<MonteCarloConfig>) => void

  setApiSettings: (settings: Partial<ApiSettings>) => void
  setFredApiKey: (key: string) => void
  toggleLiveData: () => void

  setSimulationResults: (results: SimulationResult[]) => void
  setMonteCarloResults: (results: SessionState['lastMonteCarloResults']) => void

  setIsSimulating: (simulating: boolean) => void
  toggleAdvancedParams: () => void

  resetToDefaults: () => void
}

// Default values
const DEFAULT_WEIGHTS: ComponentWeights = {
  thrust: 1.0,
  efficiency: 1.0,
  slack: 1.0,
  drag: 1.0,
}

// Helper to get date 5 years ago for faster default loading
const getFiveYearsAgo = (): string => {
  const date = new Date()
  date.setFullYear(date.getFullYear() - 5)
  return date.toISOString().split('T')[0]
}

const DEFAULT_PARAMS: SimulationParams = {
  eta: 1.5,
  weights: DEFAULT_WEIGHTS,
  smoothWindow: 12,
  startDate: getFiveYearsAgo(),  // 5 years back for faster loading (was 2000-01-01)
  endDate: new Date().toISOString().split('T')[0],
}

const DEFAULT_MONTE_CARLO: MonteCarloConfig = {
  numDraws: 1000,
  windowSize: 60, // 5 years
  confidenceLevel: 0.95,
}

const DEFAULT_API_SETTINGS: ApiSettings = {
  fredApiKey: '',
  useLiveData: false,
}

// Preset scenarios
const PRESET_SCENARIOS: Scenario[] = [
  {
    id: 'preset-2008',
    name: '2008 Financial Crisis',
    description: 'Simulate conditions similar to the Great Recession with high drag and collapsed efficiency',
    params: {
      ...DEFAULT_PARAMS,
      startDate: '2006-01-01',
      endDate: '2010-12-31',
    },
    createdAt: '2024-01-01',
    isPreset: true,
  },
  {
    id: 'preset-covid',
    name: 'COVID-19 Shock',
    description: 'Rapid thrust collapse followed by massive stimulus response',
    params: {
      ...DEFAULT_PARAMS,
      startDate: '2019-01-01',
      endDate: '2022-12-31',
    },
    createdAt: '2024-01-01',
    isPreset: true,
  },
  {
    id: 'preset-stagflation',
    name: '1970s Stagflation',
    description: 'High drag from inflation combined with slack - worst of both worlds',
    params: {
      ...DEFAULT_PARAMS,
      eta: 2.0, // Higher friction penalty
      startDate: '1970-01-01',
      endDate: '1982-12-31',
    },
    createdAt: '2024-01-01',
    isPreset: true,
  },
  {
    id: 'preset-aggressive',
    name: 'Aggressive Detection',
    description: 'Higher eta makes model more sensitive to friction buildup',
    params: {
      ...DEFAULT_PARAMS,
      eta: 2.5,
      weights: { ...DEFAULT_WEIGHTS, drag: 1.5 },
    },
    createdAt: '2024-01-01',
    isPreset: true,
  },
  {
    id: 'preset-conservative',
    name: 'Conservative Detection',
    description: 'Lower eta reduces sensitivity, fewer false positives',
    params: {
      ...DEFAULT_PARAMS,
      eta: 1.0,
      weights: { ...DEFAULT_WEIGHTS, drag: 0.7 },
    },
    createdAt: '2024-01-01',
    isPreset: true,
  },
]

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      // Initial state
      params: DEFAULT_PARAMS,
      scenarios: PRESET_SCENARIOS,
      activeScenarioId: null,
      monteCarloConfig: DEFAULT_MONTE_CARLO,
      apiSettings: DEFAULT_API_SETTINGS,
      lastSimulation: null,
      lastMonteCarloResults: null,
      isSimulating: false,
      showAdvancedParams: false,

      // Parameter setters
      setEta: (eta) => set((state) => ({
        params: { ...state.params, eta },
        activeScenarioId: null, // Clear active scenario when params change
      })),

      setWeights: (weights) => set((state) => ({
        params: {
          ...state.params,
          weights: { ...state.params.weights, ...weights },
        },
        activeScenarioId: null,
      })),

      setSmoothWindow: (smoothWindow) => set((state) => ({
        params: { ...state.params, smoothWindow },
        activeScenarioId: null,
      })),

      setDateRange: (startDate, endDate) => set((state) => ({
        params: { ...state.params, startDate, endDate },
        activeScenarioId: null,
      })),

      setParams: (newParams) => set((state) => ({
        params: { ...state.params, ...newParams },
        activeScenarioId: null,
      })),

      // Scenario management
      saveScenario: (name, description) => {
        const id = `scenario-${Date.now()}`
        const newScenario: Scenario = {
          id,
          name,
          description,
          params: { ...get().params },
          createdAt: new Date().toISOString(),
        }
        set((state) => ({
          scenarios: [...state.scenarios, newScenario],
          activeScenarioId: id,
        }))
      },

      loadScenario: (id) => {
        const scenario = get().scenarios.find((s) => s.id === id)
        if (scenario) {
          set({
            params: { ...scenario.params },
            activeScenarioId: id,
          })
        }
      },

      deleteScenario: (id) => set((state) => ({
        scenarios: state.scenarios.filter((s) => s.id !== id || s.isPreset),
        activeScenarioId: state.activeScenarioId === id ? null : state.activeScenarioId,
      })),

      // Monte Carlo
      setMonteCarloConfig: (config) => set((state) => ({
        monteCarloConfig: { ...state.monteCarloConfig, ...config },
      })),

      // API Settings
      setApiSettings: (settings) => set((state) => ({
        apiSettings: { ...state.apiSettings, ...settings },
      })),

      setFredApiKey: (fredApiKey) => set((state) => ({
        // Auto-enable live data when API key is set, disable when cleared
        apiSettings: {
          ...state.apiSettings,
          fredApiKey,
          useLiveData: fredApiKey ? true : false,
        },
      })),

      toggleLiveData: () => set((state) => ({
        apiSettings: { ...state.apiSettings, useLiveData: !state.apiSettings.useLiveData },
      })),

      // Results
      setSimulationResults: (results) => set({ lastSimulation: results }),
      setMonteCarloResults: (results) => set({ lastMonteCarloResults: results }),

      // UI state
      setIsSimulating: (isSimulating) => set({ isSimulating }),
      toggleAdvancedParams: () => set((state) => ({
        showAdvancedParams: !state.showAdvancedParams,
      })),

      // Reset
      resetToDefaults: () => set({
        params: DEFAULT_PARAMS,
        activeScenarioId: null,
        lastSimulation: null,
        lastMonteCarloResults: null,
      }),
    }),
    {
      name: 'niv-session-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        params: state.params,
        scenarios: state.scenarios,
        activeScenarioId: state.activeScenarioId,
        monteCarloConfig: state.monteCarloConfig,
        apiSettings: state.apiSettings,
        showAdvancedParams: state.showAdvancedParams,
      }),
    }
  )
)

// Selector hooks for performance
export const useParams = () => useSessionStore((state) => state.params)
export const useScenarios = () => useSessionStore((state) => state.scenarios)
export const useMonteCarloConfig = () => useSessionStore((state) => state.monteCarloConfig)
export const useApiSettings = () => useSessionStore((state) => state.apiSettings)
export const useIsSimulating = () => useSessionStore((state) => state.isSimulating)
