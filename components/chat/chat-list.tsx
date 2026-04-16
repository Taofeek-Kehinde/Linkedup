'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { X, MessageCircle, ChevronRight } from 'lucide-react'
import type { Chat, EventUser } from '@/lib/types'

interface ChatListProps {
  chats: Chat[]
  currentUser: EventUser
  eventId: string
  onClose: () => void
}

interface ChatWithPartner extends Chat {
  partner?: EventUser
  lastMessage?: string
}

export function ChatList({ chats, currentUser, eventId, onClose }: ChatListProps) {
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
    router.push(`/show/${eventId}/chat/${chatId}`)
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
                {chat.partner?.selfie_url ? (
                  <img 
                    src={chat.partner.selfie_url} 
                    alt={chat.partner.username}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-muted-foreground font-medium">
                    {chat.partner?.username.slice(0, 2).toUpperCase() || '??'}
                  </div>
                )}
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

      {/* Info */}
      <div className="p-4 border-t border-border/50">
        <p className="text-xs text-center text-muted-foreground">
          {chatsWithPartners.length}/6 chats used
        </p>
      </div>
    </div>
  )
}
