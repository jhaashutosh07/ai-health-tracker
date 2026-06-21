import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import formidable, { File } from 'formidable'
import fs from 'fs'
import os from 'os'

export const config = {
  api: {
    bodyParser: false,
  },
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// Only allow document/image types we can safely store and render. This prevents
// uploading active content (.html/.svg/.js) that could be served back and
// executed in the user's browser (stored XSS).
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
])
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.webp'])

function getExtension(name: string | null | undefined): string {
  if (!name) return ''
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i).toLowerCase() : ''
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

  let tempPath: string | undefined

  try {
    // Parse into the OS temp dir (the only reliably writable location on
    // serverless platforms like Vercel). The bytes are then persisted to the
    // database and the temp file is removed.
    const form = formidable({
      uploadDir: os.tmpdir(),
      keepExtensions: true,
      maxFileSize: MAX_FILE_SIZE,
    })

    const [fields, files] = await form.parse(req)

    const file = files.file?.[0] as File | undefined
    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' })
    }
    tempPath = file.filepath

    // Validate type by both MIME and extension.
    const ext = getExtension(file.originalFilename)
    if (!ALLOWED_MIME_TYPES.has(file.mimetype || '') || !ALLOWED_EXTENSIONS.has(ext)) {
      return res.status(400).json({
        message: 'Unsupported file type. Please upload a PDF, JPG, PNG, or WEBP file.',
      })
    }

    const fileData = fs.readFileSync(file.filepath)

    const title = fields.title?.[0] || file.originalFilename || 'Untitled'
    const description = fields.description?.[0] || null
    const category = fields.category?.[0] || 'OTHER'
    const documentDateStr = fields.documentDate?.[0]

    const document = await prisma.medicalDocument.create({
      data: {
        userId: session.user.id,
        title,
        description,
        category,
        fileName: file.originalFilename || 'document',
        // Served only through the authenticated, ownership-checked route — never from /public.
        fileUrl: '', // set below once we have the id
        fileData,
        fileSize: file.size,
        mimeType: file.mimetype || 'application/octet-stream',
        documentDate: documentDateStr ? new Date(documentDateStr) : null,
      },
    })

    const updated = await prisma.medicalDocument.update({
      where: { id: document.id },
      data: { fileUrl: `/api/medical-records/file/${document.id}` },
      // Don't ship the raw bytes back to the client.
      select: {
        id: true, userId: true, title: true, description: true, category: true,
        fileName: true, fileUrl: true, fileSize: true, mimeType: true,
        uploadedDate: true, documentDate: true, createdAt: true, updatedAt: true,
      },
    })

    return res.status(201).json({
      message: 'File uploaded successfully',
      document: updated,
    })
  } catch (error: any) {
    if (error?.code === 1009 || /maxFileSize/i.test(error?.message || '')) {
      return res.status(413).json({ message: 'File is too large. Maximum size is 10MB.' })
    }
    console.error('Upload error:', error)
    return res.status(500).json({ message: 'Failed to upload file' })
  } finally {
    if (tempPath) {
      try { fs.unlinkSync(tempPath) } catch { /* best-effort cleanup */ }
    }
  }
}
