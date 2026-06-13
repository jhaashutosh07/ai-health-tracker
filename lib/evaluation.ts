// Scoring logic for the clinical evaluation harness.
//
// Pure functions only (no Next/Prisma/OpenAI) so they are unit-testable. The
// runner in scripts/evaluate.ts feeds real model output through these.

import type { Triage } from './redFlags'

export const TRIAGE_ORDER: Record<Triage, number> = {
  'self-care': 1,
  'see-doctor-soon': 2,
  'urgent-care': 3,
  'emergency': 4,
}

export function normalizeTriage(raw: string): Triage {
  const s = (raw || '').toLowerCase().replace(/[_\s]+/g, '-')
  if (/(emergency|call-?112|^er$|emergency-room|999|108)/.test(s)) return 'emergency'
  if (/(urgent)/.test(s)) return 'urgent-care'
  if (/(self-?care|home|rest)/.test(s)) return 'self-care'
  if (/(see-?(a-)?doctor|doctor-soon|routine|gp|clinic)/.test(s)) return 'see-doctor-soon'
  // Unknown wording defaults to the middle-safe option rather than self-care.
  return 'see-doctor-soon'
}

type Condition = string | { name?: string }

export function conditionNames(conditions: Condition[] | undefined): string[] {
  if (!Array.isArray(conditions)) return []
  return conditions
    .map(c => (typeof c === 'string' ? c : c?.name || ''))
    .filter(Boolean)
}

// A hit if any acceptable gold term appears (case-insensitive substring) in any
// of the top-N predicted condition names. This mirrors the matching used in
// published symptom-checker audits.
export function matchesDiagnosis(predictedNames: string[], gold: string[], topN: number): boolean {
  const top = predictedNames.slice(0, topN).map(n => n.toLowerCase())
  return gold.some(g => {
    const term = g.toLowerCase()
    return top.some(name => name.includes(term) || term.includes(name))
  })
}

export interface Vignette {
  id: string
  title: string
  presentation: string
  goldConditions: string[]
  goldTriage: Triage
}

export interface ScoredResult {
  id: string
  title: string
  top1: boolean
  top3: boolean
  predictedTriage: Triage
  goldTriage: Triage
  triageExact: boolean
  underTriage: boolean
  overTriage: boolean
  dangerousMiss: boolean // under-triaged a true emergency — the worst failure
}

export interface AssessmentLike {
  possibleConditions?: Condition[]
  recommendation?: string
}

export function scoreOne(vignette: Vignette, assessment: AssessmentLike): ScoredResult {
  const names = conditionNames(assessment.possibleConditions)
  const predictedTriage = normalizeTriage(assessment.recommendation || '')
  const predOrd = TRIAGE_ORDER[predictedTriage]
  const goldOrd = TRIAGE_ORDER[vignette.goldTriage]
  const underTriage = predOrd < goldOrd

  return {
    id: vignette.id,
    title: vignette.title,
    top1: matchesDiagnosis(names, vignette.goldConditions, 1),
    top3: matchesDiagnosis(names, vignette.goldConditions, 3),
    predictedTriage,
    goldTriage: vignette.goldTriage,
    triageExact: predictedTriage === vignette.goldTriage,
    underTriage,
    overTriage: predOrd > goldOrd,
    dangerousMiss: underTriage && vignette.goldTriage === 'emergency',
  }
}

export interface Scorecard {
  n: number
  top1Accuracy: number
  top3Accuracy: number
  triageExactAccuracy: number
  underTriageRate: number
  overTriageRate: number
  dangerousMissCount: number
  dangerousMisses: string[] // vignette ids
}

const pct = (num: number, den: number) => (den === 0 ? 0 : Math.round((num / den) * 1000) / 10)

export function aggregate(results: ScoredResult[]): Scorecard {
  const n = results.length
  const misses = results.filter(r => r.dangerousMiss)
  return {
    n,
    top1Accuracy: pct(results.filter(r => r.top1).length, n),
    top3Accuracy: pct(results.filter(r => r.top3).length, n),
    triageExactAccuracy: pct(results.filter(r => r.triageExact).length, n),
    underTriageRate: pct(results.filter(r => r.underTriage).length, n),
    overTriageRate: pct(results.filter(r => r.overTriage).length, n),
    dangerousMissCount: misses.length,
    dangerousMisses: misses.map(r => r.id),
  }
}
