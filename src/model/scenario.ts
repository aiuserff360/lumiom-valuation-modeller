import type { Inputs, Scenario, ScenarioSettings } from './types'

/**
 * Which input paths are scaled by the scenario factor, and whether they are integers.
 * Scenario factors apply to volume drivers only; unit prices, unit costs, rates and
 * durations are never scaled.
 */
export function scaleKind(path: string, s: ScenarioSettings): 'int' | 'number' | null {
  if (/^revenue\.newCustomers\.\d+$/.test(path)) return s.scaleCustomers ? 'int' : null
  if (/^company\.workforce\.\d+\.headcount\.\d+$/.test(path)) return s.scaleHeadcount ? 'int' : null
  if (/^company\.(infra|opex)\.\d+\.values\.\d+$/.test(path)) return s.scaleOperatingCosts ? 'number' : null
  if (/^cash\.capex\.\d+$/.test(path)) return s.scaleCapex ? 'number' : null
  return null
}

function scaleArray(arr: number[], factor: number, int: boolean): number[] {
  return arr.map((v) => (int ? Math.round(v * factor) : v * factor))
}

/** Apply the scenario factor to the base-case inputs. */
export function applyScenario(base: Inputs, scenario: Scenario, s: ScenarioSettings): Inputs {
  const f = s.factors[scenario]
  if (f === 1) return base
  return {
    ...base,
    revenue: {
      ...base.revenue,
      newCustomers: s.scaleCustomers ? scaleArray(base.revenue.newCustomers, f, true) : base.revenue.newCustomers,
    },
    company: {
      ...base.company,
      workforce: s.scaleHeadcount
        ? base.company.workforce.map((w) => ({ ...w, headcount: scaleArray(w.headcount, f, true) }))
        : base.company.workforce,
      infra: s.scaleOperatingCosts
        ? base.company.infra.map((l) => ({ ...l, values: scaleArray(l.values, f, false) }))
        : base.company.infra,
      opex: s.scaleOperatingCosts
        ? base.company.opex.map((l) => ({ ...l, values: scaleArray(l.values, f, false) }))
        : base.company.opex,
    },
    cash: {
      ...base.cash,
      capex: s.scaleCapex ? scaleArray(base.cash.capex, f, false) : base.cash.capex,
    },
  }
}
