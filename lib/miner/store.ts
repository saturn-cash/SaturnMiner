'use client'

import { useSyncExternalStore } from 'react'
import { invokeCommand, isTauri, TAURI_COMMANDS } from './bridge'
import { createInitialState, makeLog, step } from './simulation'
import type { MinerConfig, MinerState, Settings } from './types'

type Listener = () => void

const SETTINGS_KEY = 'saturn.settings'

/** settings survive restarts; everything else is live telemetry */
function loadSettings(s: MinerState): MinerState {
  if (typeof window === 'undefined') return s
  try {
    const saved = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? 'null')
    return saved ? { ...s, settings: { ...s.settings, ...saved } } : s
  } catch {
    return s
  }
}

function saveSettings(settings: MinerState['settings']) {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    /* storage unavailable: settings just won't persist */
  }
}

let state: MinerState = loadSettings(createInitialState())
const listeners = new Set<Listener>()
let timer: ReturnType<typeof setInterval> | null = null
let telemetryInFlight = false

function emit() {
  for (const l of listeners) l()
}

function setState(next: MinerState) {
  state = next
  emit()
}

function update(fn: (s: MinerState) => MinerState) {
  setState(fn(state))
}

async function tickTauri() {
  if (telemetryInFlight) return
  telemetryInFlight = true
  try {
    const telemetry = await invokeCommand<Partial<MinerState>>(TAURI_COMMANDS.telemetry)
    update((s) => {
      const hashrate = telemetry.hashrate ?? s.hashrate
      return { ...s, ...telemetry, source: 'tauri', tick: s.tick + 1, history: [...s.history.slice(1), hashrate] }
    })
  } catch (err) {
    update((s) => ({ ...s, tick: s.tick + 1, log: [...s.log, makeLog('error', 'SYSTEM', `Telemetry unavailable: ${String(err)}`)] }))
  } finally {
    telemetryInFlight = false
  }
}

/**
 * True only when the desktop shell reports a real mining engine. The shell can exist without one
 * (Bitaxe control works on its own), in which case CPU mining stays simulated.
 */
let nativeMiner = false

function startLoop() {
  if (timer || typeof window === 'undefined') return
  if (isTauri()) {
    invokeCommand<{ miner?: boolean }>(TAURI_COMMANDS.backendInfo)
      .then((info) => {
        nativeMiner = !!info?.miner
        if (nativeMiner) setState({ ...state, source: 'tauri' })
      })
      .catch(() => {
        nativeMiner = false
      })
  }
  timer = setInterval(() => {
    if (nativeMiner) void tickTauri()
    else setState(step(state))
  }, 1000)
}

function subscribe(listener: Listener) {
  listeners.add(listener)
  startLoop()
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && timer) {
      clearInterval(timer)
      timer = null
    }
  }
}

const serverState = createInitialState()

/** Selectors must return a value already present on state (or a primitive) to keep renders incremental. */
export function useMiner<T>(selector: (s: MinerState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(serverState),
  )
}

export const minerActions = {
  async start() {
    if (state.status !== 'idle') return
    update((s) => ({ ...s, status: 'starting', log: [...s.log, makeLog('info', 'MINER', 'Spinning up SHA-256d workers…')] }))
    if (nativeMiner) {
      try {
        await invokeCommand(TAURI_COMMANDS.start, { config: state.config })
        update((s) => ({ ...s, status: 'mining' }))
      } catch (err) {
        update((s) => ({ ...s, status: 'idle', log: [...s.log, makeLog('error', 'MINER', `Failed to start: ${String(err)}`)] }))
      }
    }
  },
  async stop() {
    if (state.status !== 'mining') return
    update((s) => ({ ...s, status: 'stopping', log: [...s.log, makeLog('info', 'MINER', 'Stop requested — draining work queue…')] }))
    if (nativeMiner) {
      try {
        await invokeCommand(TAURI_COMMANDS.stop)
      } finally {
        update((s) => ({ ...s, status: 'idle' }))
      }
    }
  },
  updateConfig(patch: Partial<MinerConfig>) {
    update((s) => ({ ...s, config: { ...s.config, ...patch } }))
  },
  updateSettings(patch: Partial<Settings>) {
    update((s) => ({ ...s, settings: { ...s.settings, ...patch } }))
    saveSettings(state.settings)
  },
  log(level: Parameters<typeof makeLog>[0], source: Parameters<typeof makeLog>[1], message: string) {
    update((s) => ({ ...s, log: [...s.log, makeLog(level, source, message)] }))
  },
  getSnapshot() {
    return state
  },
}
