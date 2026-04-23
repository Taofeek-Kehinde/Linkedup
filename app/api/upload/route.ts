import { put } from '@vercel/blob'
import { type NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Get user identity for deterministic filename
    const eventId = (formData.get('eventId') as string) || 'unknown'
    const username = (formData.get('username') as string) || 'unknown'

    // Sanitize username for safe filesystem use
    const sanitizedUsername = username
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .substring(0, 40) || 'user'

    // Deterministic filename so each user's selfie is their profile picture
    const filename = `selfies/${eventId}/${sanitizedUsername}.jpg`

    // Upload to Vercel Blob (private access)
    const blob = await put(filename, file, {
      access: 'private',
    })

    // Return pathname for private blob access
    return NextResponse.json({ pathname: blob.pathname })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
