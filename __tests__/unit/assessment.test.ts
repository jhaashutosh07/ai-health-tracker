import { tryParse, extractAssessment, stripForDisplay } from '@/lib/assessment'

const VALID_ASSESSMENT = {
  symptoms: ['headache', 'eye pain'],
  severity: 'HIGH',
  possibleConditions: [{ name: 'Migraine', probability: 65, reasoning: 'One-sided pain' }],
  recommendation: 'see-doctor-soon',
  advice: 'See a doctor within 24 hours.',
  completed: true,
}

describe('tryParse', () => {
  it('parses valid JSON', () => {
    expect(tryParse('{"a":1}')).toEqual({ a: 1 })
  })

  it('repairs trailing commas in objects and arrays', () => {
    expect(tryParse('{"a":[1,2,],"b":2,}')).toEqual({ a: [1, 2], b: 2 })
  })

  it('returns null for hopeless input', () => {
    expect(tryParse('not json at all')).toBeNull()
  })
})

describe('extractAssessment', () => {
  const json = JSON.stringify(VALID_ASSESSMENT)

  it('extracts from a ```json code block', () => {
    const text = `You likely have a migraine.\n\n\`\`\`json\n${json}\n\`\`\``
    expect(extractAssessment(text)).toMatchObject({ severity: 'HIGH', completed: true })
  })

  it('extracts from a bare fenced block without the json tag', () => {
    const text = `Summary first.\n\`\`\`\n${json}\n\`\`\``
    expect(extractAssessment(text)).toMatchObject({ completed: true })
  })

  it('extracts bare JSON with surrounding prose', () => {
    const text = `Here is my assessment. ${json} Take care.`
    expect(extractAssessment(text)).toMatchObject({ severity: 'HIGH' })
  })

  it('repairs trailing commas inside a code block', () => {
    const sloppy = json.replace('"completed":true', '"completed":true,').replace(/}$/, ',}')
    // build a deliberately comma-broken variant
    const text = `\`\`\`json\n{"severity":"LOW","symptoms":["cough",],"completed":true,}\n\`\`\``
    expect(extractAssessment(text)).toMatchObject({ severity: 'LOW', completed: true })
    expect(sloppy).toBeTruthy()
  })

  it('returns null when the JSON is truncated mid-stream', () => {
    const truncated = `\`\`\`json\n${json.slice(0, json.length - 40)}`
    expect(extractAssessment(truncated)).toBeNull()
  })

  it('returns null when completed is false', () => {
    const text = JSON.stringify({ ...VALID_ASSESSMENT, completed: false })
    expect(extractAssessment(text)).toBeNull()
  })

  it('ignores earlier non-assessment objects and finds the real one', () => {
    const text = `{"note":"irrelevant"} some text ${json}`
    expect(extractAssessment(text)).toMatchObject({ completed: true })
  })
})

describe('stripForDisplay', () => {
  it('removes the JSON block and keeps the prose', () => {
    const text = `Your headache fits a migraine pattern — see a doctor within 24 hours.\n\n\`\`\`json\n{"completed":true}\n\`\`\``
    expect(stripForDisplay(text)).toBe('Your headache fits a migraine pattern — see a doctor within 24 hours.')
  })

  it('drops a dangling lead-in line ending with a colon', () => {
    const text = `Sorry you're feeling unwell.\nHere's what I think based on what you've shared:\n\`\`\`json\n{"completed":true}\n\`\`\``
    expect(stripForDisplay(text)).toBe("Sorry you're feeling unwell.")
  })

  it('drops "Based on what..." lead-ins even without a colon', () => {
    const text = `Rest and hydrate well.\nBased on what you've shared\n\`\`\`json\n{}\n\`\`\``
    expect(stripForDisplay(text)).toBe('Rest and hydrate well.')
  })

  it('returns empty string when the reply was only a JSON block with a lead-in', () => {
    const text = `Here's my assessment:\n\`\`\`json\n{"completed":true}\n\`\`\``
    expect(stripForDisplay(text)).toBe('')
  })

  it('leaves normal multi-line replies untouched', () => {
    const text = 'How long has the fever lasted?\nAny body ache with it?'
    expect(stripForDisplay(text)).toBe(text)
  })
})
