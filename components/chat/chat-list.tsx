'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { X, MessageCircle, ChevronRight, Clock } from 'lucide-react'
import type { Event } from '@/lib/types'
import type { Chat, EventUser } from '@/lib/types'

interface ChatListProps {
  chats: Chat[]
  currentUser: EventUser
  eventId: string
  event: Event
  onClose: () => void
  onChatSelect?: (chatId: string) => void
}

interface ChatWithPartner extends Chat {
  partner?: EventUser
  lastMessage?: string
}

export function ChatList({ chats, currentUser, eventId, event, onClose, onChatSelect }: ChatListProps) {
  const [timeRemaining, setTimeRemaining] = useState('')
  const [failedSelfieUrls, setFailedSelfieUrls] = useState<Set<string>>(new Set())

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (event.status === 'live') {
      const updateTimer = () => {
        const now = Date.now()
        let endTime = 0
        if (event.ends_at) {
          endTime = new Date(event.ends_at).getTime()
        } else {
          const createdTime = new Date(event.created_at).getTime()
          endTime = createdTime + (event.duration_hours * 60 * 60 * 1000)
        }
        const remaining = endTime - now
        if (remaining <= 0) {
          setTimeRemaining('Event ended')
          return
        }
        const hours = Math.floor(remaining / (1000 * 60 * 60))
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000)
        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`)
      }
      updateTimer()
      interval = setInterval(updateTimer, 1000)
    }
    return () => clearInterval(interval)
  }, [event])

  const markSelfieFailed = useCallback((url: string) => {
    setFailedSelfieUrls((prev) => {
      const next = new Set(prev)
      next.add(url)
      return next
    })
  }, [])

  const router = useRouter()
  const [chatsWithPartners, setChatsWithPartners] = useState<ChatWithPartner[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadChatPartners() {
      const supabase = createClient()
      
      const enrichedChats = await Promise.all(
        chats.map(async (chat) => {
          // Get the other user
          const partnerId = chat.user1_id === currentUser.id ? chat.user2_id : chat.user1_id
          
          const { data: partner } = await supabase
            .from('event_users')
            .select('*')
            .eq('id', partnerId)
            .single()

          // Get last message
          const { data: messages } = await supabase
            .from('messages')
            .select('content')
            .eq('chat_id', chat.id)
            .order('created_at', { ascending: false })
            .limit(1)

          return {
            ...chat,
            partner: partner || undefined,
            lastMessage: messages?.[0]?.content || 'No messages yet',
          }
        })
      )

      setChatsWithPartners(enrichedChats)
      setIsLoading(false)
    }

    loadChatPartners()
  }, [chats, currentUser.id])

  function openChat(chatId: string) {
    if (onChatSelect) {
      onChatSelect(chatId)
    } else {
      router.push(`/show/${eventId}/chat/${chatId}`)
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <h2 className="text-lg font-semibold text-foreground">Your Chats</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {chatsWithPartners.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">No chats yet</h3>
            <p className="text-sm text-muted-foreground">
              Browse the feed and start a conversation with someone interesting!
            </p>
          </div>
        ) : (
          chatsWithPartners.map((chat) => (
            <Card 
              key={chat.id} 
              className="border-border/50 bg-card/50 hover:bg-card/80 transition-colors cursor-pointer"
              onClick={() => openChat(chat.id)}
            >
              <CardContent className="p-3 flex items-center gap-3">
                {(() => {
                  const selfieUrl = (chat.partner?.selfie_url || '').trim()
                  const showFallback = failedSelfieUrls.has(selfieUrl) || selfieUrl.length === 0
                  return showFallback ? (
                    <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-muted-foreground font-medium">
                      {chat.partner?.username.slice(0, 2).toUpperCase() || '??'}
                    </div>
                  ) : (
                    <img 
                      src={selfieUrl}
                      alt={chat.partner.username}
                      className="w-12 h-12 rounded-full object-cover"
                      onError={() => markSelfieFailed(selfieUrl)}
                    />
                  )
                })()}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {chat.partner?.username || 'Unknown User'}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {chat.lastMessage}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Live timer - same as show-feed */}
      <div className="p-4 border-t border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-sm font-mono font-bold text-primary text-center mx-auto">
          <Clock className="h-4 w-4" />
          <span>{timeRemaining || 'Loading...'}</span>
        </div>
      </div>
    </div>
  )
}
