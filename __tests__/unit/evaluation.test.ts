import {
  normalizeTriage,
  conditionNames,
  matchesDiagnosis,
  scoreOne,
  aggregate,
  TRIAGE_ORDER,
  type Vignette,
} from '@/lib/evaluation'

describe('normalizeTriage', () => {
  it('maps emergency synonyms', () => {
    expect(normalizeTriage('emergency')).toBe('emergency')
    expect(normalizeTriage('call 112')).toBe('emergency')
    expect(normalizeTriage('ER')).toBe('emergency')
  })
  it('maps the other levels', () => {
    expect(normalizeTriage('urgent-care')).toBe('urgent-care')
    expect(normalizeTriage('self care')).toBe('self-care')
    expect(normalizeTriage('see-doctor-soon')).toBe('see-doctor-soon')
  })
  it('defaults unknown wording to the middle-safe option (not self-care)', () => {
    expect(normalizeTriage('???')).toBe('see-doctor-soon')
  })
})

describe('conditionNames', () => {
  it('extracts names from objects and strings', () => {
    expect(conditionNames([{ name: 'Migraine' }, 'Cluster headache'])).toEqual(['Migraine', 'Cluster headache'])
  })
  it('returns [] for non-arrays', () => {
    expect(conditionNames(undefined)).toEqual([])
  })
})

describe('matchesDiagnosis', () => {
  it('matches a gold term as a substring of a predicted name, case-insensitively', () => {
    expect(matchesDiagnosis(['Acute Myocardial Infarction'], ['myocardial infarction'], 3)).toBe(true)
  })
  it('respects the top-N cutoff', () => {
    const preds = ['Wrong A', 'Wrong B', 'Wrong C', 'Migraine']
    expect(matchesDiagnosis(preds, ['migraine'], 3)).toBe(false)
    expect(matchesDiagnosis(preds, ['migraine'], 4)).toBe(true)
  })
  it('returns false when nothing matches', () => {
    expect(matchesDiagnosis(['Common cold'], ['appendicitis'], 3)).toBe(false)
  })
})

const vignette = (goldTriage: any, goldConditions: string[]): Vignette => ({
  id: 'v', title: 't', presentation: 'p', goldConditions, goldTriage,
})

describe('scoreOne', () => {
  it('marks a correct top-1 diagnosis and exact triage', () => {
    const r = scoreOne(vignette('emergency', ['heart attack']), {
      possibleConditions: [{ name: 'Heart attack' }],
      recommendation: 'emergency',
    })
    expect(r.top1).toBe(true)
    expect(r.triageExact).toBe(true)
    expect(r.underTriage).toBe(false)
    expect(r.dangerousMiss).toBe(false)
  })

  it('flags a dangerous miss when an emergency is triaged as self-care', () => {
    const r = scoreOne(vignette('emergency', ['heart attack']), {
      possibleConditions: [{ name: 'Indigestion' }],
      recommendation: 'self-care',
    })
    expect(r.underTriage).toBe(true)
    expect(r.dangerousMiss).toBe(true)
    expect(r.top3).toBe(false)
  })

  it('counts over-triage without calling it dangerous', () => {
    const r = scoreOne(vignette('self-care', ['common cold']), {
      possibleConditions: [{ name: 'Common cold' }],
      recommendation: 'urgent-care',
    })
    expect(r.overTriage).toBe(true)
    expect(r.underTriage).toBe(false)
    expect(r.dangerousMiss).toBe(false)
  })

  it('uses ordinal comparison for under/over triage', () => {
    expect(TRIAGE_ORDER['self-care']).toBeLessThan(TRIAGE_ORDER['emergency'])
  })
})

describe('aggregate', () => {
  it('computes percentages and collects dangerous misses', () => {
    const results = [
      scoreOne(vignette('emergency', ['stroke']), { possibleConditions: [{ name: 'Stroke' }], recommendation: 'emergency' }),
      scoreOne(vignette('emergency', ['sepsis']), { possibleConditions: [{ name: 'Cold' }], recommendation: 'self-care' }),
      scoreOne(vignette('self-care', ['cold']), { possibleConditions: [{ name: 'Cold' }], recommendation: 'self-care' }),
      scoreOne(vignette('see-doctor-soon', ['uti']), { possibleConditions: [{ name: 'UTI' }], recommendation: 'see-doctor-soon' }),
    ]
    const s = aggregate(results)
    expect(s.n).toBe(4)
    expect(s.top1Accuracy).toBe(75) // 3 of 4 correct
    expect(s.triageExactAccuracy).toBe(75)
    expect(s.underTriageRate).toBe(25)
    expect(s.dangerousMissCount).toBe(1)
    expect(s.dangerousMisses).toEqual(['v'])
  })

  it('handles an empty result set without dividing by zero', () => {
    const s = aggregate([])
    expect(s.n).toBe(0)
    expect(s.top1Accuracy).toBe(0)
    expect(s.dangerousMissCount).toBe(0)
  })
})
