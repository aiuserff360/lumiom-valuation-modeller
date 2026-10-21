import { useEffect, useState } from 'react'
import { StoreProvider, useStore } from './state/store'
import { PERIOD_OPTIONS, SCENARIO_LABELS, START_YEAR, type Currency, type Scenario } from './model/types'
import { Legend } from './ui/components'
import { Overview } from './screens/Overview'
import { Revenue } from './screens/Revenue'
import { Implementation } from './screens/Implementation'
import { CompanyCosts } from './screens/CompanyCosts'
import { Profitability } from './screens/Profitability'
import { CashFlow } from './screens/CashFlow'
import { Valuation } from './screens/Valuation'

export const SCREENS = [
  { id: 'overview', nav: 'Overview', title: 'Overview', sub: 'Summary of assumptions, financial performance, funding needs and valuation.', C: Overview },
  { id: 'revenue', nav: 'Revenue Assumptions', title: 'Revenue Assumptions', sub: 'Define customer acquisition, pricing and revenue timing.', C: Revenue },
  { id: 'implementation', nav: 'Implementation & Unit Costs', title: 'Implementation & Unit Costs', sub: 'Define the cost to onboard a customer, implement use cases and provide ongoing services.', C: Implementation },
  { id: 'company', nav: 'Company Cost Assumptions', title: 'Company Cost Assumptions', sub: 'Define the people, infrastructure and operating costs to build, deliver and scale Lumiom.', C: CompanyCosts },
  { id: 'profitability', nav: 'Profitability & Unit Economics', title: 'Profitability & Unit Economics', sub: 'View financial performance by customer, cohort and company to assess profitability and scalability.', C: Profitability },
  { id: 'cash', nav: 'Cash Flow & Funding Needs', title: 'Cash Flow & Funding Needs', sub: 'Project cash inflows and outflows, runway and external funding needs.', C: CashFlow },
  { id: 'valuation', nav: 'Valuation & Investor Returns', title: 'Valuation & Investor Returns', sub: 'Estimate enterprise value based on projected cash flows and investment requirements.', C: Valuation },
] as const

export type ScreenId = (typeof SCREENS)[number]['id']

function useHashRoute(): [ScreenId, (id: ScreenId) => void] {
  const read = (): ScreenId => {
    const h = window.location.hash.replace(/^#\/?/, '')
    return (SCREENS.some((s) => s.id === h) ? h : 'revenue') as ScreenId
  }
  const [id, setId] = useState<ScreenId>(read)
  useEffect(() => {
    const on = () => setId(read())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return [
    id,
    (next) => {
      window.location.hash = `/${next}`
      window.scrollTo({ top: 0 })
    },
  ]
}

function Logo() {
  return (
    <svg className="logo" viewBox="0 0 32 32" aria-hidden>
      <path d="M4 22c4-10 8-10 12 0s8 10 12 0" fill="none" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" />
      <path d="M4 22c4-10 8-10 12 0" fill="none" stroke="#a855f7" strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}

function SettingsPopover() {
  const s = useStore()
  const [open, setOpen] = useState(false)
  const ss = s.scenarioSettings
  const setF = (k: Scenario, v: number) => s.setScenarioSettings({ ...ss, factors: { ...ss.factors, [k]: v } })
  const toggle = (k: 'scaleCustomers' | 'scaleHeadcount' | 'scaleOperatingCosts' | 'scaleCapex') => s.setScenarioSettings({ ...ss, [k]: !ss[k] })
  return (
    <div className="popover-wrap">
      <button className="icon-btn" onClick={() => setOpen((o) => !o)} title="Scenario and currency settings" type="button">
        ⚙ Settings
      </button>
      {open && (
        <div className="popover">
          <h4>Scenarios</h4>
          <p className="help">Base is where you enter your assumptions. Aggressive and Conservative multiply the base-case volume drivers by their factor. Unit prices, unit costs, rates and durations are the same in every scenario.</p>
          {(['conservative', 'base', 'aggressive'] as Scenario[]).map((k) => (
            <div className="row" key={k}>
              <span>{SCENARIO_LABELS[k]} factor</span>
              <input type="number" step={0.05} value={ss.factors[k]} disabled={k === 'base'} onChange={(e) => setF(k, Math.max(0, Number(e.target.value)))} />
            </div>
          ))}
          <h4 style={{ marginTop: 10 }}>Factor applies to</h4>
          {(
            [
              ['scaleCustomers', 'New customers per year'],
              ['scaleHeadcount', 'Company headcount'],
              ['scaleOperatingCosts', 'Infrastructure & operating cost lines'],
              ['scaleCapex', 'Product & technology investment'],
            ] as const
          ).map(([k, label]) => (
            <label className="row" key={k} style={{ cursor: 'pointer' }}>
              <span>{label}</span>
              <input type="checkbox" checked={ss[k]} onChange={() => toggle(k)} />
            </label>
          ))}
          <hr />
          <h4>Exchange rates (per 1 USD)</h4>
          {(['EUR', 'INR'] as Currency[]).map((c) => (
            <div className="row" key={c}>
              <span>{c}</span>
              <input type="number" step={0.01} value={s.fx[c]} onChange={(e) => s.setFx(c, Math.max(0.0001, Number(e.target.value)))} />
            </div>
          ))}
          <p className="help">The model is calculated in USD and converted for display and input entry.</p>
          <hr />
          <div className="row">
            <span className="help" style={{ margin: 0 }}>{s.editCount} input{s.editCount === 1 ? '' : 's'} changed from defaults</span>
            <button
              className="icon-btn"
              type="button"
              onClick={() => {
                if (confirm('Reset all inputs to the default assumptions?')) s.resetInputs()
              }}
            >
              Reset inputs
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Shell() {
  const s = useStore()
  const [route, go] = useHashRoute()
  const screen = SCREENS.find((x) => x.id === route) ?? SCREENS[0]
  const Screen = screen.C
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-name">
            <Logo /> Lumiom
          </div>
          <div className="brand-tag">Enterprise Transformation Intelligence</div>
        </div>
        <nav className="nav">
          {SCREENS.map((sc, i) => (
            <button key={sc.id} className={sc.id === route ? 'active' : ''} onClick={() => go(sc.id)} type="button">
              <span className="num">{i + 1}</span>
              <span>{sc.nav}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          {SCENARIO_LABELS[s.scenario]} case · {s.period} years · {s.currency}
        </div>
      </aside>
      <main className="main">
        <div className="page-head">
          <div>
            <h1>{screen.title}</h1>
            <p className="sub">{screen.sub}</p>
          </div>
          <div className="controls">
            <div className="control">
              <label>Scenario</label>
              <div className="seg">
                {(['conservative', 'base', 'aggressive'] as Scenario[]).map((k) => (
                  <button key={k} className={s.scenario === k ? 'active' : ''} onClick={() => s.setScenario(k)} type="button">
                    {SCENARIO_LABELS[k]}
                  </button>
                ))}
              </div>
            </div>
            <div className="control">
              <label>Projection period</label>
              <select value={s.period} onChange={(e) => s.setPeriod(Number(e.target.value))}>
                {PERIOD_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n} Years ({START_YEAR} – {START_YEAR + n - 1})
                  </option>
                ))}
              </select>
            </div>
            <div className="control">
              <label>Currency</label>
              <select value={s.currency} onChange={(e) => s.setCurrency(e.target.value as Currency)}>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="INR">INR</option>
              </select>
            </div>
            <div className="control">
              <label>&nbsp;</label>
              <SettingsPopover />
            </div>
          </div>
        </div>
        <div className="head-meta">
          <span className="scenario-tag">
            {s.scenario === 'base' ? 'Base case: your inputs.' : `${SCENARIO_LABELS[s.scenario]} case: volume drivers at ${Math.round(s.factor * 100)}% of the base case.`}
          </span>
          <Legend />
        </div>
        <Screen go={go} />
      </main>
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  )
}
