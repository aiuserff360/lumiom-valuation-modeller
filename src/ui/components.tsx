import { useEffect, useState, type ReactNode } from 'react'
import { useInput, useStore } from '../state/store'
import { fmtInt, fmtM, fmtNum, fmtPct, CURRENCY_SYMBOL } from './format'

// ---------------------------------------------------------------- Cards & layout

export function Card({ n, title, subtitle, children, className = '', right, flat }: { n?: number | string; title: ReactNode; subtitle?: ReactNode; children?: ReactNode; className?: string; right?: ReactNode; flat?: boolean }) {
  return (
    <section className={`card ${className}`}>
      <header className="card-head">
        {n !== undefined && <span className="badge">{n}</span>}
        <div className="card-titles">
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {right && <div className="card-right">{right}</div>}
      </header>
      <div className={flat ? 'card-body flat' : 'card-body'}>{children}</div>
    </section>
  )
}

export function Kpi({ label, value, sub, tone, hint }: { label: ReactNode; value: ReactNode; sub?: ReactNode; tone?: 'good' | 'bad'; hint?: string }) {
  return (
    <div className={`kpi ${tone ?? ''}`} title={hint}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  )
}

export function Legend() {
  return (
    <div className="legend">
      <span>
        <i className="sw sw-input" /> Editable input
      </span>
      <span>
        <i className="sw sw-linked" /> Linked from another screen
      </span>
      <span>
        <i className="sw sw-calc" /> Calculated output
      </span>
    </div>
  )
}

export function Note({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warn' }) {
  return (
    <div className={`note note-${tone}`}>
      <span className="note-icon">{tone === 'warn' ? '!' : 'i'}</span>
      <div>{children}</div>
    </div>
  )
}

export function Takeaways({ items, title = 'Key Takeaways', n, className = '' }: { items: ReactNode[]; title?: string; n?: number | string; className?: string }) {
  return (
    <Card n={n} title={title} className={className}>
      <ul className="takeaways">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </Card>
  )
}

export function NextStep({ title, text, label, onClick }: { title: string; text: string; label: string; onClick: () => void }) {
  return (
    <section className="card next-step">
      <header className="card-head">
        <span className="badge">→</span>
        <div className="card-titles">
          <h3>Next Step</h3>
          <p className="next-title">{title}</p>
        </div>
      </header>
      <p className="next-text">{text}</p>
      <button className="cta" type="button" onClick={onClick}>
        {label} →
      </button>
    </section>
  )
}

// ---------------------------------------------------------------- Display

export type Kind = 'money' | 'moneyM' | 'moneyK' | 'int' | 'pct' | 'number' | 'num2' | 'x'

/** Formats stored (USD / fraction) values in the display currency. */
export function useFmt() {
  const { currency, fx } = useStore()
  const rate = fx[currency]
  const sym = CURRENCY_SYMBOL[currency]
  return {
    sym,
    rate,
    currency,
    money: (v: number, decimals = 0) => fmtInt(v * rate, decimals),
    k: (v: number, decimals = 0) => fmtInt((v * rate) / 1000, decimals),
    m: (v: number, decimals = 1) => fmtM(v * rate, decimals),
    mUnit: `${currency} M`,
    kUnit: `${currency} '000`,
  }
}

export function fmtKind(v: number, kind: Kind, f: ReturnType<typeof useFmt>, decimals?: number): string {
  switch (kind) {
    case 'money':
      return f.money(v, decimals ?? 0)
    case 'moneyK':
      return f.k(v, decimals ?? 0)
    case 'moneyM':
      return f.m(v, decimals ?? 1)
    case 'int':
      return fmtInt(v, decimals ?? 0)
    case 'pct':
      return fmtPct(v, decimals ?? 0)
    case 'num2':
      return fmtNum(v, decimals ?? 2)
    case 'x':
      return Number.isFinite(v) ? `${v.toFixed(decimals ?? 1)}x` : 'n/m'
    default:
      return fmtNum(v, decimals ?? 1)
  }
}

export function Val({ v, kind = 'moneyM', decimals, className = 'calc', bold, dash }: { v: number; kind?: Kind; decimals?: number; className?: string; bold?: boolean; dash?: boolean }) {
  const f = useFmt()
  const s = dash && v === 0 ? '–' : fmtKind(v, kind, f, decimals)
  return <td className={`${className} num ${bold ? 'bold' : ''} ${v < 0 ? 'neg' : ''}`}>{s}</td>
}

// ---------------------------------------------------------------- Inputs

interface NumInputProps {
  path: string
  kind?: Kind
  decimals?: number
  min?: number
  max?: number
  width?: number
  suffix?: string
}

/**
 * Editable numeric input bound to an input path. Money inputs are stored in USD and
 * displayed in the selected currency; percentages are stored as fractions.
 */
export function NumInput({ path, kind = 'number', decimals, min, max, width }: NumInputProps) {
  const inp = useInput<number>(path)
  const { currency, fx } = useStore()
  const rate = fx[currency]
  const isMoney = kind === 'money' || kind === 'moneyM' || kind === 'moneyK'
  const moneyScale = kind === 'moneyK' ? 1 / 1000 : 1
  const toDisplay = (v: number) => (isMoney ? v * rate * moneyScale : kind === 'pct' ? v * 100 : v)
  const fromDisplay = (v: number) => (isMoney ? v / rate / moneyScale : kind === 'pct' ? v / 100 : v)
  const dec = decimals ?? (kind === 'money' || kind === 'int' || kind === 'pct' || kind === 'moneyK' ? 0 : 1)
  const format = (v: number) => {
    const d = toDisplay(v)
    if (kind === 'money' || kind === 'int' || kind === 'moneyK') return fmtInt(d, dec)
    if (kind === 'pct') return `${d.toFixed(dec)}%`
    return d.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })
  }

  const [focused, setFocused] = useState(false)
  const [text, setText] = useState('')
  useEffect(() => {
    if (!focused) setText(format(inp.value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inp.value, focused, currency, rate])

  const commit = () => {
    const raw = parseFloat(text.replace(/[^0-9.\-]/g, ''))
    if (Number.isFinite(raw)) {
      let v = fromDisplay(raw)
      if (kind === 'int') v = Math.round(v)
      if (min !== undefined) v = Math.max(min, v)
      if (max !== undefined) v = Math.min(max, v)
      if (Math.abs(v - inp.value) > 1e-12) inp.set(v)
    }
    setFocused(false)
  }

  return (
    <input
      className="inp"
      style={width ? { width } : undefined}
      value={focused ? text : format(inp.value)}
      title={inp.isScaled ? 'Scenario-scaled from the base case. Editing here updates the base case.' : 'Editable input'}
      onFocus={(e) => {
        setFocused(true)
        setText(String(+toDisplay(inp.value).toFixed(6)))
        const el = e.target
        requestAnimationFrame(() => el.select())
      }}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        if (e.key === 'Escape') setFocused(false)
      }}
      inputMode="decimal"
    />
  )
}

export function SelectInput<T extends string | number>({ path, options, width }: { path: string; options: { value: T; label: string }[]; width?: number }) {
  const inp = useInput<T>(path)
  const isNum = typeof options[0]?.value === 'number'
  return (
    <select className="inp sel" style={width ? { width } : undefined} value={String(inp.value)} onChange={(e) => inp.set((isNum ? Number(e.target.value) : e.target.value) as T)}>
      {options.map((o) => (
        <option key={String(o.value)} value={String(o.value)}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

/** Table cell wrapper for an input */
export function InCell(props: NumInputProps & { className?: string }) {
  const { className = '', ...rest } = props
  return (
    <td className={`in num ${className}`}>
      <NumInput {...rest} />
    </td>
  )
}

export function YearHead({ years, first, total, extra, after }: { years: number[]; first?: ReactNode; total?: string; extra?: ReactNode; after?: ReactNode }) {
  return (
    <thead>
      <tr>
        <th className="left">{first ?? ''}</th>
        {extra}
        {years.map((y) => (
          <th key={y}>{y}</th>
        ))}
        {total && <th>{total}</th>}
        {after}
      </tr>
    </thead>
  )
}

/** Row of computed values by year with optional total */
export function Row({ label, values, kind = 'moneyM', total, bold, className = 'calc', decimals, totalValue, indent, dash }: { label: ReactNode; values: number[]; kind?: Kind; total?: boolean; bold?: boolean; className?: string; decimals?: number; totalValue?: number; indent?: boolean; dash?: boolean }) {
  const t = totalValue ?? values.reduce((a, b) => a + b, 0)
  return (
    <tr className={bold ? 'total' : ''}>
      <td className={`left ${indent ? 'indent' : ''}`}>{label}</td>
      {values.map((v, i) => (
        <Val key={i} v={v} kind={kind} className={className} bold={bold} decimals={decimals} dash={dash} />
      ))}
      {total && <Val v={t} kind={kind} className={className} bold decimals={decimals} />}
    </tr>
  )
}

/** Two-column label / value row */
export function KV({ label, v, kind = 'money', decimals, className = 'calc', bold, note }: { label: ReactNode; v: number; kind?: Kind; decimals?: number; className?: string; bold?: boolean; note?: ReactNode }) {
  return (
    <tr className={bold ? 'total' : ''}>
      <td className="left">{label}</td>
      <Val v={v} kind={kind} decimals={decimals} className={className} bold={bold} />
      {note !== undefined && <td className="left sub">{note}</td>}
    </tr>
  )
}
