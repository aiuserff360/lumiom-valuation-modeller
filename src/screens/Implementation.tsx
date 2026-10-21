import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useStore } from '../state/store'
import { Card, InCell, KV, Kpi, NextStep, Note, SelectInput, Takeaways, Val, useFmt } from '../ui/components'
import { SERIES, axisStyle, gridStyle } from '../ui/charts'
import { fmtInt, fmtPct } from '../ui/format'
import type { ScreenId } from '../App'
import type { EffortLineOut } from '../model/engine'

export function Implementation({ go }: { go: (id: ScreenId) => void }) {
  const { model: m, inputs } = useStore()
  const f = useFmt()
  const R = inputs.revenue
  const years = m.years
  const last = years.length - 1
  const k = (v: number) => `${f.sym}${f.k(v)}K`
  const kLabel = (v: unknown) => `${f.sym}${fmtInt(Number(v))}K`
  const trend = [
    { name: 'First use case', value: (m.impl.useCase.total * f.rate) / 1000, fill: SERIES[0] },
    { name: 'Second use case', value: (m.impl.useCase.addlTotal * f.rate) / 1000, fill: SERIES[1] },
    { name: 'Subsequent use cases', value: (m.impl.useCase.addlTotal * f.rate) / 1000, fill: SERIES[1] },
  ]
  const basisOptions = [
    { value: 'perCustomer', label: 'Per customer' },
    { value: 'perUseCase', label: 'Per active use case' },
  ]
  const useCases = m.impl.recurring.useCasesAtFullRamp

  const EffortTable = ({ lines, pathBase, directLabel, totalLabel, total, labour, fte }: { lines: EffortLineOut[]; pathBase: string; directLabel: string; totalLabel: string; total: number; labour: number; fte: number }) => (
    <table className="compact">
      <thead>
        <tr>
          <th className="left" rowSpan={2} style={{ verticalAlign: 'bottom' }}>
            Cost component
          </th>
          <th className="group" colSpan={2}>
            Effort (FTE-months)
          </th>
          <th rowSpan={2} className="wrap" style={{ verticalAlign: 'bottom' }}>
            Monthly cost ({f.currency})
          </th>
          <th rowSpan={2} style={{ verticalAlign: 'bottom' }}>
            Cost ({f.currency})
          </th>
        </tr>
        <tr>
          <th>Role mix</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((l, i) => (
          <tr key={l.id}>
            <td className="left wrap">{l.label}</td>
            <td className="num muted">
              {l.role} ({inputs.implementation[pathBase === 'implementation.onboarding' ? 'onboarding' : 'useCase'].lines[i].fte.toFixed(1)})
            </td>
            <InCell path={`${pathBase}.lines.${i}.fteMonths`} kind="number" decimals={1} min={0} width={60} />
            <InCell path={`${pathBase}.lines.${i}.monthlyCost`} kind="money" min={0} width={84} />
            <Val v={l.cost} kind="money" />
          </tr>
        ))}
        <tr className="total">
          <td className="left">Total labour cost</td>
          <td className="calc" />
          <Val v={fte} kind="number" decimals={1} bold />
          <td className="calc" />
          <Val v={labour} kind="money" bold />
        </tr>
        <tr>
          <td className="left wrap" colSpan={4}>
            {directLabel}
          </td>
          <InCell path={`${pathBase}.directCosts`} kind="money" min={0} width={100} />
        </tr>
        <tr className="total">
          <td className="left" colSpan={4}>
            {totalLabel}
          </td>
          <Val v={total} kind="money" bold />
        </tr>
      </tbody>
    </table>
  )

  return (
    <>
      <div className="grid c5">
        <Kpi label="Total implementation cost" value={k(m.impl.lifecycleCostPerCustomer)} sub={`per customer, 1 + ${R.addlUseCases.toFixed(1)} use cases`} />
        <Kpi label="Average cost per use case" value={k(m.impl.avgCostPerUseCase)} sub="after reuse" />
        <Kpi label="Recurring service cost" value={k(m.impl.recurring.perCustomerAtFullRamp)} sub="per customer per year" />
        <Kpi label="Gross margin (implementation)" value={fmtPct(m.impl.implMargin)} sub={`${k(R.pricing.implementation.price)} fee vs ${k(m.impl.firstDeploymentCost)} cost`} tone={m.impl.implMargin < 0 ? 'bad' : undefined} />
        <Kpi label="Gross margin (recurring)" value={fmtPct(m.impl.recurringMargin)} sub={`${k(m.impl.recurringRevenuePerCustomer)} revenue per customer per year`} />
      </div>

      <div className="grid c2">
        <Card n={1} title={<>Enterprise Onboarding <span className="muted">(One-time per customer)</span></>} subtitle="Initial platform setup, data connectivity, security, ontology and core integrations.">
          <EffortTable lines={m.impl.onboarding.lines} pathBase="implementation.onboarding" directLabel="Direct costs (tools, cloud setup, external)" totalLabel="Total onboarding cost per customer" total={m.impl.onboarding.total} labour={m.impl.onboarding.labour} fte={m.impl.onboarding.fteMonths} />
        </Card>

        <Card n={2} title={<>Use Case Implementation <span className="muted">(Per use case)</span></>} subtitle="Model effort and cost for a typical use case. Reuse of assets reduces incremental effort for additional use cases.">
          <EffortTable lines={m.impl.useCase.lines} pathBase="implementation.useCase" directLabel="Direct costs (data access, tools, third-party)" totalLabel="Total cost per use case (first use case)" total={m.impl.useCase.total} labour={m.impl.useCase.labour} fte={m.impl.useCase.fteMonths} />
        </Card>
      </div>

      <div className="grid c3">
        <Card n={3} title="Reusability & Scaling Assumptions" subtitle="Define how effort and direct costs reduce for additional use cases within the same customer.">
          <table>
            <thead>
              <tr>
                <th className="left">Component</th>
                <th className="wrap">Reduction for additional use cases</th>
              </tr>
            </thead>
            <tbody>
              {m.impl.useCase.lines.map((l, i) => (
                <tr key={l.id}>
                  <td className="left wrap">{l.label}</td>
                  <InCell path={`implementation.useCase.lines.${i}.reusePct`} kind="pct" min={0} max={1} width={84} />
                </tr>
              ))}
              <tr>
                <td className="left">Direct costs</td>
                <InCell path="implementation.useCase.directReusePct" kind="pct" min={0} max={1} width={84} />
              </tr>
            </tbody>
          </table>
          <table style={{ marginTop: 12 }}>
            <tbody>
              <tr className="section">
                <td className="left" colSpan={2}>
                  Resulting cost per additional use case
                </td>
              </tr>
              <KV label={`Labour cost (${f.currency})`} v={m.impl.useCase.addlLabour} />
              <KV label={`Direct costs (${f.currency})`} v={m.impl.useCase.addlDirect} />
              <KV label="Total cost per additional use case" v={m.impl.useCase.addlTotal} bold />
              <KV label="Reduction vs. first use case" v={-m.impl.useCase.addlReduction} kind="pct" className="linked" />
            </tbody>
          </table>
        </Card>

        <Card n={5} title="Implementation Cost per Customer" subtitle={`Lifecycle delivery cost for a customer with 1 + ${R.addlUseCases.toFixed(1)} use cases, at Year 1 effort.`}>
          <table>
            <thead>
              <tr>
                <th className="left">Item</th>
                <th className="left">Formula / basis</th>
                <th>{f.currency}</th>
              </tr>
            </thead>
            <tbody>
              <KV label="Enterprise onboarding (one-time)" v={m.impl.onboarding.total} note="From Section 1" />
              <KV label="First use case" v={m.impl.useCase.total} note="From Section 2" />
              <KV label="Additional use cases" v={R.addlUseCases * m.impl.useCase.addlTotal} note={`${R.addlUseCases.toFixed(1)} × ${f.sym}${f.money(m.impl.useCase.addlTotal)}`} />
              <KV label="Total implementation cost" v={m.impl.lifecycleCostPerCustomer} bold note={`1 + ${R.addlUseCases.toFixed(1)} use cases`} />
            </tbody>
          </table>
          <table style={{ marginTop: 12 }}>
            <tbody>
              <tr className="section">
                <td className="left" colSpan={3}>
                  Implementation economics (first deployment)
                </td>
              </tr>
              <KV label="Implementation fee" v={R.pricing.implementation.price} className="linked" note="From Screen 2" />
              <KV label="First deployment cost (onboarding + first use case)" v={m.impl.firstDeploymentCost} note="Sections 1 + 2" />
              <KV label="Gross profit per implementation" v={R.pricing.implementation.price - m.impl.firstDeploymentCost} bold note="Fee − cost" />
              <KV label="Gross margin" v={m.impl.implMargin} kind="pct" bold note="Gross profit ÷ fee" />
            </tbody>
          </table>
        </Card>

        <Card n={6} title="Unit Cost Trend" subtitle={`Cost per additional use case reduces with reuse of assets (${f.kUnit}).`}>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={trend} margin={{ top: 24, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid vertical={false} {...gridStyle} />
              <XAxis dataKey="name" tick={{ ...axisStyle, fontSize: 11 }} axisLine={false} tickLine={false} interval={0} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
              <Tooltip formatter={kLabel} />
              <Bar isAnimationActive={false} dataKey="value" name="Cost per use case" radius={[4, 4, 0, 0]}>
                {trend.map((d) => (
                  <Cell key={d.name} fill={d.fill} />
                ))}
                <LabelList dataKey="value" position="top" formatter={kLabel} style={{ fontSize: 12, fontWeight: 700, fill: '#0f172a' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <table className="compact" style={{ marginTop: 8 }}>
            <tbody>
              <tr className="section">
                <td className="left" colSpan={2}>
                  Recurring unit economics (per customer per year, at full ramp)
                </td>
              </tr>
              <KV label="Total recurring revenue per customer" v={m.impl.recurringRevenuePerCustomer} className="linked" />
              <KV label="Recurring service cost per customer" v={m.impl.recurring.perCustomerAtFullRamp} />
              <KV label="Recurring gross profit per customer" v={m.impl.recurringGrossProfitPerCustomer} bold />
              <KV label="Recurring gross margin" v={m.impl.recurringMargin} kind="pct" bold />
            </tbody>
          </table>
        </Card>
      </div>

      <div className="grid c3">
        <Card className="span2" n={4} title={<>Recurring Service Costs <span className="muted">(Per customer per year)</span></>} subtitle="Ongoing platform infrastructure, AI inference, support and customer success. Scales with number of active use cases.">
          <table>
            <thead>
              <tr>
                <th className="left">Cost component</th>
                <th className="left">Basis</th>
                <th>Unit cost ({f.currency})</th>
                <th>Annual cost ({f.currency})</th>
              </tr>
            </thead>
            <tbody>
              {m.impl.recurring.lines.map((l, i) => (
                <tr key={l.id}>
                  <td className="left wrap">
                    {l.label}
                    <span className="sub">{l.basis === 'perCustomer' ? 'Fixed per customer' : `× ${useCases.toFixed(1)} use cases`}</span>
                  </td>
                  <td className="in">
                    <SelectInput path={`implementation.recurring.lines.${i}.basis`} options={basisOptions} width={160} />
                  </td>
                  <InCell path={`implementation.recurring.lines.${i}.unitCost`} kind="money" min={0} width={96} />
                  <Val v={l.annualAtFullRamp} kind="money" />
                </tr>
              ))}
              <tr className="total">
                <td className="left" colSpan={3}>
                  Total recurring cost per customer per year
                </td>
                <Val v={m.impl.recurring.perCustomerAtFullRamp} kind="money" bold />
              </tr>
            </tbody>
          </table>
          <Note>Per-use-case costs follow the use cases each customer has live (first plus additional as they ramp, from Screen 2). Dedicated per-customer support is costed here; the central customer success team is on Screen 4.</Note>
        </Card>

        <Card n={7} title={<>Deployment Effort Reduction <span className="muted">(Reuse over time)</span></>} subtitle="Labour effort improves as delivery assets mature. Direct costs are unchanged.">
          <table>
            <thead>
              <tr>
                <th className="left">Year</th>
                <th className="wrap">Effort reduction (vs. Year 1)</th>
                <th className="wrap">First deployment cost ({f.currency})</th>
                <th className="wrap">Additional use case cost ({f.currency})</th>
              </tr>
            </thead>
            <tbody>
              {years.map((y, t) => (
                <tr key={y}>
                  <td className="left">{y}</td>
                  <InCell path={`implementation.effortReduction.${t}`} kind="pct" min={0} max={0.9} width={84} />
                  <Val v={m.impl.byYear.implCostPerCustomer[t]} kind="money" />
                  <Val v={m.impl.byYear.addlUseCaseCost[t]} kind="money" />
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <div className="grid c3">
        <Takeaways
          className="span2"
          n={8}
          items={[
            <>Delivery cost is built from three parts: enterprise onboarding ({k(m.impl.onboarding.total)}), the first use case ({k(m.impl.useCase.total)}) and recurring servicing ({k(m.impl.recurring.perCustomerAtFullRamp)} per customer per year).</>,
            <>The {k(R.pricing.implementation.price)} implementation fee covers a {k(m.impl.firstDeploymentCost)} first deployment, a <b>{fmtPct(m.impl.implMargin)}</b> services margin.</>,
            <>Reuse of integrations, ontology and models cuts each additional use case to {k(m.impl.useCase.addlTotal)}, {fmtPct(m.impl.useCase.addlReduction)} below the first.</>,
            <>Servicing a customer costs {k(m.impl.recurring.perCustomerAtFullRamp)} a year against {k(m.impl.recurringRevenuePerCustomer)} of recurring revenue, a <b>{fmtPct(m.impl.recurringMargin)}</b> recurring gross margin.</>,
            <>Delivery effort falls {fmtPct(inputs.implementation.effortReduction[last] ?? 0)} by {years[last]} as assets mature, bringing the first deployment cost down to {k(m.impl.byYear.implCostPerCustomer[last])}.</>,
            <>Role effort and monthly costs set here size the delivery team shown on Screen 4; every other cost of the company is entered there.</>,
          ]}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card title="How this is used" flat>
            <ul className="takeaways">
              <li>Implementation fees and recurring revenue are defined in Revenue Assumptions (Screen 2).</li>
              <li>Role effort and monthly costs are defined here; they drive the delivery team shown read-only on Screen 4.</li>
              <li>Total costs flow into Unit Economics (Screen 5) and Cash Flow (Screen 6).</li>
            </ul>
          </Card>
          <NextStep title="Go to Company Cost Assumptions" text="Define your organization structure and operating costs to build the full financial model." label="Continue" onClick={() => go('company')} />
        </div>
      </div>
    </>
  )
}
