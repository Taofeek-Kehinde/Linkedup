import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const eventId = formData.get('eventId') as string
    const chatId = formData.get('chatId') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const isVideo = file.type.startsWith('video')
    const extension = isVideo ? 'mp4' : 'mp3'
    const contentType = isVideo ? 'video/mp4' : 'audio/mpeg'
    
    // Create a clean filename
    const timestamp = Date.now()
    const filename = `${eventId}/${chatId}/${timestamp}.${extension}`

    const supabase = await createClient()
    
    // Upload directly to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('chat-media')
      .upload(filename, buffer, {
        contentType: contentType,
        upsert: true,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: urlData } = supabase.storage
      .from('chat-media')
      .getPublicUrl(filename)

    console.log('File uploaded successfully:', urlData.publicUrl)

    return NextResponse.json({
      url: urlData.publicUrl,
      type: isVideo ? 'video' : 'audio',
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}