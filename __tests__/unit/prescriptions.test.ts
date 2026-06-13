import { FREQUENCY_TIMES, FREQUENCY_LABELS, parseDurationToEndDate } from '@/lib/prescriptions'

describe('FREQUENCY_TIMES', () => {
  it('maps standard Indian shorthand to the right number of daily reminders', () => {
    expect(FREQUENCY_TIMES.OD).toHaveLength(1)
    expect(FREQUENCY_TIMES.BD).toEqual(['08:00', '20:00'])
    expect(FREQUENCY_TIMES.TDS).toHaveLength(3)
    expect(FREQUENCY_TIMES.QID).toHaveLength(4)
    expect(FREQUENCY_TIMES.HS).toEqual(['21:00'])
  })

  it('uses valid HH:mm strings everywhere (matches the medications API validation)', () => {
    for (const times of Object.values(FREQUENCY_TIMES)) {
      for (const t of times) expect(t).toMatch(/^\d{2}:\d{2}$/)
    }
  })

  it('has a human label for every frequency', () => {
    expect(Object.keys(FREQUENCY_LABELS).sort()).toEqual(Object.keys(FREQUENCY_TIMES).sort())
  })
})

describe('parseDurationToEndDate', () => {
  const from = new Date('2026-06-12T00:00:00Z')
  const days = (d: Date | null) => d && Math.round((d.getTime() - from.getTime()) / 86400000)

  it('parses days', () => {
    expect(days(parseDurationToEndDate('5 days', from))).toBe(5)
    expect(days(parseDurationToEndDate('1 day', from))).toBe(1)
  })

  it('parses weeks and months', () => {
    expect(days(parseDurationToEndDate('2 weeks', from))).toBe(14)
    expect(days(parseDurationToEndDate('1 month', from))).toBe(30)
  })

  it('is case-insensitive and tolerant of extra text', () => {
    expect(days(parseDurationToEndDate('for 3 Days only', from))).toBe(3)
  })

  it('returns null for unparseable durations', () => {
    expect(parseDurationToEndDate('', from)).toBeNull()
    expect(parseDurationToEndDate('until better', from)).toBeNull()
  })
})
