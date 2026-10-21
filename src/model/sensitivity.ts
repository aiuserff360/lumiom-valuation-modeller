import type { Inputs } from './types'
import { compute } from './engine'

export interface SensitivityDriver {
  id: string
  label: string
  apply: (inputs: Inputs, factor: number) => Inputs
}

const scaleAll = (arr: number[], f: number) => arr.map((v) => v * f)

export const DRIVERS: SensitivityDriver[] = [
  {
    id: 'customers',
    label: 'New customers per year',
    apply: (i, f) => ({ ...i, revenue: { ...i.revenue, newCustomers: scaleAll(i.revenue.newCustomers, f) } }),
  },
  {
    id: 'platform',
    label: 'Platform subscription price',
    apply: (i, f) => ({
      ...i,
      revenue: { ...i.revenue, pricing: { ...i.revenue.pricing, platform: { ...i.revenue.pricing.platform, price: i.revenue.pricing.platform.price * f } } },
    }),
  },
  {
    id: 'implFee',
    label: 'Implementation fee',
    apply: (i, f) => ({
      ...i,
      revenue: {
        ...i.revenue,
        pricing: { ...i.revenue.pricing, implementation: { ...i.revenue.pricing.implementation, price: i.revenue.pricing.implementation.price * f } },
      },
    }),
  },
  {
    id: 'effort',
    label: 'Implementation effort (FTE-months)',
    apply: (i, f) => ({
      ...i,
      implementation: {
        ...i.implementation,
        onboarding: { ...i.implementation.onboarding, lines: i.implementation.onboarding.lines.map((l) => ({ ...l, fteMonths: l.fteMonths * f })) },
        useCase: { ...i.implementation.useCase, lines: i.implementation.useCase.lines.map((l) => ({ ...l, fteMonths: l.fteMonths * f })) },
      },
    }),
  },
  {
    id: 'recurringCost',
    label: 'Recurring service cost per customer',
    apply: (i, f) => ({
      ...i,
      implementation: { ...i.implementation, recurring: { lines: i.implementation.recurring.lines.map((l) => ({ ...l, unitCost: l.unitCost * f })) } },
    }),
  },
  {
    id: 'opex',
    label: 'Company operating costs',
    apply: (i, f) => ({
      ...i,
      company: {
        ...i.company,
        workforce: i.company.workforce.map((w) => ({ ...w, avgCost: w.avgCost * f })),
        infra: i.company.infra.map((l) => ({ ...l, values: scaleAll(l.values, f) })),
        opex: i.company.opex.map((l) => ({ ...l, values: scaleAll(l.values, f) })),
      },
    }),
  },
]

export interface SensitivityRow {
  id: string
  label: string
  low: number
  base: number
  high: number
}

/** Cumulative net profit over the projection for each driver at -20% / base / +20%. */
export function runSensitivity(inputs: Inputs, nYears: number, delta = 0.2): SensitivityRow[] {
  const base = compute(inputs, nYears).pl.totals.netIncome
  return DRIVERS.map((d) => ({
    id: d.id,
    label: d.label,
    low: compute(d.apply(inputs, 1 - delta), nYears).pl.totals.netIncome,
    base,
    high: compute(d.apply(inputs, 1 + delta), nYears).pl.totals.netIncome,
  }))
}
