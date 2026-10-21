import { useStore } from '../state/store'
import { APPROACH_LABELS, START_YEAR, type Approach } from '../model/types'
import { Card, InCell, KV, Kpi, NextStep, Note, Row, SelectInput, Takeaways, Val, YearHead, useFmt } from '../ui/components'
import { fmtMoneyCompact, fmtNum, fmtPct, fmtX } from '../ui/format'
import type { ScreenId } from '../App'

export function Valuation({ go }: { go: (id: ScreenId) => void }) {
  const { model: m, inputs, currency, fx } = useStore()
  const f = useFmt()
  const years = m.years
  const V = inputs.valuation
  const F = V.funding
  const sel = m.val.selected
  const inv = m.val.investor
  const compact = (v: number) => fmtMoneyCompact(v, currency, fx[currency])
  const yearOptions = years.map((y, i) => ({ value: i, label: String(y) }))
  const exitOptions = [{ value: -1, label: `End of period (${years[years.length - 1]})` }, ...yearOptions]
  const quarterOptions = [0, 1, 2, 3].map((q) => ({ value: q, label: `Q${q + 1}` }))
  const approachOptions = (Object.keys(APPROACH_LABELS) as Approach[]).map((a) => ({ value: a, label: APPROACH_LABELS[a] }))
  const qLabel = (y: number, q: number) => `Q${q + 1} ${START_YEAR + y}`
  const isDcf = V.approach.startsWith('dcf')
  const heat = (irr: number) => (!Number.isFinite(irr) ? 'calc' : irr >= 0 ? 'heat-pos' : 'heat-neg')
  const ok = sel.meaningful

  return (
    <>
      <div className="grid c5">
        <Kpi label={`Enterprise value at exit (${sel.exitYear})`} value={ok ? compact(sel.evAtExit) : 'n/m'} sub={sel.label} />
        <Kpi label="Equity value at exit" value={ok ? compact(sel.equityAtExit) : 'n/m'} sub={`EV + net cash ${compact(sel.netCashAtExit)}`} />
        <Kpi label="Enterprise value today" value={ok ? compact(sel.evToday) : 'n/m'} sub={`Discounted at ${fmtPct(V.discountRate, 1)}`} />
        <Kpi label="Investor money multiple" value={ok ? fmtX(inv.moneyMultiple) : 'n/m'} sub={`${compact(inv.initialAmount)} for ${fmtPct(inv.ownershipInitial, 1)}`} tone={ok && inv.moneyMultiple < 1 ? 'bad' : undefined} />
        <Kpi label="Investor IRR" value={ok ? fmtPct(inv.irr) : 'n/m'} sub={`${fmtNum(inv.holdingYears, 2)}-year hold`} tone={ok && inv.irr < 0 ? 'bad' : undefined} />
      </div>

      <div className="grid c2">
        <Card n={1} title="Exit Assumptions" subtitle="Define the basis for valuation at the end of the projection period.">
          <table>
            <thead>
              <tr>
                <th className="left">Input</th>
                <th>Value</th>
                <th className="left">Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="left">Exit year</td>
                <td className="in">
                  <SelectInput path="valuation.exitYearIndex" options={exitOptions} width={170} />
                </td>
                <td className="left sub">Last year of projection period by default</td>
              </tr>
              <tr>
                <td className="left">Valuation approach</td>
                <td className="in">
                  <SelectInput path="valuation.approach" options={approachOptions} width={170} />
                </td>
                <td className="left sub">Choose exit method; all four are compared in Section 4</td>
              </tr>
              <tr>
                <td className="left">Exit multiple – revenue (x)</td>
                <InCell path="valuation.revenueMultiple" kind="number" decimals={1} min={0} width={170} />
                <td className="left sub">Multiple on annual revenue in exit year</td>
              </tr>
              <tr>
                <td className="left">Exit multiple – EBITDA (x)</td>
                <InCell path="valuation.ebitdaMultiple" kind="number" decimals={1} min={0} width={170} />
                <td className="left sub">Multiple on EBITDA in exit year (also DCF terminal multiple)</td>
              </tr>
              <tr>
                <td className="left">Discount rate</td>
                <InCell path="valuation.discountRate" kind="pct" decimals={1} min={0.01} max={0.9} width={170} />
                <td className="left sub">Required return for present values and DCF</td>
              </tr>
              <tr>
                <td className="left">Terminal growth rate</td>
                <InCell path="valuation.terminalGrowth" kind="pct" decimals={1} min={-0.1} max={0.15} width={170} />
                <td className="left sub">Perpetual growth after exit year (DCF)</td>
              </tr>
              <tr>
                <td className="left">Exit discount to public comps</td>
                <InCell path="valuation.exitDiscount" kind="pct" min={0} max={0.9} width={170} />
                <td className="left sub">Optional (e.g., for private company)</td>
              </tr>
            </tbody>
          </table>
        </Card>

        <Card n={2} title="Funding Assumptions" subtitle="Round size and timing come from Screen 6; define the valuation terms here.">
          <table>
            <thead>
              <tr>
                <th className="left">Input</th>
                <th>Value</th>
                <th className="left">Notes</th>
              </tr>
            </thead>
            <tbody>
              <KV label={`Initial funding required (${f.mUnit})`} v={inv.initialAmount} kind="moneyM" className="linked" note={`From Screen 6 (need ${compact(m.cash.totalFundingNeed)})`} />
              <tr>
                <td className="left">Funding round timing</td>
                <td className="num linked">{qLabel(F.initialYearIndex, F.initialQuarter)}</td>
                <td className="left sub">From Screen 6</td>
              </tr>
              <tr>
                <td className="left">Pre-money valuation ({f.mUnit})</td>
                <InCell path="valuation.funding.preMoney" kind="moneyM" min={0} width={170} />
                <td className="left sub">Valuation before this round (post-money {compact(inv.postMoney * 1e6)})</td>
              </tr>
              <tr>
                <td className="left">Investor ownership (new)</td>
                <Val v={inv.ownershipInitial} kind="pct" decimals={1} />
                <td className="left sub">Equity issued in this round = round ÷ post-money</td>
              </tr>
              <tr>
                <td className="left">Future funding required ({f.mUnit})</td>
                <InCell path="valuation.funding.futureAmount" kind="moneyM" min={0} width={170} />
                <td className="left sub">Any additional funding after initial round (0 = none)</td>
              </tr>
              <tr>
                <td className="left">Future funding timing</td>
                <td className="in num">
                  <span className="inline-inputs">
                    <SelectInput path="valuation.funding.futureQuarter" options={quarterOptions} width={64} />
                    <SelectInput path="valuation.funding.futureYearIndex" options={yearOptions} width={100} />
                  </span>
                </td>
                <td className="left sub">If known; dilutes initial investors if before exit</td>
              </tr>
              <tr>
                <td className="left">Future round pre-money ({f.mUnit})</td>
                <InCell path="valuation.funding.futurePreMoney" kind="moneyM" min={0} width={170} />
                <td className="left sub">{F.futureAmount > 0 ? `New investors receive ${fmtPct(inv.futureOwnership, 1)}` : 'Only used if a future round is set'}</td>
              </tr>
            </tbody>
          </table>
        </Card>
      </div>

      <div className="grid c2">
        <Card n={3} title={<>Projected Financials <span className="muted">(from previous screens)</span></>} subtitle={`Key inputs from your model used for valuation (${f.mUnit}).`}>
          <table>
            <YearHead years={years} first="Metric" />
            <tbody>
              <Row label="Revenue" values={m.pl.revenue} className="linked" />
              <Row label="EBITDA" values={m.pl.ebitda} className="linked" />
              <Row label="Free cash flow (before funding)" values={m.cash.fcf} className="linked" />
              <Row label="Closing cash (after funding)" values={m.cash.closing} className="linked" />
              <Row label={`Discount factor at ${fmtPct(V.discountRate, 1)}`} values={m.val.discountFactors} kind="num2" decimals={3} />
              <Row label="Present value of free cash flow" values={years.map((_, t) => (t <= m.val.exitIndex ? m.val.pvFcf[t] : 0))} dash />
            </tbody>
          </table>
          <Note>These figures are linked from the Profitability (Screen 5) and Cash Flow &amp; Funding Needs (Screen 6) screens. Cash flows are discounted at end of year.</Note>
        </Card>

        <Card n={4} title="Implied Valuation at Exit" subtitle="Enterprise value and equity value based on exit assumptions.">
          <table className="compact">
            <tbody>
              <tr>
                <td className="left">Exit year</td>
                <td className="num calc">{sel.exitYear}</td>
                <td className="left sub">Year {sel.exitIndex + 1} of projection</td>
              </tr>
              <KV label={`Exit revenue (${f.mUnit})`} v={sel.exitRevenue} kind="moneyM" className="linked" note="From financial projections" />
              <KV label={`Exit EBITDA (${f.mUnit})`} v={sel.exitEbitda} kind="moneyM" className="linked" note="From financial projections" />
              {isDcf && <KV label={`Exit-year free cash flow (${f.mUnit})`} v={sel.exitFcf} kind="moneyM" className="linked" note="From Screen 6" />}
              <tr>
                <td className="left">Valuation basis</td>
                <td className="num calc">{sel.multipleOrRate}</td>
                <td className="left sub">Editable (Section 1)</td>
              </tr>
              <KV label={`Enterprise value before discount (${f.mUnit})`} v={sel.evAtExitGross} kind="moneyM" note={V.approach === 'dcf-growth' ? 'FCF × (1 + g) ÷ (r − g)' : 'Metric × multiple'} />
              <KV label={`Less: exit discount (${fmtPct(V.exitDiscount)})`} v={-(sel.evAtExitGross - sel.evAtExit)} kind="moneyM" note="Optional" />
              <KV label={`Enterprise value (${f.mUnit})`} v={sel.evAtExit} kind="moneyM" bold note="Calculated" />
              <KV label={`Plus: net cash at exit (${f.mUnit})`} v={sel.netCashAtExit} kind="moneyM" className="linked" note={`Closing cash ${sel.exitYear} (Screen 6); no debt assumed`} />
              <KV label={`Equity value (${f.mUnit})`} v={sel.equityAtExit} kind="moneyM" bold note="Calculated" />
              <KV label={`Enterprise value today (${f.mUnit})`} v={sel.evToday} kind="moneyM" note="PV of cash flows to exit + PV of exit value" />
            </tbody>
          </table>
          {!ok && <Note tone="warn">{sel.note}</Note>}
          <table className="compact" style={{ marginTop: 12 }}>
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
                <tr key={a.approach} className={a.approach === V.approach ? 'total' : ''}>
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
                      Not meaningful: {a.note}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <div className="grid c3">
        <Card n={5} title={<>Investor Returns <span className="muted">(Initial Round)</span></>} subtitle="Estimated returns for the initial investors based on exit value.">
          <table className="compact">
            <tbody>
              <KV label={`Initial investment (${f.mUnit})`} v={inv.initialAmount} kind="moneyM" className="linked" note="From Section 2" />
              <KV label="Ownership (new)" v={inv.ownershipInitial} kind="pct" decimals={1} className="linked" note="From Section 2" />
              <KV label="Ownership at exit" v={inv.ownershipAtExit} kind="pct" decimals={1} note={F.futureAmount > 0 && F.futureYearIndex <= m.val.exitIndex ? `After dilution by the ${qLabel(F.futureYearIndex, F.futureQuarter)} round` : 'No further dilution'} />
              <KV label={`Equity value at exit (${f.mUnit})`} v={sel.equityAtExit} kind="moneyM" className="linked" note="From Section 4" />
              <KV label={`Investor equity value at exit (${f.mUnit})`} v={inv.equityAtExit} kind="moneyM" bold note="Calculated" />
              <KV label="Money multiple (x)" v={inv.moneyMultiple} kind="x" bold note="Equity at exit ÷ investment" />
              <KV label="Holding period (years)" v={inv.holdingYears} kind="num2" note={`${qLabel(F.initialYearIndex, F.initialQuarter)} to end of ${sel.exitYear}`} />
              <KV label="IRR (annualised)" v={inv.irr} kind="pct" decimals={1} bold note="Multiple^(1 ÷ years) − 1" />
            </tbody>
          </table>
        </Card>

        <Card n={6} title="Sensitivity Analysis" subtitle={`Investor IRR by ${m.val.sensitivity.rowLabel.toLowerCase()} and exit year (money multiple in brackets).`}>
          <table className="compact sens">
            <thead>
              <tr>
                <th className="left">{m.val.sensitivity.rowLabel}</th>
                {m.val.sensitivity.years.map((y) => (
                  <th key={y}>{y}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {m.val.sensitivity.rows.map((r) => (
                <tr key={r.label}>
                  <td className={`left ${r.isBase ? 'bold' : ''}`}>{r.label}</td>
                  {r.cells.map((c) => (
                    <td key={c.year} className={`num ${heat(c.irr)} ${r.isBase && c.year === sel.exitYear ? 'heat-base' : ''}`}>
                      {Number.isFinite(c.irr) ? `${fmtPct(c.irr)} (${fmtNum(c.mom, 1)}x)` : 'n/m'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="table-note">Each cell re-runs the valuation for that exit year with the same funding terms. The base case is outlined.</p>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Takeaways
            n={7}
            items={[
              <>Implied enterprise value at exit ({sel.exitYear}): <b>{ok ? compact(sel.evAtExit) : 'n/m'}</b> at {sel.multipleOrRate}, or {ok ? compact(sel.equityAtExit) : 'n/m'} of equity value after adding net cash.</>,
              <>Investors' {fmtPct(inv.ownershipAtExit, 1)} stake is worth {ok ? compact(inv.equityAtExit) : 'n/m'} at exit: a <b>{ok ? fmtX(inv.moneyMultiple) : 'n/m'}</b> money multiple and <b>{ok ? fmtPct(inv.irr) : 'n/m'}</b> IRR over a {fmtNum(inv.holdingYears, 1)}-year hold.</>,
              <>{(() => { const rows = m.val.sensitivity.rows; const hi = rows[rows.length - 1]?.cells.at(-1); const lo = rows[0]?.cells.at(-1); return hi && lo && Number.isFinite(hi.irr) && Number.isFinite(lo.irr) ? `At ${rows[rows.length - 1].label} the IRR rises to ${fmtPct(hi.irr)}; at ${rows[0].label} investors still make ${fmtNum(lo.mom, 1)}x.` : 'Use the sensitivity grid to test other multiples and exit years.' })()}</>,
              <>Cross-check: {m.val.all.filter((a) => a.approach !== sel.approach && a.meaningful).map((a) => `${a.label} ${compact(a.evAtExit)}`).join(', ') || 'other approaches are not meaningful with these inputs'}.</>,
              <>Round size and timing come from Screen 6; pre-money, exit multiples and discount rate are set here and can be changed to test the deal.</>,
          ]}
          />
          <NextStep title="Back to Overview" text="See the full picture: assumptions, P&L, cash flow, funding and valuation on one page." label="Go to Overview" onClick={() => go('overview')} />
        </div>
      </div>
    </>
  )
}
