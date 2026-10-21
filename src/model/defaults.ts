import type { Inputs, ScenarioSettings } from './types'

// Base-case assumptions. Per-year arrays cover 10 years (2026–2035).

export const DEFAULT_INPUTS: Inputs = {
  revenue: {
    newCustomers: [6, 12, 22, 30, 40, 48, 55, 60, 65, 70],
    pricing: {
      platform: { price: 300_000, billing: 'recurring' },
      implementation: { price: 700_000, billing: 'one-time' },
      useCase: { price: 200_000, billing: 'recurring' },
      managed: { price: 100_000, billing: 'recurring' },
    },
    contractTerm: 3,
    retentionRate: 0.92,
    addlUseCases: 1.5,
    useCaseRampYears: 3,
    expansionRate: 0.1,
    managedAttach: 0.6,
    recognitionMonths: 6,
  },
  implementation: {
    onboarding: {
      lines: [
        { id: 'pm', label: 'Program management', role: 'PM', fte: 0.5, monthlyCost: 16_000, fteMonths: 2 },
        { id: 'arch', label: 'Solution architecture', role: 'SA', fte: 1, monthlyCost: 15_000, fteMonths: 4 },
        { id: 'data', label: 'Data engineering & integration', role: 'DE', fte: 2, monthlyCost: 12_500, fteMonths: 6 },
        { id: 'platform', label: 'Platform setup & configuration', role: 'ENG', fte: 1, monthlyCost: 12_500, fteMonths: 3 },
        { id: 'gov', label: 'Governance, security & compliance', role: 'SPEC', fte: 0.5, monthlyCost: 13_500, fteMonths: 2 },
      ],
      directCosts: 70_000,
    },
    useCase: {
      lines: [
        { id: 'domain', label: 'Domain / process analysis', role: 'BA', fte: 0.5, monthlyCost: 12_500, fteMonths: 1.5, reusePct: 0.6 },
        { id: 'model', label: 'Data modeling & engineering', role: 'DE', fte: 1, monthlyCost: 12_500, fteMonths: 3, reusePct: 0.5 },
        { id: 'ai', label: 'Analytics / AI modeling', role: 'DS', fte: 1, monthlyCost: 13_500, fteMonths: 3, reusePct: 0.4 },
        { id: 'build', label: 'Solution build & integration', role: 'ENG', fte: 1, monthlyCost: 12_500, fteMonths: 3, reusePct: 0.7 },
        { id: 'test', label: 'Testing, UAT & deployment', role: 'QA', fte: 0.5, monthlyCost: 11_000, fteMonths: 1.5, reusePct: 0.4 },
        { id: 'kt', label: 'Knowledge transfer & enablement', role: 'SPEC', fte: 0.5, monthlyCost: 13_500, fteMonths: 1.5, reusePct: 0.3 },
      ],
      directCosts: 40_000,
      directReusePct: 0.4,
    },
    recurring: {
      lines: [
        { id: 'cloud', label: 'Customer cloud infrastructure', basis: 'perCustomer', unitCost: 15_000 },
        { id: 'inference', label: 'AI model inference / compute', basis: 'perUseCase', unitCost: 5_000 },
        { id: 'support', label: 'Dedicated support & customer success', basis: 'perCustomer', unitCost: 25_000 },
        { id: 'tools', label: 'Software tools & licenses', basis: 'perCustomer', unitCost: 10_000 },
        { id: 'other', label: 'Other (data storage, monitoring)', basis: 'perCustomer', unitCost: 5_000 },
      ],
    },
    effortReduction: [0, 0.1, 0.2, 0.3, 0.4, 0.45, 0.5, 0.5, 0.5, 0.5],
  },
  company: {
    workforce: [
      { id: 'rnd', label: 'Product & R&D', avgCost: 180_000, headcount: [8, 12, 18, 26, 36, 44, 52, 58, 64, 70] },
      { id: 'sales', label: 'Sales & Marketing', avgCost: 160_000, headcount: [6, 10, 14, 20, 28, 34, 40, 45, 50, 55] },
      { id: 'ga', label: 'General & Administrative', avgCost: 140_000, headcount: [5, 7, 10, 14, 18, 22, 26, 29, 32, 35] },
      { id: 'cs', label: 'Customer Success & Support (central team)', avgCost: 120_000, headcount: [2, 3, 5, 7, 9, 11, 13, 14, 15, 16] },
    ],
    infra: [
      { id: 'cloud', label: 'Core platform cloud infrastructure', values: [0.5, 0.7, 1.0, 1.4, 1.8, 2.2, 2.6, 3.0, 3.4, 3.8] },
      { id: 'software', label: 'Software tools & licenses', values: [0.3, 0.5, 0.7, 1.0, 1.4, 1.7, 2.0, 2.3, 2.6, 2.9] },
      { id: 'data', label: 'Data & AI infrastructure', values: [0.2, 0.4, 0.6, 0.9, 1.3, 1.6, 1.9, 2.2, 2.5, 2.8] },
      { id: 'security', label: 'Security, compliance & other IT', values: [0.1, 0.2, 0.3, 0.4, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1] },
    ],
    opex: [
      { id: 'office', label: 'Office facilities (rent, utilities)', values: [0.3, 0.4, 0.6, 0.8, 1.1, 1.3, 1.5, 1.7, 1.9, 2.1] },
      { id: 'travel', label: 'Travel & events', values: [0.2, 0.4, 0.6, 0.9, 1.3, 1.5, 1.7, 1.9, 2.1, 2.3] },
      { id: 'legal', label: 'Legal, audit & insurance', values: [0.1, 0.2, 0.3, 0.4, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1] },
      { id: 'marketing', label: 'Marketing & brand', values: [0.3, 0.6, 0.9, 1.3, 1.8, 2.2, 2.6, 3.0, 3.4, 3.8] },
      { id: 'services', label: 'Professional services', values: [0.1, 0.2, 0.3, 0.4, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1] },
      { id: 'contingency', label: 'Contingency', values: [0.1, 0.2, 0.3, 0.4, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1] },
    ],
    taxRate: 0.25,
    depreciationYears: 3,
  },
  cash: {
    collectionDays: 90,
    upfrontPct: 0.3,
    initialCash: 0,
    minBufferMonths: 6,
    capex: [2.0, 1.5, 1.0, 0.7, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
    useOfFunds: [
      { id: 'product', label: 'Product & technology', pct: 0.3 },
      { id: 'sales', label: 'Sales & marketing', pct: 0.25 },
      { id: 'delivery', label: 'Delivery & customer success', pct: 0.25 },
      { id: 'ga', label: 'G&A and working capital', pct: 0.15 },
      { id: 'contingency', label: 'Contingency', pct: 0.05 },
    ],
  },
  valuation: {
    exitYearIndex: -1,
    approach: 'ev-revenue',
    revenueMultiple: 5,
    ebitdaMultiple: 15,
    discountRate: 0.2,
    terminalGrowth: 0.03,
    exitDiscount: 0,
    funding: {
      initialAmount: 25,
      initialYearIndex: 0,
      initialQuarter: 0,
      preMoney: 75,
      futureAmount: 0,
      futureYearIndex: 2,
      futureQuarter: 0,
      futurePreMoney: 150,
    },
  },
}

export const DEFAULT_SCENARIO_SETTINGS: ScenarioSettings = {
  factors: { conservative: 0.5, base: 1, aggressive: 1.5 },
  scaleCustomers: true,
  scaleHeadcount: true,
  scaleOperatingCosts: true,
  scaleCapex: true,
}

export const DEFAULT_FX: Record<'USD' | 'EUR' | 'INR', number> = { USD: 1, EUR: 0.92, INR: 88 }
