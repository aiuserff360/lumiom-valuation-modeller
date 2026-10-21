import type { Approach, Inputs, RoleId } from './types'
import { APPROACH_LABELS, START_YEAR } from './types'
import { spreadFractions, completionFractions, lagSeries } from './timing'
import { addSeries, cumulative, paybackYears, safeDiv, sum } from './finance'

const M = 1_000_000
const zeros = (n: number) => new Array<number>(n).fill(0)

export interface EffortLineOut {
  id: string
  label: string
  role: RoleId
  fteMonths: number
  monthlyCost: number
  cost: number
  reusePct: number
  addlFteMonths: number
  addlCost: number
}

export interface ValuationResult {
  approach: Approach
  label: string
  exitIndex: number
  exitYear: number
  exitRevenue: number
  exitEbitda: number
  exitFcf: number
  multipleOrRate: string
  evAtExitGross: number
  evAtExit: number
  netCashAtExit: number
  equityAtExit: number
  evToday: number
  meaningful: boolean
  note: string
}

export type LensStatus = 'strong' | 'watch' | 'weak'
export interface LensMetric {
  id: string
  label: string
  value: number
  /** 'pct' | 'x' | 'months' | 'moneyM' | 'number' */
  kind: 'pct' | 'x' | 'months' | 'moneyM' | 'number'
  benchmark: string
  status: LensStatus
  definition: string
  screen: 'revenue' | 'implementation' | 'company' | 'profitability' | 'cash' | 'valuation'
}

export interface Model {
  nYears: number
  years: number[]
  rev: {
    newCustomers: number[]
    cohort: number[][]
    active: number[]
    activeUseCases: number[]
    newAddlUseCases: number[]
    addlPerCustomerByTenure: number[]
    platform: number[]
    implementation: number[]
    useCase: number[]
    managed: number[]
    total: number[]
    avgPerCustomer: number[]
    recFrac: number[]
    compFrac: number[]
    billings: number[]
    collections: number[]
    receivablesEnd: number[]
    deferredEnd: number[]
    recurringTotal: number[]
    oneTimeTotal: number[]
  }
  impl: {
    onboarding: { lines: EffortLineOut[]; labour: number; fteMonths: number; direct: number; total: number }
    useCase: {
      lines: EffortLineOut[]
      labour: number
      fteMonths: number
      direct: number
      total: number
      addlLabour: number
      addlFteMonths: number
      addlDirect: number
      addlTotal: number
      addlReduction: number
    }
    recurring: {
      lines: { id: string; label: string; basis: 'perCustomer' | 'perUseCase'; unitCost: number; annualAtFullRamp: number }[]
      fixedPerCustomer: number
      perUseCase: number
      perCustomerAtFullRamp: number
      useCasesAtFullRamp: number
    }
    firstDeploymentCost: number
    lifecycleCostPerCustomer: number
    avgCostPerUseCase: number
    implMargin: number
    recurringRevenuePerCustomer: number
    recurringGrossProfitPerCustomer: number
    recurringMargin: number
    byYear: {
      reduction: number[]
      implLabourPerCustomer: number[]
      implCostPerCustomer: number[]
      addlUseCaseCost: number[]
      implCostIncurred: number[]
      addlUseCaseCostIncurred: number[]
      recurringCost: number[]
      requiredFteMonths: number[]
      blendedMonthlyRate: number
    }
  }
  company: {
    functions: { id: string; label: string; avgCost: number; headcount: number[]; cost: number[] }[]
    /** Delivery team implied by Screen 3: required FTE-months ÷ 12, rounded up. Read-only on Screen 4. */
    deliveryHeadcount: number[]
    deliveryAvgCost: number
    /** Delivery labour cost charged to implementations (Screen 3, cost of revenue) */
    deliveryCost: number[]
    availableFteMonths: number[]
    requiredFteMonths: number[]
    utilization: number[]
    unallocatedFteMonths: number[]
    headcountTotal: number[]
    payroll: number[]
    people: number[]
    infraLines: { id: string; label: string; values: number[] }[]
    infra: number[]
    opexLines: { id: string; label: string; values: number[] }[]
    other: number[]
    total: number[]
    pctOfRevenue: { people: number[]; infra: number[]; other: number[]; total: number[] }
  }
  pl: {
    revenue: number[]
    cogsImpl: number[]
    cogsAddl: number[]
    cogsRecurring: number[]
    cogs: number[]
    grossProfit: number[]
    grossMargin: number[]
    opex: number[]
    ebitda: number[]
    ebitdaMargin: number[]
    da: number[]
    ebit: number[]
    tax: number[]
    netIncome: number[]
    netMargin: number[]
    totals: { revenue: number; cogs: number; grossProfit: number; opex: number; ebitda: number; da: number; tax: number; netIncome: number }
    breakevenIndex: number | null
    cumulativeEbitdaPaybackYears: number | null
  }
  unit: {
    years: number
    implementationFee: number[]
    platformRevenue: number[]
    useCaseRevenue: number[]
    managedRevenue: number[]
    totalRevenue: number[]
    implementationCost: number[]
    addlUseCaseCost: number[]
    recurringCost: number[]
    totalCost: number[]
    grossProfit: number[]
    grossMargin: number[]
    survival: number[]
    ltv: number
    cacByYear: number[]
    cacPaybackMonthsByYear: number[]
    ltvToCac: number
  }
  cash: {
    collections: number[]
    deferredChange: number[]
    receivablesChange: number[]
    cogsPaid: number[]
    opexPaid: number[]
    taxPaid: number[]
    capex: number[]
    outflow: number[]
    operatingCashFlow: number[]
    fcf: number[]
    funding: number[]
    opening: number[]
    closing: number[]
    preFundingCumulative: number[]
    peakFundingNeed: number
    peakFundingIndex: number
    bufferNeed: number
    totalFundingNeed: number
    totalFundingPlanned: number
    runwayMonths: number | null
    runwayMonthsNoFunding: number | null
    quarterlyBalance: { label: string; balance: number }[]
    cashPaybackYears: number | null
    useOfFundsTotalPct: number
  }
  /** Investor-lens metrics with benchmark status, for the Overview */
  lens: LensMetric[]
  val: {
    selected: ValuationResult
    all: ValuationResult[]
    exitIndex: number
    discountFactors: number[]
    pvFcf: number[]
    pvTerminal: number
    investor: {
      initialAmount: number
      postMoney: number
      ownershipInitial: number
      futureAmount: number
      futureOwnership: number
      ownershipAtExit: number
      equityAtExit: number
      moneyMultiple: number
      holdingYears: number
      irr: number
    }
    sensitivity: { rowLabel: string; rows: { label: string; isBase: boolean; cells: { year: number; irr: number; mom: number }[] }[]; years: number[] }
  }
}

export function compute(inputs: Inputs, nYears: number): Model {
  const N = nYears
  const years = Array.from({ length: N }, (_, i) => START_YEAR + i)
  const R = inputs.revenue
  const P = R.pricing

  // ------------------------------------------------------------------ customers
  const newCustomers = years.map((_, t) => Math.max(0, Math.round(R.newCustomers[t] ?? 0)))
  const term = Math.max(1, Math.round(R.contractTerm))
  const retention = Math.min(1, Math.max(0, R.retentionRate))
  const survival = (k: number) => (k < term ? 1 : Math.pow(retention, k - term + 1))
  const cohort: number[][] = years.map((_, s) =>
    years.map((_, t) => (t < s ? 0 : Math.round(newCustomers[s] * survival(t - s)))),
  )
  const active = years.map((_, t) => sum(cohort.map((c) => c[t])))

  const ramp = Math.max(1, Math.round(R.useCaseRampYears))
  const addlAt = (k: number) => (k < 0 ? 0 : R.addlUseCases * Math.min(k + 1, ramp) / ramp)
  const addlPerCustomerByTenure = years.map((_, k) => addlAt(k))
  const expansion = (k: number) => Math.pow(1 + R.expansionRate, k)

  const activeUseCases = years.map((_, t) => sum(cohort.map((c, s) => c[t] * (1 + addlAt(t - s)))))
  const newAddlUseCases = years.map((_, t) =>
    sum(cohort.map((c, s) => (t < s ? 0 : Math.max(0, c[t] * (addlAt(t - s) - addlAt(t - s - 1)))))),
  )

  // ------------------------------------------------------------------ revenue
  const recFrac = spreadFractions(R.recognitionMonths)
  const compFrac = completionFractions(R.recognitionMonths)
  const upfront = Math.min(1, Math.max(0, inputs.cash.upfrontPct))

  /** recurring: per active customer per year; one-time: per new unit at signing, recognised over recFrac */
  const recurringRev = (price: number, units: (k: number) => number, grow: boolean) =>
    years.map((_, t) => sum(cohort.map((c, s) => (t < s ? 0 : c[t] * units(t - s) * price * (grow ? expansion(t - s) : 1)))))
  const oneTimeRev = (origin: number[]) => lagSeries(origin, recFrac, N)
  const oneTimeBillings = (origin: number[]) =>
    addSeries(origin.map((v) => v * upfront), lagSeries(origin.map((v) => v * (1 - upfront)), compFrac, N))

  const platformOrigin = newCustomers.map((n) => n * P.platform.price)
  const implOrigin = newCustomers.map((n) => n * P.implementation.price)
  const useCaseOrigin = newAddlUseCases.map((n) => n * P.useCase.price)
  const managedOrigin = newCustomers.map((n) => n * R.managedAttach * P.managed.price)

  const platform = P.platform.billing === 'recurring' ? recurringRev(P.platform.price, () => 1, true) : oneTimeRev(platformOrigin)
  const implementation =
    P.implementation.billing === 'recurring' ? recurringRev(P.implementation.price, () => 1, false) : oneTimeRev(implOrigin)
  const useCase = P.useCase.billing === 'recurring' ? recurringRev(P.useCase.price, (k) => addlAt(k), false) : oneTimeRev(useCaseOrigin)
  const managed = P.managed.billing === 'recurring' ? recurringRev(P.managed.price, () => R.managedAttach, true) : oneTimeRev(managedOrigin)
  const revenueTotal = addSeries(platform, implementation, useCase, managed)

  const billings = addSeries(
    P.platform.billing === 'recurring' ? platform : oneTimeBillings(platformOrigin),
    P.implementation.billing === 'recurring' ? implementation : oneTimeBillings(implOrigin),
    P.useCase.billing === 'recurring' ? useCase : oneTimeBillings(useCaseOrigin),
    P.managed.billing === 'recurring' ? managed : oneTimeBillings(managedOrigin),
  )
  const lag = Math.min(1, Math.max(0, inputs.cash.collectionDays / 365))
  const collections = years.map((_, t) => billings[t] * (1 - lag) + (t > 0 ? billings[t - 1] * lag : 0))
  const receivablesEnd = billings.map((b) => b * lag)
  const cumBill = cumulative(billings)
  const cumRev = cumulative(revenueTotal)
  const deferredEnd = years.map((_, t) => cumBill[t] - cumRev[t])

  const recurringTotal = addSeries(
    P.platform.billing === 'recurring' ? platform : zeros(N),
    P.implementation.billing === 'recurring' ? implementation : zeros(N),
    P.useCase.billing === 'recurring' ? useCase : zeros(N),
    P.managed.billing === 'recurring' ? managed : zeros(N),
  )
  const oneTimeTotal = years.map((_, t) => revenueTotal[t] - recurringTotal[t])

  // ------------------------------------------------------------------ implementation unit costs
  const I = inputs.implementation
  const mkLine = (l: Inputs['implementation']['onboarding']['lines'][number]): EffortLineOut => {
    const monthlyCost = l.monthlyCost
    const reusePct = l.reusePct ?? 0
    return {
      id: l.id,
      label: l.label,
      role: l.role,
      fteMonths: l.fteMonths,
      monthlyCost,
      cost: l.fteMonths * monthlyCost,
      reusePct,
      addlFteMonths: l.fteMonths * (1 - reusePct),
      addlCost: l.fteMonths * monthlyCost * (1 - reusePct),
    }
  }
  const onbLines = I.onboarding.lines.map(mkLine)
  const onbLabour = sum(onbLines.map((l) => l.cost))
  const onbFte = sum(onbLines.map((l) => l.fteMonths))
  const onbTotal = onbLabour + I.onboarding.directCosts

  const ucLines = I.useCase.lines.map(mkLine)
  const ucLabour = sum(ucLines.map((l) => l.cost))
  const ucFte = sum(ucLines.map((l) => l.fteMonths))
  const ucTotal = ucLabour + I.useCase.directCosts
  const addlLabour = sum(ucLines.map((l) => l.addlCost))
  const addlFte = sum(ucLines.map((l) => l.addlFteMonths))
  const addlDirect = I.useCase.directCosts * (1 - I.useCase.directReusePct)
  const addlTotal = addlLabour + addlDirect

  const fixedPerCustomer = sum(I.recurring.lines.filter((l) => l.basis === 'perCustomer').map((l) => l.unitCost))
  const perUseCase = sum(I.recurring.lines.filter((l) => l.basis === 'perUseCase').map((l) => l.unitCost))
  const useCasesAtFullRamp = 1 + R.addlUseCases
  const recurringLines = I.recurring.lines.map((l) => ({
    ...l,
    annualAtFullRamp: l.basis === 'perCustomer' ? l.unitCost : l.unitCost * useCasesAtFullRamp,
  }))
  const perCustomerAtFullRamp = fixedPerCustomer + perUseCase * useCasesAtFullRamp

  const reduction = years.map((_, t) => Math.min(1, Math.max(0, I.effortReduction[t] ?? 0)))
  const implLabourPerCustomer = reduction.map((r) => (onbLabour + ucLabour) * (1 - r))
  const implCostPerCustomer = implLabourPerCustomer.map((l) => l + I.onboarding.directCosts + I.useCase.directCosts)
  const addlUseCaseCost = reduction.map((r) => addlLabour * (1 - r) + addlDirect)
  const implCostIncurred = lagSeries(newCustomers.map((n, t) => n * implCostPerCustomer[t]), recFrac, N)
  const addlUseCaseCostIncurred = newAddlUseCases.map((n, t) => n * addlUseCaseCost[t])
  const recurringCost = years.map((_, t) => active[t] * fixedPerCustomer + activeUseCases[t] * perUseCase)
  const requiredFteMonths = addSeries(
    lagSeries(newCustomers.map((n, t) => n * (onbFte + ucFte) * (1 - reduction[t])), recFrac, N),
    newAddlUseCases.map((n, t) => n * addlFte * (1 - reduction[t])),
  )
  const projectLabour = addSeries(
    lagSeries(newCustomers.map((n, t) => n * implLabourPerCustomer[t]), recFrac, N),
    newAddlUseCases.map((n, t) => n * addlLabour * (1 - reduction[t])),
  )
  const blendedMonthlyRate = safeDiv(onbLabour + ucLabour, onbFte + ucFte)

  const firstDeploymentCost = onbTotal + ucTotal
  const lifecycleCostPerCustomer = firstDeploymentCost + R.addlUseCases * addlTotal
  const avgCostPerUseCase = safeDiv(ucTotal + R.addlUseCases * addlTotal, useCasesAtFullRamp)
  const implMargin = safeDiv(P.implementation.price - firstDeploymentCost, P.implementation.price)
  const recurringRevenuePerCustomer =
    (P.platform.billing === 'recurring' ? P.platform.price : 0) +
    (P.useCase.billing === 'recurring' ? P.useCase.price * R.addlUseCases : 0) +
    (P.managed.billing === 'recurring' ? P.managed.price * R.managedAttach : 0) +
    (P.implementation.billing === 'recurring' ? P.implementation.price : 0)
  const recurringGrossProfitPerCustomer = recurringRevenuePerCustomer - perCustomerAtFullRamp
  const recurringMargin = safeDiv(recurringGrossProfitPerCustomer, recurringRevenuePerCustomer)

  // ------------------------------------------------------------------ company costs (USD)
  const C = inputs.company
  const functions = C.workforce.map((w) => {
    const headcount = years.map((_, t) => Math.max(0, Math.round(w.headcount[t] ?? 0)))
    return { id: w.id, label: w.label, avgCost: w.avgCost, headcount, cost: headcount.map((h) => h * w.avgCost) }
  })
  // Delivery team is fully determined by Screen 3 (effort per deployment × customer plan) and is
  // costed there as cost of revenue. Screen 4 shows it read-only and excludes it from company costs,
  // so Screens 3 and 4 are mutually exclusive.
  const deliveryHeadcount = requiredFteMonths.map((f) => Math.ceil(f / 12 - 1e-9))
  const deliveryAvgCost = blendedMonthlyRate * 12
  const deliveryCost = projectLabour
  const availableFteMonths = deliveryHeadcount.map((h) => h * 12)
  const utilization = years.map((_, t) => safeDiv(requiredFteMonths[t], availableFteMonths[t]))
  const unallocatedFteMonths = years.map((_, t) => availableFteMonths[t] - requiredFteMonths[t])
  const headcountTotal = years.map((_, t) => sum(functions.map((f) => f.headcount[t])) + deliveryHeadcount[t])
  const payroll = years.map((_, t) => sum(functions.map((f) => f.cost[t])) + deliveryCost[t])
  const people = years.map((_, t) => sum(functions.map((f) => f.cost[t])))
  const infraLines = C.infra.map((l) => ({ id: l.id, label: l.label, values: years.map((_, t) => (l.values[t] ?? 0) * M) }))
  const infra = years.map((_, t) => sum(infraLines.map((l) => l.values[t])))
  const opexLines = C.opex.map((l) => ({ id: l.id, label: l.label, values: years.map((_, t) => (l.values[t] ?? 0) * M) }))
  const other = years.map((_, t) => sum(opexLines.map((l) => l.values[t])))
  const companyTotal = addSeries(people, infra, other)
  const pct = (s: number[]) => s.map((v, t) => safeDiv(v, revenueTotal[t]))

  // ------------------------------------------------------------------ P&L
  const cogs = addSeries(implCostIncurred, addlUseCaseCostIncurred, recurringCost)
  const grossProfit = years.map((_, t) => revenueTotal[t] - cogs[t])
  const ebitda = years.map((_, t) => grossProfit[t] - companyTotal[t])
  const capex = years.map((_, t) => (inputs.cash.capex[t] ?? 0) * M)
  const depYears = Math.max(1, Math.round(C.depreciationYears))
  const da = years.map((_, t) => sum(capex.map((c, s) => (t >= s && t - s < depYears ? c / depYears : 0))))
  const ebit = years.map((_, t) => ebitda[t] - da[t])
  // Tax with loss carry-forward
  const tax: number[] = []
  let nol = 0
  for (let t = 0; t < N; t++) {
    if (ebit[t] <= 0) {
      nol += -ebit[t]
      tax.push(0)
    } else {
      const used = Math.min(nol, ebit[t])
      nol -= used
      tax.push((ebit[t] - used) * Math.max(0, C.taxRate))
    }
  }
  const netIncome = years.map((_, t) => ebit[t] - tax[t])
  const breakevenIndex = ebitda.findIndex((v) => v >= 0)

  // ------------------------------------------------------------------ unit economics (per retained customer, Year-1 standard cost)
  const U = 5
  const uk = Array.from({ length: U }, (_, k) => k)
  const once = (billing: 'recurring' | 'one-time', k: number, price: number) => (billing === 'one-time' ? (k === 0 ? price : 0) : price)
  const uImplFee = uk.map((k) => once(P.implementation.billing, k, P.implementation.price))
  const uPlatform = uk.map((k) => (P.platform.billing === 'recurring' ? P.platform.price * expansion(k) : k === 0 ? P.platform.price : 0))
  const uUseCase = uk.map((k) =>
    P.useCase.billing === 'recurring' ? P.useCase.price * addlAt(k) : P.useCase.price * (addlAt(k) - addlAt(k - 1)),
  )
  const uManaged = uk.map((k) =>
    P.managed.billing === 'recurring' ? P.managed.price * R.managedAttach * expansion(k) : k === 0 ? P.managed.price * R.managedAttach : 0,
  )
  const uRevenue = uk.map((k) => uImplFee[k] + uPlatform[k] + uUseCase[k] + uManaged[k])
  const uImplCost = uk.map((k) => (k === 0 ? implCostPerCustomer[0] : 0))
  const uAddlCost = uk.map((k) => (addlAt(k) - addlAt(k - 1)) * addlUseCaseCost[0])
  const uRecurring = uk.map((k) => fixedPerCustomer + perUseCase * (1 + addlAt(k)))
  const uCost = uk.map((k) => uImplCost[k] + uAddlCost[k] + uRecurring[k])
  const uGp = uk.map((k) => uRevenue[k] - uCost[k])
  const uSurvival = uk.map((k) => survival(k))
  const ltv = sum(uk.map((k) => uGp[k] * uSurvival[k]))
  const salesFn = functions.find((f) => f.id === 'sales')
  const marketingLine = opexLines.find((l) => l.id === 'marketing')
  const cacByYear = years.map((_, t) => safeDiv((salesFn?.cost[t] ?? 0) + (marketingLine?.values[t] ?? 0), newCustomers[t]))
  // CAC payback on recurring gross profit in the customer's first year (implementation fee excluded)
  const uRecurringGp0 = uPlatform[0] + uUseCase[0] + uManaged[0] - uRecurring[0]
  const cacPaybackMonthsByYear = cacByYear.map((cac) => (uRecurringGp0 > 0 ? (12 * cac) / uRecurringGp0 : NaN))
  const ltvToCac = safeDiv(ltv, sum(cacByYear.map((c, t) => c * newCustomers[t])) / Math.max(1, sum(newCustomers)))

  // ------------------------------------------------------------------ cash flow
  const deferredChange = years.map((_, t) => deferredEnd[t] - (t > 0 ? deferredEnd[t - 1] : 0))
  const receivablesChange = years.map((_, t) => receivablesEnd[t] - (t > 0 ? receivablesEnd[t - 1] : 0))
  const outflow = addSeries(cogs, companyTotal, tax, capex)
  const operatingCashFlow = years.map((_, t) => collections[t] - cogs[t] - companyTotal[t] - tax[t])
  const fcf = years.map((_, t) => operatingCashFlow[t] - capex[t])
  const F = inputs.valuation.funding
  const funding = years.map((_, t) => {
    let f = 0
    if (F.initialAmount > 0 && F.initialYearIndex === t) f += F.initialAmount * M
    if (F.futureAmount > 0 && F.futureYearIndex === t) f += F.futureAmount * M
    return f
  })
  const initialCash = inputs.cash.initialCash * M
  const preFundingCumulative = cumulative(fcf).map((c) => c + initialCash)
  let minCum = Infinity
  let peakFundingIndex = 0
  preFundingCumulative.forEach((c, t) => {
    if (c < minCum) {
      minCum = c
      peakFundingIndex = t
    }
  })
  const peakFundingNeed = Math.max(0, -minCum)
  const bufferNeed = (Math.max(0, inputs.cash.minBufferMonths) / 12) * outflow[peakFundingIndex]
  const totalFundingNeed = peakFundingNeed + bufferNeed
  const opening: number[] = []
  const closing: number[] = []
  let bal = initialCash
  for (let t = 0; t < N; t++) {
    opening.push(bal)
    bal += fcf[t] + funding[t]
    closing.push(bal)
  }
  // monthly path for runway and quarterly chart
  const monthly = (withFunding: boolean) => {
    const balances: number[] = []
    let b = initialCash
    for (let t = 0; t < N; t++) {
      for (let mo = 0; mo < 12; mo++) {
        if (withFunding) {
          if (F.initialAmount > 0 && F.initialYearIndex === t && F.initialQuarter * 3 === mo) b += F.initialAmount * M
          if (F.futureAmount > 0 && F.futureYearIndex === t && F.futureQuarter * 3 === mo) b += F.futureAmount * M
        }
        b += fcf[t] / 12
        balances.push(b)
      }
    }
    return balances
  }
  const runway = (balances: number[]) => {
    const idx = balances.findIndex((b) => b < -1e-6)
    return idx === -1 ? null : idx
  }
  const monthlyWith = monthly(true)
  const runwayMonths = runway(monthlyWith)
  const runwayMonthsNoFunding = runway(monthly(false))
  const quarterlyBalance = monthlyWith
    .map((b, i) => ({ b, i }))
    .filter(({ i }) => i % 3 === 2)
    .map(({ b, i }) => ({ label: `Q${Math.floor((i % 12) / 3) + 1} ${START_YEAR + Math.floor(i / 12)}`, balance: b }))
  const cashPaybackYears = paybackYears(fcf.map((v, t) => (t === 0 ? v + initialCash : v)))
  const useOfFundsTotalPct = sum(inputs.cash.useOfFunds.map((u) => u.pct))

  // ------------------------------------------------------------------ valuation
  const V = inputs.valuation
  const exitIndex = V.exitYearIndex < 0 ? N - 1 : Math.min(N - 1, Math.max(0, V.exitYearIndex))
  const w = V.discountRate
  const discountFactors = years.map((_, t) => 1 / Math.pow(1 + w, t + 1))
  const netCashAt = (e: number) => closing[e]

  const valueAt = (approach: Approach, e: number, p: { revMult: number; ebitdaMult: number; growth: number; wacc: number }): ValuationResult => {
    const exitRevenue = revenueTotal[e]
    const exitEbitda = ebitda[e]
    const exitFcf = fcf[e]
    let gross = NaN
    let meaningful = true
    let note = ''
    let multipleOrRate = ''
    switch (approach) {
      case 'ev-revenue':
        gross = exitRevenue * p.revMult
        multipleOrRate = `${p.revMult.toFixed(1)}x revenue`
        break
      case 'ev-ebitda':
        gross = exitEbitda * p.ebitdaMult
        multipleOrRate = `${p.ebitdaMult.toFixed(1)}x EBITDA`
        if (exitEbitda <= 0) {
          meaningful = false
          note = 'EBITDA is not positive in the exit year, so an EBITDA multiple is not meaningful.'
        }
        break
      case 'dcf-growth':
        multipleOrRate = `${(p.growth * 100).toFixed(1)}% growth, ${(p.wacc * 100).toFixed(1)}% discount`
        if (p.wacc <= p.growth) {
          meaningful = false
          note = 'Discount rate must exceed terminal growth.'
        } else {
          gross = (exitFcf * (1 + p.growth)) / (p.wacc - p.growth)
          if (exitFcf <= 0) {
            meaningful = false
            note = 'Free cash flow is not positive in the exit year, so a perpetuity value is not meaningful.'
          }
        }
        break
      case 'dcf-multiple':
        gross = exitEbitda * p.ebitdaMult
        multipleOrRate = `${p.ebitdaMult.toFixed(1)}x EBITDA terminal, ${(p.wacc * 100).toFixed(1)}% discount`
        if (exitEbitda <= 0) {
          meaningful = false
          note = 'EBITDA is not positive in the exit year, so an EBITDA terminal multiple is not meaningful.'
        }
        break
    }
    const evAtExit = gross * (1 - V.exitDiscount)
    const netCash = netCashAt(e)
    const equityAtExit = evAtExit + netCash
    const pvFlows = sum(fcf.slice(0, e + 1).map((cf, t) => cf / Math.pow(1 + p.wacc, t + 1)))
    const evToday = pvFlows + evAtExit / Math.pow(1 + p.wacc, e + 1)
    return {
      approach,
      label: APPROACH_LABELS[approach],
      exitIndex: e,
      exitYear: START_YEAR + e,
      exitRevenue,
      exitEbitda,
      exitFcf,
      multipleOrRate,
      evAtExitGross: gross,
      evAtExit,
      netCashAtExit: netCash,
      equityAtExit,
      evToday,
      meaningful,
      note,
    }
  }
  const baseParams = { revMult: V.revenueMultiple, ebitdaMult: V.ebitdaMultiple, growth: V.terminalGrowth, wacc: w }
  const all = (['ev-revenue', 'ev-ebitda', 'dcf-growth', 'dcf-multiple'] as Approach[]).map((a) => valueAt(a, exitIndex, baseParams))
  const selected = all.find((v) => v.approach === V.approach) ?? all[0]
  const pvFcf = fcf.slice(0, exitIndex + 1).map((cf, t) => cf * discountFactors[t])
  const pvTerminal = selected.evAtExit * discountFactors[exitIndex]

  // investor returns
  const postMoney = F.preMoney + F.initialAmount
  const ownershipInitial = safeDiv(F.initialAmount, postMoney)
  const futureOwnership = F.futureAmount > 0 ? safeDiv(F.futureAmount, F.futurePreMoney + F.futureAmount) : 0
  const futureBeforeExit = F.futureAmount > 0 && F.futureYearIndex <= exitIndex
  const investorReturns = (equityAtExit: number, e: number) => {
    const diluted = futureBeforeExit ? ownershipInitial * (1 - futureOwnership) : ownershipInitial
    const equity = equityAtExit * diluted
    const invested = F.initialAmount * M
    const mom = safeDiv(equity, invested)
    const holdingYears = e + 1 - (F.initialYearIndex + F.initialQuarter / 4)
    const irrValue = holdingYears > 0 && mom > 0 ? Math.pow(mom, 1 / holdingYears) - 1 : NaN
    return { ownershipAtExit: diluted, equityAtExit: equity, moneyMultiple: mom, holdingYears, irr: irrValue }
  }
  const inv = investorReturns(selected.equityAtExit, exitIndex)

  // sensitivity grid: driver values (rows) x exit years (columns)
  const sensYears = years.map((_, i) => i).filter((i) => i >= Math.max(0, N - 3))
  const steps = [0.5, 0.75, 1, 1.25, 1.5]
  let rowLabel = 'Exit multiple (x revenue)'
  let rowValues: { label: string; isBase: boolean; params: typeof baseParams }[]
  if (V.approach === 'ev-revenue') {
    rowValues = steps.map((s) => ({ label: `${(V.revenueMultiple * s).toFixed(1)}x`, isBase: s === 1, params: { ...baseParams, revMult: V.revenueMultiple * s } }))
  } else if (V.approach === 'dcf-growth') {
    rowLabel = 'Terminal growth rate'
    rowValues = [-0.02, -0.01, 0, 0.01, 0.02].map((d) => ({
      label: `${((V.terminalGrowth + d) * 100).toFixed(1)}%`,
      isBase: d === 0,
      params: { ...baseParams, growth: V.terminalGrowth + d },
    }))
  } else {
    rowLabel = 'Exit multiple (x EBITDA)'
    rowValues = steps.map((s) => ({ label: `${(V.ebitdaMultiple * s).toFixed(1)}x`, isBase: s === 1, params: { ...baseParams, ebitdaMult: V.ebitdaMultiple * s } }))
  }
  const sensitivity = {
    rowLabel,
    years: sensYears.map((i) => START_YEAR + i),
    rows: rowValues.map((rv) => ({
      label: rv.label,
      isBase: rv.isBase,
      cells: sensYears.map((e) => {
        const v = valueAt(V.approach, e, rv.params)
        const r = investorReturns(v.equityAtExit, e)
        return { year: START_YEAR + e, irr: v.meaningful ? r.irr : NaN, mom: v.meaningful ? r.moneyMultiple : NaN }
      }),
    })),
  }

  // ------------------------------------------------------------------ investor lens
  const L = N - 1
  const grade = (v: number, strong: number, watch: number, higherIsBetter = true): LensStatus => {
    if (!Number.isFinite(v)) return 'weak'
    if (higherIsBetter) return v >= strong ? 'strong' : v >= watch ? 'watch' : 'weak'
    return v <= strong ? 'strong' : v <= watch ? 'watch' : 'weak'
  }
  const cagr = L > 0 && revenueTotal[0] > 0 ? Math.pow(revenueTotal[L] / revenueTotal[0], 1 / L) - 1 : NaN
  const growthLast = L > 0 && revenueTotal[L - 1] > 0 ? revenueTotal[L] / revenueTotal[L - 1] - 1 : NaN
  const rule40 = growthLast + ebitda[L] / (revenueTotal[L] || 1)
  const recurringShare = safeDiv(recurringTotal[L], revenueTotal[L])
  const burnYears = fcf.map((v, t) => (v < 0 ? t : -1)).filter((t) => t >= 0)
  const totalBurn = -sum(burnYears.map((t) => fcf[t]))
  const lastBurnYear = burnYears.length ? burnYears[burnYears.length - 1] : -1
  const burnMultiple = lastBurnYear >= 0 && recurringTotal[lastBurnYear] > 0 ? totalBurn / recurringTotal[lastBurnYear] : lastBurnYear < 0 ? 0 : NaN
  const avgCacPayback = (() => {
    const v = cacPaybackMonthsByYear.filter((x) => Number.isFinite(x))
    return v.length ? sum(v) / v.length : NaN
  })()
  const roundCoverage = safeDiv(F.initialAmount * M, totalFundingNeed || 1)
  const lens: LensMetric[] = [
    { id: 'cagr', label: `Revenue CAGR ${START_YEAR}–${START_YEAR + L}`, value: cagr, kind: 'pct', benchmark: '≥ 60% strong · ≥ 30% watch', status: grade(cagr, 0.6, 0.3), definition: 'Compound annual revenue growth over the projection.', screen: 'revenue' },
    { id: 'recurring', label: `Recurring revenue share (${START_YEAR + L})`, value: recurringShare, kind: 'pct', benchmark: '≥ 70% strong · ≥ 50% watch', status: grade(recurringShare, 0.7, 0.5), definition: 'Platform, use case and managed services revenue as a share of total revenue in the exit year. Higher means more predictable revenue.', screen: 'revenue' },
    { id: 'gm', label: `Gross margin (${START_YEAR + L})`, value: safeDiv(grossProfit[L], revenueTotal[L]), kind: 'pct', benchmark: '≥ 70% strong · ≥ 50% watch', status: grade(safeDiv(grossProfit[L], revenueTotal[L]), 0.7, 0.5), definition: 'Revenue less delivery and service costs, as a share of revenue.', screen: 'profitability' },
    { id: 'implMargin', label: 'Implementation margin', value: implMargin, kind: 'pct', benchmark: '≥ 20% strong · ≥ 0% watch', status: grade(implMargin, 0.2, 0), definition: 'Implementation fee less first deployment cost. Services should at least pay for themselves.', screen: 'implementation' },
    { id: 'ebitda', label: `EBITDA margin (${START_YEAR + L})`, value: safeDiv(ebitda[L], revenueTotal[L]), kind: 'pct', benchmark: '≥ 20% strong · ≥ 0% watch', status: grade(safeDiv(ebitda[L], revenueTotal[L]), 0.2, 0), definition: 'Operating profitability before depreciation and tax in the exit year.', screen: 'profitability' },
    { id: 'rule40', label: `Rule of 40 (${START_YEAR + L})`, value: rule40, kind: 'pct', benchmark: '≥ 40% strong · ≥ 20% watch', status: grade(rule40, 0.4, 0.2), definition: 'Revenue growth plus EBITDA margin in the exit year. Balances growth against profitability.', screen: 'profitability' },
    { id: 'ltvcac', label: 'LTV / CAC', value: ltvToCac, kind: 'x', benchmark: '≥ 3x strong · ≥ 1.5x watch', status: grade(ltvToCac, 3, 1.5), definition: `Retention-weighted ${U}-year gross profit per customer divided by sales and marketing cost per new customer.`, screen: 'profitability' },
    { id: 'cacPayback', label: 'CAC payback', value: avgCacPayback, kind: 'months', benchmark: '≤ 12 months strong · ≤ 24 watch', status: grade(avgCacPayback, 12, 24, false), definition: 'Months of first-year recurring gross profit needed to recover the cost of acquiring a customer.', screen: 'profitability' },
    { id: 'burn', label: 'Burn multiple', value: burnMultiple, kind: 'x', benchmark: '≤ 1.0x strong · ≤ 2.0x watch', status: grade(burnMultiple, 1, 2, false), definition: 'Total cash burned while unprofitable divided by recurring revenue built by the last burn year. Lower is more capital-efficient.', screen: 'cash' },
    { id: 'coverage', label: 'Round covers funding need', value: roundCoverage, kind: 'x', benchmark: '≥ 1.0x strong · ≥ 0.8x watch', status: grade(roundCoverage, 1, 0.8), definition: 'Proposed round divided by peak cash deficit plus the minimum buffer.', screen: 'cash' },
    { id: 'mom', label: 'Investor money multiple', value: inv.moneyMultiple, kind: 'x', benchmark: '≥ 3x strong · ≥ 2x watch', status: grade(inv.moneyMultiple, 3, 2), definition: 'Investor share of equity value at exit divided by the amount invested.', screen: 'valuation' },
    { id: 'irr', label: 'Investor IRR', value: inv.irr, kind: 'pct', benchmark: '≥ 30% strong · ≥ 15% watch', status: grade(inv.irr, 0.3, 0.15), definition: 'Annualised return from the funding date to the end of the exit year.', screen: 'valuation' },
  ]

  return {
    nYears: N,
    years,
    rev: {
      newCustomers,
      cohort,
      active,
      activeUseCases,
      newAddlUseCases,
      addlPerCustomerByTenure,
      platform,
      implementation,
      useCase,
      managed,
      total: revenueTotal,
      avgPerCustomer: years.map((_, t) => safeDiv(revenueTotal[t], active[t])),
      recFrac,
      compFrac,
      billings,
      collections,
      receivablesEnd,
      deferredEnd,
      recurringTotal,
      oneTimeTotal,
    },
    impl: {
      onboarding: { lines: onbLines, labour: onbLabour, fteMonths: onbFte, direct: I.onboarding.directCosts, total: onbTotal },
      useCase: {
        lines: ucLines,
        labour: ucLabour,
        fteMonths: ucFte,
        direct: I.useCase.directCosts,
        total: ucTotal,
        addlLabour,
        addlFteMonths: addlFte,
        addlDirect,
        addlTotal,
        addlReduction: safeDiv(ucTotal - addlTotal, ucTotal),
      },
      recurring: { lines: recurringLines, fixedPerCustomer, perUseCase, perCustomerAtFullRamp, useCasesAtFullRamp },
      firstDeploymentCost,
      lifecycleCostPerCustomer,
      avgCostPerUseCase,
      implMargin,
      recurringRevenuePerCustomer,
      recurringGrossProfitPerCustomer,
      recurringMargin,
      byYear: {
        reduction,
        implLabourPerCustomer,
        implCostPerCustomer,
        addlUseCaseCost,
        implCostIncurred,
        addlUseCaseCostIncurred,
        recurringCost,
        requiredFteMonths,
        blendedMonthlyRate,
      },
    },
    company: {
      functions,
      deliveryHeadcount,
      deliveryAvgCost,
      deliveryCost,
      availableFteMonths,
      requiredFteMonths,
      utilization,
      unallocatedFteMonths,
      headcountTotal,
      payroll,
      people,
      infraLines,
      infra,
      opexLines,
      other,
      total: companyTotal,
      pctOfRevenue: { people: pct(people), infra: pct(infra), other: pct(other), total: pct(companyTotal) },
    },
    pl: {
      revenue: revenueTotal,
      cogsImpl: implCostIncurred,
      cogsAddl: addlUseCaseCostIncurred,
      cogsRecurring: recurringCost,
      cogs,
      grossProfit,
      grossMargin: pct(grossProfit),
      opex: companyTotal,
      ebitda,
      ebitdaMargin: pct(ebitda),
      da,
      ebit,
      tax,
      netIncome,
      netMargin: pct(netIncome),
      totals: {
        revenue: sum(revenueTotal),
        cogs: sum(cogs),
        grossProfit: sum(grossProfit),
        opex: sum(companyTotal),
        ebitda: sum(ebitda),
        da: sum(da),
        tax: sum(tax),
        netIncome: sum(netIncome),
      },
      breakevenIndex: breakevenIndex === -1 ? null : breakevenIndex,
      cumulativeEbitdaPaybackYears: paybackYears(ebitda),
    },
    unit: {
      years: U,
      implementationFee: uImplFee,
      platformRevenue: uPlatform,
      useCaseRevenue: uUseCase,
      managedRevenue: uManaged,
      totalRevenue: uRevenue,
      implementationCost: uImplCost,
      addlUseCaseCost: uAddlCost,
      recurringCost: uRecurring,
      totalCost: uCost,
      grossProfit: uGp,
      grossMargin: uk.map((k) => safeDiv(uGp[k], uRevenue[k])),
      survival: uSurvival,
      ltv,
      cacByYear,
      cacPaybackMonthsByYear,
      ltvToCac,
    },
    cash: {
      collections,
      deferredChange,
      receivablesChange,
      cogsPaid: cogs,
      opexPaid: companyTotal,
      taxPaid: tax,
      capex,
      outflow,
      operatingCashFlow,
      fcf,
      funding,
      opening,
      closing,
      preFundingCumulative,
      peakFundingNeed,
      peakFundingIndex,
      bufferNeed,
      totalFundingNeed,
      totalFundingPlanned: sum(funding),
      runwayMonths,
      runwayMonthsNoFunding,
      quarterlyBalance,
      cashPaybackYears,
      useOfFundsTotalPct,
    },
    lens,
    val: {
      selected,
      all,
      exitIndex,
      discountFactors,
      pvFcf,
      pvTerminal,
      investor: {
        initialAmount: F.initialAmount * M,
        postMoney,
        ownershipInitial,
        futureAmount: F.futureAmount * M,
        futureOwnership,
        ...inv,
      },
      sensitivity,
    },
  }
}
