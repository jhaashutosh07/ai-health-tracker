/**
 * Clinical evaluation harness.
 *
 * Runs every standardized vignette through the real symptom-checker model,
 * then scores diagnostic accuracy and triage safety — both WITHOUT and WITH
 * the deterministic red-flag override — and prints a scorecard.
 *
 * Usage:  npm run evaluate
 * Needs:  OPENAI_API_KEY in .env.local (makes real API calls — costs money).
 * This is an OFFLINE tool; it is not part of the app build or the Jest suite.
 */
import fs from 'fs'
import path from 'path'

// Minimal .env loader (avoids adding a dependency; tsx does not auto-load .env.local)
function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    const p = path.join(process.cwd(), file)
    if (!fs.existsSync(p)) continue
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
      }
    }
  }
}
loadEnv()

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('✗ OPENAI_API_KEY not found in .env.local — cannot run the evaluation.')
    process.exit(1)
  }

  const { openai, SYMPTOM_CHECKER_SYSTEM_PROMPT } = await import('../lib/openai')
  const { extractAssessment } = await import('../lib/assessment')
  const { detectRedFlags, applyRedFlagOverride } = await import('../lib/redFlags')
  const { VIGNETTES } = await import('../data/vignettes')
  const { scoreOne, aggregate } = await import('../lib/evaluation')

  const rawResults: any[] = []
  const overriddenResults: any[] = []

  console.log(`\nRunning ${VIGNETTES.length} vignettes through gpt-4o…\n`)

  for (const v of VIGNETTES) {
    process.stdout.write(`  • ${v.id.padEnd(22)} `)
    try {
      const res = await openai.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 4000,
        messages: [
          { role: 'system', content: SYMPTOM_CHECKER_SYSTEM_PROMPT },
          { role: 'user', content: v.presentation },
          { role: 'user', content: 'Based on the above, provide your FINAL assessment now as the JSON block with "completed": true. Do not ask any more questions.' },
        ],
      })
      const text = res.choices[0]?.message?.content || ''
      const assessment = extractAssessment(text)
      if (!assessment) {
        console.log('⚠ no parseable assessment')
        continue
      }

      const raw = scoreOne(v, assessment)
      rawResults.push(raw)

      const matched = detectRedFlags(v.presentation)
      const { assessment: fixed } = applyRedFlagOverride(assessment, matched)
      overriddenResults.push(scoreOne(v, fixed))

      console.log(`dx@3=${raw.top3 ? '✓' : '✗'} triage=${raw.predictedTriage}${raw.dangerousMiss ? '  ‼ DANGEROUS UNDER-TRIAGE' : ''}`)
    } catch (err: any) {
      console.log(`✗ error: ${err.message}`)
    }
  }

  const before = aggregate(rawResults)
  const after = aggregate(overriddenResults)

  const line = (label: string, b: number | string, a: number | string, suffix = '') =>
    console.log(`  ${label.padEnd(28)} ${String(b).padStart(8)}${suffix}   ${String(a).padStart(8)}${suffix}`)

  console.log('\n────────────────────────────────────────────────────────')
  console.log('  SCORECARD                        model only   + red-flag layer')
  console.log('────────────────────────────────────────────────────────')
  line('Vignettes scored', before.n, after.n)
  line('Top-1 diagnostic accuracy', before.top1Accuracy, after.top1Accuracy, '%')
  line('Top-3 diagnostic accuracy', before.top3Accuracy, after.top3Accuracy, '%')
  line('Triage exact accuracy', before.triageExactAccuracy, after.triageExactAccuracy, '%')
  line('Under-triage rate', before.underTriageRate, after.underTriageRate, '%')
  line('Over-triage rate', before.overTriageRate, after.overTriageRate, '%')
  line('Dangerous misses (emergencies)', before.dangerousMissCount, after.dangerousMissCount)
  console.log('────────────────────────────────────────────────────────')

  if (before.dangerousMisses.length) {
    console.log(`\n  Model-only dangerous misses: ${before.dangerousMisses.join(', ')}`)
  }
  if (after.dangerousMisses.length) {
    console.log(`  ‼ Remaining dangerous misses after override: ${after.dangerousMisses.join(', ')}`)
  } else {
    console.log('\n  ✓ Red-flag layer caught every emergency in the set (0 dangerous misses).')
  }
  console.log('')
}

main().catch(err => { console.error(err); process.exit(1) })
