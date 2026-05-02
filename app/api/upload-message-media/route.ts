import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegPath from 'ffmpeg-static'
import fs from 'fs'

ffmpeg.setFfmpegPath(ffmpegPath as string)

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
    const outputExt = isVideo ? 'mp4' : 'mp3'

    const unique = Date.now()
    const tempInput = `/tmp/input-${unique}.webm`
    const tempOutput = `/tmp/output-${unique}.${outputExt}`

    // Save input file
    fs.writeFileSync(tempInput, buffer)

    // Convert using ffmpeg
    await new Promise((resolve, reject) => {
      if (isVideo) {
  ffmpeg(tempInput)
    .output(tempOutput)
    .videoCodec('libx264')
    .audioCodec('aac')
    .on('end', resolve)
    .on('error', reject)
    .run()
} else {
  ffmpeg(tempInput)
    .output(tempOutput)
    .audioCodec('libmp3lame')
    .on('end', resolve)
    .on('error', reject)
    .run()
}
    })

    const outputBuffer = fs.readFileSync(tempOutput)

    const supabase = await createClient()

    const filename = `${eventId}/${chatId}/${Date.now()}.${outputExt}`

    const { error: uploadError } = await supabase.storage
      .from('chat-media')
      .upload(filename, outputBuffer, {
        contentType: isVideo ? 'video/mp4' : 'audio/mpeg',
        upsert: true,
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data } = supabase.storage
      .from('chat-media')
      .getPublicUrl(filename)

    return NextResponse.json({
      url: data.publicUrl,
      type: isVideo ? 'video' : 'audio',
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}