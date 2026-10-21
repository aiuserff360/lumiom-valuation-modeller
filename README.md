# Lumiom Valuation Modeller

An interactive, fully linked financial model for Lumiom (Enterprise Transformation Intelligence). Seven screens take you from customer acquisition and pricing through delivery costs, company costs, profitability, cash flow and funding to valuation and investor returns. Every number on every screen is recalculated live from a single calculation engine, so the screens always tie.

## Running it

```bash
npm install
npm run dev        # local dev server (prints the URL)
npm test           # unit tests for the calculation engine
npm run build      # production build into dist/
npm run preview    # serve the production build locally
```

Deploying: pushing to `main` on GitHub runs `.github/workflows/deploy.yml`, which tests, builds and publishes `dist/` to GitHub Pages (enable Pages with source "GitHub Actions" in the repository settings). The build uses a relative base path, so it works at any URL.

## Report download

The app opens on **Revenue Assumptions** so the natural flow is Screens 2 → 7, then back to the Overview. The Overview has a **Download report (HTML)** button that generates a single self-contained HTML file (`src/report/report.ts`, a template filled from the live model) with every assumption, unit cost, company cost, the P&L, cash flow and funding need, valuation, sensitivities and the Investor Lens, for the scenario, period and currency on screen at that moment. It opens in any browser without a server and prints cleanly to PDF. `npx tsx scripts/report-sample.ts out.html` writes a base-case sample.

## Global controls

| Control | Behaviour |
|---|---|
| **Scenario** (Conservative / Base / Aggressive) | **Base is where you enter your assumptions.** Aggressive multiplies the base-case volume drivers by 1.5 and Conservative by 0.5 (new customers per year, company headcount, infrastructure and operating cost lines, product investment). Unit prices, unit costs, rates and durations are the same in every scenario. There is one set of inputs: editing in Aggressive or Conservative writes the equivalent base value back (a value typed in Aggressive is divided by 1.5). Factors and which inputs they apply to can be changed in **Settings**; untick the cost items to hold the cost base fixed and see operating leverage. |
| **Projection period** | 3, 5, 7 or 10 years from 2026. Per-year inputs exist for all ten years and are sliced to the period. The exit year defaults to the last year of the period. |
| **Currency** | USD, EUR or INR. The model is calculated in USD; display values and input fields are converted at the exchange rates in Settings. Typing a value in EUR or INR stores it back in USD. |

Every blue cell is an editable input and is saved in the browser. Inputs always live on the screen where they are first used; later screens show them as green linked cells. Grey cells are calculated. **Settings → Reset inputs** restores the default assumptions.

## How the screens link

1. **Overview** – executive summary of the current scenario: headline KPIs, an **Investor Lens** (revenue CAGR, recurring share, gross and EBITDA margins, Rule of 40, LTV/CAC, CAC payback, burn multiple, round coverage, money multiple and IRR, each graded Strong / Watch / Weak against common venture rules of thumb and linked to its source screen), then revenue assumptions and forecast, unit costs, company costs, P&L, cash flow and funding need, valuation and investor returns.
2. **Revenue Assumptions** – new customers, pricing and billing nature per component, contract term, retention, use case ramp, expansion, attach rate and revenue recognition period. Produces cohorts, active customers, active use cases, recognised revenue and billings.
3. **Implementation & Unit Costs** – project-based costs: enterprise onboarding effort and monthly cost per role, use case implementation effort and cost, reuse for additional use cases, recurring service cost per customer and the year-by-year effort reduction. Produces cost of revenue and delivery demand in FTE-months.
4. **Company Cost Assumptions** – editable workforce plan for the non-delivery functions, infrastructure and technology, other operating expenses, tax rate and depreciation period. The Implementation Delivery row is read-only: its headcount is required FTE-months ÷ 12 (from Screens 2 and 3) and its cost is already in cost of revenue, so Screens 3 and 4 are mutually exclusive.
5. **Profitability & Unit Economics** – outputs only: per-customer lifecycle economics, the company P&L, bridge, margins, unit metrics and a ±20% sensitivity on net profit.
6. **Cash Flow & Funding Needs** – collections from billings with upfront payments and a collection lag, cash outflows, capex, free cash flow, cash balance, runway, peak funding need, the proposed round size and timing, and use of funds.
7. **Valuation & Investor Returns** – exit and valuation terms (round size and timing are linked from Screen 6); EV/Revenue, EV/EBITDA, DCF with perpetuity growth and DCF with an exit multiple, all computed every time; equity value, present value today, investor ownership, dilution, money multiple, IRR and a sensitivity grid.

## Calculation methodology

All formulas live in `src/model/engine.ts` and are covered by `src/model/engine.test.ts`.

**Customers.** New customers signed in year *s* stay for the contract term, then the annual retention rate applies: active in year *t* = round(new<sub>s</sub> × r<sup>max(0, t−s−term+1)</sup>). Additional use cases per customer ramp evenly over the ramp-up period (e.g. 0.5, 1.0, 1.5 for 1.5 use cases over 3 years).

**Revenue.** Recurring components are charged to every active customer each year. Platform and managed services fees grow by the expansion rate per year of tenure; managed services are weighted by the attach rate; use case fees scale with ramped use cases. One-time components are charged per signing and recognised evenly over the recognition period, with signings spread uniformly through the year (6 months → 75% in the signing year, 25% the next).

**Cost of revenue.** First deployment cost = onboarding labour + first use case labour (effort × monthly cost per role) + direct costs. Additional use case cost applies each line's reuse reduction. The year-by-year effort reduction lowers labour only. Implementation cost is incurred on the same schedule as implementation revenue (percentage of completion). Recurring service cost = fixed per-customer lines × active customers + per-use-case lines × active use cases. Required FTE-months follow the same volumes.

**Operating costs.** Headcount × fully loaded cost per non-delivery function, plus infrastructure and other opex lines. Delivery headcount = required FTE-months ÷ 12 rounded up (derived, not an input); delivery cost = project labour at the Screen 3 role costs, which sits in cost of revenue, never in company costs.

**Investor lens.** CAC = Sales & Marketing payroll plus marketing spend ÷ new customers; CAC payback = CAC ÷ monthly first-year recurring gross profit per customer; LTV = retention-weighted 5-year gross profit per customer; Rule of 40 = exit-year revenue growth + EBITDA margin; burn multiple = total cash burned in loss-making years ÷ recurring revenue in the last loss-making year.

**P&L.** Gross profit = revenue − cost of revenue. EBITDA = gross profit − operating costs. Capex is depreciated straight-line from the year of spend. Tax applies to EBIT with full loss carry-forward. Net profit = EBIT − tax.

**Cash.** Recurring fees are billed in the year of service. One-time fees are billed at the upfront percentage on signing and the remainder on completion. Collections = billings × (1 − lag) + prior-year billings × lag, where lag = collection days ÷ 365. Collections reconcile to revenue plus the change in deferred/unbilled revenue minus the change in receivables. Free cash flow = collections − cost of revenue − operating costs − tax − capex. Peak funding need = deepest cumulative pre-funding deficit; recommended round = peak need + buffer months of outflow in that year. Runway is measured on a monthly path with funding injected at the start of its quarter.

**Valuation.** Enterprise value at exit: revenue × multiple, EBITDA × multiple, or FCF × (1+g) ÷ (r−g); an optional exit discount is applied. Equity value = EV + net cash at exit (closing cash, no debt). EV today = Σ FCF<sub>t</sub> ÷ (1+r)<sup>t+1</sup> through exit + EV at exit ÷ (1+r)<sup>exit+1</sup>. Investor ownership = round ÷ (pre-money + round), diluted by any later round before exit. Money multiple = investor share of equity ÷ investment; IRR = multiple<sup>1/years</sup> − 1 from the funding quarter to the end of the exit year.

## Project structure

```
src/model/      pure calculation engine (types, defaults, timing, scenario scaling, engine, sensitivity, tests)
src/state/      React store: scenario, period, currency, FX, per-scenario overrides, persistence
src/ui/         formatting, shared components (cards, KPI tiles, inputs, tables), chart theme
src/screens/    the seven screens
scripts/dump.ts prints headline numbers for all scenarios: npx tsx scripts/dump.ts
docs/reference/ the original screen designs
```
