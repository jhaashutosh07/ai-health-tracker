import { createMocks } from 'node-mocks-http'
import handler from '@/pages/api/symptom-check/chat'
import { getServerSession } from 'next-auth'
import { openai } from '@/lib/openai'
import { prisma } from '@/lib/prisma'

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/pages/api/auth/[...nextauth]', () => ({ authOptions: {} }))
jest.mock('@/lib/openai', () => ({
  openai: { chat: { completions: { create: jest.fn() } } },
  SYMPTOM_CHECKER_SYSTEM_PROMPT: 'system prompt',
}))
jest.mock('@/lib/prisma', () => ({
  prisma: { symptomLog: { create: jest.fn() } },
}))

const mockSession = getServerSession as jest.Mock
const mockCreate = openai.chat.completions.create as unknown as jest.Mock
const mockLogCreate = prisma.symptomLog.create as jest.Mock

const aiReply = (content: string) => ({ choices: [{ message: { content } }] })

const VALID_JSON = JSON.stringify({
  symptoms: ['fever'],
  severity: 'MEDIUM',
  possibleConditions: [
    { name: 'Viral fever', probability: 70, reasoning: 'common' },
    { name: 'Dengue', probability: 30, reasoning: 'seasonal' },
  ],
  medicineSuggestions: [{ name: 'Paracetamol (Dolo 650)', type: 'OTC', purpose: 'fever', dosage: '650mg', warning: '' }],
  recommendation: 'self-care',
  advice: 'Rest and hydrate. See a doctor if fever lasts beyond 3 days.',
  completed: true,
})

const messages = [{ role: 'user', content: 'I have a fever since yesterday' }]

beforeEach(() => {
  mockSession.mockResolvedValue({ user: { id: 'user-1', name: 'Test' } })
  mockLogCreate.mockResolvedValue({ id: 'log-1' })
})

describe('POST /api/symptom-check/chat', () => {
  it('rejects unauthenticated requests', async () => {
    mockSession.mockResolvedValue(null)
    const { req, res } = createMocks({ method: 'POST', body: { messages } })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(401)
  })

  it('rejects invalid message payloads', async () => {
    const { req, res } = createMocks({ method: 'POST', body: { messages: 'nope' } })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(400)
  })

  it('returns an in-progress reply when no assessment yet', async () => {
    mockCreate.mockResolvedValueOnce(aiReply('How long have you had the fever?'))
    const { req, res } = createMocks({ method: 'POST', body: { messages } })
    await handler(req as any, res as any)
    const data = JSON.parse(res._getData())
    expect(data.completed).toBe(false)
    expect(data.message).toContain('How long')
    expect(mockLogCreate).not.toHaveBeenCalled()
  })

  it('parses a completed assessment, saves the log, and strips the JSON from the chat text', async () => {
    mockCreate.mockResolvedValueOnce(
      aiReply(`A viral fever is most likely — rest and hydrate.\n\n\`\`\`json\n${VALID_JSON}\n\`\`\``)
    )
    const { req, res } = createMocks({ method: 'POST', body: { messages } })
    await handler(req as any, res as any)
    const data = JSON.parse(res._getData())

    expect(data.completed).toBe(true)
    expect(data.symptomLogId).toBe('log-1')
    expect(data.assessment.severity).toBe('MEDIUM')
    expect(data.assessment.medicineSuggestions).toHaveLength(1)
    expect(data.message).not.toContain('```')
    expect(data.message).toContain('viral fever')
  })

  it('saves condition NAMES (not [object Object]) and persists suggested medicines', async () => {
    mockCreate.mockResolvedValueOnce(aiReply(`Done.\n\`\`\`json\n${VALID_JSON}\n\`\`\``))
    const { req, res } = createMocks({ method: 'POST', body: { messages } })
    await handler(req as any, res as any)

    const saved = mockLogCreate.mock.calls[0][0].data
    expect(saved.aiDiagnosis).toBe('Viral fever, Dengue')
    expect(saved.aiDiagnosis).not.toContain('[object Object]')
    expect(JSON.parse(saved.suggestedMedicines)[0].name).toContain('Dolo 650')
    expect(saved.severity).toBe('MEDIUM')
  })

  it('retries once when the assessment JSON is truncated, then succeeds', async () => {
    const truncated = `Assessment ready.\n\`\`\`json\n${VALID_JSON.slice(0, 80)}`
    mockCreate
      .mockResolvedValueOnce(aiReply(truncated))
      .mockResolvedValueOnce(aiReply(`\`\`\`json\n${VALID_JSON}\n\`\`\``))

    const { req, res } = createMocks({ method: 'POST', body: { messages } })
    await handler(req as any, res as any)
    const data = JSON.parse(res._getData())

    expect(mockCreate).toHaveBeenCalledTimes(2)
    expect(data.completed).toBe(true)
    expect(data.assessment.severity).toBe('MEDIUM')
    expect(mockLogCreate).toHaveBeenCalledTimes(1)
  })

  it('removes dangling lead-in lines from the displayed message', async () => {
    mockCreate.mockResolvedValueOnce(
      aiReply(`Your fever pattern fits a viral infection.\nHere's what I think based on what you've shared:\n\`\`\`json\n${VALID_JSON}\n\`\`\``)
    )
    const { req, res } = createMocks({ method: 'POST', body: { messages } })
    await handler(req as any, res as any)
    const data = JSON.parse(res._getData())
    expect(data.message).toBe('Your fever pattern fits a viral infection.')
  })

  it('forces EMERGENCY via the red-flag layer when the model under-triages a cardiac presentation', async () => {
    // Model wrongly calls crushing chest pain "indigestion / self-care"
    const underTriaged = JSON.stringify({
      symptoms: ['chest pain'],
      severity: 'LOW',
      possibleConditions: [{ name: 'Indigestion', probability: 80, reasoning: 'after food' }],
      recommendation: 'self-care',
      advice: 'Take an antacid and rest.',
      completed: true,
    })
    mockCreate.mockResolvedValueOnce(aiReply(`Likely indigestion.\n\`\`\`json\n${underTriaged}\n\`\`\``))

    const dangerous = [{ role: 'user', content: 'I have crushing chest pain spreading to my left arm and I am sweating' }]
    const { req, res } = createMocks({ method: 'POST', body: { messages: dangerous } })
    await handler(req as any, res as any)
    const data = JSON.parse(res._getData())

    expect(data.assessment.severity).toBe('CRITICAL')
    expect(data.assessment.recommendation).toBe('emergency')
    expect(data.assessment.advice).toMatch(/112/)
    // and the override is persisted, not just shown
    expect(mockLogCreate.mock.calls[0][0].data.severity).toBe('CRITICAL')
  })

  it('returns 500 with a friendly message when the AI call fails', async () => {
    mockCreate.mockRejectedValueOnce(new Error('rate limited'))
    const { req, res } = createMocks({ method: 'POST', body: { messages } })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(500)
    expect(JSON.parse(res._getData()).message).toContain('temporarily unavailable')
  })
})
