'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MessageCircle, User, Lock } from 'lucide-react'
import type { EventUser } from '@/lib/types'
interface UserCardProps {
  user: EventUser
  onChat: () => void
  onPass: () => void
  canChat: boolean
}

export function UserCard({ user, onChat, onPass, canChat }: UserCardProps) {
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => {
    setImageFailed(false)
  }, [user.selfie_url])

  const selfieUrl = (user.selfie_url || '').trim()
  const showFallback = imageFailed || selfieUrl.length === 0

  return (
    <div className="h-full flex items-center justify-center p-6">
      <Card className="w-full max-w-sm border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
        <CardContent className="p-0">
          {/* Selfie or placeholder */}
          <div className="aspect-square relative bg-gradient-to-br from-primary/20 to-accent/20">
            {showFallback ? (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/10">
                <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                  {user.username.charAt(0).toUpperCase()}
                </div>
              </div>
            ) : (
              <img
                src={selfieUrl}
                alt={user.username}
                className="w-full h-full object-cover"
                onError={() => setImageFailed(true)}
              />
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

