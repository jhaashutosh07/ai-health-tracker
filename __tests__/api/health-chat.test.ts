import { createMocks } from 'node-mocks-http'
import handler from '@/pages/api/health-chat'
import { getServerSession } from 'next-auth'
import { openai } from '@/lib/openai'
import { retrieveContext } from '@/lib/rag/retrieve'

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/pages/api/auth/[...nextauth]', () => ({ authOptions: {} }))
jest.mock('@/lib/openai', () => ({ openai: { chat: { completions: { create: jest.fn() } } } }))
// Mock only retrieveContext; keep the real buildReferenceBlock/buildSources.
jest.mock('@/lib/rag/retrieve', () => {
  const actual = jest.requireActual('@/lib/rag/retrieve')
  return { ...actual, retrieveContext: jest.fn() }
})
jest.mock('@/lib/prisma', () => ({
  prisma: {
    symptomLog: { findMany: jest.fn().mockResolvedValue([]) },
    vitalReading: { findMany: jest.fn().mockResolvedValue([]) },
    medication: { findMany: jest.fn().mockResolvedValue([]) },
    appointment: { findMany: jest.fn().mockResolvedValue([]) },
    medicalHistory: { findMany: jest.fn().mockResolvedValue([]) },
  },
}))

const mockSession = getServerSession as jest.Mock
const mockCreate = openai.chat.completions.create as unknown as jest.Mock
const mockRetrieve = retrieveContext as jest.Mock

const chunk = {
  id: 'migraine', title: 'Migraine', source: 'NHS',
  url: 'https://www.nhs.uk/conditions/migraine/', tags: [], text: 'A migraine is a throbbing headache.', score: 0.8,
}

beforeEach(() => {
  mockSession.mockResolvedValue({ user: { id: 'user-1', name: 'Test' } })
  mockCreate.mockResolvedValue({ choices: [{ message: { content: 'Migraines are throbbing headaches [1].' } }] })
  mockRetrieve.mockResolvedValue([])
})

describe('POST /api/health-chat', () => {
  const body = { messages: [{ role: 'user', content: 'what is a migraine?' }] }

  it('rejects unauthenticated requests', async () => {
    mockSession.mockResolvedValue(null)
    const { req, res } = createMocks({ method: 'POST', body })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(401)
  })

  it('rejects a missing messages array', async () => {
    const { req, res } = createMocks({ method: 'POST', body: {} })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(400)
  })

  it('injects retrieved references into the system prompt and returns sources', async () => {
    mockRetrieve.mockResolvedValue([chunk])
    const { req, res } = createMocks({ method: 'POST', body })
    await handler(req as any, res as any)

    expect(res._getStatusCode()).toBe(200)
    const data = JSON.parse(res._getData())
    expect(data.sources).toEqual([
      { n: 1, id: 'migraine', title: 'Migraine', source: 'NHS', url: 'https://www.nhs.uk/conditions/migraine/' },
    ])
    // the reference block must reach the model's system message
    const systemMsg = mockCreate.mock.calls[0][0].messages[0].content
    expect(systemMsg).toContain('MEDICAL REFERENCE LIBRARY')
    expect(systemMsg).toContain('Migraine')
  })

  it('retrieves using the latest user message', async () => {
    mockRetrieve.mockResolvedValue([])
    const multi = { messages: [
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'hi' },
      { role: 'user', content: 'is my blood pressure ok?' },
    ] }
    const { req, res } = createMocks({ method: 'POST', body: multi })
    await handler(req as any, res as any)
    expect(mockRetrieve).toHaveBeenCalledWith('is my blood pressure ok?')
  })

  it('still answers (no sources) when retrieval returns nothing', async () => {
    mockRetrieve.mockResolvedValue([])
    const { req, res } = createMocks({ method: 'POST', body })
    await handler(req as any, res as any)
    const data = JSON.parse(res._getData())
    expect(data.sources).toEqual([])
    expect(data.message).toBeTruthy()
    const systemMsg = mockCreate.mock.calls[0][0].messages[0].content
    expect(systemMsg).not.toContain('MEDICAL REFERENCE LIBRARY')
  })

  it('answers even if retrieval throws (best-effort)', async () => {
    mockRetrieve.mockRejectedValue(new Error('embedding failed'))
    const { req, res } = createMocks({ method: 'POST', body })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(200)
    expect(JSON.parse(res._getData()).sources).toEqual([])
  })
})
