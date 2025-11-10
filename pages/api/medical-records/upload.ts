import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import formidable, { File } from 'formidable'
import fs from 'fs'
import path from 'path'

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  try {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'medical-documents')

    // Ensure upload directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    const form = formidable({
      uploadDir,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      filename: (name, ext, part) => {
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        return `${session.user.id}-${uniqueSuffix}${ext}`
      }
    })

    const [fields, files] = await form.parse(req)

    const file = files.file?.[0] as File
    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' })
    }

    const title = fields.title?.[0] || file.originalFilename || 'Untitled'
    const description = fields.description?.[0] || null
    const category = fields.category?.[0] || 'OTHER'
    const documentDateStr = fields.documentDate?.[0]

    // Save file info to database
    const document = await prisma.medicalDocument.create({
      data: {
        userId: session.user.id,
        title,
        description,
        category,
        fileName: file.originalFilename || file.newFilename,
        fileUrl: `/uploads/medical-documents/${file.newFilename}`,
        fileSize: file.size,
        mimeType: file.mimetype || 'application/octet-stream',
        documentDate: documentDateStr ? new Date(documentDateStr) : null
      }
    })

    return res.status(201).json({
      message: 'File uploaded successfully',
      document
    })

  } catch (error) {
    console.error('Upload error:', error)
    return res.status(500).json({ message: 'Failed to upload file' })
  }
}
