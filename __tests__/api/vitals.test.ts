import { createMocks } from 'node-mocks-http'
import handler from '@/pages/api/vitals'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/pages/api/auth/[...nextauth]', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    vitalReading: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

const mockSession = getServerSession as jest.Mock
const mockCreate = prisma.vitalReading.create as jest.Mock
const mockFindMany = prisma.vitalReading.findMany as jest.Mock
const mockFindFirst = prisma.vitalReading.findFirst as jest.Mock
const mockDelete = prisma.vitalReading.delete as jest.Mock

beforeEach(() => {
  mockSession.mockResolvedValue({ user: { id: 'user-1' } })
})

describe('/api/vitals', () => {
  it('rejects unauthenticated requests', async () => {
    mockSession.mockResolvedValue(null)
    const { req, res } = createMocks({ method: 'GET' })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(401)
  })

  it('GET returns the user readings', async () => {
    mockFindMany.mockResolvedValue([{ id: 'v1', type: 'BP' }])
    const { req, res } = createMocks({ method: 'GET', query: { days: '90' } })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(200)
    expect(JSON.parse(res._getData()).readings).toHaveLength(1)
    expect(mockFindMany.mock.calls[0][0].where.userId).toBe('user-1')
  })

  it('POST accepts a valid BP reading', async () => {
    mockCreate.mockResolvedValue({ id: 'v1' })
    const { req, res } = createMocks({ method: 'POST', body: { type: 'BP', systolic: 120, diastolic: 80 } })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(201)
    const data = mockCreate.mock.calls[0][0].data
    expect(data.systolic).toBe(120)
    expect(data.diastolic).toBe(80)
    expect(data.value).toBeNull()
    expect(data.unit).toBe('mmHg')
  })

  it('POST rejects BP where diastolic >= systolic', async () => {
    const { req, res } = createMocks({ method: 'POST', body: { type: 'BP', systolic: 80, diastolic: 120 } })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(400)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('POST rejects an unknown vital type', async () => {
    const { req, res } = createMocks({ method: 'POST', body: { type: 'CHOLESTEROL', value: 200 } })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(400)
  })

  it('POST rejects an out-of-range SpO2 value', async () => {
    const { req, res } = createMocks({ method: 'POST', body: { type: 'SPO2', value: 12 } })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(400)
  })

  it('POST accepts a valid sugar reading with context', async () => {
    mockCreate.mockResolvedValue({ id: 'v2' })
    const { req, res } = createMocks({ method: 'POST', body: { type: 'SUGAR', value: 95, context: 'FASTING' } })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(201)
    const data = mockCreate.mock.calls[0][0].data
    expect(data.value).toBe(95)
    expect(data.context).toBe('FASTING')
    expect(data.unit).toBe('mg/dL')
  })

  it('DELETE removes only a reading the user owns', async () => {
    mockFindFirst.mockResolvedValue({ id: 'v1', userId: 'user-1' })
    mockDelete.mockResolvedValue({})
    const { req, res } = createMocks({ method: 'DELETE', body: { id: 'v1' } })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(200)
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'v1' } })
  })

  it('DELETE returns 404 for a reading the user does not own', async () => {
    mockFindFirst.mockResolvedValue(null)
    const { req, res } = createMocks({ method: 'DELETE', body: { id: 'other' } })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(404)
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('rejects unsupported methods', async () => {
    const { req, res } = createMocks({ method: 'PUT' })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(405)
  })
})
