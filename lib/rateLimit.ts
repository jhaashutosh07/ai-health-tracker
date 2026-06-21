import type { NextApiRequest } from 'next'

// Lightweight in-memory sliding-window rate limiter.
// Note: on serverless this is per-instance, not globally shared — it raises the
// bar against casual brute-force/abuse but is not a substitute for a distributed
// limiter (e.g. Upstash) if stronger guarantees are needed.
type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()

export function clientIp(req: NextApiRequest): string {
  const fwd = req.headers['x-forwarded-for']
  if (typeof fwd === 'string' && fwd.length > 0) return fwd.split(',')[0].trim()
  if (Array.isArray(fwd) && fwd.length > 0) return fwd[0]
  return req.socket?.remoteAddress || 'unknown'
}

/**
 * Returns true if the request is allowed, false if it has exceeded the limit.
 * @param key   logical bucket key (e.g. `login:1.2.3.4`)
 * @param limit max requests permitted within the window
 * @param windowMs window length in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (bucket.count >= limit) return false

  bucket.count++
  return true
}
