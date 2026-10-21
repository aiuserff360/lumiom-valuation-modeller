// ---------------------------------------------------------------------------
// Input schema for the Lumiom valuation model.
// All money inputs are stored in USD. Display currency conversion happens in the UI.
// Per-year arrays always hold MAX_YEARS entries; the projection period slices them.
// ---------------------------------------------------------------------------

export const START_YEAR = 2026
export const MAX_YEARS = 10
export const PERIOD_OPTIONS = [3, 5, 7, 10] as const

export type Scenario = 'conservative' | 'base' | 'aggressive'
export type Currency = 'USD' | 'EUR' | 'INR'
export type Billing = 'recurring' | 'one-time'
export type Approach = 'ev-revenue' | 'ev-ebitda' | 'dcf-growth' | 'dcf-multiple'
export type RoleId = 'PM' | 'SA' | 'DE' | 'ENG' | 'SPEC' | 'BA' | 'DS' | 'QA'

export interface PriceComponent {
  price: number
  billing: Billing
}

export interface EffortLine {
  id: string
  label: string
  role: RoleId
  /** Role mix: fraction of an FTE assigned (display only, e.g. "PM (0.5)") */
  fte: number
  fteMonths: number
  /** Fully loaded monthly cost for this role (USD) */
  monthlyCost: number
  /** Only on use-case lines: % effort saved on each additional use case (0..1) */
  reusePct?: number
}

export interface RecurringLine {
  id: string
  label: string
  basis: 'perCustomer' | 'perUseCase'
  unitCost: number
}

export interface FunctionLine {
  id: string
  label: string
  avgCost: number
  headcount: number[]
}

export interface SeriesLine {
  id: string
  label: string
  values: number[]
}

export interface UseOfFundsLine {
  id: string
  label: string
  pct: number
}

export interface Inputs {
  revenue: {
    newCustomers: number[]
    pricing: {
      platform: PriceComponent
      implementation: PriceComponent
      useCase: PriceComponent
      managed: PriceComponent
    }
    contractTerm: number
    retentionRate: number
    addlUseCases: number
    useCaseRampYears: number
    expansionRate: number
    managedAttach: number
    recognitionMonths: number
  }
  implementation: {
    onboarding: { lines: EffortLine[]; directCosts: number }
    useCase: { lines: EffortLine[]; directCosts: number; directReusePct: number }
    recurring: { lines: RecurringLine[] }
    effortReduction: number[]
  }
  company: {
    workforce: FunctionLine[]
    infra: SeriesLine[]
    opex: SeriesLine[]
    taxRate: number
    depreciationYears: number
  }
  cash: {
    collectionDays: number
    upfrontPct: number
    initialCash: number
    minBufferMonths: number
    capex: number[]
    useOfFunds: UseOfFundsLine[]
  }
  valuation: {
    /** Index into the projection years; -1 = last year of the projection period */
    exitYearIndex: number
    approach: Approach
    revenueMultiple: number
    ebitdaMultiple: number
    discountRate: number
    terminalGrowth: number
    exitDiscount: number
    funding: {
      initialAmount: number
      initialYearIndex: number
      initialQuarter: number
      preMoney: number
      futureAmount: number
      futureYearIndex: number
      futureQuarter: number
      futurePreMoney: number
    }
  }
}

export interface ScenarioSettings {
  factors: Record<Scenario, number>
  scaleCustomers: boolean
  scaleHeadcount: boolean
  scaleOperatingCosts: boolean
  scaleCapex: boolean
}

export const APPROACH_LABELS: Record<Approach, string> = {
  'ev-revenue': 'EV / Revenue multiple',
  'ev-ebitda': 'EV / EBITDA multiple',
  'dcf-growth': 'DCF – perpetuity growth',
  'dcf-multiple': 'DCF – exit multiple',
}

export const SCENARIO_LABELS: Record<Scenario, string> = {
  conservative: 'Conservative',
  base: 'Base',
  aggressive: 'Aggressive',
}
