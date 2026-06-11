import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { anthropic } from '@/lib/claude'
import { prisma } from '@/lib/prisma'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user) return res.status(401).json({ message: 'Unauthorized' })

  const { imageBase64, mimeType, title, category, documentDate } = req.body

  if (!imageBase64 || !mimeType) {
    return res.status(400).json({ message: 'Image data and MIME type are required' })
  }

  const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  if (!supportedTypes.includes(mimeType)) {
    return res.status(400).json({
      message: `Unsupported file type: ${mimeType}. Please upload JPG, PNG, GIF, or WEBP images.`,
    })
  }

  // Estimate base64 size (4/3 × bytes) — reject obvious oversize early
  const estimatedBytes = (imageBase64.length * 3) / 4
  if (estimatedBytes > 10 * 1024 * 1024) {
    return res.status(400).json({ message: 'Image is too large. Please upload an image under 10MB.' })
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: `You are a medical document analyzer. Please extract ALL text from this medical document image using OCR, then provide a structured summary.

Respond in this exact format:

## Extracted Text
[Full verbatim text from the document, preserving structure as much as possible]

## Document Summary
[3-5 sentences summarizing what this document contains — patient name if visible, date, type of report, key findings or values, doctor name if present]

## Key Information
- Document type: [Lab Report / Prescription / X-Ray Report / Medical Certificate / Other]
- Date on document: [date if visible, or "Not specified"]
- Patient name: [if visible, or "Not visible"]
- Doctor/Hospital: [if visible, or "Not visible"]
- Key findings: [bullet points of important medical values or findings]

Be thorough with the OCR — capture all numbers, units, reference ranges, and medical terminology exactly as written.`,
            },
          ],
        },
      ],
    })

    const ocrText = response.content[0]?.type === 'text' ? response.content[0].text : ''

    if (!ocrText) {
      return res.status(500).json({ message: 'OCR returned no text. Please try a clearer image.' })
    }

    // Save to database — description holds full OCR + summary text
    const document = await prisma.medicalDocument.create({
      data: {
        userId: session.user.id,
        title: title || 'Medical Document',
        description: ocrText,
        category: category || 'OTHER',
        fileName: `ocr-${Date.now()}.jpg`,
        fileUrl: '',
        fileSize: Math.round(estimatedBytes),
        mimeType,
        documentDate: documentDate ? new Date(documentDate) : null,
      },
    })

    return res.status(201).json({
      message: 'Document analyzed and saved successfully',
      document,
      ocrText,
    })
  } catch (err: any) {
    console.error('OCR error:', err)
    return res.status(500).json({
      message: `AI analysis failed: ${err.message}. Please try again.`,
    })
  }
}
