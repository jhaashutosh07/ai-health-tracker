import { detectRedFlags, applyRedFlagOverride, RED_FLAG_RULES } from '@/lib/redFlags'

describe('detectRedFlags', () => {
  it('flags chest pain radiating to the arm as cardiac', () => {
    const m = detectRedFlags('I have crushing chest pain spreading to my left arm and I am sweating')
    expect(m.map(r => r.id)).toContain('cardiac')
  })

  it('does NOT flag isolated chest pain without cardiac features', () => {
    // chest pain alone (e.g. after coughing) should not trip the cardiac combo
    const m = detectRedFlags('I have a bit of chest pain when I cough, no other symptoms')
    expect(m.map(r => r.id)).not.toContain('cardiac')
  })

  it('flags stroke (FAST) signs', () => {
    expect(detectRedFlags('my face drooped and my speech is slurred').map(r => r.id)).toContain('stroke')
  })

  it('flags difficulty breathing', () => {
    expect(detectRedFlags('I am struggling to breathe').map(r => r.id)).toContain('breathing')
  })

  it('flags throat/tongue swelling as anaphylaxis', () => {
    expect(detectRedFlags('my tongue is swelling and my throat feels tight').map(r => r.id)).toContain('anaphylaxis-swelling')
  })

  it('flags a thunderclap headache', () => {
    expect(detectRedFlags('this is the worst headache of my life, came on suddenly').map(r => r.id)).toContain('thunderclap-headache')
  })

  it('flags fever with a stiff neck as possible meningitis', () => {
    expect(detectRedFlags('I have a high fever and a stiff neck with light hurting my eyes').map(r => r.id)).toContain('meningitis')
  })

  it('flags suicidal ideation', () => {
    expect(detectRedFlags('I want to die and have thought about how to kill myself').map(r => r.id)).toContain('suicidal')
  })

  it('does not false-positive on benign words like "warm" or "alarm"', () => {
    const m = detectRedFlags('I felt warm and my alarm woke me up; mild sore throat')
    expect(m.map(r => r.id)).not.toContain('cardiac')
  })

  it('returns nothing for an everyday complaint', () => {
    expect(detectRedFlags('I have a runny nose and mild sneezing for two days')).toHaveLength(0)
  })

  it('handles empty input', () => {
    expect(detectRedFlags('')).toEqual([])
  })

  it('every rule has at least one pattern and advice', () => {
    for (const r of RED_FLAG_RULES) {
      expect(r.all.length).toBeGreaterThan(0)
      expect(r.advice).toMatch(/112|helpline/i)
    }
  })
})

describe('applyRedFlagOverride', () => {
  const base = { severity: 'LOW', recommendation: 'self-care', advice: 'Rest and drink fluids.', redFlags: [] as string[] }

  it('forces severity and triage to emergency when a flag fires', () => {
    const matched = detectRedFlags('crushing chest pain radiating to my arm, sweating')
    const { assessment, changed } = applyRedFlagOverride(base, matched)
    expect(changed).toBe(true)
    expect(assessment.severity).toBe('CRITICAL')
    expect(assessment.recommendation).toBe('emergency')
    expect(assessment.advice).toMatch(/112/)
    expect(assessment.redFlags.length).toBeGreaterThan(0)
  })

  it('does not mutate the original assessment object', () => {
    const matched = detectRedFlags('I am struggling to breathe')
    applyRedFlagOverride(base, matched)
    expect(base.severity).toBe('LOW')
    expect(base.recommendation).toBe('self-care')
  })

  it('is a no-op when no flags are matched', () => {
    const { assessment, changed } = applyRedFlagOverride(base, [])
    expect(changed).toBe(false)
    expect(assessment).toBe(base)
  })

  it('preserves any existing red flags while adding new ones', () => {
    const withFlags = { ...base, redFlags: ['existing warning'] }
    const matched = detectRedFlags('my face drooped and speech is slurred')
    const { assessment } = applyRedFlagOverride(withFlags, matched)
    expect(assessment.redFlags).toContain('existing warning')
    expect(assessment.redFlags.length).toBeGreaterThan(1)
  })

  it('does not double-prepend the 112 line if advice already mentions emergency', () => {
    const already = { ...base, advice: 'Call 112 immediately, this is an emergency.' }
    const matched = detectRedFlags('I am struggling to breathe')
    const { assessment } = applyRedFlagOverride(already, matched)
    expect((assessment.advice.match(/112/g) || []).length).toBe(1)
  })
})
