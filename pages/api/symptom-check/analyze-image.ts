import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { openai, CHAT_MODEL } from '@/lib/openai'

export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const { image, mimeType } = req.body

  if (!image || !mimeType) {
    return res.status(400).json({ message: 'Image and mimeType are required' })
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!allowedTypes.includes(mimeType)) {
    return res.status(400).json({ message: 'Unsupported image type. Use JPEG, PNG, GIF, or WebP.' })
  }

  try {
    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      max_completion_tokens: 512,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${image}`,
              },
            },
            {
              type: 'text',
              text: 'You are helping analyze a medical image for symptom assessment. Describe visible symptoms objectively — such as rashes, redness, swelling, discoloration, wounds, or skin changes. If it is a prescription or lab report, summarize the key findings. Be clinical and concise (2-4 sentences). Do not diagnose.',
            },
          ],
        },
      ],
    })

    const description = response.choices[0]?.message?.content || ''
    return res.status(200).json({ description })
  } catch (error: any) {
    console.error('Image analysis error:', error)
    return res.status(500).json({ message: 'Failed to analyze image' })
  }
}
