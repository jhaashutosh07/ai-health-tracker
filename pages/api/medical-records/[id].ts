import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

// Fields returned to the client — deliberately excludes the raw `fileData` bytes.
const documentSelect = {
  id: true, userId: true, title: true, description: true, category: true,
  fileName: true, fileUrl: true, fileSize: true, mimeType: true,
  uploadedDate: true, documentDate: true, createdAt: true, updatedAt: true,
} as const

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'Invalid document ID' })
  }

  try {
    // GET - Fetch single document
    if (req.method === 'GET') {
      const document = await prisma.medicalDocument.findFirst({
        where: {
          id,
          userId: session.user.id
        },
        select: documentSelect,
      })

      if (!document) {
        return res.status(404).json({ message: 'Document not found' })
      }

      return res.status(200).json({ document })
    }

    // DELETE - Remove document
    if (req.method === 'DELETE') {
      // Scope the delete to the owner so it both enforces ownership and 404s otherwise.
      const result = await prisma.medicalDocument.deleteMany({
        where: { id, userId: session.user.id },
      })

      if (result.count === 0) {
        return res.status(404).json({ message: 'Document not found' })
      }

      return res.status(200).json({ message: 'Document deleted successfully' })
    }

    return res.status(405).json({ message: 'Method not allowed' })

  } catch (error) {
    console.error('Document operation error:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
