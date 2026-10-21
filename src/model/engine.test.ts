import { describe, expect, it } from 'vitest'
import { DEFAULT_INPUTS, DEFAULT_SCENARIO_SETTINGS } from './defaults'
import { compute } from './engine'
import { spreadFractions, completionFractions } from './timing'
import { applyScenario } from './scenario'
import { irr, npv, paybackYears, sum } from './finance'
import { setPath, getPath } from './paths'
import type { Inputs } from './types'

const close = (a: number, b: number, tol = 1e-6) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol)

describe('timing', () => {
  it('spreads a 6-month recognition 75/25 across the signing and following year', () => {
    const f = spreadFractions(6)
    close(f[0], 0.75)
    close(f[1], 0.25)
    close(sum(f), 1)
  })
  it('spreads 12 months 50/50 and 0 months immediately', () => {
    const f = spreadFractions(12)
    close(f[0], 0.5)
    close(f[1], 0.5)
    expect(spreadFractions(0)).toEqual([1])
  })
  it('completion: with 6 months delivery half the deals complete in the signing year', () => {
    const c = completionFractions(6)
    close(c[0], 0.5)
    close(c[1], 0.5)
  })
})

describe('finance', () => {
  it('npv and irr agree', () => {
    const flows = [-100, 60, 60]
    const r = irr(flows)
    close(npv(r, flows.slice(1)) - 100, 0, 1e-6)
  })
  it('payback interpolates within the year', () => {
    expect(paybackYears([-100, 50, 100])).toBeCloseTo(2.5)
    expect(paybackYears([-100, -10])).toBeNull()
  })
})

describe('paths', () => {
  it('sets nested values immutably', () => {
    const next = setPath(DEFAULT_INPUTS, 'revenue.newCustomers.2', 99)
    expect(getPath(next, 'revenue.newCustomers.2')).toBe(99)
    expect(getPath(DEFAULT_INPUTS, 'revenue.newCustomers.2')).toBe(22)
    expect(next.company).toBe(DEFAULT_INPUTS.company)
  })
})

describe('scenario', () => {
  it('scales volume drivers by the factor and rounds integers', () => {
    const agg = applyScenario(DEFAULT_INPUTS, 'aggressive', DEFAULT_SCENARIO_SETTINGS)
    expect(agg.revenue.newCustomers.slice(0, 5)).toEqual([9, 18, 33, 45, 60])
    expect(agg.company.workforce[0].headcount.slice(0, 3)).toEqual([12, 18, 27])
    close(agg.company.infra[0].values[0], 0.75)
    expect(agg.revenue.pricing.platform.price).toBe(300_000)
    const con = applyScenario(DEFAULT_INPUTS, 'conservative', DEFAULT_SCENARIO_SETTINGS)
    expect(con.revenue.newCustomers.slice(0, 5)).toEqual([3, 6, 11, 15, 20])
  })
})

describe('engine – base case, 5 years', () => {
  const m = compute(DEFAULT_INPUTS, 5)
  const R = DEFAULT_INPUTS.revenue

  it('builds cohorts with full retention during the contract term, then annual retention', () => {
    expect(m.rev.cohort[0]).toEqual([6, 6, 6, 6, 5]) // 6*0.92=5.52→6, 6*0.92^2=5.08→5
    expect(m.rev.cohort[1]).toEqual([0, 12, 12, 12, 11])
    expect(m.rev.active).toEqual([6, 18, 40, 70, 108])
  })

  it('year-1 revenue ties to a hand calculation', () => {
    // platform 6*300k, use cases 6*0.5*200k, managed 6*0.6*100k, implementation 6*700k*0.75
    close(m.rev.platform[0], 1_800_000)
    close(m.rev.useCase[0], 600_000)
    close(m.rev.managed[0], 360_000)
    close(m.rev.implementation[0], 3_150_000)
    close(m.rev.total[0], 5_910_000)
  })

  it('implementation revenue over the period equals fees signed less the unrecognised tail', () => {
    const signed = sum(m.rev.newCustomers) * R.pricing.implementation.price
    const tail = m.rev.newCustomers[4] * R.pricing.implementation.price * 0.25
    close(sum(m.rev.implementation), signed - tail)
  })

  it('expansion applies to platform fees by tenure', () => {
    // 2027 platform: cohort 2026 (6 × 300k × 1.1) + cohort 2027 (12 × 300k)
    close(m.rev.platform[1], 6 * 300_000 * 1.1 + 12 * 300_000)
  })

  it('unit costs follow the rate card and reuse assumptions', () => {
    close(m.impl.onboarding.labour, 2 * 16_000 + 4 * 15_000 + 6 * 12_500 + 3 * 12_500 + 2 * 13_500) // 231,500
    close(m.impl.onboarding.total, 301_500)
    close(m.impl.useCase.labour, 1.5 * 12_500 + 3 * 12_500 + 3 * 13_500 + 3 * 12_500 + 1.5 * 11_000 + 1.5 * 13_500)
    close(m.impl.useCase.total, m.impl.useCase.labour + 40_000)
    close(m.impl.useCase.addlDirect, 24_000)
    close(m.impl.recurring.fixedPerCustomer, 55_000)
    close(m.impl.recurring.perUseCase, 5_000)
    close(m.impl.recurring.perCustomerAtFullRamp, 55_000 + 5_000 * 2.5)
  })

  it('implementation cost per customer falls with the learning curve', () => {
    const labour0 = m.impl.onboarding.labour + m.impl.useCase.labour
    close(m.impl.byYear.implCostPerCustomer[0], labour0 + 110_000)
    close(m.impl.byYear.implCostPerCustomer[4], labour0 * 0.6 + 110_000)
  })

  it('cost of revenue is incurred on the same schedule as implementation revenue', () => {
    close(m.pl.cogsImpl[0], 6 * m.impl.byYear.implCostPerCustomer[0] * 0.75)
    close(m.pl.cogsImpl[1], 6 * m.impl.byYear.implCostPerCustomer[0] * 0.25 + 12 * m.impl.byYear.implCostPerCustomer[1] * 0.75)
  })

  it('company costs exclude delivery entirely; delivery team is derived from Screen 3', () => {
    const nonDelivery0 = 8 * 180_000 + 6 * 160_000 + 5 * 140_000 + 2 * 120_000
    close(m.company.people[0], nonDelivery0)
    close(m.company.infra[0], 1_100_000)
    close(m.company.other[0], 1_100_000)
    close(m.company.total[0], nonDelivery0 + 2_200_000)
    m.years.forEach((_, t) => {
      expect(m.company.deliveryHeadcount[t]).toBe(Math.ceil(m.impl.byYear.requiredFteMonths[t] / 12 - 1e-9))
      expect(m.company.deliveryCost[t]).toBeLessThanOrEqual(m.pl.cogsImpl[t] + m.pl.cogsAddl[t] + 1e-6) // labour part of project cost
      expect(m.company.utilization[t]).toBeLessThanOrEqual(1 + 1e-9)
      expect(m.company.utilization[t]).toBeGreaterThan(0.9)
    })
    close(m.company.headcountTotal[0], 8 + 6 + 5 + 2 + m.company.deliveryHeadcount[0])
    close(m.company.payroll[0], nonDelivery0 + m.company.deliveryCost[0])
  })

  it('P&L identities hold every year', () => {
    m.years.forEach((_, t) => {
      close(m.pl.grossProfit[t], m.pl.revenue[t] - m.pl.cogs[t])
      close(m.pl.ebitda[t], m.pl.grossProfit[t] - m.pl.opex[t])
      close(m.pl.ebit[t], m.pl.ebitda[t] - m.pl.da[t])
      close(m.pl.netIncome[t], m.pl.ebit[t] - m.pl.tax[t])
      expect(m.pl.tax[t]).toBeGreaterThanOrEqual(0)
    })
  })

  it('tax uses loss carry-forward: no tax until cumulative EBIT is positive', () => {
    let cum = 0
    m.years.forEach((_, t) => {
      cum += m.pl.ebit[t]
      if (cum <= 0) expect(m.pl.tax[t]).toBe(0)
    })
    const cumEbit = m.pl.ebit.reduce((a, b) => a + b, 0)
    close(sum(m.pl.tax), Math.max(0, cumEbit) * 0.25, 1)
  })

  it('depreciation is straight-line over 3 years from the year of spend', () => {
    close(m.pl.da[0], 2_000_000 / 3)
    close(m.pl.da[2], (2_000_000 + 1_500_000 + 1_000_000) / 3)
    close(m.pl.da[3], (1_500_000 + 1_000_000 + 700_000) / 3)
  })

  it('cash reconciles: collections = revenue + change in deferred − change in receivables', () => {
    m.years.forEach((_, t) => close(m.cash.collections[t], m.pl.revenue[t] + m.cash.deferredChange[t] - m.cash.receivablesChange[t], 1e-3))
  })

  it('collections lag 90 days: 2026 collections are 1 − 90/365 of 2026 billings', () => {
    close(m.cash.collections[0], m.rev.billings[0] * (1 - 90 / 365))
  })

  it('cash balance rolls forward with funding', () => {
    m.years.forEach((_, t) => {
      close(m.cash.closing[t], m.cash.opening[t] + m.cash.fcf[t] + m.cash.funding[t])
      if (t > 0) close(m.cash.opening[t], m.cash.closing[t - 1])
    })
    close(m.cash.funding[0], 25_000_000)
  })

  it('peak funding need is the deepest pre-funding cumulative deficit', () => {
    close(m.cash.peakFundingNeed, Math.max(0, -Math.min(...m.cash.preFundingCumulative)))
  })

  it('valuation: EV/Revenue multiple and investor returns tie', () => {
    const v = m.val.selected
    close(v.evAtExit, m.pl.revenue[4] * 5)
    close(v.equityAtExit, v.evAtExit + m.cash.closing[4])
    close(m.val.investor.ownershipInitial, 0.25)
    close(m.val.investor.equityAtExit, v.equityAtExit * 0.25)
    close(m.val.investor.moneyMultiple, (v.equityAtExit * 0.25) / 25_000_000)
    const years = 5 - 0
    close(m.val.investor.irr, Math.pow(m.val.investor.moneyMultiple, 1 / years) - 1)
  })

  it('DCF perpetuity: PV today equals discounted flows plus discounted terminal value', () => {
    const dcf = m.val.all.find((a) => a.approach === 'dcf-growth')!
    const w = 0.2
    const tv = (m.cash.fcf[4] * 1.03) / (w - 0.03)
    close(dcf.evAtExit, tv, 1e-3)
    const pv = m.cash.fcf.reduce((acc, cf, t) => acc + cf / Math.pow(1 + w, t + 1), 0) + tv / Math.pow(1 + w, 5)
    close(dcf.evToday, pv, 1e-3)
  })

  it('unit economics: year-1 revenue per customer and lifetime gross profit', () => {
    close(m.unit.totalRevenue[0], 700_000 + 300_000 + 100_000 + 60_000)
    close(m.unit.recurringCost[0], 55_000 + 5_000 * 1.5)
    close(m.unit.implementationCost[0], m.impl.byYear.implCostPerCustomer[0])
    close(m.unit.survival[3], 0.92)
    close(m.unit.survival[4], 0.92 * 0.92)
  })
})

describe('engine – investor lens', () => {
  const m = compute(DEFAULT_INPUTS, 5)
  it('grades metrics against benchmarks and ties to the model', () => {
    const gm = m.lens.find((l) => l.id === 'gm')!
    close(gm.value, m.pl.grossMargin[4])
    expect(gm.status).toBe('strong')
    const irr = m.lens.find((l) => l.id === 'irr')!
    close(irr.value, m.val.investor.irr)
    const cov = m.lens.find((l) => l.id === 'coverage')!
    close(cov.value, (25 * 1e6) / m.cash.totalFundingNeed)
    expect(m.lens.every((l) => ['strong', 'watch', 'weak'].includes(l.status))).toBe(true)
  })
  it('CAC payback uses first-year recurring gross profit', () => {
    const recurringGp0 = m.unit.platformRevenue[0] + m.unit.useCaseRevenue[0] + m.unit.managedRevenue[0] - m.unit.recurringCost[0]
    close(m.unit.cacPaybackMonthsByYear[0], (12 * m.unit.cacByYear[0]) / recurringGp0)
  })
})

describe('engine – billing switches and periods', () => {
  it('switching implementation to recurring charges every active customer each year', () => {
    const inputs: Inputs = setPath(DEFAULT_INPUTS, 'revenue.pricing.implementation.billing', 'recurring')
    const m = compute(inputs, 5)
    close(m.rev.implementation[0], 6 * 700_000)
    close(m.rev.implementation[1], 18 * 700_000)
  })
  it('projection period slices per-year inputs', () => {
    const m3 = compute(DEFAULT_INPUTS, 3)
    const m10 = compute(DEFAULT_INPUTS, 10)
    expect(m3.years).toEqual([2026, 2027, 2028])
    expect(m10.years[9]).toBe(2035)
    close(m3.rev.total[0], m10.rev.total[0])
  })
  it('scenario factor scales revenue roughly proportionally', () => {
    const base = compute(DEFAULT_INPUTS, 5)
    const agg = compute(applyScenario(DEFAULT_INPUTS, 'aggressive', DEFAULT_SCENARIO_SETTINGS), 5)
    const ratio = sum(agg.rev.total) / sum(base.rev.total)
    expect(ratio).toBeGreaterThan(1.45)
    expect(ratio).toBeLessThan(1.55)
  })
})
