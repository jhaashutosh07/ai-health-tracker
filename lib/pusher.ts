import Pusher from 'pusher'
import PusherJS from 'pusher-js'

// Server-side Pusher instance
export const pusherServer =
  process.env.PUSHER_APP_ID &&
  process.env.PUSHER_KEY &&
  process.env.PUSHER_SECRET &&
  process.env.PUSHER_CLUSTER
    ? new Pusher({
        appId: process.env.PUSHER_APP_ID,
        key: process.env.PUSHER_KEY,
        secret: process.env.PUSHER_SECRET,
        cluster: process.env.PUSHER_CLUSTER,
        useTLS: true,
      })
    : null

// Client-side Pusher factory — call once and reuse
let pusherClient: PusherJS | null = null

export function getPusherClient(): PusherJS | null {
  if (typeof window === 'undefined') return null

  const key = process.env.NEXT_PUBLIC_PUSHER_KEY
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER

  if (!key || !cluster) return null

  if (!pusherClient) {
    pusherClient = new PusherJS(key, { cluster })
  }

  return pusherClient
}
