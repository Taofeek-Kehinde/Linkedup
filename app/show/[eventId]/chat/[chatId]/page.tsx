'use client'

import { useEffect, useState, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getLocalSession } from '@/lib/utils/session'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { ArrowLeft, Send, User } from 'lucide-react'
import type { Chat, EventUser, Message, UserSession } from '@/lib/types'

export default function ChatPage({ params }: { params: Promise<{ eventId: string; chatId: string }> }) {
  const { eventId, chatId } = use(params)
  const router = useRouter()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  const [session, setSession] = useState<UserSession | null>(null)
  const [chat, setChat] = useState<Chat | null>(null)
  const [partner, setPartner] = useState<EventUser | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)

  // Load initial data
  useEffect(() => {
    async function loadData() {
      const localSession = getLocalSession()
      if (!localSession || localSession.eventId !== eventId) {
        router.push('/')
        return
      }
      setSession(localSession)

      const supabase = createClient()

      // Load chat
      const { data: chatData } = await supabase
        .from('chats')
        .select('*')
        .eq('id', chatId)
        .single()

      if (!chatData) {
        router.push(`/show/${eventId}`)
        return
      }
      setChat(chatData)

      // Load partner
      const partnerId = chatData.user1_id === localSession.eventUserId 
        ? chatData.user2_id 
        : chatData.user1_id

      const { data: partnerData } = await supabase
        .from('event_users')
        .select('*')
        .eq('id', partnerId)
        .single()

      setPartner(partnerData)

      // Load messages
      const { data: messagesData } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })

      setMessages(messagesData || [])
      setIsLoading(false)
    }

    loadData()
  }, [eventId, chatId, router])

  // Real-time subscription for new messages
  useEffect(() => {
    if (!chat) return

    const supabase = createClient()
    const channel = supabase
      .channel(`chat-${chatId}-messages`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(m => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [chat, chatId])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!newMessage.trim() || !session || isSending) return

    setIsSending(true)
    const messageText = newMessage.trim()
    setNewMessage('')

    const supabase = createClient()
    const { error } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        sender_id: session.eventUserId,
        content: messageText,
      })

    if (error) {
      setNewMessage(messageText) // Restore on error
    }
    
    setIsSending(false)
    inputRef.current?.focus()
  }

  if (isLoading || !session) {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-background">
        <Spinner className="w-8 h-8" />
      </main>
    )
  }

  return (
    <main className="min-h-dvh flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/show/${eventId}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          {partner?.selfie_url ? (
            <img 
              src={partner.selfie_url} 
              alt={partner.username}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-foreground truncate">{partner?.username || 'Unknown'}</h1>
            <p className="text-xs font-mono text-muted-foreground">{partner?.vibe_key}</p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <p className="text-muted-foreground">
              Start the conversation! Say hi to {partner?.username}.
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.sender_id === session.eventUserId
            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                    isOwn
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-secondary text-secondary-foreground rounded-bl-md'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                  <p className={`text-xs mt-1 ${isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                    {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="sticky bottom-0 bg-background border-t border-border/50 p-4">
        <form onSubmit={sendMessage} className="flex gap-2">
          <Input
            ref={inputRef}
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 bg-input"
            autoComplete="off"
          />
          <Button type="submit" size="icon" disabled={!newMessage.trim() || isSending}>
            {isSending ? (
              <Spinner className="h-4 w-4" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </main>
  )
}
