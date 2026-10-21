import type { Currency } from '../model/types'

export const CURRENCY_SYMBOL: Record<Currency, string> = { USD: '$', EUR: '€', INR: '₹' }

const neg = (s: string, v: number) => (v < 0 ? `(${s})` : s)

/** Millions, 1 decimal, negatives in parentheses: 12.3 / (0.5) */
export function fmtM(v: number, decimals = 1): string {
  if (!Number.isFinite(v)) return 'n/m'
  const a = Math.abs(v) / 1e6
  return neg(a.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }), v)
}

/** Whole units with thousands separators: 1,234,567 */
export function fmtInt(v: number, decimals = 0): string {
  if (!Number.isFinite(v)) return 'n/m'
  const a = Math.abs(v)
  return neg(a.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }), v)
}

export function fmtNum(v: number, decimals = 1): string {
  if (!Number.isFinite(v)) return 'n/m'
  return neg(Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }), v)
}

export function fmtPct(v: number, decimals = 0): string {
  if (!Number.isFinite(v)) return 'n/m'
  return neg(`${(Math.abs(v) * 100).toFixed(decimals)}%`, v)
}

export function fmtX(v: number, decimals = 1): string {
  if (!Number.isFinite(v)) return 'n/m'
  return `${v.toFixed(decimals)}x`
}

/** Compact headline money: $22.5M, €1.2B, ₹980M */
export function fmtMoneyCompact(v: number, currency: Currency, fx: number): string {
  if (!Number.isFinite(v)) return 'n/m'
  const x = v * fx
  const a = Math.abs(x)
  const sym = CURRENCY_SYMBOL[currency]
  let s: string
  if (a >= 1e9) s = `${sym}${(a / 1e9).toFixed(a >= 1e10 ? 0 : 1)}B`
  else if (a >= 1e6) s = `${sym}${(a / 1e6).toFixed(a >= 1e8 ? 0 : 1)}M`
  else if (a >= 1e3) s = `${sym}${(a / 1e3).toFixed(0)}K`
  else s = `${sym}${a.toFixed(0)}`
  return x < 0 ? `(${s})` : s
}

export function fmtMonths(v: number | null): string {
  if (v === null) return 'Beyond horizon'
  return `${v} months`
}

export function fmtYears(v: number | null, decimals = 1): string {
  if (v === null || !Number.isFinite(v)) return 'Not reached'
  return `${v.toFixed(decimals)} years`
}
