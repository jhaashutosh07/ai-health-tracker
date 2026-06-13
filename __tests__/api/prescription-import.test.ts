import { createMocks } from 'node-mocks-http'
import handler from '@/pages/api/prescriptions/import'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/pages/api/auth/[...nextauth]', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    prescription: { findFirst: jest.fn(), update: jest.fn() },
    medication: { create: jest.fn((args) => ({ ...args.data, id: 'created' })) },
    $transaction: jest.fn((ops) => Promise.resolve(ops)),
  },
}))

const mockSession = getServerSession as jest.Mock
const mockFindFirst = prisma.prescription.findFirst as jest.Mock

const prescriptionWith = (items: any[], importedAt: Date | null = null) => ({
  id: 'rx-1',
  importedAt,
  items: JSON.stringify(items),
  appointment: { doctor: { name: 'Rao' } },
})

beforeEach(() => {
  mockSession.mockResolvedValue({ user: { id: 'patient-1' } })
})

describe('POST /api/prescriptions/import', () => {
  it('rejects unauthenticated requests', async () => {
    mockSession.mockResolvedValue(null)
    const { req, res } = createMocks({ method: 'POST', body: { prescriptionId: 'rx-1' } })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(401)
  })

  it('requires a prescriptionId', async () => {
    const { req, res } = createMocks({ method: 'POST', body: {} })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(400)
  })

  it('returns 404 when the prescription is not the patient\'s', async () => {
    mockFindFirst.mockResolvedValue(null)
    const { req, res } = createMocks({ method: 'POST', body: { prescriptionId: 'rx-x' } })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(404)
    // ownership is enforced in the query
    expect(mockFindFirst.mock.calls[0][0].where.appointment.patientId).toBe('patient-1')
  })

  it('refuses to import the same prescription twice', async () => {
    mockFindFirst.mockResolvedValue(prescriptionWith([{ name: 'A', frequency: 'OD' }], new Date()))
    const { req, res } = createMocks({ method: 'POST', body: { prescriptionId: 'rx-1' } })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(400)
    expect(JSON.parse(res._getData()).message).toMatch(/already/i)
  })

  it('imports items into medications with frequency-derived reminder times', async () => {
    mockFindFirst.mockResolvedValue(
      prescriptionWith([
        { name: 'Amoxicillin', dosage: '500mg', frequency: 'TDS', duration: '5 days', instructions: 'After food' },
      ])
    )
    const { req, res } = createMocks({ method: 'POST', body: { prescriptionId: 'rx-1' } })
    await handler(req as any, res as any)

    expect(res._getStatusCode()).toBe(200)
    const created = (prisma.medication.create as jest.Mock).mock.calls[0][0].data
    expect(JSON.parse(created.times)).toEqual(['08:00', '14:00', '20:00']) // TDS
    expect(created.frequency).toBe('3x daily')
    expect(created.endDate).toBeInstanceOf(Date)
    expect(created.instructions).toContain('After food')
    expect(created.instructions).toContain('Dr. Rao')
    // transaction includes the per-item creates plus the prescription.update flag
    expect((prisma.$transaction as jest.Mock).mock.calls[0][0]).toHaveLength(2)
  })

  it('rejects a prescription with no medicines', async () => {
    mockFindFirst.mockResolvedValue(prescriptionWith([]))
    const { req, res } = createMocks({ method: 'POST', body: { prescriptionId: 'rx-1' } })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(400)
  })
})
