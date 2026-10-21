import { Bar, BarChart, CartesianGrid, ComposedChart, LabelList, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useStore } from '../state/store'
import { SCENARIO_LABELS, START_YEAR } from '../model/types'
import { Card, KV, Kpi, Row, Val, YearHead, fmtKind, useFmt } from '../ui/components'
import { ChartLegend, SERIES, axisStyle, gridStyle, useChartFmt } from '../ui/charts'
import { fmtMoneyCompact, fmtNum, fmtPct, fmtX, fmtYears } from '../ui/format'
import type { ScreenId } from '../App'

const SCREEN_NAMES: Record<string, string> = { revenue: 'Revenue', implementation: 'Implementation', company: 'Company Costs', profitability: 'Profitability', cash: 'Cash Flow', valuation: 'Valuation' }

export function Overview({ go }: { go: (id: ScreenId) => void }) {
  const { model: m, inputs, scenario, currency, fx } = useStore()
  const f = useFmt()
  const cf = useChartFmt()
  const years = m.years
  const N = years.length
  const last = N - 1
  const T = m.pl.totals
  const R = inputs.revenue
  const F = inputs.valuation.funding
  const C = m.cash
  const sel = m.val.selected
  const inv = m.val.investor
  const compact = (v: number) => fmtMoneyCompact(v, currency, fx[currency])
  const sumS = (a: number[]) => a.reduce((x, y) => x + y, 0)
  const ok = sel.meaningful
  const qLabel = (y: number, q: number) => `Q${q + 1} ${START_YEAR + y}`
  const breakevenYear = m.pl.breakevenIndex === null ? null : years[m.pl.breakevenIndex]
  const mLabel = (v: unknown) => `${f.sym}${Number(v).toFixed(1)}M`

  const revChart = years.map((y, t) => ({
    year: y,
    'Platform subscription': cf.axisM(m.rev.platform[t]),
    'Additional use cases': cf.axisM(m.rev.useCase[t]),
    Implementation: cf.axisM(m.rev.implementation[t]),
    'Managed services': cf.axisM(m.rev.managed[t]),
    total: cf.axisM(m.rev.total[t]),
  }))
  const plChart = years.map((y, t) => ({ year: y, Revenue: cf.axisM(m.pl.revenue[t]), EBITDA: cf.axisM(m.pl.ebitda[t]), 'Net profit': cf.axisM(m.pl.netIncome[t]) }))
  const cashChart = years.map((y, t) => ({ year: y, 'Net cash flow': cf.axisM(C.fcf[t]), 'Closing cash (after funding)': cf.axisM(C.closing[t]) }))

  return (
    <>
      <div className="grid c6">
        <Kpi label={`Revenue (${N}Y)`} value={compact(T.revenue)} sub={`${f.sym}${f.m(m.rev.total[last])}M in ${years[last]}`} />
        <Kpi label={`EBITDA (${years[last]})`} value={compact(m.pl.ebitda[last])} sub={`${fmtPct(m.pl.ebitdaMargin[last])} margin · breakeven ${breakevenYear ?? 'not reached'}`} tone={m.pl.ebitda[last] < 0 ? 'bad' : undefined} />
        <Kpi label={`Net profit (${N}Y)`} value={compact(T.netIncome)} sub={`${fmtPct(T.revenue ? T.netIncome / T.revenue : 0)} margin`} tone={T.netIncome < 0 ? 'bad' : undefined} />
        <Kpi label="Funding need" hint="Peak cumulative cash deficit plus the minimum cash buffer (Screen 6)." value={compact(C.totalFundingNeed)} sub={`Round ${compact(F.initialAmount * 1e6)} in ${qLabel(F.initialYearIndex, F.initialQuarter)}`} tone={F.initialAmount * 1e6 < C.totalFundingNeed ? 'bad' : undefined} />
        <Kpi label={`Enterprise value at exit (${sel.exitYear})`} value={ok ? compact(sel.evAtExit) : 'n/m'} sub={sel.label} hint="Exit-year metric × multiple, or DCF terminal value, less any exit discount (Screen 7)." />
        <Kpi label="Investor returns" value={ok ? `${fmtX(inv.moneyMultiple)} / ${fmtPct(inv.irr)}` : 'n/m'} sub={`Money multiple / IRR on ${compact(inv.initialAmount)}`} />
      </div>

      <div className="grid c3">
        <Card n={2} title="Revenue Assumptions" subtitle={`${SCENARIO_LABELS[scenario]} case · ${N}-year plan`} right={<button className="icon-btn" type="button" onClick={() => go('revenue')}>Edit →</button>}>
          <table className="compact">
            <YearHead years={years} first="" />
            <tbody>
              <Row label="New customers" values={m.rev.newCustomers} kind="int" className="linked" />
              <Row label="Active customers (end of year)" values={m.rev.active} kind="int" />
              <Row label="Active use cases" values={m.rev.activeUseCases} kind="number" decimals={0} />
            </tbody>
          </table>
          <table className="compact" style={{ marginTop: 10 }}>
            <tbody>
              <KV label="Platform subscription (per customer per year)" v={R.pricing.platform.price} className="linked" />
              <KV label="Implementation / FDE (per deployment)" v={R.pricing.implementation.price} className="linked" />
              <KV label="Additional use case (per use case per year)" v={R.pricing.useCase.price} className="linked" />
              <KV label="Managed services (per customer per year)" v={R.pricing.managed.price} className="linked" />
              <KV label="Average contract term (years)" v={R.contractTerm} kind="int" className="linked" />
              <KV label="Retention rate after initial term" v={R.retentionRate} kind="pct" className="linked" />
              <KV label={`Additional use cases per customer (over ${R.useCaseRampYears} years)`} v={R.addlUseCases} kind="number" decimals={1} className="linked" />
              <KV label="Annual expansion rate (existing customers)" v={R.expansionRate} kind="pct" className="linked" />
              <KV label="Managed services attach rate" v={R.managedAttach} kind="pct" className="linked" />
            </tbody>
          </table>
        </Card>

        <Card title={<>Revenue Forecast <span className="muted">({f.mUnit})</span></>} subtitle="Recognised revenue by component.">
          <ChartLegend items={[{ label: 'Platform', color: SERIES[0] }, { label: 'Use cases', color: SERIES[1] }, { label: 'Implementation', color: SERIES[2] }, { label: 'Managed services', color: SERIES[3] }]} />
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={revChart} margin={{ top: 22, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid vertical={false} {...gridStyle} />
              <XAxis dataKey="year" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
              <Tooltip formatter={mLabel} />
              <Bar isAnimationActive={false} dataKey="Platform subscription" stackId="a" fill={SERIES[0]} />
              <Bar isAnimationActive={false} dataKey="Additional use cases" stackId="a" fill={SERIES[1]} />
              <Bar isAnimationActive={false} dataKey="Implementation" stackId="a" fill={SERIES[2]} />
              <Bar isAnimationActive={false} dataKey="Managed services" stackId="a" fill={SERIES[3]} radius={[4, 4, 0, 0]}>
                <LabelList dataKey="total" position="top" formatter={(v) => Number(v).toFixed(1)} style={{ fontSize: 11.5, fontWeight: 700, fill: '#0f172a' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <table className="compact" style={{ marginTop: 8 }}>
            <YearHead years={years} first="" total="Total" />
            <tbody>
              <Row label="Total revenue" values={m.rev.total} total bold />
              <Row label="of which recurring" values={m.rev.recurringTotal} total indent />
            </tbody>
          </table>
        </Card>

        <Card n={3} title="Implementation & Unit Costs" subtitle="Per customer, at Year 1 effort." right={<button className="icon-btn" type="button" onClick={() => go('implementation')}>Edit →</button>}>
          <table className="compact">
            <tbody>
              <KV label="Enterprise onboarding (one-time)" v={m.impl.onboarding.total} />
              <KV label="First use case" v={m.impl.useCase.total} />
              <KV label={`Each additional use case (${fmtPct(m.impl.useCase.addlReduction)} lower after reuse)`} v={m.impl.useCase.addlTotal} />
              <KV label={`Total implementation cost (1 + ${R.addlUseCases.toFixed(1)} use cases)`} v={m.impl.lifecycleCostPerCustomer} bold />
              <KV label={`Implementation margin (${f.sym}${f.k(R.pricing.implementation.price)}K fee vs ${f.sym}${f.k(m.impl.firstDeploymentCost)}K cost)`} v={m.impl.implMargin} kind="pct" bold />
              <KV label="Recurring service cost (per customer per year)" v={m.impl.recurring.perCustomerAtFullRamp} />
              <KV label="Recurring gross margin" v={m.impl.recurringMargin} kind="pct" bold />
              <KV label={`Lifetime gross profit per customer (${m.unit.years}Y, retention-weighted)`} v={m.unit.ltv} />
              <KV label="LTV / CAC" v={m.unit.ltvToCac} kind="x" />
            </tbody>
          </table>
        </Card>
      </div>

      <div className="grid c2">
        <Card n={5} title="Profitability" subtitle={`Company P&L (${f.mUnit}).`} right={<button className="icon-btn" type="button" onClick={() => go('profitability')}>Detail →</button>}>
          <table className="compact">
            <YearHead years={years} first="" total={`${N}Y`} />
            <tbody>
              <Row label="Revenue" values={m.pl.revenue} total bold />
              <Row label="Cost of revenue" values={m.pl.cogs.map((v) => -v)} total />
              <Row label="Gross profit" values={m.pl.grossProfit} total bold />
              <Row label="Gross margin" values={m.pl.grossMargin} kind="pct" total totalValue={T.revenue ? T.grossProfit / T.revenue : 0} />
              <Row label="Operating expenses" values={m.pl.opex.map((v) => -v)} total />
              <Row label="EBITDA" values={m.pl.ebitda} total bold />
              <Row label="EBITDA margin" values={m.pl.ebitdaMargin} kind="pct" total totalValue={T.revenue ? T.ebitda / T.revenue : 0} />
              <Row label="Net profit (after tax)" values={m.pl.netIncome} total bold />
            </tbody>
          </table>
          <ResponsiveContainer width="100%" height={150}>
            <ComposedChart data={plChart} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid vertical={false} {...gridStyle} />
              <XAxis dataKey="year" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
              <Tooltip formatter={mLabel} />
              <Bar isAnimationActive={false} dataKey="Revenue" fill={SERIES[0]} radius={[3, 3, 0, 0]} />
              <Bar isAnimationActive={false} dataKey="EBITDA" fill={SERIES[1]} radius={[3, 3, 0, 0]} />
              <Line isAnimationActive={false} dataKey="Net profit" stroke={SERIES[2]} strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>

        <Card n={6} title="Cash Flow & Funding" subtitle={`Cash position and funding need (${f.mUnit}).`} right={<button className="icon-btn" type="button" onClick={() => go('cash')}>Detail →</button>}>
          <table className="compact">
            <YearHead years={years} first="" />
            <tbody>
              <Row label="Cash inflow (collections)" values={C.collections} />
              <Row label="Cash outflow" values={C.outflow.map((v) => -v)} />
              <Row label="Net cash flow" values={C.fcf} bold />
              <Row label="Funding received" values={C.funding} className="linked" />
              <Row label="Closing cash balance" values={C.closing} bold />
            </tbody>
          </table>
          <ResponsiveContainer width="100%" height={130}>
            <ComposedChart data={cashChart} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid vertical={false} {...gridStyle} />
              <XAxis dataKey="year" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
              <Tooltip formatter={mLabel} />
              <Bar isAnimationActive={false} dataKey="Net cash flow" fill={SERIES[1]} radius={[3, 3, 0, 0]} />
              <Line isAnimationActive={false} dataKey="Closing cash (after funding)" stroke={SERIES[0]} strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
          <ul className="ov-list">
            <li>
              <span>Peak funding need ({years[C.peakFundingIndex]})</span>
              <b>{compact(C.peakFundingNeed)}</b>
            </li>
            <li>
              <span>Total need incl. {inputs.cash.minBufferMonths}-month buffer</span>
              <b>{compact(C.totalFundingNeed)}</b>
            </li>
            <li>
              <span>Proposed round ({qLabel(F.initialYearIndex, F.initialQuarter)})</span>
              <b>{compact(F.initialAmount * 1e6)}</b>
            </li>
            <li>
              <span>Runway with funding</span>
              <b>{C.runwayMonths === null ? `${12 * N}+ months` : `${C.runwayMonths} months`}</b>
            </li>
            <li>
              <span>Cash payback</span>
              <b>{fmtYears(C.cashPaybackYears)}</b>
            </li>
          </ul>
        </Card>
      </div>

      <div className="grid c2">
        <Card n={4} title="Company Costs" subtitle={`Operating costs; delivery is costed on Screen 3 (${f.mUnit}).`} right={<button className="icon-btn" type="button" onClick={() => go('company')}>Edit →</button>}>
          <table className="compact">
            <YearHead years={years} first="" total="Total" />
            <tbody>
              <Row label="Total headcount" values={m.company.headcountTotal} kind="int" className="linked" />
              <Row label="of which delivery (from Screen 3)" values={m.company.deliveryHeadcount} kind="int" indent className="linked" />
              <Row label="People costs" values={m.company.people} total />
              <Row label="Infrastructure & technology" values={m.company.infra} total />
              <Row label="Other operating expenses" values={m.company.other} total />
              <Row label="Total company costs" values={m.company.total} total bold />
              <Row label="% of revenue" values={m.company.pctOfRevenue.total} kind="pct" totalValue={T.revenue ? T.opex / T.revenue : 0} total />
              <Row label="Delivery utilization" values={m.company.utilization} kind="pct" totalValue={sumS(m.company.requiredFteMonths) / Math.max(1, sumS(m.company.availableFteMonths))} total />
            </tbody>
          </table>
        </Card>

        <Card n={7} title="Valuation & Investor Returns" subtitle={`Exit in ${sel.exitYear} · all approaches (${f.mUnit}).`} right={<button className="icon-btn" type="button" onClick={() => go('valuation')}>Detail →</button>}>
          <table className="compact">
            <thead>
              <tr>
                <th className="left">Approach</th>
                <th className="left">Basis</th>
                <th>EV at exit</th>
                <th>Equity at exit</th>
                <th>EV today</th>
              </tr>
            </thead>
            <tbody>
              {m.val.all.map((a) => (
                <tr key={a.approach} className={a.approach === sel.approach ? 'total' : ''}>
                  <td className="left">{a.label}</td>
                  <td className="left sub">{a.multipleOrRate}</td>
                  {a.meaningful ? (
                    <>
                      <Val v={a.evAtExit} />
                      <Val v={a.equityAtExit} />
                      <Val v={a.evToday} />
                    </>
                  ) : (
                    <td className="left sub" colSpan={3}>
                      Not meaningful ({a.note.toLowerCase()})
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <table className="compact" style={{ marginTop: 12 }}>
            <tbody>
              <KV label={`Initial investment (${qLabel(F.initialYearIndex, F.initialQuarter)})`} v={inv.initialAmount} kind="moneyM" note={`${fmtPct(inv.ownershipInitial, 1)} at ${compact(F.preMoney * 1e6)} pre-money`} />
              <KV label="Investor equity value at exit" v={inv.equityAtExit} kind="moneyM" note={`${fmtPct(inv.ownershipAtExit, 1)} ownership at exit`} />
              <KV label="Money multiple" v={inv.moneyMultiple} kind="x" bold note={`${fmtNum(inv.holdingYears, 2)}-year hold`} />
              <KV label="IRR (annualised)" v={inv.irr} kind="pct" decimals={1} bold />
            </tbody>
          </table>
        </Card>
      </div>

      <div className="grid c1">
        <Card title="Investor Lens" subtitle="The metrics an investor screens first, graded against common venture benchmarks. Each links to the screen that drives it.">
          <div className="lens-summary">
            <span>
              <span className="pill pill-strong">Strong</span> {m.lens.filter((l) => l.status === 'strong').length}
            </span>
            <span>
              <span className="pill pill-watch">Watch</span> {m.lens.filter((l) => l.status === 'watch').length}
            </span>
            <span>
              <span className="pill pill-weak">Weak</span> {m.lens.filter((l) => l.status === 'weak').length}
            </span>
            <span className="muted">Thresholds are rules of thumb for early-stage enterprise software; adjust to your own view.</span>
          </div>
          <table className="compact lens">
            <thead>
              <tr>
                <th className="left">Metric</th>
                <th>Value</th>
                <th className="left">Benchmark</th>
                <th className="left">Status</th>
                <th className="left">Source</th>
              </tr>
            </thead>
            <tbody>
              {m.lens.map((l) => (
                <tr key={l.id}>
                  <td className="left wrap">
                    {l.label}
                    <span className="sub">{l.definition}</span>
                  </td>
                  <td className="num calc bold">{l.kind === 'months' ? (Number.isFinite(l.value) ? `${l.value.toFixed(1)} mo` : 'n/m') : fmtKind(l.value, l.kind, f, l.kind === 'pct' ? 0 : 1)}</td>
                  <td className="left sub">{l.benchmark}</td>
                  <td className="left">
                    <span className={`pill pill-${l.status}`}>{l.status === 'strong' ? 'Strong' : l.status === 'watch' ? 'Watch' : 'Weak'}</span>
                  </td>
                  <td className="left">
                    <button className="link-btn" type="button" onClick={() => go(l.screen)}>
                      {SCREEN_NAMES[l.screen]} →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

      </div>

      <div className="grid c1">
        <Card title="How to use this model">
          <ul className="takeaways">
            <li>
              <b>Base</b> is where you enter your assumptions. <b>Aggressive</b> scales the volume drivers (customers, headcount, cost lines, investment) to 150% and <b>Conservative</b> to 50%. Unit prices, unit costs and rates stay the same.
            </li>
            <li>Every blue cell on Screens 2–4, 6 and 7 is editable; all screens recalculate instantly. Edits are saved in this browser.</li>
            <li>Screens 3 and 4 are mutually exclusive: implementation delivery is costed per project on Screen 3 and shown read-only on Screen 4; company costs cover everything else.</li>
            <li>Switch the projection period (3–10 years) and currency (USD, EUR, INR) at the top. Exchange rates are in Settings.</li>
          </ul>
          <div style={{ marginTop: 14 }}>
            <button className="cta" type="button" onClick={() => go('revenue')}>
              Start with Revenue Assumptions →
            </button>
          </div>
        </Card>
      </div>
    </>
  )
}
