import { createMocks } from 'node-mocks-http'
import handler from '@/pages/api/symptom-check/follow-up'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/pages/api/auth/[...nextauth]', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({
  prisma: { symptomLog: { findFirst: jest.fn(), update: jest.fn() } },
}))

const mockSession = getServerSession as jest.Mock
const mockFindFirst = prisma.symptomLog.findFirst as jest.Mock
const mockUpdate = prisma.symptomLog.update as jest.Mock

beforeEach(() => {
  mockSession.mockResolvedValue({ user: { id: 'user-1' } })
})

describe('GET /api/symptom-check/follow-up', () => {
  it('rejects unauthenticated requests', async () => {
    mockSession.mockResolvedValue(null)
    const { req, res } = createMocks({ method: 'GET' })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(401)
  })

  it('returns an already-pending check-in', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: 'log-1', symptoms: '["fever"]', severity: 'HIGH',
      recommendation: 'see-doctor-soon', createdAt: new Date(), followUpSentAt: new Date(),
    })
    const { req, res } = createMocks({ method: 'GET' })
    await handler(req as any, res as any)
    const data = JSON.parse(res._getData())
    expect(data.followUp.symptomLogId).toBe('log-1')
    expect(data.followUp.symptoms).toEqual(['fever'])
  })

  it('returns null when nothing is pending or eligible', async () => {
    mockFindFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null)
    const { req, res } = createMocks({ method: 'GET' })
    await handler(req as any, res as any)
    expect(JSON.parse(res._getData()).followUp).toBeNull()
  })

  it('promotes an eligible 24h-old assessment to PENDING', async () => {
    mockFindFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: 'log-2', symptoms: '["cough"]', severity: 'MEDIUM', createdAt: new Date(),
    })
    mockUpdate.mockResolvedValue({
      id: 'log-2', symptoms: '["cough"]', severity: 'MEDIUM',
      recommendation: null, createdAt: new Date(), followUpStatus: 'PENDING',
    })
    const { req, res } = createMocks({ method: 'GET' })
    await handler(req as any, res as any)
    expect(mockUpdate.mock.calls[0][0].data.followUpStatus).toBe('PENDING')
    expect(JSON.parse(res._getData()).followUp.symptomLogId).toBe('log-2')
  })
})

describe('POST /api/symptom-check/follow-up', () => {
  it('validates the response value', async () => {
    const { req, res } = createMocks({ method: 'POST', body: { symptomLogId: 'log-1', response: 'MEH' } })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(400)
  })

  it('returns 404 for a log the user does not own', async () => {
    mockFindFirst.mockResolvedValue(null)
    const { req, res } = createMocks({ method: 'POST', body: { symptomLogId: 'x', response: 'BETTER' } })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(404)
  })

  it('does not escalate when the patient is BETTER', async () => {
    mockFindFirst.mockResolvedValue({ id: 'log-1', severity: 'HIGH' })
    mockUpdate.mockResolvedValue({})
    const { req, res } = createMocks({ method: 'POST', body: { symptomLogId: 'log-1', response: 'BETTER' } })
    await handler(req as any, res as any)
    const data = JSON.parse(res._getData())
    expect(data.escalate).toBe(false)
    expect(mockUpdate.mock.calls[0][0].data.followUpStatus).toBe('BETTER')
  })

  it('escalates when symptoms are WORSE', async () => {
    mockFindFirst.mockResolvedValue({ id: 'log-1', severity: 'MEDIUM' })
    mockUpdate.mockResolvedValue({})
    const { req, res } = createMocks({ method: 'POST', body: { symptomLogId: 'log-1', response: 'WORSE' } })
    await handler(req as any, res as any)
    expect(JSON.parse(res._getData()).escalate).toBe(true)
  })

  it('escalates when a HIGH-severity case is unchanged (SAME)', async () => {
    mockFindFirst.mockResolvedValue({ id: 'log-1', severity: 'HIGH' })
    mockUpdate.mockResolvedValue({})
    const { req, res } = createMocks({ method: 'POST', body: { symptomLogId: 'log-1', response: 'SAME' } })
    await handler(req as any, res as any)
    expect(JSON.parse(res._getData()).escalate).toBe(true)
  })

  it('does not escalate when a LOW/MEDIUM case is unchanged (SAME)', async () => {
    mockFindFirst.mockResolvedValue({ id: 'log-1', severity: 'MEDIUM' })
    mockUpdate.mockResolvedValue({})
    const { req, res } = createMocks({ method: 'POST', body: { symptomLogId: 'log-1', response: 'SAME' } })
    await handler(req as any, res as any)
    expect(JSON.parse(res._getData()).escalate).toBe(false)
  })
})
