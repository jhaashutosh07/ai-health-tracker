// Prescription frequency shorthand mapping and duration parsing.
// Kept free of Next/Prisma imports so they can be unit-tested directly.

// Standard Indian prescription shorthand → reminder times
export const FREQUENCY_TIMES: Record<string, string[]> = {
  OD:  ['08:00'],                   // once daily
  BD:  ['08:00', '20:00'],          // twice daily
  TDS: ['08:00', '14:00', '20:00'], // thrice daily
  QID: ['08:00', '12:00', '16:00', '20:00'],
  HS:  ['21:00'],                   // at bedtime
  SOS: ['08:00'],                   // as needed — single daily slot as reminder
}

export const FREQUENCY_LABELS: Record<string, string> = {
  OD: 'Once daily', BD: 'Twice daily', TDS: '3x daily', QID: '4x daily',
  HS: 'At bedtime', SOS: 'As needed',
}

// "5 days" / "2 weeks" / "1 month" → end date; null if unparseable
export function parseDurationToEndDate(duration: string, from: Date = new Date()): Date | null {
  const m = duration?.match(/(\d+)\s*(day|week|month)/i)
  if (!m) return null
  const n = Number(m[1])
  const unit = m[2].toLowerCase()
  const days = unit === 'day' ? n : unit === 'week' ? n * 7 : n * 30
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000)
}
