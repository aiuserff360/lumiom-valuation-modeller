// Writes a sample report for the base case: npx tsx scripts/report-sample.ts <out.html>
import { writeFileSync } from 'node:fs'
import { DEFAULT_INPUTS } from '../src/model/defaults'
import { compute } from '../src/model/engine'
import { runSensitivity } from '../src/model/sensitivity'
import { buildReport } from '../src/report/report'

const inputs = DEFAULT_INPUTS
const m = compute(inputs, 5)
const html = buildReport(m, inputs, { scenario: 'base', period: 5, currency: 'USD', fx: 1, factor: 1, sensitivity: runSensitivity(inputs, 5) })
writeFileSync(process.argv[2] ?? 'report-sample.html', html)
console.log('bytes', html.length)
