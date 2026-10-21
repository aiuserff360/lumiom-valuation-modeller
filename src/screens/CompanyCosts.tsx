import { Bar, BarChart, CartesianGrid, Cell, LabelList, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useStore } from '../state/store'
import { Card, InCell, KV, NextStep, Note, Row, Takeaways, Val, YearHead, useFmt } from '../ui/components'
import { ChartLegend, NEUTRAL, SERIES, axisStyle, gridStyle, useChartFmt } from '../ui/charts'
import { fmtInt, fmtPct } from '../ui/format'
import type { ScreenId } from '../App'

export function CompanyCosts({ go }: { go: (id: ScreenId) => void }) {
  const { model: m } = useStore()
  const f = useFmt()
  const cf = useChartFmt()
  const years = m.years
  const last = years.length - 1
  const C = m.company
  const mix = [
    { name: 'People costs', value: C.people[last], color: SERIES[0] },
    { name: 'Infrastructure & technology', value: C.infra[last], color: SERIES[1] },
    { name: 'Other operating expenses', value: C.other[last], color: NEUTRAL },
  ]
  const stack = years.map((y, t) => ({
    year: y,
    'People costs': cf.axisM(C.people[t]),
    'Infrastructure & technology': cf.axisM(C.infra[t]),
    'Other operating expenses': cf.axisM(C.other[t]),
    total: cf.axisM(C.total[t]),
  }))
  const totRev = m.pl.totals.revenue
  const sumS = (a: number[]) => a.reduce((x, y) => x + y, 0)

  return (
    <>
      <div className="grid c32">
        <Card n={1} title="Workforce Plan and People Costs" subtitle="Define headcount and fully loaded annual cost by function.">
          <table>
            <thead>
              <tr>
                <th className="left">Function</th>
                <th className="wrap">Avg. fully loaded annual cost ({f.currency})</th>
                {years.map((y) => (
                  <th key={y}>{y}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="left wrap">
                  Implementation Delivery (Consulting &amp; Engineering)
                  <span className="sub">Linked from Screen 3: required effort ÷ 12 months. Not editable here.</span>
                </td>
                <Val v={C.deliveryAvgCost} kind="money" className="linked" />
                {C.deliveryHeadcount.map((v, t) => (
                  <Val key={t} v={v} kind="int" className="linked" />
                ))}
              </tr>
              {C.functions.map((fn, i) => (
                <tr key={fn.id}>
                  <td className="left wrap">{fn.label}</td>
                  <InCell path={`company.workforce.${i}.avgCost`} kind="money" min={0} width={96} />
                  {years.map((_, t) => (
                    <InCell key={t} path={`company.workforce.${i}.headcount.${t}`} kind="int" min={0} width={56} />
                  ))}
                </tr>
              ))}
              <tr className="total">
                <td className="left">Total headcount</td>
                <td className="calc" />
                {C.headcountTotal.map((v, t) => (
                  <Val key={t} v={v} kind="int" bold />
                ))}
              </tr>
              <tr className="total">
                <td className="left">Total payroll ({f.mUnit})</td>
                <td className="calc" />
                {C.payroll.map((v, t) => (
                  <Val key={t} v={v} kind="moneyM" bold />
                ))}
              </tr>
              <tr>
                <td className="left indent">Less: implementation delivery, costed on Screen 3 (cost of revenue)</td>
                <td className="calc" />
                {C.deliveryCost.map((v, t) => (
                  <Val key={t} v={-v} kind="moneyM" className="linked" />
                ))}
              </tr>
              <tr className="total">
                <td className="left">People cost in company costs ({f.mUnit})</td>
                <td className="calc" />
                {C.people.map((v, t) => (
                  <Val key={t} v={v} kind="moneyM" bold />
                ))}
              </tr>
            </tbody>
          </table>
          <Note>
            Fully loaded cost includes salary, benefits and allocated overhead. The delivery team is determined by the implementation effort and customer plan on Screens 2 and 3 and is costed there as cost of revenue, so it is shown here for completeness but is not editable and is excluded from company costs. Screens 3 and 4 are mutually exclusive.
          </Note>
        </Card>

        <Card n={2} title="Delivery Capacity and Utilization" subtitle="Delivery team implied by implementation demand (from revenue plan and Screen 3).">
          <table>
            <thead>
              <tr>
                <th className="left">Metric</th>
                {years.map((y) => (
                  <th key={y}>{y}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <Row label="Required FTE-months (Screens 2 & 3)" values={C.requiredFteMonths} kind="int" className="linked" />
              <Row label="Delivery headcount (required ÷ 12, rounded up)" values={C.deliveryHeadcount} kind="int" bold />
              <Row label="Available FTE-months" values={C.availableFteMonths} kind="int" />
              <Row label="Utilization" values={C.utilization} kind="pct" bold />
              <Row label="Unallocated FTE-months (rounding)" values={C.unallocatedFteMonths} kind="int" />
              <Row label={`Delivery labour cost, in cost of revenue (${f.mUnit})`} values={C.deliveryCost} className="linked" />
            </tbody>
          </table>
          <Note>The delivery team scales with demand: new customers and use cases (Screen 2) multiplied by effort per deployment and monthly role costs (Screen 3). To change it, edit the effort, reuse or effort-reduction assumptions on Screen 3.</Note>
        </Card>
      </div>

      <div className="grid c2">
        <Card n={3} title="Infrastructure and Technology Costs" subtitle={`Core platform and technology infrastructure for operations (${f.mUnit}).`}>
          <table>
            <YearHead years={years} first="Cost item (annual)" />
            <tbody>
              {C.infraLines.map((l, i) => (
                <tr key={l.id}>
                  <td className="left wrap">{l.label}</td>
                  {years.map((_, t) => (
                    <InCell key={t} path={`company.infra.${i}.values.${t}`} kind="moneyM" min={0} width={62} />
                  ))}
                </tr>
              ))}
              <Row label={`Total infrastructure cost (${f.mUnit})`} values={C.infra} bold />
            </tbody>
          </table>
        </Card>

        <Card n={4} title="Other Operating Expenses" subtitle={`Non-people operating costs (${f.mUnit}).`}>
          <table>
            <YearHead years={years} first="Expense item (annual)" />
            <tbody>
              {C.opexLines.map((l, i) => (
                <tr key={l.id}>
                  <td className="left wrap">{l.label}</td>
                  {years.map((_, t) => (
                    <InCell key={t} path={`company.opex.${i}.values.${t}`} kind="moneyM" min={0} width={62} />
                  ))}
                </tr>
              ))}
              <Row label={`Total other operating expenses (${f.mUnit})`} values={C.other} bold />
            </tbody>
          </table>
        </Card>
      </div>

      <div className="grid c3">
        <Card n={5} title="Total Company Costs" subtitle="Summary of annual costs.">
          <table className="compact">
            <YearHead years={years} first="Cost category" />
            <tbody>
              <Row label="People costs" values={C.people} />
              <Row label="Infrastructure & technology" values={C.infra} />
              <Row label="Other operating expenses" values={C.other} />
              <Row label={`Total company costs (${f.mUnit})`} values={C.total} bold />
              <tr className="section">
                <td className="left" colSpan={years.length + 1}>
                  % of revenue
                </td>
              </tr>
              <Row label="People costs" values={C.pctOfRevenue.people} kind="pct" />
              <Row label="Infrastructure & technology" values={C.pctOfRevenue.infra} kind="pct" />
              <Row label="Other operating expenses" values={C.pctOfRevenue.other} kind="pct" />
              <Row label="Total company costs" values={C.pctOfRevenue.total} kind="pct" bold />
            </tbody>
          </table>
        </Card>

        <Card n={6} title={`Cost Mix in ${years[last]}`} subtitle="Share of total company costs.">
          <div className="donut-wrap">
            <PieChart width={200} height={200}>
              <Pie isAnimationActive={false} data={mix} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={2} stroke="#fff" strokeWidth={2}>
                {mix.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => `${f.sym}${f.m(Number(v))}M`} />
              <text x={100} y={94} textAnchor="middle" style={{ fontSize: 12, fill: '#64748b' }}>
                {f.currency}
              </text>
              <text x={100} y={114} textAnchor="middle" style={{ fontSize: 17, fontWeight: 700, fill: '#0b1a3a' }}>
                {f.m(C.total[last])}M
              </text>
            </PieChart>
            <ul className="donut-list">
              {mix.map((d) => (
                <li key={d.name}>
                  <i style={{ background: d.color }} />
                  {d.name}
                  <b>{fmtPct(C.total[last] ? d.value / C.total[last] : 0)}</b>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <Card n={7} title={`Total Company Costs (${f.mUnit})`}>
          <ChartLegend items={[{ label: 'People costs', color: SERIES[0] }, { label: 'Infrastructure & technology', color: SERIES[1] }, { label: 'Other operating expenses', color: NEUTRAL }]} />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stack} margin={{ top: 24, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid vertical={false} {...gridStyle} />
              <XAxis dataKey="year" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => `${f.sym}${Number(v).toFixed(1)}M`} />
              <Bar isAnimationActive={false} dataKey="People costs" stackId="a" fill={SERIES[0]} />
              <Bar isAnimationActive={false} dataKey="Infrastructure & technology" stackId="a" fill={SERIES[1]} />
              <Bar isAnimationActive={false} dataKey="Other operating expenses" stackId="a" fill={NEUTRAL} radius={[4, 4, 0, 0]}>
                <LabelList dataKey="total" position="top" formatter={(v) => Number(v).toFixed(1)} style={{ fontSize: 12, fontWeight: 700, fill: '#0f172a' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid c3">
        <Card n={8} title="Tax and Depreciation" subtitle="Used in the P&L on Screen 5.">
          <table>
            <tbody>
              <tr>
                <td className="left">Corporate tax rate</td>
                <InCell path="company.taxRate" kind="pct" min={0} max={0.6} width={96} />
              </tr>
              <tr>
                <td className="left">Capex depreciation period (years)</td>
                <InCell path="company.depreciationYears" kind="int" min={1} max={10} width={96} />
              </tr>
              <KV label={`Total company costs over ${years.length} years (${f.mUnit})`} v={sumS(C.total)} kind="moneyM" />
              <KV label="As % of revenue" v={totRev ? sumS(C.total) / totRev : 0} kind="pct" />
            </tbody>
          </table>
          <Note>Tax is charged on EBIT with full loss carry-forward. Capex (Screen 6) is depreciated straight-line from the year of spend.</Note>
        </Card>

        <Takeaways
          n={9}
          items={[
            <>Operating costs scale from {f.sym}{f.m(C.total[0])}M to <b>{f.sym}{f.m(C.total[last])}M</b> by {years[last]} while falling from {fmtPct(C.pctOfRevenue.total[0])} to {fmtPct(C.pctOfRevenue.total[last])} of revenue, a clear sign of operating leverage.</>,
            <>Total headcount reaches {fmtInt(C.headcountTotal[last])} by {years[last]}, including a {fmtInt(C.deliveryHeadcount[last])}-person delivery team sized to demand on Screen 3 and costed in cost of revenue.</>,
            <>People remain the largest line at {fmtPct(C.total[last] ? C.people[last] / C.total[last] : 0)} of company costs in {years[last]}; infrastructure is {fmtPct(C.total[last] ? C.infra[last] / C.total[last] : 0)} and other operating expenses {fmtPct(C.total[last] ? C.other[last] / C.total[last] : 0)}.</>,
          ]}
        />

        <NextStep title="Go to Profitability & Unit Economics" text="See the P&L, unit economics and sensitivity that result from these assumptions." label="Continue" onClick={() => go('profitability')} />
      </div>
    </>
  )
}
