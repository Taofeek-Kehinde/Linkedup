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

    // Upload to Vercel Blob (public access so images can be viewed)
    const blob = await put(filename, file, {
      access: 'public', // Changed from 'private' to 'public'
    })

    // Return the full URL for direct image access
    return NextResponse.json({ url: blob.url, pathname: blob.pathname })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}