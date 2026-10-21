// Builds a self-contained HTML report from the current model. Pure template: no React, no network.
import type { Model } from '../model/engine'
import type { SensitivityRow } from '../model/sensitivity'
import { APPROACH_LABELS, SCENARIO_LABELS, START_YEAR, type Currency, type Inputs, type Scenario } from '../model/types'
import { CURRENCY_SYMBOL, fmtInt, fmtM, fmtNum, fmtPct, fmtX, fmtYears } from '../ui/format'

export interface ReportOptions {
  scenario: Scenario
  period: number
  currency: Currency
  fx: number
  factor: number
  sensitivity: SensitivityRow[]
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function buildReport(m: Model, inputs: Inputs, o: ReportOptions): string {
  const sym = CURRENCY_SYMBOL[o.currency]
  const cur = o.currency
  const years = m.years
  const N = years.length
  const last = N - 1
  const R = inputs.revenue
  const F = inputs.valuation.funding
  const V = inputs.valuation
  const C = m.cash
  const T = m.pl.totals
  const sel = m.val.selected
  const inv = m.val.investor
  const money = (v: number, d = 0) => fmtInt(v * o.fx, d)
  const mm = (v: number) => fmtM(v * o.fx)
  const k = (v: number) => `${sym}${fmtInt((v * o.fx) / 1000)}K`
  const compact = (v: number) => {
    if (!Number.isFinite(v)) return 'n/m'
    const x = Math.abs(v * o.fx)
    const s = x >= 1e9 ? `${sym}${(x / 1e9).toFixed(1)}B` : x >= 1e6 ? `${sym}${(x / 1e6).toFixed(1)}M` : `${sym}${(x / 1e3).toFixed(0)}K`
    return v < 0 ? `(${s})` : s
  }
  const neg = (s: string, v: number) => (v < 0 ? `<span class="neg">${s}</span>` : s)
  const qLabel = (y: number, q: number) => `Q${q + 1} ${START_YEAR + y}`
  const sumS = (a: number[]) => a.reduce((x, y) => x + y, 0)
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  type Cell = string | number
  const td = (c: Cell, cls = '') => `<td class="${cls}">${c}</td>`
  const row = (label: string, cells: Cell[], cls = '') => `<tr class="${cls}"><td class="l">${label}</td>${cells.map((c) => td(c, 'n')).join('')}</tr>`
  const table = (head: string[], body: string, cls = '') =>
    `<table class="${cls}"><thead><tr>${head.map((h, i) => `<th class="${i === 0 ? 'l' : ''}">${h}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>`
  const yr = (first = '', extra: string[] = []) => [first, ...years.map(String), ...extra]
  const seriesM = (s: number[], total = false, bold = false) => (label: string) =>
    row(label, [...s.map((v) => neg(mm(v), v)), ...(total ? [neg(mm(sumS(s)), sumS(s))] : [])], bold ? 'b' : '')
  const seriesPct = (s: number[], totalValue?: number, bold = false) => (label: string) =>
    row(label, [...s.map((v) => neg(fmtPct(v), v)), ...(totalValue !== undefined ? [neg(fmtPct(totalValue), totalValue)] : [])], bold ? 'b' : '')
  const seriesInt = (s: number[], total = false, bold = false) => (label: string) =>
    row(label, [...s.map((v) => fmtInt(v)), ...(total ? [fmtInt(sumS(s))] : [])], bold ? 'b' : '')
  const kv = (label: string, value: string, bold = false, note = '') => `<tr class="${bold ? 'b' : ''}"><td class="l">${label}</td><td class="n">${value}</td>${note ? `<td class="sub">${note}</td>` : ''}</tr>`

  // ---- simple SVG stacked bar chart (revenue by component)
  const svgBars = (title: string, series: { label: string; color: string; values: number[] }[], unit = `${cur} M`) => {
    const W = 760
    const H = 240
    const padL = 48
    const padB = 28
    const padT = 24
    const totals = years.map((_, t) => sumS(series.map((s) => s.values[t])))
    const maxV = Math.max(1e-9, ...totals, ...series.flatMap((s) => s.values))
    const minV = Math.min(0, ...series.flatMap((s) => s.values))
    const span = maxV - minV
    const plotH = H - padT - padB
    const y = (v: number) => padT + (plotH * (maxV - v)) / span
    const bw = (W - padL - 20) / N
    let out = `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px;font-family:inherit">`
    for (let g = 0; g <= 4; g++) {
      const v = minV + (span * g) / 4
      out += `<line x1="${padL}" x2="${W - 10}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="#e5e9f0" stroke-dasharray="2 4"/><text x="${padL - 6}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end" font-size="11" fill="#6b7a93">${v.toFixed(0)}</text>`
    }
    years.forEach((yr0, t) => {
      let pos = 0
      let negAcc = 0
      const x = padL + bw * t + bw * 0.2
      series.forEach((s) => {
        const v = s.values[t]
        if (v >= 0) {
          out += `<rect x="${x.toFixed(1)}" y="${y(pos + v).toFixed(1)}" width="${(bw * 0.6).toFixed(1)}" height="${Math.max(0, y(pos) - y(pos + v)).toFixed(1)}" fill="${s.color}"/>`
          pos += v
        } else {
          out += `<rect x="${x.toFixed(1)}" y="${y(negAcc).toFixed(1)}" width="${(bw * 0.6).toFixed(1)}" height="${Math.max(0, y(negAcc + v) - y(negAcc)).toFixed(1)}" fill="${s.color}"/>`
          negAcc += v
        }
      })
      out += `<text x="${(x + bw * 0.3).toFixed(1)}" y="${(y(Math.max(pos, 0)) - 6).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="700" fill="#0f172a">${totals[t].toFixed(1)}</text>`
      out += `<text x="${(x + bw * 0.3).toFixed(1)}" y="${H - 8}" text-anchor="middle" font-size="11" fill="#6b7a93">${yr0}</text>`
    })
    out += '</svg>'
    const legend = series.map((s) => `<span><i style="background:${s.color}"></i>${s.label}</span>`).join('')
    return `<div class="chart"><div class="chart-title">${title} <span class="muted">(${unit})</span></div><div class="legend">${legend}</div>${out}</div>`
  }
  const toM = (s: number[]) => s.map((v) => (v * o.fx) / 1e6)

  const lensRows = m.lens
    .map(
      (l) =>
        `<tr><td class="l">${l.label}<div class="sub">${l.definition}</div></td><td class="n b">${l.kind === 'months' ? (Number.isFinite(l.value) ? `${l.value.toFixed(1)} mo` : 'n/m') : l.kind === 'pct' ? fmtPct(l.value) : l.kind === 'x' ? fmtX(l.value) : fmtNum(l.value)}</td><td class="sub">${l.benchmark}</td><td><span class="pill ${l.status}">${l.status === 'strong' ? 'Strong' : l.status === 'watch' ? 'Watch' : 'Weak'}</span></td></tr>`,
    )
    .join('')

  const uk = Array.from({ length: m.unit.years }, (_, i) => i)
  const unitRow = (label: string, s: number[], bold = false) => row(label, [...s.map((v) => (v === 0 ? '–' : money(v))), money(sumS(s))], bold ? 'b' : '')

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Lumiom Valuation Model – ${esc(SCENARIO_LABELS[o.scenario])} case</title>
<style>
:root{--navy:#0b1a3a;--blue:#1a56ff;--border:#e1e6f0;--text:#0f172a;--t2:#4b5a74;--t3:#6b7a93;--calc:#f2f4f8;--linked:#e4f6ea;--input:#eaf2ff;--total:#e8eef9}
*{box-sizing:border-box}body{margin:0;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--text);background:#eef2f9;font-size:13px}
.page{max-width:1180px;margin:0 auto;padding:28px 24px 60px}
.cover{background:var(--navy);color:#fff;border-radius:16px;padding:28px 32px;margin-bottom:22px}
.cover h1{margin:0;font-size:30px}.cover p{margin:6px 0 0;color:#d5dcea;font-size:14px}
.cover .meta{display:flex;gap:22px;flex-wrap:wrap;margin-top:16px;font-size:13px;color:#e6ebf5}.cover .meta b{display:block;color:#fff;font-size:15px}
h2{font-size:20px;color:var(--navy);margin:34px 0 4px;padding-top:12px;border-top:2px solid var(--blue)}h2 small{font-weight:400;color:var(--t2);font-size:13px;margin-left:8px}
h3{font-size:15px;color:var(--navy);margin:20px 0 8px}
.kpis{display:grid;grid-template-columns:repeat(6,1fr);gap:12px;margin:16px 0}.kpi{background:#fff;border:1px solid var(--border);border-radius:12px;padding:12px 14px}.kpi .lbl{font-size:12.5px;font-weight:600;color:var(--navy)}.kpi .val{font-size:22px;font-weight:700;color:var(--navy);margin-top:4px}.kpi .sub{font-size:12px;color:var(--t2);margin-top:3px}
.card{background:#fff;border:1px solid var(--border);border-radius:14px;padding:16px 18px;margin:12px 0}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
table{border-collapse:separate;border-spacing:0;width:100%;font-size:12.5px;margin:6px 0}th{text-align:right;font-weight:600;color:var(--t2);padding:6px 8px;border-bottom:1px solid var(--border);background:#f7f9fc;font-size:12px;white-space:nowrap}th.l,td.l{text-align:left}td{padding:5px 8px;border-bottom:1px solid #eef1f6;white-space:nowrap;vertical-align:middle}td.n{text-align:right;font-variant-numeric:tabular-nums;background:var(--calc)}td.l{white-space:normal}tr.b td{font-weight:700;background:var(--total)}tr.b td.n{background:var(--total)}td.sub,.sub{color:var(--t3);font-size:11.5px;white-space:normal}.neg{color:#c0271d}
tr.sec td{background:#f7f9fc;font-weight:600;color:var(--navy)}
.pill{display:inline-block;padding:2px 9px;border-radius:999px;font-size:11.5px;font-weight:600}.pill.strong{background:#e3f6e8;color:#0f5132}.pill.watch{background:#fff3d6;color:#8a5a00}.pill.weak{background:#fde8e6;color:#8a1c13}
.chart{margin:10px 0}.chart-title{font-weight:600;color:var(--navy);margin-bottom:4px}.legend{display:flex;gap:14px;font-size:12px;color:var(--t2);margin-bottom:4px;flex-wrap:wrap}.legend i{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:5px;vertical-align:-1px}
.muted{color:var(--t3);font-weight:400}.note{background:#eef4ff;border-radius:8px;padding:10px 12px;font-size:12px;color:var(--t2);margin:10px 0;line-height:1.45}
.foot{margin-top:40px;font-size:11.5px;color:var(--t3);text-align:center}
@media print{body{background:#fff;font-size:11px}.page{padding:0;max-width:none}.card{break-inside:avoid;border:1px solid #ddd}h2{break-before:page}h2:first-of-type{break-before:auto}.kpis{grid-template-columns:repeat(3,1fr)}}
@media(max-width:900px){.kpis{grid-template-columns:repeat(2,1fr)}.grid2,.grid3{grid-template-columns:1fr}}
</style></head><body><div class="page">

<div class="cover">
  <h1>Lumiom Valuation Model</h1>
  <p>Enterprise Transformation Intelligence · financial model and valuation report</p>
  <div class="meta">
    <span>Scenario<b>${SCENARIO_LABELS[o.scenario]} case${o.factor !== 1 ? ` (volume drivers × ${o.factor})` : ''}</b></span>
    <span>Projection period<b>${N} years (${years[0]} – ${years[last]})</b></span>
    <span>Currency<b>${cur}${cur !== 'USD' ? ` (${o.fx} per USD)` : ''}</b></span>
    <span>Generated<b>${date}</b></span>
  </div>
</div>

<div class="kpis">
  <div class="kpi"><div class="lbl">Revenue (${N}Y)</div><div class="val">${compact(T.revenue)}</div><div class="sub">${compact(m.rev.total[last])} in ${years[last]}</div></div>
  <div class="kpi"><div class="lbl">EBITDA (${years[last]})</div><div class="val">${compact(m.pl.ebitda[last])}</div><div class="sub">${fmtPct(m.pl.ebitdaMargin[last])} margin · breakeven ${m.pl.breakevenIndex === null ? 'not reached' : years[m.pl.breakevenIndex]}</div></div>
  <div class="kpi"><div class="lbl">Net profit (${N}Y)</div><div class="val">${compact(T.netIncome)}</div><div class="sub">${fmtPct(T.revenue ? T.netIncome / T.revenue : 0)} margin</div></div>
  <div class="kpi"><div class="lbl">Funding need</div><div class="val">${compact(C.totalFundingNeed)}</div><div class="sub">Round ${compact(F.initialAmount * 1e6)} in ${qLabel(F.initialYearIndex, F.initialQuarter)}</div></div>
  <div class="kpi"><div class="lbl">Enterprise value at exit (${sel.exitYear})</div><div class="val">${sel.meaningful ? compact(sel.evAtExit) : 'n/m'}</div><div class="sub">${sel.label}</div></div>
  <div class="kpi"><div class="lbl">Investor returns</div><div class="val">${sel.meaningful ? `${fmtX(inv.moneyMultiple)} / ${fmtPct(inv.irr)}` : 'n/m'}</div><div class="sub">Money multiple / IRR on ${compact(inv.initialAmount)}</div></div>
</div>

<h2>1 · Investor Lens</h2>
<div class="card">${table(['Metric', 'Value', 'Benchmark', 'Status'], lensRows)}
<div class="note">Thresholds are rules of thumb for early-stage enterprise software. Strong ${m.lens.filter((l) => l.status === 'strong').length} · Watch ${m.lens.filter((l) => l.status === 'watch').length} · Weak ${m.lens.filter((l) => l.status === 'weak').length}.</div></div>

<h2>2 · Revenue Assumptions</h2>
<div class="grid3">
<div class="card"><h3>Customer acquisition plan</h3>${table(['Year', 'New customers', 'Active (end of year)'], years.map((y, t) => `<tr><td class="l">${y}</td>${td(fmtInt(m.rev.newCustomers[t]), 'n')}${td(fmtInt(m.rev.active[t]), 'n')}</tr>`).join('') + row('Total signed', [fmtInt(sumS(m.rev.newCustomers)), fmtInt(m.rev.active[last])], 'b'))}</div>
<div class="card"><h3>Pricing per customer (${cur})</h3>${table(['Component', 'Price', 'Billing'], [
  ['Platform subscription (per customer per year)', R.pricing.platform],
  ['Implementation / FDE (per deployment)', R.pricing.implementation],
  ['Additional use case (per use case per year)', R.pricing.useCase],
  ['Managed services (per customer per year)', R.pricing.managed],
].map(([l, p]) => `<tr><td class="l">${l}</td>${td(money((p as { price: number }).price), 'n')}<td>${(p as { billing: string }).billing === 'recurring' ? 'Recurring (annual)' : 'One-time'}</td></tr>`).join(''))}</div>
<div class="card"><h3>Other assumptions</h3><table><tbody>
${kv('Average contract term (years)', String(R.contractTerm))}${kv('Retention rate after initial term', fmtPct(R.retentionRate))}${kv('Additional use cases per customer', R.addlUseCases.toFixed(1), false, `over ${R.useCaseRampYears} years`)}${kv('Annual expansion rate (existing customers)', fmtPct(R.expansionRate, 1))}${kv('Managed services attach rate', fmtPct(R.managedAttach))}${kv('Implementation revenue recognition (months)', String(R.recognitionMonths))}
</tbody></table></div>
</div>
<div class="card">${svgBars('Revenue forecast by component', [
  { label: 'Platform subscription', color: '#1d4ed8', values: toM(m.rev.platform) },
  { label: 'Additional use cases', color: '#3b9ff0', values: toM(m.rev.useCase) },
  { label: 'Implementation', color: '#6d28d9', values: toM(m.rev.implementation) },
  { label: 'Managed services', color: '#a78bfa', values: toM(m.rev.managed) },
])}
${table(yr('Revenue by component (' + cur + ' M)', ['Total']), [seriesM(m.rev.platform, true)('Platform subscription'), seriesM(m.rev.useCase, true)('Additional use cases'), seriesM(m.rev.implementation, true)('Implementation'), seriesM(m.rev.managed, true)('Managed services'), seriesM(m.rev.total, true, true)('Total revenue'), seriesM(m.rev.recurringTotal, true)('of which recurring'), seriesPct(years.map((_, t) => (t === 0 ? NaN : m.rev.total[t] / m.rev.total[t - 1] - 1)))('Year-on-year growth')].join(''))}
<h3>Customer cohort view</h3>${table(yr('Sign year', ['Total']), years.map((sy, s) => `<tr><td class="l">${sy}</td>${years.map((_, t) => td(t < s ? '–' : fmtInt(m.rev.cohort[s][t]), 'n')).join('')}${td(fmtInt(m.rev.newCustomers[s]), 'n')}</tr>`).join('') + seriesInt(m.rev.active)('Total active customers').replace('<tr class="">', '<tr class="b">') + row('Active use cases', [...m.rev.activeUseCases.map((v) => fmtNum(v, 1)), '']))}
</div>

<h2>3 · Implementation &amp; Unit Costs</h2>
<div class="kpis">
  <div class="kpi"><div class="lbl">Total implementation cost</div><div class="val">${k(m.impl.lifecycleCostPerCustomer)}</div><div class="sub">per customer, 1 + ${R.addlUseCases.toFixed(1)} use cases</div></div>
  <div class="kpi"><div class="lbl">Average cost per use case</div><div class="val">${k(m.impl.avgCostPerUseCase)}</div><div class="sub">after reuse</div></div>
  <div class="kpi"><div class="lbl">Recurring service cost</div><div class="val">${k(m.impl.recurring.perCustomerAtFullRamp)}</div><div class="sub">per customer per year</div></div>
  <div class="kpi"><div class="lbl">Gross margin (implementation)</div><div class="val">${fmtPct(m.impl.implMargin)}</div><div class="sub">${k(R.pricing.implementation.price)} fee vs ${k(m.impl.firstDeploymentCost)} cost</div></div>
  <div class="kpi"><div class="lbl">Gross margin (recurring)</div><div class="val">${fmtPct(m.impl.recurringMargin)}</div><div class="sub">${k(m.impl.recurringRevenuePerCustomer)} recurring revenue per customer</div></div>
</div>
<div class="grid2">
<div class="card"><h3>Enterprise onboarding (one-time per customer)</h3>${table(['Cost component', 'Role mix', 'FTE-months', `Monthly cost (${cur})`, `Cost (${cur})`], m.impl.onboarding.lines.map((l, i) => `<tr><td class="l">${l.label}</td>${td(`${l.role} (${inputs.implementation.onboarding.lines[i].fte.toFixed(1)})`, 'n')}${td(fmtNum(l.fteMonths, 1), 'n')}${td(money(l.monthlyCost), 'n')}${td(money(l.cost), 'n')}</tr>`).join('') + row('Total labour cost', ['', fmtNum(m.impl.onboarding.fteMonths, 1), '', money(m.impl.onboarding.labour)], 'b') + row('Direct costs (tools, cloud setup, external)', ['', '', '', money(m.impl.onboarding.direct)]) + row('Total onboarding cost per customer', ['', '', '', money(m.impl.onboarding.total)], 'b'))}</div>
<div class="card"><h3>Use case implementation (per use case)</h3>${table(['Cost component', 'Role mix', 'FTE-months', `Monthly cost (${cur})`, `Cost (${cur})`], m.impl.useCase.lines.map((l, i) => `<tr><td class="l">${l.label}</td>${td(`${l.role} (${inputs.implementation.useCase.lines[i].fte.toFixed(1)})`, 'n')}${td(fmtNum(l.fteMonths, 1), 'n')}${td(money(l.monthlyCost), 'n')}${td(money(l.cost), 'n')}</tr>`).join('') + row('Total labour cost', ['', fmtNum(m.impl.useCase.fteMonths, 1), '', money(m.impl.useCase.labour)], 'b') + row('Direct costs (data access, tools, third-party)', ['', '', '', money(m.impl.useCase.direct)]) + row('Total cost per use case (first use case)', ['', '', '', money(m.impl.useCase.total)], 'b'))}</div>
</div>
<div class="grid3">
<div class="card"><h3>Reusability for additional use cases</h3>${table(['Component', 'Reduction', `Cost per additional use case (${cur})`], m.impl.useCase.lines.map((l) => `<tr><td class="l">${l.label}</td>${td(fmtPct(l.reusePct), 'n')}${td(money(l.addlCost), 'n')}</tr>`).join('') + row('Direct costs', [fmtPct(inputs.implementation.useCase.directReusePct), money(m.impl.useCase.addlDirect)]) + row('Total cost per additional use case', [`${fmtPct(-m.impl.useCase.addlReduction)} vs first`, money(m.impl.useCase.addlTotal)], 'b'))}</div>
<div class="card"><h3>Recurring service costs (per customer per year)</h3>${table(['Cost component', 'Basis', `Unit cost (${cur})`, `Annual (${cur})`], m.impl.recurring.lines.map((l) => `<tr><td class="l">${l.label}</td><td>${l.basis === 'perCustomer' ? 'Per customer' : `Per use case × ${m.impl.recurring.useCasesAtFullRamp.toFixed(1)}`}</td>${td(money(l.unitCost), 'n')}${td(money(l.annualAtFullRamp), 'n')}</tr>`).join('') + row('Total recurring cost per customer per year', ['', '', money(m.impl.recurring.perCustomerAtFullRamp)], 'b'))}</div>
<div class="card"><h3>Implementation cost per customer</h3><table><tbody>${kv('Enterprise onboarding (one-time)', money(m.impl.onboarding.total))}${kv('First use case', money(m.impl.useCase.total))}${kv(`Additional use cases (${R.addlUseCases.toFixed(1)} × ${money(m.impl.useCase.addlTotal)})`, money(R.addlUseCases * m.impl.useCase.addlTotal))}${kv('Total implementation cost', money(m.impl.lifecycleCostPerCustomer), true)}${kv('Implementation fee (Screen 2)', money(R.pricing.implementation.price))}${kv('Gross profit per implementation', money(R.pricing.implementation.price - m.impl.firstDeploymentCost), true)}${kv('Gross margin', fmtPct(m.impl.implMargin), true)}</tbody></table>
<h3>Deployment effort reduction</h3>${table(['Year', 'Effort reduction', `First deployment cost (${cur})`, `Additional use case (${cur})`], years.map((y, t) => `<tr><td class="l">${y}</td>${td(fmtPct(m.impl.byYear.reduction[t]), 'n')}${td(money(m.impl.byYear.implCostPerCustomer[t]), 'n')}${td(money(m.impl.byYear.addlUseCaseCost[t]), 'n')}</tr>`).join(''))}</div>
</div>

<h2>4 · Company Cost Assumptions</h2>
<div class="card"><h3>Workforce plan and people costs</h3>${table(['Function', `Avg. annual cost (${cur})`, ...years.map(String)], `<tr><td class="l">Implementation Delivery (Consulting &amp; Engineering)<div class="sub">Derived from Screen 3 (required effort ÷ 12); costed in cost of revenue</div></td>${td(money(m.company.deliveryAvgCost), 'n')}${m.company.deliveryHeadcount.map((v) => td(fmtInt(v), 'n')).join('')}</tr>` + m.company.functions.map((fn) => `<tr><td class="l">${fn.label}</td>${td(money(fn.avgCost), 'n')}${fn.headcount.map((v) => td(fmtInt(v), 'n')).join('')}</tr>`).join('') + row('Total headcount', ['', ...m.company.headcountTotal.map((v) => fmtInt(v))], 'b') + row(`Total payroll (${cur} M)`, ['', ...m.company.payroll.map(mm)], 'b') + row('Less: delivery costed on Screen 3', ['', ...m.company.deliveryCost.map((v) => neg(mm(-v), -v))]) + row(`People cost in company costs (${cur} M)`, ['', ...m.company.people.map(mm)], 'b'))}
<h3>Delivery capacity and utilization</h3>${table(yr('Metric'), [seriesInt(m.company.requiredFteMonths)('Required FTE-months (Screens 2 & 3)'), seriesInt(m.company.deliveryHeadcount, false, true)('Delivery headcount (required ÷ 12, rounded up)'), seriesInt(m.company.availableFteMonths)('Available FTE-months'), seriesPct(m.company.utilization, undefined, true)('Utilization'), seriesM(m.company.deliveryCost)(`Delivery labour cost in cost of revenue (${cur} M)`)].join(''))}</div>
<div class="grid2">
<div class="card"><h3>Infrastructure and technology (${cur} M)</h3>${table(yr('Cost item'), m.company.infraLines.map((l) => seriesM(l.values)(l.label)).join('') + seriesM(m.company.infra, false, true)('Total infrastructure cost'))}</div>
<div class="card"><h3>Other operating expenses (${cur} M)</h3>${table(yr('Expense item'), m.company.opexLines.map((l) => seriesM(l.values)(l.label)).join('') + seriesM(m.company.other, false, true)('Total other operating expenses'))}</div>
</div>
<div class="card"><h3>Total company costs (${cur} M)</h3>${table(yr('Cost category', ['Total']), [seriesM(m.company.people, true)('People costs'), seriesM(m.company.infra, true)('Infrastructure & technology'), seriesM(m.company.other, true)('Other operating expenses'), seriesM(m.company.total, true, true)('Total company costs'), seriesPct(m.company.pctOfRevenue.total, T.revenue ? T.opex / T.revenue : 0)('% of revenue')].join(''))}
<table><tbody>${kv('Corporate tax rate', fmtPct(inputs.company.taxRate))}${kv('Capex depreciation period (years)', String(inputs.company.depreciationYears))}</tbody></table></div>

<h2>5 · Profitability &amp; Unit Economics</h2>
<div class="kpis">
  <div class="kpi"><div class="lbl">Total revenue (${N}Y)</div><div class="val">${compact(T.revenue)}</div></div>
  <div class="kpi"><div class="lbl">Gross profit (${N}Y)</div><div class="val">${compact(T.grossProfit)}</div><div class="sub">${fmtPct(T.revenue ? T.grossProfit / T.revenue : 0)} margin</div></div>
  <div class="kpi"><div class="lbl">EBITDA (${N}Y)</div><div class="val">${compact(T.ebitda)}</div><div class="sub">${fmtPct(T.revenue ? T.ebitda / T.revenue : 0)} margin</div></div>
  <div class="kpi"><div class="lbl">Net profit (${N}Y)</div><div class="val">${compact(T.netIncome)}</div><div class="sub">${fmtPct(T.revenue ? T.netIncome / T.revenue : 0)} margin</div></div>
  <div class="kpi"><div class="lbl">Payback period</div><div class="val">${fmtYears(C.cashPaybackYears)}</div><div class="sub">cumulative cash flow positive</div></div>
  <div class="kpi"><div class="lbl">Breakeven year</div><div class="val">${m.pl.breakevenIndex === null ? 'Not reached' : `Year ${m.pl.breakevenIndex + 1}`}</div><div class="sub">${m.pl.breakevenIndex === null ? '' : `(${years[m.pl.breakevenIndex]}) EBITDA positive`}</div></div>
</div>
<div class="card"><h3>Company profitability (${cur} M)</h3>${table(yr('', [`Total (${N}Y)`]), [seriesM(m.rev.implementation, true)('Implementation revenue'), seriesM(years.map((_, t) => m.rev.total[t] - m.rev.implementation[t]), true)('Recurring revenue'), seriesM(m.pl.revenue, true, true)('Total revenue'), seriesM(years.map((_, t) => m.pl.cogsImpl[t] + m.pl.cogsAddl[t]), true)('Implementation cost'), seriesM(m.pl.cogsRecurring, true)('Recurring service cost'), seriesM(m.pl.grossProfit, true, true)('Gross profit'), seriesPct(m.pl.grossMargin, T.revenue ? T.grossProfit / T.revenue : 0)('Gross margin'), seriesM(m.pl.opex, true)('Operating expenses'), seriesM(m.pl.ebitda, true, true)('EBITDA'), seriesPct(m.pl.ebitdaMargin, T.revenue ? T.ebitda / T.revenue : 0)('EBITDA margin'), seriesM(m.pl.da, true)('Depreciation'), seriesM(m.pl.tax, true)(`Tax (${fmtPct(inputs.company.taxRate)}, loss carry-forward)`), seriesM(m.pl.netIncome, true, true)('Net profit (after tax)'), seriesPct(m.pl.netMargin, T.revenue ? T.netIncome / T.revenue : 0)('Net margin')].join(''))}
${svgBars('Annual P&L', [{ label: 'Revenue', color: '#1d4ed8', values: toM(m.pl.revenue) }], `${cur} M`)}</div>
<div class="grid2">
<div class="card"><h3>Customer unit economics (${cur}, per retained customer)</h3>${table(['', ...uk.map((i) => `Year ${i + 1}`), `Total (${m.unit.years}Y)`], [unitRow('Implementation fee', m.unit.implementationFee), unitRow('Platform subscription', m.unit.platformRevenue), unitRow('Additional use cases', m.unit.useCaseRevenue), unitRow('Managed services (attach-weighted)', m.unit.managedRevenue), unitRow('Total revenue per customer', m.unit.totalRevenue, true), unitRow('Implementation cost', m.unit.implementationCost), unitRow('Additional use case delivery', m.unit.addlUseCaseCost), unitRow('Recurring service cost', m.unit.recurringCost), unitRow('Total cost per customer', m.unit.totalCost, true), unitRow('Gross profit per customer', m.unit.grossProfit, true), row('Gross margin', [...m.unit.grossMargin.map((v) => fmtPct(v)), fmtPct(sumS(m.unit.grossProfit) / sumS(m.unit.totalRevenue))])].join(''))}<div class="note">Retention-weighted lifetime gross profit: ${sym}${money(m.unit.ltv)} per customer.</div></div>
<div class="card"><h3>Key unit metrics</h3>${table(yr(''), [seriesInt(m.rev.newCustomers)('New customers'), seriesInt(m.rev.active)('Active customers (end of year)'), row(`Revenue per active customer (${cur} '000)`, m.rev.avgPerCustomer.map((v) => fmtInt((v * o.fx) / 1000))), row(`CAC per new customer (${cur} '000)`, m.unit.cacByYear.map((v) => fmtInt((v * o.fx) / 1000))), row('CAC payback (months of recurring gross profit)', m.unit.cacPaybackMonthsByYear.map((v) => fmtNum(v, 1))), row(`LTV / CAC (${m.unit.years}-year)`, [fmtX(m.unit.ltvToCac), ...years.slice(1).map(() => '')])].join(''))}
<h3>Sensitivity: ${N}-year net profit (${cur} M)</h3>${table(['Driver', '−20%', 'Base', '+20%'], o.sensitivity.map((s) => row(s.label, [neg(mm(s.low), s.low), neg(mm(s.base), s.base), neg(mm(s.high), s.high)])).join(''))}</div>
</div>

<h2>6 · Cash Flow &amp; Funding Needs</h2>
<div class="kpis">
  <div class="kpi"><div class="lbl">Total cash inflow (${N}Y)</div><div class="val">${compact(sumS(C.collections))}</div></div>
  <div class="kpi"><div class="lbl">Total cash outflow (${N}Y)</div><div class="val">${compact(sumS(C.outflow))}</div></div>
  <div class="kpi"><div class="lbl">Ending cash (${years[last]})</div><div class="val">${compact(C.closing[last])}</div></div>
  <div class="kpi"><div class="lbl">Peak funding need</div><div class="val">${compact(C.peakFundingNeed)}</div><div class="sub">deepest deficit in ${years[C.peakFundingIndex]}</div></div>
  <div class="kpi"><div class="lbl">Runway (from start)</div><div class="val">${C.runwayMonths === null ? `${12 * N}+ months` : `${C.runwayMonths} months`}</div></div>
  <div class="kpi"><div class="lbl">Estimated funding round</div><div class="val">${compact(F.initialAmount * 1e6)}</div><div class="sub">${qLabel(F.initialYearIndex, F.initialQuarter)} · need ${compact(C.totalFundingNeed)}</div></div>
</div>
<div class="grid2">
<div class="card"><h3>Cash inflows (${cur} M)</h3>${table(yr('', [`Total (${N}Y)`]), [seriesM(m.pl.revenue, true, true)('Total revenue'), seriesM(C.deferredChange, true)('Billings ahead of / (behind) recognised revenue'), seriesM(C.receivablesChange.map((v) => -v), true)('Less: increase in receivables'), seriesM(C.collections, true, true)('Total cash inflow (collections)')].join(''))}</div>
<div class="card"><h3>Cash outflows (${cur} M)</h3>${table(yr('', [`Total (${N}Y)`]), [seriesM(years.map((_, t) => m.pl.cogsImpl[t] + m.pl.cogsAddl[t]), true)('Implementation delivery costs'), seriesM(m.pl.cogsRecurring, true)('Recurring service costs'), seriesM(m.company.people, true)('People costs'), seriesM(m.company.infra, true)('Infrastructure & technology'), seriesM(m.company.other, true)('Other operating expenses'), seriesM(C.taxPaid, true)('Corporate tax'), seriesM(C.capex, true)('Product & technology investment (capex)'), seriesM(C.outflow, true, true)('Total cash outflow')].join(''))}</div>
</div>
<div class="grid2">
<div class="card"><h3>Annual cash flow (${cur} M)</h3>${table(yr(''), [seriesM(C.collections)('Total cash inflow'), seriesM(C.outflow.map((v) => -v))('Total cash outflow'), seriesM(C.fcf, false, true)('Net cash flow'), seriesM(C.opening)('Opening cash balance'), seriesM(C.funding)('Funding received'), seriesM(C.closing, false, true)('Closing cash balance')].join(''))}
${svgBars('Net cash flow and closing cash', [{ label: 'Net cash flow', color: '#3b9ff0', values: toM(C.fcf) }], `${cur} M`)}</div>
<div class="card"><h3>Funding need and use of funds (${cur} M)</h3><table><tbody>${kv(`Peak cumulative deficit (${years[C.peakFundingIndex]})`, mm(C.peakFundingNeed))}${kv(`Minimum cash buffer (${inputs.cash.minBufferMonths} months)`, mm(C.bufferNeed))}${kv('Total funding need', mm(C.totalFundingNeed), true)}${kv('Proposed round size', mm(F.initialAmount * 1e6))}${kv('Expected timing', qLabel(F.initialYearIndex, F.initialQuarter))}</tbody></table>
${table(['Use of funds', '%', `${cur} M`], inputs.cash.useOfFunds.map((u) => `<tr><td class="l">${u.label}</td>${td(fmtPct(u.pct), 'n')}${td(mm(u.pct * F.initialAmount * 1e6), 'n')}</tr>`).join('') + row('Total', [fmtPct(C.useOfFundsTotalPct), mm(C.useOfFundsTotalPct * F.initialAmount * 1e6)], 'b'))}
<h3>Key assumptions</h3><table><tbody>${kv('Customer payment terms (days)', String(inputs.cash.collectionDays))}${kv('Upfront payment for implementation', fmtPct(inputs.cash.upfrontPct))}${kv(`Initial cash balance (${cur} M)`, mm(inputs.cash.initialCash * 1e6))}${kv('Minimum cash buffer (months)', String(inputs.cash.minBufferMonths))}</tbody></table></div>
</div>

<h2>7 · Valuation &amp; Investor Returns</h2>
<div class="grid2">
<div class="card"><h3>Exit assumptions</h3><table><tbody>${kv('Exit year', String(sel.exitYear))}${kv('Valuation approach', APPROACH_LABELS[V.approach])}${kv('Exit multiple – revenue', fmtX(V.revenueMultiple))}${kv('Exit multiple – EBITDA', fmtX(V.ebitdaMultiple))}${kv('Discount rate', fmtPct(V.discountRate, 1))}${kv('Terminal growth rate', fmtPct(V.terminalGrowth, 1))}${kv('Exit discount to public comps', fmtPct(V.exitDiscount))}</tbody></table></div>
<div class="card"><h3>Funding assumptions</h3><table><tbody>${kv(`Initial funding (${cur} M)`, mm(F.initialAmount * 1e6), false, 'from Screen 6')}${kv('Funding round timing', qLabel(F.initialYearIndex, F.initialQuarter))}${kv(`Pre-money valuation (${cur} M)`, mm(F.preMoney * 1e6), false, `post-money ${mm(inv.postMoney * 1e6)}`)}${kv('Investor ownership (new)', fmtPct(inv.ownershipInitial, 1))}${kv(`Future funding (${cur} M)`, mm(F.futureAmount * 1e6), false, F.futureAmount > 0 ? `${qLabel(F.futureYearIndex, F.futureQuarter)} at ${mm(F.futurePreMoney * 1e6)} pre-money` : 'none')}</tbody></table></div>
</div>
<div class="card"><h3>Projected financials (${cur} M)</h3>${table(yr('Metric'), [seriesM(m.pl.revenue)('Revenue'), seriesM(m.pl.ebitda)('EBITDA'), seriesM(C.fcf)('Free cash flow (before funding)'), seriesM(C.closing)('Closing cash (after funding)'), row(`Discount factor at ${fmtPct(V.discountRate, 1)}`, m.val.discountFactors.map((v) => v.toFixed(3))), seriesM(years.map((_, t) => (t <= m.val.exitIndex ? m.val.pvFcf[t] : 0)))('Present value of free cash flow')].join(''))}</div>
<div class="grid2">
<div class="card"><h3>Implied valuation at exit (${cur} M)</h3><table><tbody>${kv('Exit revenue', mm(sel.exitRevenue))}${kv('Exit EBITDA', neg(mm(sel.exitEbitda), sel.exitEbitda))}${kv('Valuation basis', sel.multipleOrRate)}${kv('Enterprise value before discount', mm(sel.evAtExitGross))}${kv(`Less: exit discount (${fmtPct(V.exitDiscount)})`, mm(-(sel.evAtExitGross - sel.evAtExit)))}${kv('Enterprise value at exit', mm(sel.evAtExit), true)}${kv('Plus: net cash at exit', mm(sel.netCashAtExit))}${kv('Equity value at exit', mm(sel.equityAtExit), true)}${kv('Enterprise value today (PV)', mm(sel.evToday))}</tbody></table>
${table(['Approach', 'Basis', 'EV at exit', 'Equity at exit', 'EV today'], m.val.all.map((a) => `<tr class="${a.approach === V.approach ? 'b' : ''}"><td class="l">${a.label}</td><td class="sub">${a.multipleOrRate}</td>${a.meaningful ? td(mm(a.evAtExit), 'n') + td(mm(a.equityAtExit), 'n') + td(mm(a.evToday), 'n') : `<td class="sub" colspan="3">Not meaningful: ${a.note}</td>`}</tr>`).join(''))}</div>
<div class="card"><h3>Investor returns (initial round)</h3><table><tbody>${kv(`Initial investment (${cur} M)`, mm(inv.initialAmount))}${kv('Ownership (new)', fmtPct(inv.ownershipInitial, 1))}${kv('Ownership at exit', fmtPct(inv.ownershipAtExit, 1))}${kv(`Equity value at exit (${cur} M)`, mm(sel.equityAtExit))}${kv(`Investor equity value at exit (${cur} M)`, mm(inv.equityAtExit), true)}${kv('Money multiple', fmtX(inv.moneyMultiple), true)}${kv('Holding period (years)', fmtNum(inv.holdingYears, 2))}${kv('IRR (annualised)', fmtPct(inv.irr, 1), true)}</tbody></table>
<h3>Sensitivity: investor IRR (money multiple)</h3>${table([m.val.sensitivity.rowLabel, ...m.val.sensitivity.years.map(String)], m.val.sensitivity.rows.map((r) => `<tr class="${r.isBase ? 'b' : ''}"><td class="l">${r.label}</td>${r.cells.map((c) => td(Number.isFinite(c.irr) ? `${fmtPct(c.irr)} (${fmtNum(c.mom, 1)}x)` : 'n/m', 'n')).join('')}</tr>`).join(''))}</div>
</div>

<div class="foot">Lumiom Valuation Model · ${SCENARIO_LABELS[o.scenario]} case · generated ${date} · all figures in ${cur}${cur !== 'USD' ? ` at ${o.fx} per USD` : ''}. Calculated by the Lumiom Valuation Modeller; this report is a snapshot of the inputs at the time of download.</div>
</div></body></html>`
  return html
}

export function downloadReport(html: string, filename: string) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
