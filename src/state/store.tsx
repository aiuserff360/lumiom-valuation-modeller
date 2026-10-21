import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { DEFAULT_FX, DEFAULT_INPUTS, DEFAULT_SCENARIO_SETTINGS } from '../model/defaults'
import { compute, type Model } from '../model/engine'
import { getPath, setPath } from '../model/paths'
import { applyScenario, scaleKind } from '../model/scenario'
import type { Currency, Inputs, Scenario, ScenarioSettings } from '../model/types'

const STORAGE_KEY = 'lumiom-valuation-modeller-v3'

/**
 * One set of inputs (the Base case). Aggressive and Conservative are derived views:
 * volume drivers × scenario factor. Editing in any scenario writes back to the base
 * inputs (scaled values are divided by the factor), so what you type is what you see.
 */
interface Persisted {
  scenario: Scenario
  period: number
  currency: Currency
  fx: Record<Currency, number>
  scenarioSettings: ScenarioSettings
  edits: Record<string, number | string>
}

const defaultPersisted = (): Persisted => ({
  scenario: 'base',
  period: 5,
  currency: 'USD',
  fx: { ...DEFAULT_FX },
  scenarioSettings: { ...DEFAULT_SCENARIO_SETTINGS, factors: { ...DEFAULT_SCENARIO_SETTINGS.factors } },
  edits: {},
})

function load(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultPersisted()
    const parsed = JSON.parse(raw) as Partial<Persisted>
    const d = defaultPersisted()
    return {
      scenario: parsed.scenario ?? d.scenario,
      period: parsed.period ?? d.period,
      currency: parsed.currency ?? d.currency,
      fx: { ...d.fx, ...(parsed.fx ?? {}) },
      scenarioSettings: {
        ...d.scenarioSettings,
        ...(parsed.scenarioSettings ?? {}),
        factors: { ...d.scenarioSettings.factors, ...(parsed.scenarioSettings?.factors ?? {}) },
      },
      edits: parsed.edits ?? {},
    }
  } catch {
    return defaultPersisted()
  }
}

export function applyEdits(base: Inputs, edits: Record<string, number | string>): Inputs {
  let out = base
  for (const [path, value] of Object.entries(edits)) out = setPath(out, path, value)
  return out
}

export interface Store extends Persisted {
  baseInputs: Inputs
  inputs: Inputs
  model: Model
  factor: number
  editCount: number
  setScenario: (s: Scenario) => void
  setPeriod: (n: number) => void
  setCurrency: (c: Currency) => void
  setFx: (c: Currency, rate: number) => void
  setScenarioSettings: (s: ScenarioSettings) => void
  setInput: (path: string, value: number | string) => void
  resetInputs: () => void
  resetAll: () => void
}

const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* storage unavailable */
    }
  }, [state])

  const baseInputs = useMemo(() => applyEdits(DEFAULT_INPUTS, state.edits), [state.edits])
  const inputs = useMemo(() => applyScenario(baseInputs, state.scenario, state.scenarioSettings), [baseInputs, state.scenario, state.scenarioSettings])
  const model = useMemo(() => compute(inputs, state.period), [inputs, state.period])
  const factor = state.scenarioSettings.factors[state.scenario]

  const setInput = useCallback(
    (path: string, value: number | string) =>
      setState((s) => {
        const f = s.scenarioSettings.factors[s.scenario]
        const kind = scaleKind(path, s.scenarioSettings)
        const stored = typeof value === 'number' && kind && f !== 0 ? value / f : value
        return { ...s, edits: { ...s.edits, [path]: stored } }
      }),
    [],
  )

  const api = useMemo<Store>(
    () => ({
      ...state,
      baseInputs,
      inputs,
      model,
      factor,
      editCount: Object.keys(state.edits).length,
      setScenario: (scenario) => setState((s) => ({ ...s, scenario })),
      setPeriod: (period) => setState((s) => ({ ...s, period })),
      setCurrency: (currency) => setState((s) => ({ ...s, currency })),
      setFx: (c, rate) => setState((s) => ({ ...s, fx: { ...s.fx, [c]: rate } })),
      setScenarioSettings: (scenarioSettings) => setState((s) => ({ ...s, scenarioSettings })),
      setInput,
      resetInputs: () => setState((s) => ({ ...s, edits: {} })),
      resetAll: () => setState(defaultPersisted()),
    }),
    [state, baseInputs, inputs, model, factor, setInput],
  )

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useStore(): Store {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore outside provider')
  return s
}

/** Read/write a single input by path (value as seen in the current scenario). */
export function useInput<T extends number | string = number>(path: string) {
  const s = useStore()
  const value = getPath(s.inputs, path) as T
  const isScaled = scaleKind(path, s.scenarioSettings) !== null && s.factor !== 1
  return { value, isScaled, set: (v: T) => s.setInput(path, v) }
}
