// app/utils/upload-selfie.ts
import { createClient } from '@/lib/supabase/client' 

export async function uploadSelfie(
  userId: string, 
  eventId: string, 
  blob: Blob
): Promise<string | null> {
  const supabase = createClient()
  
  const filename = `${userId}-${Date.now()}.jpg`
  const filePath = `selfies/${eventId}/${filename}`
  
  const { data, error } = await supabase.storage
    .from('selfies')
    .upload(filePath, blob, {
      contentType: 'image/jpeg',
      upsert: true,
      cacheControl: '3600',
    })


  
  if (error) {
    console.error('Upload error:', error)
    return null
  }
  
  const { data: urlData } = supabase.storage
    .from('selfies')
    .getPublicUrl(filePath)

  
  return urlData.publicUrl
}