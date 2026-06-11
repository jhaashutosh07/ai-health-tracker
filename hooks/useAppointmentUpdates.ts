import { useEffect } from 'react'
import { getPusherClient } from '@/lib/pusher'

interface AppointmentUpdate {
  appointmentId: string
  status: string
  notes: string | null
}

export function useAppointmentUpdates(
  userId: string | undefined,
  onUpdate: (update: AppointmentUpdate) => void
) {
  useEffect(() => {
    if (!userId) return

    const pusher = getPusherClient()
    if (!pusher) return

    const channel = pusher.subscribe(`patient-${userId}`)
    channel.bind('appointment-updated', onUpdate)

    return () => {
      channel.unbind('appointment-updated', onUpdate)
      pusher.unsubscribe(`patient-${userId}`)
    }
  }, [userId, onUpdate])
}
