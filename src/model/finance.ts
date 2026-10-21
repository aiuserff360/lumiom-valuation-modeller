export const sum = (a: number[]): number => a.reduce((x, y) => x + y, 0)

export const cumulative = (a: number[]): number[] => {
  let acc = 0
  return a.map((v) => (acc += v))
}

export const addSeries = (...series: number[][]): number[] =>
  series[0].map((_, i) => series.reduce((acc, s) => acc + (s[i] ?? 0), 0))

export const scaleSeries = (s: number[], k: number): number[] => s.map((v) => v * k)

export const safeDiv = (a: number, b: number): number => (b === 0 ? 0 : a / b)

/** Net present value of cash flows, each received at end of year t (t = 0 is the first year). */
export function npv(rate: number, flows: number[]): number {
  return flows.reduce((acc, cf, t) => acc + cf / Math.pow(1 + rate, t + 1), 0)
}

/** IRR by bisection on annual flows (flow[0] at t = 0). Returns NaN if no sign change. */
export function irr(flows: number[]): number {
  const hasPos = flows.some((f) => f > 0)
  const hasNeg = flows.some((f) => f < 0)
  if (!hasPos || !hasNeg) return NaN
  const f = (r: number) => flows.reduce((acc, cf, t) => acc + cf / Math.pow(1 + r, t), 0)
  let lo = -0.99
  let hi = 10
  let flo = f(lo)
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2
    const fm = f(mid)
    if (Math.abs(fm) < 1e-9) return mid
    if ((fm < 0) === (flo < 0)) {
      lo = mid
      flo = fm
    } else {
      hi = mid
    }
  }
  return (lo + hi) / 2
}

/**
 * Years until a cumulative series first turns non-negative, interpolated within the year.
 * Returns null if it never does.
 */
export function paybackYears(flows: number[]): number | null {
  let cum = 0
  for (let t = 0; t < flows.length; t++) {
    const prev = cum
    cum += flows[t]
    if (cum >= 0) {
      if (t === 0 && flows[0] >= 0) return 0
      const frac = flows[t] > 0 ? -prev / flows[t] : 0
      return t + Math.min(1, Math.max(0, frac))
    }
  }
  return null
}
