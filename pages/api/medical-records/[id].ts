import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

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
        }
      })

      if (!document) {
        return res.status(404).json({ message: 'Document not found' })
      }

      return res.status(200).json({ document })
    }

    // DELETE - Remove document
    if (req.method === 'DELETE') {
      const document = await prisma.medicalDocument.findFirst({
        where: {
          id,
          userId: session.user.id
        }
      })

      if (!document) {
        return res.status(404).json({ message: 'Document not found' })
      }

      // Delete file from filesystem
      const filePath = path.join(process.cwd(), 'public', document.fileUrl)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }

      // Delete from database
      await prisma.medicalDocument.delete({
        where: { id }
      })

      return res.status(200).json({ message: 'Document deleted successfully' })
    }

    return res.status(405).json({ message: 'Method not allowed' })

  } catch (error) {
    console.error('Document operation error:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
