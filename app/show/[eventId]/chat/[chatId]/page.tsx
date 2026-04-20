'use client'

import { useEffect, useState, useRef, use } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreVertical, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getLocalSession } from '@/lib/utils/session'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Spinner } from '@/components/ui/spinner'
import { ArrowLeft, Send, User, Sticker, MessageSquare } from 'lucide-react'
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
  const [replyTo, setReplyTo] = useState<Message | null>(null)

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

      // Load messages with reply_to populated
      const { data: messagesData } = await supabase
        .from('messages')
        .select('*, reply_to:reply_to_id(*)')
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

    const messageText = newMessage.trim()
    setNewMessage('')
    setIsSending(true)
    const replyToId = replyTo?.id || null
    setReplyTo(null)

    const supabase = createClient()
    const { error } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        sender_id: session.eventUserId,
        content: messageText,
        reply_to_id: replyToId,
      })

    if (error) {
      setNewMessage(messageText) // Restore on error
    }
    
    setReplyTo(null)
    setIsSending(false)
    inputRef.current?.focus()
  }

  function setReply(message: Message) {
    setReplyTo(message)
  }

  function cancelReply() {
    setReplyTo(null)
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
            const replyToMsg = (message as any).reply_to
            return (
                <div
                  key={message.id}
                  className={`group flex ${isOwn ? 'justify-end' : 'justify-start'} relative`}
                  onClick={(e) => e.stopPropagation()}
                >
                <div
                  className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                    isOwn
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-secondary text-secondary-foreground rounded-bl-md'
                  }`}
                >
                  {replyToMsg && (
                    <div className="mb-2 p-2 bg-background/50 rounded-lg border">
                      <p className="text-xs text-muted-foreground mb-1">Replying to</p>
                      <p className="text-xs italic truncate">{replyToMsg.content}</p>
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                  <p className={`text-xs mt-1 ${isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                    {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity p-1 -m-1 rounded-full hover:bg-accent/50 cursor-pointer">
                        <MoreVertical className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent sideOffset={5} align="end" className="w-32 p-1">
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.preventDefault()
                          setReply(message)
                        }}
                        className="cursor-pointer text-xs py-1.5"
                      >
                        Reply
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="sticky bottom-0 bg-background border-t border-border/50 p-4">
        {replyTo && (
          <div className="mb-3 p-3 bg-accent/50 rounded-lg border flex items-start gap-2">
            <button
              onClick={cancelReply}
              className="text-muted-foreground hover:text-foreground text-sm -mt-1"
            >
              <X className="h-3 w-3" />
            </button>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Replying to {replyTo.content.length > 50 ? replyTo.content.slice(0,50) + '...' : replyTo.content}</p>
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0">
                <Sticker className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="p-4 pt-0 h-[400px]">
              <div className="grid grid-cols-10 gap-2 p-4 max-h-[300px] overflow-y-auto">
                {['😀', '😂', '😍', '🤔', '😎', '🥳', '😢', '😡', '👍', '❤️', '🔥', '⭐', '🎉', '🚀', '💯', '👏', '🙌', '🤝', '✨', '🌟', '💥', '⚡', '🔔', '📱'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      setNewMessage(emoji)
                    }}
                    className="w-12 h-12 rounded-lg hover:bg-accent p-2 flex items-center justify-center text-2xl transition-colors cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </SheetContent>
          </Sheet>
          <form id="message-form" onSubmit={sendMessage} className="flex-1 flex gap-2">
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
      </div>
    </main>
  )
}
