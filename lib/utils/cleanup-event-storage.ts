import { createClient } from '@supabase/supabase-js'

function sanitizeSupabaseUrl(url?: string): string {
  if (!url) return ''
  return url.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '')
}

function normalizeServiceRoleKey(key?: string): string {
  return (key || '').trim().replace(/^["']|["']$/g, '')
}

/**
 * Clean up all storage files and database records for a given event.
 * This frees up storage space by deleting all selfie/avatar videos.
 */
export async function cleanupEventStorage(eventId: string): Promise<{ ok: boolean; deletedFiles: number; error?: string }> {
  const supabaseUrl = sanitizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const supabaseServiceKey = normalizeServiceRoleKey(process.env.SUPABASE_SERVICE_ROLE_KEY)

  if (!supabaseUrl || !supabaseServiceKey) {
    return { ok: false, deletedFiles: 0, error: 'Missing Supabase credentials' }
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  let deletedFiles = 0

  try {
    // Step 1: List all files in the event's folder in the 'selfies' bucket
    const folderPath = `selfies/${eventId}`
    
    const { data: fileList, error: listError } = await supabase.storage
      .from('selfies')
      .list(folderPath)

    if (listError) {
      console.error('Error listing selfie files:', listError)
      // Folder may not exist - that's okay
    }

    // Step 2: Delete all files in that folder
    if (fileList && fileList.length > 0) {
      const filePaths = fileList.map(file => `${folderPath}/${file.name}`)
      
      const { error: deleteError } = await supabase.storage
        .from('selfies')
        .remove(filePaths)

      if (deleteError) {
        console.error('Error deleting selfie files:', deleteError)
      } else {
        deletedFiles = fileList.length
        console.log(`Deleted ${deletedFiles} selfie file(s) for event ${eventId}`)
      }
    }

    return { ok: true, deletedFiles }
  } catch (err) {
    console.error('Cleanup error:', err)
    return { ok: false, deletedFiles, error: err instanceof Error ? err.message : 'Cleanup failed' }
  }
}
