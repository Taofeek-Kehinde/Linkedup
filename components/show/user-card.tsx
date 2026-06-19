'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MessageCircle, User } from 'lucide-react'
import type { EventUser } from '@/lib/types'

interface SelfieImageProps {
  src: string | null | undefined
  alt: string
  className?: string
  fallbackClassName?: string
}

export function SelfieImage({ src, alt, className, fallbackClassName }: SelfieImageProps) {
  const [imageFailed, setImageFailed] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  const raw = (src || '').trim()

  // Render/Supabase robustness:
  // - If src is already an absolute URL => use it.
  // - If src looks like a Supabase storage path (e.g. "selfies/<...>/<file>.jpg"),
  //   convert it to a public URL using NEXT_PUBLIC_SUPABASE_URL.
  const selfieUrl = (() => {
    if (!raw) return ''
    if (/^https?:\/\//i.test(raw)) return raw

    // normalize: allow both with and without leading slash
    const path = raw.startsWith('/') ? raw.slice(1) : raw
    if (!path.startsWith('selfies/')) return raw

    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
    if (!supabaseUrl) return raw

    // prevent duplicated slashes
    return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${path}`
  })()

  useEffect(() => {
    setImageFailed(false)
    setRetryCount(0)
  }, [selfieUrl])

  const showFallback = imageFailed || selfieUrl.length === 0
  const retryUrl = selfieUrl
    ? `${selfieUrl}${selfieUrl.includes('?') ? '&' : '?'}retry=${retryCount}`
    : ''

  if (showFallback) {
    return (
      <div
        className={
          fallbackClassName ||
          'w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/10'
        }
      >
        <User className="h-10 w-10 text-muted-foreground" />
      </div>
    )
  }

  return (
    <img
      src={retryUrl}
      alt={alt}
      className={className || 'w-full h-full object-cover'}
      loading="lazy"
      decoding="async"
      onError={() => {
        if (retryCount === 0) {
          setRetryCount(1)
          return
        }

        setImageFailed(true)
      }}
    />
  )
}

interface UserCardProps {
  user: EventUser
  onChat: () => void
  onPass: () => void
  canChat: boolean
}

export function UserCard({ user, onChat, onPass, canChat }: UserCardProps) {

return (
     <div className="h-full flex items-center justify-center p-6">
       <Card className="w-full max-w-sm border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
         <CardContent className="p-0">
           {/* Selfie or placeholder */}
            <div className="aspect-square w-full relative bg-gradient-to-br from-primary/20 to-accent/20">
              <SelfieImage
                src={user.selfie_url}
                alt={user.username}
                className="w-full h-full object-cover"
              />
              {user.is_active && !user.last_seen && (
                <div className="absolute -bottom-2 -right-2 w-5 h-5 bg-green-500 rounded-full border-3 border-background"></div>
              )}

              {/* Overlay gradient */}
             <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-card to-transparent" />

             {/* VIP tick */}
             {user.is_vip && (
               <div className="absolute top-3 right-3">
                 <img src="/tick.png" alt="VIP" className="w-8 h-8 drop-shadow-lg" />
               </div>
             )}
           </div>

           {/* User info */}
           <div className="p-4 space-y-4 -mt-16 relative">
             <div className="flex items-end justify-between">
               <div className="flex items-center gap-2">
                 <h2 className="text-2xl font-bold text-foreground">{user.username}</h2>
                 {user.is_vip && <img src="/tick.png" alt="VIP" className="w-6 h-6" />}
               </div>
               <div className="flex items-center gap-2">
                 {user.is_upgraded && (
                   <Badge className="bg-accent text-accent-foreground">Upgraded</Badge>
                 )}
               </div>
             </div>
             <p className="text-sm font-mono text-primary">{user.vibe_key}</p>
             <p className="text-xs text-muted-foreground">
               {user.is_active && !user.last_seen
                 ? 'Online'
                 : user.last_seen
                 ? `Last seen ${new Date(user.last_seen).toLocaleTimeString()}`
                 : 'Offline'}
             </p>

             {/* Pass / Peep buttons */}
             <div className="flex gap-4 pt-2">
               <Button
                 className="flex-1 h-14 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                 size="lg"
                 onClick={onPass}
               >
                 Pass
               </Button>
               <Button
                 className="flex-1 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white"
                 size="lg"
                 onClick={onChat}
               >
                 Peep
               </Button>
             </div>
           </div>
         </CardContent>
       </Card>
     </div>
   )
}

