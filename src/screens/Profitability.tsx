import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useStore } from '../state/store'
import { runSensitivity } from '../model/sensitivity'
import { Card, Kpi, NextStep, Note, Row, Takeaways, Val, YearHead, useFmt } from '../ui/components'
import { BAD, ChartLegend, NEUTRAL, SERIES, axisStyle, gridStyle, useChartFmt } from '../ui/charts'
import { fmtMoneyCompact, fmtNum, fmtPct, fmtYears } from '../ui/format'
import type { ScreenId } from '../App'

export function Profitability({ go }: { go: (id: ScreenId) => void }) {
  const { model: m, inputs, period, currency, fx } = useStore()
  const f = useFmt()
  const cf = useChartFmt()
  const years = m.years
  const N = years.length
  const last = N - 1
  const T = m.pl.totals
  const compact = (v: number) => fmtMoneyCompact(v, currency, fx[currency])
  const sens = useMemo(() => runSensitivity(inputs, period), [inputs, period])

  // Waterfall: each step is a [low, high] range.
  const steps = (() => {
    const out: { name: string; range: [number, number]; color: string; value: number }[] = []
    let level = 0
    const push = (name: string, delta: number, color: string) => {
      const next = level + delta
      out.push({ name, range: [Math.min(level, next), Math.max(level, next)].map(cf.axisM) as [number, number], color, value: delta })
      level = next
    }
    push('Revenue', T.revenue, SERIES[0])
    push('Cost of rev.', -T.cogs, NEUTRAL)
    push('Opex', -T.opex, NEUTRAL)
    push('D&A', -T.da, NEUTRAL)
    push('Tax', -T.tax, NEUTRAL)
    out.push({ name: 'Net profit', range: [Math.min(0, cf.axisM(T.netIncome)), Math.max(0, cf.axisM(T.netIncome))], color: T.netIncome >= 0 ? SERIES[0] : BAD, value: T.netIncome })
    return out
  })()

  const annual = years.map((y, t) => ({ year: y, Revenue: cf.axisM(m.pl.revenue[t]), EBITDA: cf.axisM(m.pl.ebitda[t]), 'Net profit': cf.axisM(m.pl.netIncome[t]) }))
  const margins = years.map((y, t) => ({ year: y, 'Gross margin': m.pl.grossMargin[t] * 100, 'EBITDA margin': m.pl.ebitdaMargin[t] * 100 }))
  const sensData = sens.map((s) => ({ name: s.label, '+20%': cf.axisM(s.high), Base: cf.axisM(s.base), '−20%': cf.axisM(s.low) }))
  const uk = Array.from({ length: m.unit.years }, (_, k) => k)
  const sumS = (arr: number[]) => arr.reduce((a, b) => a + b, 0)
  const breakevenYear = m.pl.breakevenIndex === null ? null : years[m.pl.breakevenIndex]
  const cacPaybacks = m.unit.cacPaybackMonthsByYear.filter((v) => Number.isFinite(v))
  const cacPayback = cacPaybacks.length ? sumS(cacPaybacks) / cacPaybacks.length : NaN
  const mostSensitive = [...sens].sort((a, b) => Math.abs(b.high - b.low) - Math.abs(a.high - a.low))[0]
  const mLabel = (v: unknown) => `${f.sym}${Number(v).toFixed(1)}M`
  const pctLabel = (v: unknown) => `${Number(v).toFixed(0)}%`

  return (
    <>
      <div className="grid c6">
        <Kpi label={`Total revenue (${N}Y)`} value={compact(T.revenue)} sub={`${f.sym}${f.m(m.pl.revenue[last])}M in ${years[last]}`} />
        <Kpi label={`Gross profit (${N}Y)`} value={compact(T.grossProfit)} sub={`${fmtPct(T.revenue ? T.grossProfit / T.revenue : 0)} margin`} />
        <Kpi label={`EBITDA (${N}Y)`} value={compact(T.ebitda)} sub={`${fmtPct(T.revenue ? T.ebitda / T.revenue : 0)} margin`} tone={T.ebitda < 0 ? 'bad' : undefined} />
        <Kpi label={`Net profit (${N}Y)`} value={compact(T.netIncome)} sub={`${fmtPct(T.revenue ? T.netIncome / T.revenue : 0)} margin`} tone={T.netIncome < 0 ? 'bad' : undefined} />
        <Kpi label="Payback period" value={fmtYears(m.cash.cashPaybackYears)} sub="Cumulative cash flow turns positive" hint="Years from the start of the projection until cumulative free cash flow (before funding) is positive." />
        <Kpi label="Breakeven year" value={breakevenYear ? `Year ${m.pl.breakevenIndex! + 1}` : 'Not reached'} sub={breakevenYear ? `(${breakevenYear}) EBITDA positive` : `within ${N} years`} hint="First year in which EBITDA is zero or positive." />
      </div>

      <div className="grid c2">
        <Card n={1} title="Customer Unit Economics" subtitle={`Profitability per customer over a ${m.unit.years}-year lifecycle (${f.currency}).`}>
          <table className="compact">
            <thead>
              <tr>
                <th className="left"></th>
                {uk.map((k) => (
                  <th key={k}>Year {k + 1}</th>
                ))}
                <th>Total ({m.unit.years}Y)</th>
              </tr>
            </thead>
            <tbody>
              <Row label="Implementation fee" values={m.unit.implementationFee} kind="money" total className="linked" dash />
              <Row label="Platform subscription" values={m.unit.platformRevenue} kind="money" total className="linked" dash />
              <Row label="Additional use cases" values={m.unit.useCaseRevenue} kind="money" total className="linked" dash />
              <Row label="Managed services (attach-weighted)" values={m.unit.managedRevenue} kind="money" total className="linked" dash />
              <Row label="Total revenue per customer" values={m.unit.totalRevenue} kind="money" total bold />
              <Row label="Implementation cost" values={m.unit.implementationCost} kind="money" total className="linked" dash />
              <Row label="Additional use case delivery" values={m.unit.addlUseCaseCost} kind="money" total className="linked" dash />
              <Row label="Recurring service cost" values={m.unit.recurringCost} kind="money" total className="linked" />
              <Row label="Total cost per customer" values={m.unit.totalCost} kind="money" total bold />
              <Row label="Gross profit per customer" values={m.unit.grossProfit} kind="money" total bold />
              <Row label="Gross margin" values={m.unit.grossMargin} kind="pct" total totalValue={sumS(m.unit.grossProfit) / sumS(m.unit.totalRevenue)} />
            </tbody>
          </table>
          <Note>
            Shown for a retained customer at Year 1 cost. Weighted by retention ({inputs.revenue.contractTerm}-year term, then {fmtPct(inputs.revenue.retentionRate)} a year), lifetime gross profit is <b>{f.sym}{f.money(m.unit.ltv)}</b> per customer.
          </Note>
        </Card>

        <Card n={2} title={<>Company Profitability <span className="muted">({f.mUnit})</span></>} subtitle="Total revenue, costs and profit over the projection period.">
          <table className="compact">
            <YearHead years={years} first="" total={`Total (${N}Y)`} />
            <tbody>
              <Row label="Implementation revenue" values={m.rev.implementation} total className="linked" />
              <Row label="Recurring revenue" values={years.map((_, t) => m.rev.total[t] - m.rev.implementation[t])} total className="linked" />
              <Row label="Total revenue" values={m.pl.revenue} total bold />
              <Row label="Implementation cost" values={years.map((_, t) => m.pl.cogsImpl[t] + m.pl.cogsAddl[t])} total className="linked" />
              <Row label="Recurring service cost" values={m.pl.cogsRecurring} total className="linked" />
              <Row label="Gross profit" values={m.pl.grossProfit} total bold />
              <Row label="Gross margin" values={m.pl.grossMargin} kind="pct" total totalValue={T.revenue ? T.grossProfit / T.revenue : 0} />
              <Row label="Operating expenses (from Screen 4)" values={m.pl.opex} total className="linked" />
              <Row label="EBITDA" values={m.pl.ebitda} total bold />
              <Row label="EBITDA margin" values={m.pl.ebitdaMargin} kind="pct" total totalValue={T.revenue ? T.ebitda / T.revenue : 0} />
              <Row label="Depreciation (capex, Screen 6)" values={m.pl.da} total className="linked" />
              <Row label={`Tax (${fmtPct(inputs.company.taxRate)}, with loss carry-forward)`} values={m.pl.tax} total />
              <Row label="Net profit (after tax)" values={m.pl.netIncome} total bold />
              <Row label="Net margin" values={m.pl.netMargin} kind="pct" total totalValue={T.revenue ? T.netIncome / T.revenue : 0} />
            </tbody>
          </table>
        </Card>
      </div>

      <div className="grid c3">
        <Card n={3} title={<>Revenue and Profit Bridge <span className="muted">({f.mUnit})</span></>} subtitle={`From revenue to net profit over ${N} years.`}>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={steps} margin={{ top: 22, right: 8, left: -10, bottom: 4 }}>
              <CartesianGrid vertical={false} {...gridStyle} />
              <XAxis dataKey="name" tick={{ ...axisStyle, fontSize: 10.5 }} axisLine={false} tickLine={false} interval={0} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
              <Tooltip formatter={(_, __, item) => `${f.sym}${f.m((item.payload as { value: number }).value)}M`} />
              <Bar isAnimationActive={false} dataKey="range" radius={[4, 4, 0, 0]}>
                {steps.map((s) => (
                  <Cell key={s.name} fill={s.color} />
                ))}
                <LabelList dataKey="value" position="top" formatter={(v) => f.m(Number(v))} style={{ fontSize: 11.5, fontWeight: 700, fill: '#0f172a' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card n={4} title={<>Annual P&amp;L <span className="muted">({f.mUnit})</span></>}>
          <ChartLegend items={[{ label: 'Revenue', color: SERIES[0] }, { label: 'EBITDA', color: SERIES[1] }, { label: 'Net profit', color: SERIES[2] }]} />
          <ResponsiveContainer width="100%" height={230}>
            <ComposedChart data={annual} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid vertical={false} {...gridStyle} />
              <XAxis dataKey="year" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
              <Tooltip formatter={mLabel} />
              <Bar isAnimationActive={false} dataKey="Revenue" fill={SERIES[0]} radius={[4, 4, 0, 0]}>
                <LabelList dataKey="Revenue" position="top" formatter={(v) => Number(v).toFixed(1)} style={{ fontSize: 11, fontWeight: 600, fill: '#0f172a' }} />
              </Bar>
              <Bar isAnimationActive={false} dataKey="EBITDA" fill={SERIES[1]} radius={[4, 4, 0, 0]} />
              <Line isAnimationActive={false} dataKey="Net profit" stroke={SERIES[2]} strokeWidth={2} dot={{ r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>

        <Card n={5} title="Margin Trend">
          <ChartLegend items={[{ label: 'Gross margin', color: SERIES[0] }, { label: 'EBITDA margin', color: SERIES[1] }]} />
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={margins} margin={{ top: 16, right: 16, left: -10, bottom: 0 }}>
              <CartesianGrid vertical={false} {...gridStyle} />
              <XAxis dataKey="year" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} unit="%" />
              <Tooltip formatter={pctLabel} />
              <Line isAnimationActive={false} dataKey="Gross margin" stroke={SERIES[0]} strokeWidth={2} dot={{ r: 4 }}>
                <LabelList dataKey="Gross margin" position="top" formatter={pctLabel} style={{ fontSize: 11, fill: '#0f172a' }} />
              </Line>
              <Line isAnimationActive={false} dataKey="EBITDA margin" stroke={SERIES[1]} strokeWidth={2} dot={{ r: 4 }}>
                <LabelList dataKey="EBITDA margin" position="bottom" formatter={pctLabel} style={{ fontSize: 11, fill: '#0f172a' }} />
              </Line>
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid c3">
        <Card n={6} title="Key Unit Metrics">
          <table className="compact">
            <YearHead years={years} first="" />
            <tbody>
              <Row label="New customers" values={m.rev.newCustomers} kind="int" className="linked" />
              <Row label="Active customers (end of year)" values={m.rev.active} kind="int" className="linked" />
              <Row label={`Revenue per active customer (${f.kUnit})`} values={m.rev.avgPerCustomer} kind="moneyK" />
              <Row label={`CAC per new customer (${f.kUnit})`} values={m.unit.cacByYear} kind="moneyK" />
              <Row label="CAC payback (months of recurring gross profit)" values={m.unit.cacPaybackMonthsByYear} kind="number" decimals={1} />
              <tr>
                <td className="left">LTV / CAC ({m.unit.years}-year)</td>
                <Val v={m.unit.ltvToCac} kind="x" />
                {years.slice(1).map((y) => (
                  <td key={y} className="calc" />
                ))}
              </tr>
            </tbody>
          </table>
          <p className="table-note">CAC = Sales &amp; Marketing people cost plus marketing &amp; brand spend (Screen 4) ÷ new customers. Payback = months of first-year recurring gross profit per customer (implementation fee excluded) to recover CAC.</p>
        </Card>

        <Card n={7} title={<>Sensitivity Analysis <span className="muted">({N}Y net profit, {f.mUnit})</span></>} subtitle="Impact of ±20% on each driver, everything else unchanged.">
          <ChartLegend items={[{ label: '+20%', color: SERIES[0] }, { label: 'Base', color: SERIES[1] }, { label: '−20%', color: SERIES[3] }]} />
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={sensData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }} barCategoryGap={6} barGap={1}>
              <CartesianGrid horizontal={false} {...gridStyle} />
              <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={165} tick={{ ...axisStyle, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={mLabel} />
              <Bar isAnimationActive={false} dataKey="+20%" fill={SERIES[0]} radius={[0, 3, 3, 0]} />
              <Bar isAnimationActive={false} dataKey="Base" fill={SERIES[1]} radius={[0, 3, 3, 0]} />
              <Bar isAnimationActive={false} dataKey="−20%" fill={SERIES[3]} radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Takeaways
            n={8}
            items={[
              <>Five-year revenue of <b>{compact(T.revenue)}</b> converts to {compact(T.grossProfit)} gross profit ({fmtPct(T.revenue ? T.grossProfit / T.revenue : 0)}), {compact(T.ebitda)} EBITDA ({fmtPct(T.revenue ? T.ebitda / T.revenue : 0)}) and {compact(T.netIncome)} net profit ({fmtPct(T.revenue ? T.netIncome / T.revenue : 0)}).</>,
              <>Margins expand every year: gross margin from {fmtPct(m.pl.grossMargin[0])} to {fmtPct(m.pl.grossMargin[last])}, EBITDA margin from {fmtPct(m.pl.ebitdaMargin[0])} to {fmtPct(m.pl.ebitdaMargin[last])}.</>,
              <>{breakevenYear ? `EBITDA turns positive in ${breakevenYear} (Year ${m.pl.breakevenIndex! + 1}) and cumulative cash flow turns positive after ${fmtYears(m.cash.cashPaybackYears)}.` : `EBITDA does not turn positive within ${N} years.`}</>,
              <>Unit economics are strong: {fmtPct(sumS(m.unit.grossProfit) / sumS(m.unit.totalRevenue))} gross margin per customer over {m.unit.years} years, LTV/CAC of {fmtNum(m.unit.ltvToCac, 1)}x and CAC payback of about {fmtNum(cacPayback, 0)} months.</>,
              <>Net profit is most sensitive to <b>{mostSensitive?.label.toLowerCase()}</b>: a ±20% change moves {N}-year net profit by about {f.sym}{f.m(Math.abs(mostSensitive.high - mostSensitive.low) / 2)}M.</>,
          ]}
          />
          <NextStep title="Go to Cash Flow & Funding Needs" text="Convert the P&L into cash with payment terms, investment and funding." label="Continue" onClick={() => go('cash')} />
        </div>
      </div>
    </>
  )
}
