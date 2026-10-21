import { Bar, CartesianGrid, ComposedChart, LabelList, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useStore } from '../state/store'
import { START_YEAR } from '../model/types'
import { Card, InCell, KV, Kpi, NextStep, Note, Row, SelectInput, Takeaways, Val, YearHead, useFmt } from '../ui/components'
import { BAD, ChartLegend, SERIES, axisStyle, gridStyle, useChartFmt } from '../ui/charts'
import { fmtMoneyCompact, fmtPct } from '../ui/format'
import type { ScreenId } from '../App'

export function CashFlow({ go }: { go: (id: ScreenId) => void }) {
  const { model: m, inputs, currency, fx } = useStore()
  const f = useFmt()
  const cf = useChartFmt()
  const years = m.years
  const N = years.length
  const last = N - 1
  const C = m.cash
  const F = inputs.valuation.funding
  const compact = (v: number) => fmtMoneyCompact(v, currency, fx[currency])
  const sumS = (a: number[]) => a.reduce((x, y) => x + y, 0)
  const totalIn = sumS(C.collections)
  const totalOut = sumS(C.outflow)
  const qLabel = (y: number, q: number) => `Q${q + 1} ${START_YEAR + y}`
  const yearOptions = Array.from({ length: N }, (_, i) => ({ value: i, label: String(START_YEAR + i) }))
  const quarterOptions = [0, 1, 2, 3].map((q) => ({ value: q, label: `Q${q + 1}` }))
  const annual = years.map((y, t) => ({ year: y, 'Annual cash flow': cf.axisM(C.fcf[t]), 'Cumulative cash balance': cf.axisM(C.preFundingCumulative[t]) }))
  const quarterly = C.quarterlyBalance.map((q) => ({ name: q.label, balance: cf.axisM(q.balance) }))
  const roundUsd = F.initialAmount * 1e6
  const shortfall = roundUsd < C.totalFundingNeed
  const mLabel = (v: unknown) => `${f.sym}${Number(v).toFixed(1)}M`
  const runwayValue = C.runwayMonths === null ? `${12 * N}+ months` : `${C.runwayMonths} months`
  const firstPositiveYear = C.fcf.findIndex((v) => v > 0)

  return (
    <>
      <div className="grid c6">
        <Kpi label={`Total cash inflow (${N}Y)`} value={compact(totalIn)} />
        <Kpi label={`Total cash outflow (${N}Y)`} value={compact(totalOut)} />
        <Kpi label={`Ending cash (${years[last]})`} value={compact(C.closing[last])} tone={C.closing[last] < 0 ? 'bad' : undefined} />
        <Kpi label="Peak funding need" value={compact(C.peakFundingNeed)} sub={`Deepest deficit in ${years[C.peakFundingIndex]}`} hint="Deepest cumulative cash deficit before any funding." />
        <Kpi label="Runway (from start)" value={runwayValue} sub={C.runwayMonths === null ? `Cash positive through ${years[last]}` : 'With planned funding'} tone={C.runwayMonths !== null ? 'bad' : undefined} />
        <Kpi label="Estimated funding round" value={compact(roundUsd)} sub={`(${qLabel(F.initialYearIndex, F.initialQuarter)}) · need ${compact(C.totalFundingNeed)}`} tone={shortfall ? 'bad' : undefined} />
      </div>

      <div className="grid c2">
        <Card n={1} title={<>Cash Inflows <span className="muted">({f.mUnit})</span></>} subtitle="Based on revenue assumptions and payment terms.">
          <table className="compact">
            <YearHead years={years} first="" total={`Total (${N}Y)`} />
            <tbody>
              <Row label="Implementation revenue" values={m.rev.implementation} total className="linked" />
              <Row label="Recurring revenue" values={years.map((_, t) => m.rev.total[t] - m.rev.implementation[t])} total className="linked" />
              <Row label="Total revenue (from Screen 5)" values={m.pl.revenue} total bold className="linked" />
              <Row label="Billings ahead of / (behind) recognised revenue" values={C.deferredChange} total />
              <Row label="Less: increase in receivables (collection lag)" values={C.receivablesChange.map((v) => -v)} total />
              <Row label="Total cash inflow (collections)" values={C.collections} total bold />
              <Row label="Collections as % of billings" values={years.map((_, t) => (m.rev.billings[t] ? C.collections[t] / m.rev.billings[t] : 0))} kind="pct" />
            </tbody>
          </table>
          <Note>
            One-time fees are billed {fmtPct(inputs.cash.upfrontPct)} at signing and the remainder on completion; recurring fees are billed in the year of service. With {inputs.cash.collectionDays}-day payment terms, {fmtPct(inputs.cash.collectionDays / 365)} of each year's billings are collected the following year.
          </Note>
        </Card>

        <Card n={2} title={<>Cash Outflows <span className="muted">({f.mUnit})</span></>} subtitle="Operating costs, delivery costs, tax and investment.">
          <table className="compact">
            <YearHead years={years} first="" total={`Total (${N}Y)`} />
            <tbody>
              <Row label="Implementation delivery costs (Screen 3)" values={years.map((_, t) => m.pl.cogsImpl[t] + m.pl.cogsAddl[t])} total className="linked" />
              <Row label="Recurring service costs (Screen 3)" values={m.pl.cogsRecurring} total className="linked" />
              <Row label="People costs (Screen 4)" values={m.company.people} total className="linked" />
              <Row label="Infrastructure & technology (Screen 4)" values={m.company.infra} total className="linked" />
              <Row label="Other operating expenses (Screen 4)" values={m.company.other} total className="linked" />
              <Row label="Corporate tax (Screen 5)" values={C.taxPaid} total className="linked" />
              <tr>
                <td className="left">Product &amp; technology investment (capex)</td>
                {years.map((_, t) => (
                  <InCell key={t} path={`cash.capex.${t}`} kind="moneyM" min={0} width={60} />
                ))}
                <Val v={sumS(C.capex)} bold />
              </tr>
              <Row label="Total cash outflow" values={C.outflow} total bold />
            </tbody>
          </table>
          <Note>Capex is a cash outflow in the year of spend and is depreciated over {inputs.company.depreciationYears} years in the P&amp;L (Screen 5).</Note>
        </Card>
      </div>

      <div className="grid c3">
        <Card n={3} title={<>Annual Cash Flow <span className="muted">({f.mUnit})</span></>}>
          <table className="compact">
            <YearHead years={years} first="" />
            <tbody>
              <Row label="Total cash inflow" values={C.collections} />
              <Row label="Total cash outflow" values={C.outflow.map((v) => -v)} />
              <Row label="Net cash flow" values={C.fcf} bold />
              <Row label="Opening cash balance" values={C.opening} />
              <Row label="Funding received" values={C.funding} className="linked" />
              <Row label="Closing cash balance" values={C.closing} bold />
            </tbody>
          </table>
          <Note>Funding of {compact(roundUsd)} is received in {qLabel(F.initialYearIndex, F.initialQuarter)}{F.futureAmount > 0 ? ` and ${compact(F.futureAmount * 1e6)} in ${qLabel(F.futureYearIndex, F.futureQuarter)}` : ''} (Section 5).</Note>
        </Card>

        <Card n={4} title={<>Cumulative Cash Balance <span className="muted">({f.mUnit})</span></>} subtitle="Before funding: the position the round must cover.">
          <ChartLegend items={[{ label: 'Annual cash flow', color: SERIES[1] }, { label: 'Cumulative cash balance', color: SERIES[0] }]} />
          <ResponsiveContainer width="100%" height={230}>
            <ComposedChart data={annual} margin={{ top: 16, right: 12, left: -10, bottom: 0 }}>
              <CartesianGrid vertical={false} {...gridStyle} />
              <XAxis dataKey="year" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
              <Tooltip formatter={mLabel} />
              <Bar isAnimationActive={false} dataKey="Annual cash flow" fill={SERIES[1]} radius={[4, 4, 0, 0]}>
                <LabelList dataKey="Annual cash flow" position="top" formatter={(v) => f.m(Number(v) * 1e6)} style={{ fontSize: 11, fill: '#0f172a' }} />
              </Bar>
              <Line isAnimationActive={false} dataKey="Cumulative cash balance" stroke={SERIES[0]} strokeWidth={2} dot={{ r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>

        <Card n={5} title={<>Funding Need and Use of Funds <span className="muted">({f.mUnit})</span></>}>
          <table className="compact">
            <tbody>
              <tr className="section">
                <td className="left" colSpan={2}>
                  Funding requirement
                </td>
              </tr>
              <KV label={`Peak cumulative deficit (${years[C.peakFundingIndex]})`} v={C.peakFundingNeed} kind="moneyM" />
              <KV label={`Minimum cash buffer (${inputs.cash.minBufferMonths} months)`} v={C.bufferNeed} kind="moneyM" />
              <KV label="Total funding need" v={C.totalFundingNeed} kind="moneyM" bold />
              <tr>
                <td className="left">Proposed round size</td>
                <InCell path="valuation.funding.initialAmount" kind="moneyM" min={0} width={96} />
              </tr>
              <tr>
                <td className="left">Expected timing</td>
                <td className="in num">
                  <span className="inline-inputs">
                    <SelectInput path="valuation.funding.initialQuarter" options={quarterOptions} width={64} />
                    <SelectInput path="valuation.funding.initialYearIndex" options={yearOptions} width={84} />
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
          <table className="compact" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th className="left">Use of funds ({N}Y)</th>
                <th>%</th>
                <th>{f.mUnit}</th>
              </tr>
            </thead>
            <tbody>
              {inputs.cash.useOfFunds.map((u, i) => (
                <tr key={u.id}>
                  <td className="left">{u.label}</td>
                  <InCell path={`cash.useOfFunds.${i}.pct`} kind="pct" min={0} max={1} width={66} />
                  <Val v={u.pct * roundUsd} />
                </tr>
              ))}
              <tr className="total">
                <td className="left">Total</td>
                <td className={`num bold ${Math.abs(C.useOfFundsTotalPct - 1) > 1e-6 ? 'neg' : ''}`}>{fmtPct(C.useOfFundsTotalPct)}</td>
                <Val v={C.useOfFundsTotalPct * roundUsd} bold />
              </tr>
            </tbody>
          </table>
          {shortfall && <Note tone="warn">The proposed round ({compact(roundUsd)}) is below the total funding need ({compact(C.totalFundingNeed)}).</Note>}
          {Math.abs(C.useOfFundsTotalPct - 1) > 1e-6 && <Note tone="warn">Use of funds should total 100%.</Note>}
        </Card>
      </div>

      <div className="grid c3">
        <Card n={6} title={<>Cash Runway <span className="muted">({f.mUnit})</span></>} subtitle="Quarterly cash balance including planned funding.">
          <ResponsiveContainer width="100%" height={230}>
            <ComposedChart data={quarterly} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
              <CartesianGrid vertical={false} {...gridStyle} />
              <XAxis dataKey="name" tick={{ ...axisStyle, fontSize: 10.5 }} axisLine={false} tickLine={false} interval={Math.max(0, Math.floor(quarterly.length / 8))} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
              <Tooltip formatter={mLabel} />
              <Line isAnimationActive={false} dataKey="balance" name="Cash balance" stroke={C.runwayMonths !== null ? BAD : SERIES[0]} strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
          <p className="table-note">
            {C.runwayMonths === null ? `Cash stays positive through ${years[last]} with the planned funding.` : `Cash runs out after ${C.runwayMonths} months even with the planned funding.`} Lowest quarterly balance {compact(Math.min(...C.quarterlyBalance.map((q) => q.balance)))}.
          </p>
        </Card>

        <Card n={7} title={<>Key Assumptions <span className="muted">(Editable)</span></>}>
          <table className="compact">
            <thead>
              <tr>
                <th className="left">Assumption</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="left">Customer payment terms (days)</td>
                <InCell path="cash.collectionDays" kind="int" min={0} max={365} width={96} />
              </tr>
              <tr>
                <td className="left">Upfront payment for implementation (% at signing)</td>
                <InCell path="cash.upfrontPct" kind="pct" min={0} max={1} width={96} />
              </tr>
              <tr>
                <td className="left">Implementation delivery period (months, Screen 2)</td>
                <Val v={inputs.revenue.recognitionMonths} kind="int" className="linked" />
              </tr>
              <tr>
                <td className="left">Initial cash balance ({f.mUnit})</td>
                <InCell path="cash.initialCash" kind="moneyM" min={0} width={96} />
              </tr>
              <tr>
                <td className="left">Minimum cash buffer (months)</td>
                <InCell path="cash.minBufferMonths" kind="int" min={0} max={24} width={96} />
              </tr>
              <tr>
                <td className="left">Proposed funding round size ({f.mUnit})</td>
                <InCell path="valuation.funding.initialAmount" kind="moneyM" min={0} width={96} />
              </tr>
            </tbody>
          </table>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Takeaways
            n={8}
            items={[
              <>The business needs <b>{compact(C.totalFundingNeed)}</b> of external funding: a peak cumulative deficit of {compact(C.peakFundingNeed)} in {years[C.peakFundingIndex]} plus a {inputs.cash.minBufferMonths}-month cash buffer.</>,
              <>{shortfall ? `The proposed ${compact(roundUsd)} round in ${qLabel(F.initialYearIndex, F.initialQuarter)} falls ${compact(C.totalFundingNeed - roundUsd)} short of that need.` : `The proposed ${compact(roundUsd)} round in ${qLabel(F.initialYearIndex, F.initialQuarter)} covers this with ${compact(roundUsd - C.totalFundingNeed)} to spare.`}</>,
              <>{C.cashPaybackYears === null ? `Cumulative cash flow stays negative through ${years[last]}.` : `Cumulative cash flow turns positive after ${C.cashPaybackYears.toFixed(1)} years; the company is self-funding from ${firstPositiveYear >= 0 ? years[firstPositiveYear] : years[last]}.`}</>,
              <>{C.runwayMonths === null ? `With the round, cash never falls below ${compact(Math.min(...C.quarterlyBalance.map((q) => q.balance)))} and runway extends beyond ${years[last]}.` : `Even with the round, cash runs out after ${C.runwayMonths} months.`}</>,
              <>{fmtPct((inputs.cash.useOfFunds[0]?.pct ?? 0) + (inputs.cash.useOfFunds[1]?.pct ?? 0))} of the round goes to {inputs.cash.useOfFunds[0]?.label.toLowerCase()} and {inputs.cash.useOfFunds[1]?.label.toLowerCase()}; ending cash in {years[last]} is {compact(C.closing[last])}.</>,
            ]}
          />
          <NextStep title="Go to Valuation & Investor Returns" text="Value the business on these cash flows and see investor returns." label="Continue" onClick={() => go('valuation')} />
        </div>
      </div>
    </>
  )
}
