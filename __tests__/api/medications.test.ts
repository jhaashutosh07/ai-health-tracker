import { createMocks } from 'node-mocks-http'
import handler from '@/pages/api/medications'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/pages/api/auth/[...nextauth]', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({
  prisma: { medication: { findMany: jest.fn(), create: jest.fn() } },
}))

const mockSession = getServerSession as jest.Mock
const mockFindMany = prisma.medication.findMany as jest.Mock
const mockCreate = prisma.medication.create as jest.Mock

beforeEach(() => {
  mockSession.mockResolvedValue({ user: { id: 'user-1' } })
})

describe('/api/medications', () => {
  it('rejects unauthenticated requests', async () => {
    mockSession.mockResolvedValue(null)
    const { req, res } = createMocks({ method: 'GET' })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(401)
  })

  it('GET returns active medications scoped to the user', async () => {
    mockFindMany.mockResolvedValue([{ id: 'm1', doseLogs: [] }])
    const { req, res } = createMocks({ method: 'GET' })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(200)
    expect(mockFindMany.mock.calls[0][0].where).toMatchObject({ userId: 'user-1', active: true })
  })

  it('POST creates a medication and serializes times as JSON', async () => {
    mockCreate.mockResolvedValue({ id: 'm1' })
    const { req, res } = createMocks({
      method: 'POST',
      body: { name: 'Paracetamol', dosage: '650mg', times: ['08:00', '20:00'], instructions: 'After food' },
    })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(201)
    const data = mockCreate.mock.calls[0][0].data
    expect(JSON.parse(data.times)).toEqual(['08:00', '20:00'])
    expect(data.frequency).toBe('2x daily') // derived from times length
    expect(data.userId).toBe('user-1')
  })

  it('POST rejects missing name/dosage', async () => {
    const { req, res } = createMocks({ method: 'POST', body: { times: ['08:00'] } })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(400)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('POST rejects an empty times array', async () => {
    const { req, res } = createMocks({ method: 'POST', body: { name: 'X', dosage: '1', times: [] } })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(400)
  })

  it('POST rejects malformed time strings', async () => {
    const { req, res } = createMocks({ method: 'POST', body: { name: 'X', dosage: '1', times: ['8am'] } })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(400)
    expect(mockCreate).not.toHaveBeenCalled()
  })
})
