import type { ReactNode } from 'react'
import { useFmt } from './components'

// Validated categorical palette (passes CVD and normal-vision separation checks).
export const SERIES = ['#1d4ed8', '#3b9ff0', '#6d28d9', '#a78bfa'] as const
export const NEUTRAL = '#94a3b8'
export const GOOD = '#0f7b3e'
export const BAD = '#b42318'

export const axisStyle = { fontSize: 11, fill: '#64748b' }
export const gridStyle = { stroke: '#e9edf3', strokeDasharray: '2 4' }

export function ChartLegend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="chart-legend">
      {items.map((it) => (
        <span key={it.label}>
          <i style={{ background: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  )
}

/** Tooltip/axis formatter helpers that respect the display currency. */
export function useChartFmt() {
  const f = useFmt()
  return {
    m: (v: number) => `${f.m(v)}`,
    mLabel: (v: number) => `${f.sym}${f.m(v)}M`,
    axisM: (v: number) => (v * f.rate) / 1e6,
    unit: f.mUnit,
  }
}

export function ChartBlock({ title, children }: { title?: ReactNode; children: ReactNode }) {
  return (
    <div>
      {title && <div className="chart-title">{title}</div>}
      {children}
    </div>
  )
}
