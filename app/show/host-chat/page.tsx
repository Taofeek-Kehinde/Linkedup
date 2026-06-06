'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { ArrowLeft, Send, Crown, User, MessageCircle } from 'lucide-react'
import Image from 'next/image'
import type { Event, EventUser, Message } from '@/lib/types'
import { clearLocalSession } from '@/lib/utils/session'

export default function HostChatPage({ params }: { params: Promise<{ eventId: string }> }) {
  const router = useRouter()
  const { eventId } = use(params)
  const [event, setEvent] = useState<Event | null>(null)
  const [hostUser, setHostUser] = useState<EventUser | null>(null)
  const [currentUser, setCurrentUser] = useState<EventUser | null>(null)
  const [chatId, setChatId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isTyping, setIsTyping] = useState(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const [failedHostSelfie, setFailedHostSelfie] = useState(false)
  const [failedUserSelfie, setFailedUserSelfie] = useState(false)

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()
      
      // Get current session from localStorage
      const sessionStr = localStorage.getItem('linkedup_session')
      if (!sessionStr) {
        router.push('/join')
        return
      }

      const session = JSON.parse(sessionStr)
      
      // Get event details
      const { data: eventData } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single()

      if (!eventData) {
        router.push('/')
        return
      }
      setEvent(eventData)

      // Get current user from event_users
      const { data: currentUserData } = await supabase
        .from('event_users')
        .select('*')
        .eq('id', session.eventUserId)
        .single()

      if (!currentUserData) {
        router.push('/join')
        return
      }
      setCurrentUser(currentUserData)

      // Get host user (find user with username 'HOST')
      const { data: hostData } = await supabase
        .from('event_users')
        .select('*')
        .eq('event_id', eventId)
        .eq('username', 'HOST')
        .single()

      if (hostData) {
        setHostUser(hostData)
      }

      // Find or create chat between current user and host
      if (hostData && currentUserData) {
        // Check if chat exists
        let { data: existingChat } = await supabase
          .from('chats')
          .select('*')
          .eq('event_id', eventId)
          .or(`and(user1_id.eq.${currentUserData.id},user2_id.eq.${hostData.id}),and(user1_id.eq.${hostData.id},user2_id.eq.${currentUserData.id})`)
          .single()

        if (!existingChat) {
          // Create new chat
          const { data: newChat } = await supabase
            .from('chats')
            .insert({
              event_id: eventId,
              user1_id: currentUserData.id,
              user2_id: hostData.id,
              is_active: true
            })
            .select()
            .single()
          existingChat = newChat
        }

        if (existingChat) {
          setChatId(existingChat.id)
          
          // Load messages
          const { data: messagesData } = await supabase
            .from('messages')
            .select('*')
            .eq('chat_id', existingChat.id)
            .order('created_at', { ascending: true })

          setMessages(messagesData || [])
        }
      }

      setIsLoading(false)
    }

    loadData()
  }, [eventId, router])

  // Subscribe to new messages
  useEffect(() => {
    if (!chatId) return

    const supabase = createClient()
    const channel = supabase
      .channel(`chat-${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`
        },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages(prev => [...prev, newMsg])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [chatId])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!newMessage.trim() || isSending || !chatId || !currentUser) return

    setIsSending(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        sender_id: currentUser.id,
        content: newMessage.trim(),
        message_type: 'text'
      })

    if (!error) {
      setNewMessage('')
    } else {
      console.error('Error sending message:', error)
    }

    setIsSending(false)
  }

  const handleTyping = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    if (!isTyping) {
      setIsTyping(true)
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
    }, 1000)
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (isLoading || !event || !hostUser || !currentUser) {
    return (
      <main className="h-dvh flex items-center justify-center bg-gradient-to-br from-black to-gray-900">
        <Spinner className="w-8 h-8" />
      </main>
    )
  }

  return (
    <main className="h-dvh flex flex-col bg-gradient-to-br from-gray-900 to-black">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-lg border-b border-white/10">
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="text-white/70 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          {/* Host Profile */}
          <div className="flex items-center gap-3 flex-1">
            {(() => {
            const selfieUrl = (hostUser?.selfie_url || '').trim()
            const showFallback = failedHostSelfie || selfieUrl.length === 0
            return showFallback ? (
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center ring-2 ring-purple-500">
                <Crown className="w-6 h-6 text-white" />
              </div>
            ) : (
              <div className="relative w-12 h-12 rounded-full overflow-hidden ring-2 ring-purple-500">
                <Image
                  src={selfieUrl}
                  alt={hostUser.username}
                  fill
                  className="object-cover"
                  onError={() => setFailedHostSelfie(true)}
                />
              </div>
            )
          })()}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-white">{hostUser.username}</h2>
                <Crown className="w-4 h-4 text-yellow-500" />
              </div>
              <p className="text-xs text-white/60">Host • Online</p>
            </div>
          </div>

          {/* Your Profile */}
          <div className="flex items-center gap-2">
            {(() => {
              const selfieUrl = (currentUser?.selfie_url || '').trim()
              const showFallback = failedUserSelfie || selfieUrl.length === 0
              return showFallback ? (
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600/50 to-pink-600/50 flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
              ) : (
                <div className="relative w-8 h-8 rounded-full overflow-hidden">
                  <Image
                    src={selfieUrl}
                    alt={currentUser.username}
                    fill
                    className="object-cover"
                    onError={() => setFailedUserSelfie(true)}
                  />
                </div>
              )
            })()}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-purple-600/20 to-pink-600/20 flex items-center justify-center mb-4">
              <MessageCircle className="w-10 h-10 text-purple-400" />
            </div>
            <h3 className="text-white font-semibold mb-2">No messages yet</h3>
            <p className="text-white/50 text-sm">Send a message to start chatting with the host</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isCurrentUser = msg.sender_id === currentUser.id
            return (
              <div
                key={msg.id}
                className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    isCurrentUser
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                      : 'bg-white/10 text-white'
                  }`}
                >
                  <p className="text-sm break-words">{msg.content}</p>
                  <p className={`text-[10px] mt-1 ${isCurrentUser ? 'text-white/60' : 'text-white/40'}`}>
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
            )
          })
        )}
        
        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white/10 rounded-2xl px-4 py-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Section */}
      <div className="sticky bottom-0 bg-black/80 backdrop-blur-lg border-t border-white/10 p-4">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
              handleTyping()
            }}
            placeholder={`Message ${hostUser.username}...`}
            className="flex-1 bg-white/10 border border-white/20 rounded-full px-4 py-2 text-white placeholder-white/50 outline-none focus:border-purple-500 transition-colors"
            disabled={isSending}
          />
          <Button
            onClick={sendMessage}
            disabled={!newMessage.trim() || isSending}
            className="rounded-full w-10 h-10 p-0 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg"
          >
            {isSending ? <Spinner className="w-4 h-4" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <style jsx>{`
        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-4px);
          }
        }
        
        .animate-bounce {
          animation: bounce 0.8s ease-in-out infinite;
        }
      `}</style>
    </main>
  )
}