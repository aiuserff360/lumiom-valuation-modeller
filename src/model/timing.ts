// Revenue recognition and completion timing helpers.
// Deals are assumed to be signed uniformly through the year (mid-month, 12 cohorts).

/**
 * Fraction of a one-time amount recognised in year k (k = 0 is the signing year)
 * when it is recognised evenly over `months` months from signing.
 * Fractions sum to 1.
 */
export function spreadFractions(months: number): number[] {
  if (months <= 0) return [1]
  const out: number[] = []
  for (let i = 0; i < 12; i++) {
    const start = i + 0.5
    const end = start + months
    for (let k = 0; 12 * k < end; k++) {
      const ys = 12 * k
      const ye = 12 * (k + 1)
      const overlap = Math.max(0, Math.min(end, ye) - Math.max(start, ys))
      out[k] = (out[k] ?? 0) + overlap / months / 12
    }
  }
  return out
}

/**
 * Fraction of deals signed in a year that reach completion in year k after signing,
 * when delivery takes `months` months.
 */
export function completionFractions(months: number): number[] {
  if (months <= 0) return [1]
  const out: number[] = []
  for (let i = 0; i < 12; i++) {
    const k = Math.floor((i + 0.5 + months) / 12)
    out[k] = (out[k] ?? 0) + 1 / 12
  }
  for (let k = 0; k < out.length; k++) out[k] = out[k] ?? 0
  return out
}

/** Convolve an annual series of "originations" with a lag schedule (fractions by year offset). */
export function lagSeries(origin: number[], fractions: number[], nYears: number): number[] {
  const out = new Array<number>(nYears).fill(0)
  for (let s = 0; s < nYears; s++) {
    for (let k = 0; k < fractions.length; k++) {
      const t = s + k
      if (t < nYears) out[t] += origin[s] * fractions[k]
    }
  }
  return out
}
