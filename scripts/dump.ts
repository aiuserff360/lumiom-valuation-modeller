// Prints the headline numbers for all three scenarios. Run: npx tsx scripts/dump.ts
import { DEFAULT_INPUTS, DEFAULT_SCENARIO_SETTINGS } from '../src/model/defaults'
import { applyScenario } from '../src/model/scenario'
import { compute } from '../src/model/engine'
import type { Scenario } from '../src/model/types'

const m1 = (v: number) => (v / 1e6).toFixed(1)
const pct = (v: number) => (v * 100).toFixed(0) + '%'
const row = (label: string, s: number[], f = m1) => console.log(label.padEnd(28), s.map((v) => f(v).padStart(8)).join(''))

for (const sc of ['conservative', 'base', 'aggressive'] as Scenario[]) {
  const m = compute(applyScenario(DEFAULT_INPUTS, sc, DEFAULT_SCENARIO_SETTINGS), 5)
  console.log(`\n=== ${sc.toUpperCase()} ===`)
  console.log(''.padEnd(28), m.years.map((y) => String(y).padStart(8)).join(''))
  row('New customers', m.rev.newCustomers, (v) => String(v))
  row('Active customers', m.rev.active, (v) => String(v))
  row('Active use cases', m.rev.activeUseCases, (v) => v.toFixed(1))
  row('Platform', m.rev.platform)
  row('Implementation', m.rev.implementation)
  row('Use cases', m.rev.useCase)
  row('Managed', m.rev.managed)
  row('Revenue', m.rev.total)
  row('COGS impl', m.pl.cogsImpl)
  row('COGS addl UC', m.pl.cogsAddl)
  row('COGS recurring', m.pl.cogsRecurring)
  row('Gross profit', m.pl.grossProfit)
  row('Gross margin', m.pl.grossMargin, pct)
  row('People', m.company.people)
  row('Infra', m.company.infra)
  row('Other opex', m.company.other)
  row('EBITDA', m.pl.ebitda)
  row('EBITDA margin', m.pl.ebitdaMargin, pct)
  row('Tax', m.pl.tax)
  row('Net income', m.pl.netIncome)
  row('Collections', m.cash.collections)
  row('FCF', m.cash.fcf)
  row('Closing cash', m.cash.closing)
  row('Req FTE-months', m.impl.byYear.requiredFteMonths, (v) => v.toFixed(0))
  row('Delivery utilisation', m.company.utilization, pct)
  row('Delivery headcount', m.company.deliveryHeadcount, (v) => String(v))
  row('CAC', m.unit.cacByYear, (v) => (v / 1000).toFixed(0) + 'k')
  console.log('Peak funding need', m1(m.cash.peakFundingNeed), 'total need', m1(m.cash.totalFundingNeed), 'runway', m.cash.runwayMonths, 'no-funding runway', m.cash.runwayMonthsNoFunding)
  console.log('Impl margin', pct(m.impl.implMargin), 'recurring margin', pct(m.impl.recurringMargin), 'LTV', m1(m.unit.ltv), 'LTV/CAC', m.unit.ltvToCac.toFixed(1))
  for (const v of m.val.all) console.log(v.label.padEnd(26), 'EV exit', m1(v.evAtExit).padStart(8), 'EV today', m1(v.evToday).padStart(8), v.meaningful ? '' : 'n/m')
  console.log('Investor MoM', m.val.investor.moneyMultiple.toFixed(2), 'IRR', pct(m.val.investor.irr))
}
