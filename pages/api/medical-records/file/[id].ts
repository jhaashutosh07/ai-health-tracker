import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

// Streams a medical document's bytes only to its owner. This replaces serving
// files statically from /public, which had no access control.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const { id } = req.query
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'Invalid document ID' })
  }

  const document = await prisma.medicalDocument.findFirst({
    where: { id, userId: session.user.id },
    select: { fileData: true, mimeType: true, fileName: true },
  })

  if (!document || !document.fileData) {
    return res.status(404).json({ message: 'Document not found' })
  }

  const buffer = Buffer.from(document.fileData)
  const safeName = (document.fileName || 'document').replace(/[^\w.\-]+/g, '_')

  res.setHeader('Content-Type', document.mimeType || 'application/octet-stream')
  res.setHeader('Content-Length', buffer.length)
  // Prevent MIME sniffing and keep these private to the authenticated user.
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Cache-Control', 'private, no-store')
  res.setHeader('Content-Disposition', `inline; filename="${safeName}"`)

  return res.status(200).send(buffer)
}
