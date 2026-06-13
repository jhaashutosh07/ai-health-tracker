// Deterministic emergency ("red flag") detection layer.
//
// This is a SAFETY FLOOR that runs independently of the LLM. Even if the model
// under-triages a dangerous presentation, these rules force the assessment to
// EMERGENCY. Kept free of Next/Prisma imports so it is unit-testable and can be
// reused by the offline evaluation harness.

export type Triage = 'self-care' | 'see-doctor-soon' | 'urgent-care' | 'emergency'

export interface RedFlagRule {
  id: string
  label: string
  // The rule fires only when EVERY pattern matches the text (AND semantics).
  // Use one pattern for single-trigger rules; OR semantics live across rules.
  all: RegExp[]
  advice: string
}

// Patterns use word boundaries where a substring could cause false positives
// (e.g. \barm\b so "warm"/"alarm" don't trigger the cardiac rule).
export const RED_FLAG_RULES: RedFlagRule[] = [
  {
    id: 'cardiac',
    label: 'Possible heart attack',
    all: [
      /\bchest (pain|pressure|tightness|tight|discomfort|heaviness)/i,
      /(\barm\b|\bjaw\b|radiat|short(ness)? of breath|breathless|sweating|cold sweat|nausea)/i,
    ],
    advice: 'Call 112 now — chest pain with these features can be a heart attack. Do not drive yourself.',
  },
  {
    id: 'breathing',
    label: 'Severe breathing difficulty',
    all: [/(short(ness)? of breath|difficulty breathing|can'?t breathe|cannot breathe|struggling to breathe|gasping for air|blue lips|turning blue)/i],
    advice: 'Call 112 now — severe difficulty breathing is a medical emergency.',
  },
  {
    id: 'stroke',
    label: 'Possible stroke (FAST)',
    all: [/(face droop|drooping face|slurred speech|slurring my|sudden numbness|numb on one side|weakness on one side|one side of (my|the) (face|body)|can'?t speak|cannot speak|sudden vision loss|sudden loss of vision)/i],
    advice: 'Call 112 now — facial droop, slurred speech or one-sided weakness are stroke warning signs (FAST). Note the time symptoms started.',
  },
  {
    id: 'anaphylaxis-swelling',
    label: 'Possible anaphylaxis',
    all: [/(swelling|swollen|tightness|tight)/i, /(throat|tongue|lips?)/i],
    advice: 'Call 112 now — throat/tongue swelling can be a life-threatening allergic reaction. Use an adrenaline auto-injector if you have one.',
  },
  {
    id: 'anaphylaxis-explicit',
    label: 'Possible anaphylaxis',
    all: [/(anaphylaxis|throat closing|throat is closing|difficulty swallowing|can'?t swallow)/i],
    advice: 'Call 112 now — this can be a life-threatening allergic reaction.',
  },
  {
    id: 'severe-bleeding',
    label: 'Uncontrolled bleeding',
    all: [/(uncontrolled bleeding|won'?t stop bleeding|bleeding (heavily|profusely)|severe bleeding|losing a lot of blood|coughing up blood|vomiting blood|blood in my vomit)/i],
    advice: 'Call 112 now — apply firm pressure to any external bleeding while help arrives.',
  },
  {
    id: 'thunderclap-headache',
    label: 'Thunderclap headache',
    all: [/(worst headache of my life|thunderclap|sudden severe headache|worst headache ever)/i],
    advice: 'Call 112 now — a sudden, worst-ever headache needs emergency assessment to rule out a brain bleed.',
  },
  {
    id: 'loss-of-consciousness',
    label: 'Loss of consciousness',
    all: [/(unconscious|passed out|fainted|unresponsive|loss of consciousness|blacked out|won'?t wake up|not waking up)/i],
    advice: 'Call 112 now — someone who has lost consciousness needs emergency care.',
  },
  {
    id: 'seizure',
    label: 'Seizure',
    all: [/(seizure|convuls|having a fit|having a seizure)/i],
    advice: 'Call 112 now — protect the person from injury and do not put anything in their mouth.',
  },
  {
    id: 'suicidal',
    label: 'Suicidal ideation / self-harm',
    all: [/(suicid|kill myself|end my life|want to die|don'?t want to live|harm myself|self.?harm|hurting myself)/i],
    advice: 'Please reach out right now — call 112 or the iCall helpline (9152987821). You are not alone and help is available.',
  },
  {
    id: 'meningitis',
    label: 'Possible meningitis',
    all: [/fever/i, /(stiff neck|neck stiffness|can'?t touch chin to chest)/i],
    advice: 'Call 112 / go to the ER now — fever with a stiff neck can indicate meningitis.',
  },
  {
    id: 'poisoning',
    label: 'Poisoning / overdose',
    all: [/(overdose|poisoning|swallowed (chemical|bleach|too many pills|pills)|drank (bleach|poison))/i],
    advice: 'Call 112 now — do not induce vomiting unless told to by a professional.',
  },
  {
    id: 'rigid-abdomen',
    label: 'Acute abdomen',
    all: [/(abdomen|abdominal|stomach|belly)/i, /(rigid|board.?like|rock hard)/i],
    advice: 'Call 112 / go to the ER now — a rigid, severely painful abdomen can be a surgical emergency.',
  },
]

export function detectRedFlags(text: string): RedFlagRule[] {
  if (!text) return []
  return RED_FLAG_RULES.filter(rule => rule.all.every(p => p.test(text)))
}

export interface RedFlagOverrideResult<T> {
  assessment: T
  changed: boolean
  matched: RedFlagRule[]
}

// Forces an assessment to EMERGENCY when any red flag fires. Returns a new
// object (does not mutate the input) plus whether it changed anything.
export function applyRedFlagOverride<T extends Record<string, any>>(
  assessment: T,
  matched: RedFlagRule[]
): RedFlagOverrideResult<T> {
  if (!matched.length) return { assessment, changed: false, matched }

  const existingFlags: string[] = Array.isArray(assessment.redFlags) ? assessment.redFlags : []
  const flagAdvice = matched.map(m => m.advice)
  const mergedFlags = Array.from(new Set([...flagAdvice, ...existingFlags]))

  const callLine = '🚨 Call 112 immediately. '
  const prevAdvice = typeof assessment.advice === 'string' ? assessment.advice : ''
  const advice = /112|emergency/i.test(prevAdvice) ? prevAdvice : callLine + prevAdvice

  const overridden = {
    ...assessment,
    severity: 'CRITICAL',
    recommendation: 'emergency',
    redFlags: mergedFlags,
    advice: advice.trim(),
  }

  return { assessment: overridden, changed: true, matched }
}
