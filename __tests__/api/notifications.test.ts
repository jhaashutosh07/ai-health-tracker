import { createMocks } from 'node-mocks-http'
import handler from '@/pages/api/notifications'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/pages/api/auth/[...nextauth]', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    symptomLog: { findFirst: jest.fn() },
    appointment: { findMany: jest.fn() },
    medication: { findMany: jest.fn() },
  },
}))

const mockSession = getServerSession as jest.Mock
const mockFollowUp = prisma.symptomLog.findFirst as jest.Mock
const mockAppts = prisma.appointment.findMany as jest.Mock
const mockMeds = prisma.medication.findMany as jest.Mock

beforeEach(() => {
  mockSession.mockResolvedValue({ user: { id: 'user-1', role: 'PATIENT' } })
  mockFollowUp.mockResolvedValue(null)
  mockAppts.mockResolvedValue([])
  mockMeds.mockResolvedValue([])
})

describe('GET /api/notifications', () => {
  it('rejects unauthenticated requests', async () => {
    mockSession.mockResolvedValue(null)
    const { req, res } = createMocks({ method: 'GET' })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(401)
  })

  it('returns an empty list for doctors', async () => {
    mockSession.mockResolvedValue({ user: { id: 'd1', role: 'DOCTOR' } })
    const { req, res } = createMocks({ method: 'GET' })
    await handler(req as any, res as any)
    expect(JSON.parse(res._getData()).notifications).toEqual([])
  })

  it('returns no notifications when nothing is pending', async () => {
    const { req, res } = createMocks({ method: 'GET' })
    await handler(req as any, res as any)
    expect(JSON.parse(res._getData()).notifications).toEqual([])
  })

  it('surfaces a pending follow-up check-in', async () => {
    mockFollowUp.mockResolvedValue({
      id: 'log-1', symptoms: '["fever","cough"]', severity: 'HIGH',
      createdAt: new Date(), followUpSentAt: new Date(),
    })
    const { req, res } = createMocks({ method: 'GET' })
    await handler(req as any, res as any)
    const items = JSON.parse(res._getData()).notifications
    expect(items.some((n: any) => n.type === 'followup')).toBe(true)
  })

  it('surfaces appointment status changes', async () => {
    mockAppts.mockResolvedValue([
      { id: 'a1', status: 'CONFIRMED', appointmentDate: new Date(), appointmentTime: '10:00', updatedAt: new Date(), doctor: { name: 'Rao' } },
    ])
    const { req, res } = createMocks({ method: 'GET' })
    await handler(req as any, res as any)
    const items = JSON.parse(res._getData()).notifications
    const apt = items.find((n: any) => n.type === 'appointment')
    expect(apt).toBeTruthy()
    expect(apt.title).toMatch(/confirmed/i)
  })

  it('counts medication doses still due today', async () => {
    mockMeds.mockResolvedValue([
      { times: '["08:00","20:00"]', doseLogs: [{ time: '08:00' }] }, // one of two taken
    ])
    const { req, res } = createMocks({ method: 'GET' })
    await handler(req as any, res as any)
    const items = JSON.parse(res._getData()).notifications
    const med = items.find((n: any) => n.type === 'medication')
    expect(med).toBeTruthy()
    expect(med.body).toMatch(/1 dose/)
  })

  it('rejects non-GET methods', async () => {
    const { req, res } = createMocks({ method: 'POST' })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(405)
  })
})
