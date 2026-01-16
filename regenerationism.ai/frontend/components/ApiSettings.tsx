'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Key,
  Eye,
  EyeOff,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Loader2,
  Database,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { useSessionStore } from '@/store/sessionStore'
import { validateFREDApiKey } from '@/lib/fredApi'

export default function ApiSettings() {
  const { apiSettings, setFredApiKey, toggleLiveData } = useSessionStore()

  const [showKey, setShowKey] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [validationStatus, setValidationStatus] = useState<'idle' | 'valid' | 'invalid'>('idle')
  const [keyInput, setKeyInput] = useState(apiSettings.fredApiKey)

  // Validate FRED API key by making a test request directly to FRED
  const validateApiKey = async () => {
    if (!keyInput.trim()) {
      setValidationStatus('invalid')
      return
    }

    setIsValidating(true)
    setValidationStatus('idle')

    try {
      const isValid = await validateFREDApiKey(keyInput)

      if (isValid) {
        setValidationStatus('valid')
        setFredApiKey(keyInput)
      } else {
        setValidationStatus('invalid')
      }
    } catch (err) {
      // If validation fails due to network, save the key anyway
      // Real validation will happen when user runs simulation
      setValidationStatus('valid')
      setFredApiKey(keyInput)
    } finally {
      setIsValidating(false)
    }
  }

  const handleKeyChange = (value: string) => {
    setKeyInput(value)
    setValidationStatus('idle')
  }

  const handleSaveKey = () => {
    if (keyInput.trim()) {
      validateApiKey()
    }
  }

  const maskedKey = apiSettings.fredApiKey
    ? `${apiSettings.fredApiKey.slice(0, 4)}${'•'.repeat(Math.max(0, apiSettings.fredApiKey.length - 8))}${apiSettings.fredApiKey.slice(-4)}`
    : ''

  return (
    <div className="glass-card rounded-2xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Key className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="font-bold text-white">API Settings</h3>
            <p className="text-xs text-gray-400">Connect to live FRED data</p>
          </div>
        </div>

        {/* Live Data Toggle */}
        <button
          onClick={toggleLiveData}
          disabled={!apiSettings.fredApiKey}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition ${
            apiSettings.useLiveData && apiSettings.fredApiKey
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-dark-700 text-gray-400 border border-white/10'
          } ${!apiSettings.fredApiKey ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {apiSettings.useLiveData && apiSettings.fredApiKey ? (
            <>
              <Wifi size={16} />
              <span className="text-sm">Live</span>
            </>
          ) : (
            <>
              <WifiOff size={16} />
              <span className="text-sm">Mock</span>
            </>
          )}
        </button>
      </div>

      {/* Current Status */}
      {apiSettings.fredApiKey && (
        <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <div className="flex-1">
            <p className="text-sm text-green-400 font-medium">API Key Configured</p>
            <p className="text-xs text-gray-400 font-mono">{maskedKey}</p>
          </div>
          <button
            onClick={() => {
              setFredApiKey('')
              setKeyInput('')
              setValidationStatus('idle')
            }}
            className="text-xs text-red-400 hover:text-red-300"
          >
            Remove
          </button>
        </div>
      )}

      {/* API Key Input */}
      <div className="space-y-3">
        <label className="text-sm text-gray-400">FRED API Key</label>
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={keyInput}
            onChange={(e) => handleKeyChange(e.target.value)}
            placeholder="Enter your FRED API key..."
            className="w-full bg-dark-700 border border-white/10 rounded-lg pl-4 pr-20 py-3 text-white font-mono text-sm focus:border-blue-500 focus:outline-none"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <button
              onClick={() => setShowKey(!showKey)}
              className="p-2 text-gray-400 hover:text-white transition"
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Validation Status */}
        <AnimatePresence>
          {validationStatus !== 'idle' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`flex items-center gap-2 text-sm ${
                validationStatus === 'valid' ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {validationStatus === 'valid' ? (
                <>
                  <CheckCircle size={14} />
                  API key saved successfully
                </>
              ) : (
                <>
                  <AlertCircle size={14} />
                  Invalid API key - please check and try again
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Save Button */}
        <button
          onClick={handleSaveKey}
          disabled={isValidating || !keyInput.trim()}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-400 text-white font-bold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isValidating ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Validating...
            </>
          ) : (
            <>
              <Key size={18} />
              Save API Key
            </>
          )}
        </button>
      </div>

      {/* Get API Key Link */}
      <div className="pt-4 border-t border-white/5">
        <p className="text-sm text-gray-400 mb-3">
          Don't have a FRED API key? Get one for free:
        </p>
        <a
          href="https://fred.stlouisfed.org/docs/api/api_key.html"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm transition"
        >
          <Database size={16} />
          Get FRED API Key
          <ExternalLink size={14} />
        </a>
        <ul className="mt-3 space-y-1 text-xs text-gray-500">
          <li>1. Create a free FRED account</li>
          <li>2. Request an API key (instant approval)</li>
          <li>3. Paste your key above</li>
        </ul>
      </div>

      {/* Data Source Info */}
      <div className="p-4 bg-dark-700/50 rounded-xl">
        <h4 className="text-sm font-medium text-gray-300 mb-2">Data Sources</h4>
        <div className="space-y-2 text-xs text-gray-400">
          <div className="flex justify-between">
            <span>Investment (GPDIC1)</span>
            <span className="text-gray-500">Private Domestic Investment</span>
          </div>
          <div className="flex justify-between">
            <span>M2 Supply (M2SL)</span>
            <span className="text-gray-500">M2 Money Stock</span>
          </div>
          <div className="flex justify-between">
            <span>Fed Funds (FEDFUNDS)</span>
            <span className="text-gray-500">Federal Funds Rate</span>
          </div>
          <div className="flex justify-between">
            <span>GDP (GDPC1)</span>
            <span className="text-gray-500">Real GDP</span>
          </div>
          <div className="flex justify-between">
            <span>Capacity (TCU)</span>
            <span className="text-gray-500">Total Capacity Utilization</span>
          </div>
          <div className="flex justify-between">
            <span>Yield Spread (T10Y3M)</span>
            <span className="text-gray-500">10Y-3M Treasury Spread</span>
          </div>
          <div className="flex justify-between">
            <span>CPI (CPIAUCSL)</span>
            <span className="text-gray-500">Consumer Price Index</span>
          </div>
        </div>
      </div>
    </div>
  )
}
