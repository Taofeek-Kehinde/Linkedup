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
  const [mediaFailed, setMediaFailed] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [isLoaded, setIsLoaded] = useState(false)
  const [retryPending, setRetryPending] = useState(false)

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
  const isVideo = /\.(webm|mp4)(?:[?#]|$)/i.test(selfieUrl)
  const imageUrl = (() => {
    if (isVideo) return selfieUrl

    try {
      const url = new URL(selfieUrl)
      if (/\/storage\/v1\/object\/public\//.test(url.pathname)) {
        url.searchParams.set('width', '512')
        url.searchParams.set('height', '512')
        url.searchParams.set('resize', 'cover')
        url.searchParams.set('quality', '75')
      }
      return url.toString()
    } catch {
      return selfieUrl
    }
  })()

  useEffect(() => {
    setMediaFailed(false)
    setRetryCount(0)
    setIsLoaded(false)
    setRetryPending(false)
  }, [selfieUrl])

  useEffect(() => {
    if (!retryPending) return

    let timeoutId: number | undefined
    const retry = () => {
      timeoutId = window.setTimeout(() => {
        setRetryCount((count) => count + 1)
        setRetryPending(false)
      }, Math.min(1000 * 2 ** retryCount, 8000))
    }

    if (navigator.onLine) {
      retry()
    } else {
      window.addEventListener('online', retry, { once: true })
    }

    return () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId)
      window.removeEventListener('online', retry)
    }
  }, [retryCount, retryPending])

  const showFallback = mediaFailed || selfieUrl.length === 0

  function handleMediaError() {
    setIsLoaded(false)
    if (retryCount < 3) {
      setRetryPending(true)
    } else {
      setMediaFailed(true)
    }
  }

  const retryUrl = retryCount === 0
    ? imageUrl
    : `${imageUrl}${imageUrl.includes('?') ? '&' : '?'}retry=${retryCount}`

  function retryImage() {
    setIsLoaded(false)
    setRetryPending(false)
    setRetryCount(0)
    setMediaFailed(false)
  }

  if (showFallback) {
    return (
      <div
        className={`relative ${fallbackClassName || 'w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/10'}`}
      >
        <User className="h-10 w-10 text-muted-foreground" />
        {selfieUrl && (
          <button
            type="button"
            className="absolute bottom-1 rounded bg-background/80 px-2 py-1 text-[10px] text-foreground"
            onClick={(event) => {
              event.stopPropagation()
              retryImage()
            }}
            aria-label={`Retry loading ${alt}'s photo`}
          >
            Retry
          </button>
        )}
      </div>
    )
  }

  if (isVideo) {
    return (
      <div className="relative h-full w-full overflow-hidden">
        {!isLoaded && (
          <div
            className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted to-muted-foreground/10"
            aria-hidden="true"
          />
        )}
        <video
          key={retryUrl}
          src={retryUrl}
          autoPlay
          loop
          muted
          playsInline
          className={className || 'w-full h-full object-cover'}
          onLoadedData={() => setIsLoaded(true)}
          onError={handleMediaError}
        />
      </div>
    )
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      {!isLoaded && (
        <div
          className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted to-muted-foreground/10"
          aria-hidden="true"
        />
      )}
      <img
        key={`${selfieUrl}-${retryCount}`}
        src={retryUrl}
        alt={alt}
        className={className || 'w-full h-full object-cover'}
        loading="lazy"
        decoding="async"
        onLoad={() => {
          setIsLoaded(true)
          setRetryPending(false)
        }}
        onError={handleMediaError}
      />
    </div>
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
