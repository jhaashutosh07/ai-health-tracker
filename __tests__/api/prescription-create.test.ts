import { createMocks } from 'node-mocks-http'
import handler from '@/pages/api/prescriptions'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/pages/api/auth/[...nextauth]', () => ({ authOptions: {} }))
jest.mock('@/lib/pusher', () => ({ pusherServer: null }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    doctor: { findUnique: jest.fn() },
    appointment: { findFirst: jest.fn() },
    prescription: { upsert: jest.fn() },
  },
}))

const mockSession = getServerSession as jest.Mock
const mockDoctor = prisma.doctor.findUnique as jest.Mock
const mockAppt = prisma.appointment.findFirst as jest.Mock
const mockUpsert = prisma.prescription.upsert as jest.Mock

const items = [{ name: 'Paracetamol', dosage: '650mg', frequency: 'BD', duration: '5 days' }]

beforeEach(() => {
  mockSession.mockResolvedValue({ user: { id: 'd1', email: 'doc@x.com', role: 'DOCTOR' } })
  mockDoctor.mockResolvedValue({ id: 'doctor-1', email: 'doc@x.com' })
  mockAppt.mockResolvedValue({ id: 'apt-1', patientId: 'p1', doctorId: 'doctor-1', status: 'CONFIRMED' })
  mockUpsert.mockResolvedValue({ id: 'rx-1' })
})

describe('POST /api/prescriptions', () => {
  it('blocks non-doctor users', async () => {
    mockSession.mockResolvedValue({ user: { id: 'p1', role: 'PATIENT' } })
    const { req, res } = createMocks({ method: 'POST', body: { appointmentId: 'apt-1', items } })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(403)
  })

  it('404s when no doctor profile exists for the account', async () => {
    mockDoctor.mockResolvedValue(null)
    const { req, res } = createMocks({ method: 'POST', body: { appointmentId: 'apt-1', items } })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(404)
  })

  it('requires an appointmentId and at least one item', async () => {
    const { req, res } = createMocks({ method: 'POST', body: { appointmentId: 'apt-1', items: [] } })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(400)
  })

  it('404s when the appointment is not this doctor\'s', async () => {
    mockAppt.mockResolvedValue(null)
    const { req, res } = createMocks({ method: 'POST', body: { appointmentId: 'apt-x', items } })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(404)
    expect(mockAppt.mock.calls[0][0].where.doctorId).toBe('doctor-1')
  })

  it('upserts a prescription with cleaned, JSON-serialized items', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { appointmentId: 'apt-1', diagnosis: 'Viral fever', items: [...items, { name: '' }] },
    })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(200)
    const arg = mockUpsert.mock.calls[0][0]
    expect(arg.where).toEqual({ appointmentId: 'apt-1' })
    const saved = JSON.parse(arg.create.items)
    expect(saved).toHaveLength(1) // empty-name item dropped
    expect(saved[0].name).toBe('Paracetamol')
    expect(arg.create.diagnosis).toBe('Viral fever')
  })

  it('rejects items that are all blank', async () => {
    const { req, res } = createMocks({ method: 'POST', body: { appointmentId: 'apt-1', items: [{ name: '  ' }] } })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(400)
  })

  it('rejects non-POST methods', async () => {
    const { req, res } = createMocks({ method: 'GET' })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(405)
  })
})
