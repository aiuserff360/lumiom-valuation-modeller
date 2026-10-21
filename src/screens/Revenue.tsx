import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useStore } from '../state/store'
import { SCENARIO_LABELS } from '../model/types'
import { Card, InCell, NextStep, Note, Row, SelectInput, Takeaways, Val, YearHead, useFmt } from '../ui/components'
import { ChartLegend, SERIES, axisStyle, gridStyle, useChartFmt } from '../ui/charts'
import { fmtInt, fmtPct } from '../ui/format'
import type { ScreenId } from '../App'

export function Revenue({ go }: { go: (id: ScreenId) => void }) {
  const { model: m, inputs, scenario } = useStore()
  const f = useFmt()
  const cf = useChartFmt()
  const R = inputs.revenue
  const years = m.years
  const last = years.length - 1

  const chartData = years.map((y, t) => ({
    year: y,
    'Platform subscription': cf.axisM(m.rev.platform[t]),
    'Additional use cases': cf.axisM(m.rev.useCase[t]),
    Implementation: cf.axisM(m.rev.implementation[t]),
    'Managed services': cf.axisM(m.rev.managed[t]),
    total: cf.axisM(m.rev.total[t]),
  }))
  const arpc = years.map((y, t) => ({ year: y, value: (m.rev.avgPerCustomer[t] * f.rate) / 1000 }))
  const billingOptions = [
    { value: 'recurring', label: 'Recurring (Annual)' },
    { value: 'one-time', label: 'One-time' },
  ]
  const totalSigned = m.rev.newCustomers.reduce((a, b) => a + b, 0)
  const recurringShare = m.rev.recurringTotal[last] / (m.rev.total[last] || 1)
  const cagr = last > 0 && m.rev.total[0] > 0 ? Math.pow(m.rev.total[last] / m.rev.total[0], 1 / last) - 1 : NaN
  const mLabel = (v: unknown) => `${f.sym}${Number(v).toFixed(1)}M`
  const kLabel = (v: unknown) => `${f.sym}${fmtInt(Number(v))}K`

  return (
    <>
      <div className="grid c3">
        <Card n={1} title="Customer Acquisition Plan" subtitle="Number of new customers to be signed each year.">
          <table>
            <thead>
              <tr>
                <th className="left">Year</th>
                <th>New customers</th>
                <th className="wrap">Total active customers (end of year)</th>
              </tr>
            </thead>
            <tbody>
              {years.map((y, t) => (
                <tr key={y}>
                  <td className="left">{y}</td>
                  <InCell path={`revenue.newCustomers.${t}`} kind="int" min={0} width={110} />
                  <Val v={m.rev.active[t]} kind="int" />
                </tr>
              ))}
              <tr className="total">
                <td className="left">Total signed</td>
                <Val v={totalSigned} kind="int" bold />
                <td className="calc" />
              </tr>
            </tbody>
          </table>
          <Note>
            Customers stay for the full contract term, then the annual retention rate applies.
            {scenario !== 'base' && ` ${SCENARIO_LABELS[scenario]} case: new customers are scaled from the base case.`}
          </Note>
        </Card>

        <Card n={2} title="Pricing per Customer" subtitle="Define contract values for each component.">
          <table>
            <thead>
              <tr>
                <th className="left">Component</th>
                <th>Price ({f.currency})</th>
                <th className="left">Billing nature</th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ['platform', 'Platform subscription', 'per customer per year'],
                  ['implementation', 'Implementation / FDE', 'per deployment'],
                  ['useCase', 'Additional use case', 'per use case per year'],
                  ['managed', 'Managed services', 'per customer per year'],
                ] as const
              ).map(([key, label, unit]) => (
                <tr key={key}>
                  <td className="left">
                    {label}
                    <span className="sub">({unit})</span>
                  </td>
                  <InCell path={`revenue.pricing.${key}.price`} kind="money" min={0} width={100} />
                  <td className="in">
                    <SelectInput path={`revenue.pricing.${key}.billing`} options={billingOptions} width={150} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Note>Recurring components are charged to every active customer each year. One-time components are charged at signing and recognised over the recognition period.</Note>
        </Card>

        <Card n={3} title="Other Assumptions" subtitle="Customer lifecycle and expansion assumptions.">
          <table>
            <tbody>
              <tr>
                <td className="left wrap">Average contract term (years)</td>
                <InCell path="revenue.contractTerm" kind="int" min={1} max={10} width={96} />
              </tr>
              <tr>
                <td className="left wrap">Customer retention rate (annual, after initial term)</td>
                <InCell path="revenue.retentionRate" kind="pct" min={0} max={1} width={96} />
              </tr>
              <tr>
                <td className="left wrap">
                  Average additional use cases per customer
                  <span className="sub">(over the ramp-up period)</span>
                </td>
                <InCell path="revenue.addlUseCases" kind="number" decimals={1} min={0} width={96} />
              </tr>
              <tr>
                <td className="left wrap">Use case ramp-up period (years)</td>
                <InCell path="revenue.useCaseRampYears" kind="int" min={1} max={10} width={96} />
              </tr>
              <tr>
                <td className="left wrap">
                  Annual expansion rate
                  <span className="sub">(existing customers)</span>
                </td>
                <InCell path="revenue.expansionRate" kind="pct" decimals={1} min={-1} max={2} width={96} />
              </tr>
              <tr>
                <td className="left wrap">Managed services attach rate</td>
                <InCell path="revenue.managedAttach" kind="pct" min={0} max={1} width={96} />
              </tr>
              <tr>
                <td className="left wrap">Implementation revenue recognition period (months)</td>
                <InCell path="revenue.recognitionMonths" kind="int" min={0} max={36} width={96} />
              </tr>
            </tbody>
          </table>
          <Note>
            With a {R.recognitionMonths}-month recognition period, {fmtPct(m.rev.recFrac[0])} of a one-time fee is recognised in the signing year. Expansion applies to platform and managed services fees by customer tenure.
          </Note>
        </Card>
      </div>

      <div className="grid c2">
        <Card
          title={
            <>
              Revenue Forecast <span className="muted">({SCENARIO_LABELS[scenario]} Case)</span>
            </>
          }
          subtitle={`Projected revenue by component (${f.mUnit}).`}
        >
          <ChartLegend items={[{ label: 'Platform subscription', color: SERIES[0] }, { label: 'Additional use cases', color: SERIES[1] }, { label: 'Implementation', color: SERIES[2] }, { label: 'Managed services', color: SERIES[3] }]} />
          <ResponsiveContainer width="100%" height={270}>
            <BarChart data={chartData} margin={{ top: 24, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid vertical={false} {...gridStyle} />
              <XAxis dataKey="year" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
              <Tooltip formatter={mLabel} />
              <Bar isAnimationActive={false} dataKey="Platform subscription" stackId="a" fill={SERIES[0]} />
              <Bar isAnimationActive={false} dataKey="Additional use cases" stackId="a" fill={SERIES[1]} />
              <Bar isAnimationActive={false} dataKey="Implementation" stackId="a" fill={SERIES[2]} />
              <Bar isAnimationActive={false} dataKey="Managed services" stackId="a" fill={SERIES[3]} radius={[4, 4, 0, 0]}>
                <LabelList dataKey="total" position="top" formatter={mLabel} style={{ fontSize: 12, fontWeight: 700, fill: '#0f172a' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title={<>Revenue by Component <span className="muted">({f.mUnit})</span></>} subtitle="Recognised revenue by year.">
          <table>
            <YearHead years={years} first="Component" total="Total" />
            <tbody>
              <Row label="Platform subscription" values={m.rev.platform} total />
              <Row label="Additional use cases" values={m.rev.useCase} total />
              <Row label="Implementation" values={m.rev.implementation} total />
              <Row label="Managed services" values={m.rev.managed} total />
              <Row label="Total Revenue" values={m.rev.total} total bold />
              <Row label="of which recurring" values={m.rev.recurringTotal} total indent />
              <Row label="Year-on-year growth" values={years.map((_, t) => (t === 0 ? NaN : m.rev.total[t] / m.rev.total[t - 1] - 1))} kind="pct" indent />
            </tbody>
          </table>
        </Card>
      </div>

      <div className="grid c3">
        <Card className="span2" title={<>Customer Cohort View <span className="muted">({SCENARIO_LABELS[scenario]} Case)</span></>} subtitle="Active customers by year of signing.">
          <table>
            <thead>
              <tr>
                <th className="left" rowSpan={2} style={{ verticalAlign: 'bottom' }}>
                  Sign year
                </th>
                <th className="group" colSpan={years.length}>
                  Customers active in year
                </th>
                <th rowSpan={2} style={{ verticalAlign: 'bottom' }}>
                  Total
                </th>
              </tr>
              <tr>
                {years.map((y) => (
                  <th key={y}>{y}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {years.map((sy, s) => (
                <tr key={sy}>
                  <td className="left">{sy}</td>
                  {years.map((_, t) => (
                    <td key={t} className={`num ${t < s ? 'plain muted' : 'calc'}`}>
                      {t < s ? '–' : fmtInt(m.rev.cohort[s][t])}
                    </td>
                  ))}
                  <Val v={m.rev.newCustomers[s]} kind="int" bold />
                </tr>
              ))}
              <tr className="total">
                <td className="left">Total active customers</td>
                {m.rev.active.map((v, t) => (
                  <Val key={t} v={v} kind="int" bold />
                ))}
                <Val v={totalSigned} kind="int" bold />
              </tr>
              <tr>
                <td className="left">Active use cases (first use case + additional)</td>
                {m.rev.activeUseCases.map((v, t) => (
                  <Val key={t} v={v} kind="number" decimals={1} />
                ))}
                <td className="calc" />
              </tr>
            </tbody>
          </table>
        </Card>

        <Card title="Average Revenue per Customer" subtitle={`Total revenue per active customer (${f.kUnit}).`}>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={arpc} margin={{ top: 24, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid vertical={false} {...gridStyle} />
              <XAxis dataKey="year" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
              <Tooltip formatter={kLabel} />
              <Bar isAnimationActive={false} dataKey="value" name="Revenue per customer" fill={SERIES[0]} radius={[4, 4, 0, 0]}>
                <LabelList dataKey="value" position="top" formatter={kLabel} style={{ fontSize: 12, fontWeight: 700, fill: '#0f172a' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid c3">
        <Takeaways
          className="span2"
          items={[
            <>Revenue grows from {f.sym}{f.m(m.rev.total[0])}M in {years[0]} to <b>{f.sym}{f.m(m.rev.total[last])}M</b> in {years[last]}, a {fmtPct(cagr)} CAGR and {f.sym}{f.m(m.pl.totals.revenue)}M in total over {years.length} years.</>,
            <>The customer base grows from {m.rev.active[0]} to <b>{m.rev.active[last]}</b> active customers; {totalSigned} are signed over the period and {fmtPct(R.retentionRate)} renew each year after the {R.contractTerm}-year term.</>,
            <>By {years[last]}, <b>{fmtPct(recurringShare)}</b> of revenue is recurring (platform, use cases and managed services), up from {fmtPct(m.rev.recurringTotal[0] / (m.rev.total[0] || 1))} in {years[0]}.</>,
            <>Each active customer generates {f.sym}{f.k(m.rev.avgPerCustomer[last])}K in {years[last]}, driven by {fmtPct(R.expansionRate)} annual expansion and {R.addlUseCases.toFixed(1)} additional use cases per customer.</>,
            <>Implementation fees of {f.sym}{f.m(m.rev.implementation.reduce((a, b) => a + b, 0))}M are recognised over {R.recognitionMonths} months from signing, so part of each year's signings is recognised in the following year.</>,
          ]}
        />
        <NextStep title="Go to Implementation & Unit Costs" text="Define the effort and cost to onboard each customer, implement use cases and service them." label="Continue" onClick={() => go('implementation')} />
      </div>
    </>
  )
}
