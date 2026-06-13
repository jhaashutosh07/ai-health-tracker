// Helpers for parsing the AI's final symptom assessment out of a chat reply.
// Kept free of Next/Prisma imports so they can be unit-tested directly.

export function tryParse(str: string): any | null {
  try { return JSON.parse(str) } catch { }
  // Common model slip: trailing commas before } or ]
  try { return JSON.parse(str.replace(/,\s*([}\]])/g, '$1')) } catch { }
  return null
}

export function extractAssessment(text: string) {
  const candidates: string[] = []

  const codeBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/)
  if (codeBlockMatch) candidates.push(codeBlockMatch[1])

  // Balanced-brace scan picks up bare JSON objects (and survives text after them)
  let depth = 0
  let start = -1
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '{') {
      if (depth === 0) start = i
      depth++
    } else if (ch === '}') {
      depth--
      if (depth === 0 && start !== -1) {
        candidates.push(text.slice(start, i + 1))
        start = -1
      }
    }
  }

  for (const candidate of candidates) {
    const parsed = tryParse(candidate)
    if (parsed && parsed.completed === true) return parsed
  }
  return null
}

// Strip JSON blocks and any dangling lead-in the model wrote pointing at them
// (e.g. "Here's what I think based on what you've shared:")
export function stripForDisplay(text: string) {
  const clean = text
    .replace(/```json[\s\S]*?```/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .trim()
  const lines = clean.split('\n')
  while (lines.length > 0) {
    const last = lines[lines.length - 1].trim()
    if (last === '' || /[:：]$/.test(last) || /^(here('|’)s|based on what)/i.test(last)) lines.pop()
    else break
  }
  return lines.join('\n').trim()
}
