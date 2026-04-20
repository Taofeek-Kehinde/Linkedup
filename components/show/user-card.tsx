'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MessageCircle, User, Lock } from 'lucide-react'
import type { EventUser } from '@/lib/types'

interface UserCardProps {
  user: EventUser
  onChat: () => void
  canChat: boolean
}

export function UserCard({ user, onChat, canChat }: UserCardProps) {
  return (
    <div className="h-full flex items-center justify-center p-6">
      <Card className="w-full max-w-sm border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
        <CardContent className="p-0">
          {/* Selfie or placeholder */}
          <div className="aspect-square relative bg-gradient-to-br from-primary/20 to-accent/20">
            {user.selfie_url ? (
              <img 
                src={user.selfie_url} 
                alt={user.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/10">
                <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                  {user.username.charAt(0).toUpperCase()}
                </div>
              </div>
            )}
            
            {/* Overlay gradient */}
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-card to-transparent" />
          </div>

          {/* User info */}
          <div className="p-4 space-y-4 -mt-16 relative">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground">{user.username}</h2>
                <p className="text-sm font-mono text-primary">{user.vibe_key}</p>
              </div>
              {user.is_upgraded && (
                <Badge className="bg-accent text-accent-foreground">
                  Upgraded
                </Badge>
              )}
            </div>

            {/* Chat button */}
            <Button 
              className="w-full" 
              size="lg"
              onClick={onChat}
              disabled={!canChat}
            >
              {canChat ? (
                <>
                  <MessageCircle className="mr-2 h-5 w-5" />
                  Start Chat
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-5 w-5" />
                  Chat Limit Reached
                </>
              )}
            </Button>

            {!canChat && (
              <p className="text-xs text-center text-muted-foreground">
                Upgrade to chat with more people
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
