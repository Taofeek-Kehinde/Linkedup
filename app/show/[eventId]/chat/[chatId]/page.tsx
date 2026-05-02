'use client'

import { useEffect, useState, useRef } from 'react'
import { Clock, Mic, Video, X, Square, Send, ArrowLeft, User, Sticker, MoreVertical } from 'lucide-react'
import type { Chat, EventUser, Message, UserSession, Event } from '@/lib/types'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getLocalSession, clearLocalSession } from '@/lib/utils/session'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { useCallback } from 'react'
import EmojiPicker from 'emoji-picker-react'

export default function ChatPage() {
  const params = useParams()
  const eventId = params.eventId as string
  const chatId = params.chatId as string

  const router = useRouter()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)

  const [session, setSession] = useState<UserSession | null>(null)
  const [chat, setChat] = useState<Chat | null>(null)
  const [partner, setPartner] = useState<EventUser | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [event, setEvent] = useState<Event | null>(null)
  const [timeRemaining, setTimeRemaining] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [selectedEmojis, setSelectedEmojis] = useState<string[]>([])
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false)

  // Recording states
  const [isRecording, setIsRecording] = useState(false)
  const [recordingType, setRecordingType] = useState<'video' | 'audio' | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)

  // Load initial data
  useEffect(() => {
    async function loadData() {
      if (!eventId || !chatId) {
        router.push('/')
        return
      }

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

      // Load event
      const { data: eventData } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single()

      if (!eventData || eventData.status === 'ended') {
        clearLocalSession()
        router.push('/')
        return
      }

      setEvent(eventData)
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

          if (newMsg.sender_id !== session?.eventUserId && session) {
            playBeep()
            showNotification(newMsg.content, partner?.username || 'Chat')
          }

          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [chat, chatId, session?.eventUserId, partner?.username])

  // Cleanup recording on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
    }
  }, [])

  // Live event timer
  useEffect(() => {
    let interval: NodeJS.Timeout

    const updateTimer = () => {
      if (!event) {
        setTimeRemaining('')
        return
      }

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

    if (event) {
      updateTimer()
      interval = setInterval(updateTimer, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [event])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(content: string, type: 'text' | 'video' | 'audio' = 'text') {
    if (!session || isSending) return

    setIsSending(true)
    const replyToId = replyTo?.id || null
    setReplyTo(null)

    const supabase = createClient()
    const { data, error } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        sender_id: session.eventUserId,
        content: content,
        reply_to_id: replyToId,
        message_type: type
      })
      .select()
      .single()

    if (error) {
      console.error('Send error:', error)
      // Still add the message locally so it shows - this is a workaround
      // In production you'd want proper error handling
      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        chat_id: chatId,
        sender_id: session.eventUserId,
        content: content,
        created_at: new Date().toISOString(),
        reply_to_id: replyToId,
        message_type: type,
      }
      setMessages(prev => [...prev, tempMessage])
    } else if (data) {
      // Add message to state immediately
      setMessages(prev => {
        if (prev.some(m => m.id === data.id)) return prev
        return [...prev, data]
      })
    }

    setIsSending(false)
    inputRef.current?.focus()
  }

  function handleTextSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isMultiSelectMode && selectedEmojis.length > 0) {
      const emojiMessage = selectedEmojis.join('')
      sendMessage(emojiMessage, 'text')
      setSelectedEmojis([])
      setIsMultiSelectMode(false)
      setShowEmojiPicker(false)
      return
    }
    if (!newMessage.trim() || isSending) return
    sendMessage(newMessage.trim(), 'text')
    setNewMessage('')
  }

  function onEmojiClick(emojiObject: any) {
    const emoji = emojiObject.emoji
    if (isMultiSelectMode) {
      setSelectedEmojis(prev => {
        if (prev.includes(emoji)) {
          return prev.filter(e => e !== emoji)
        }
        return [...prev, emoji]
      })
    } else {
      setNewMessage(prev => prev + emoji)
      setShowEmojiPicker(false)
    }
  }

  function toggleMultiSelectMode() {
    setIsMultiSelectMode(!isMultiSelectMode)
    if (!isMultiSelectMode) {
      setSelectedEmojis([])
    }
  }

  async function sendSelectedEmojis() {
    if (selectedEmojis.length === 0) return
    const emojiMessage = selectedEmojis.join('')
    await sendMessage(emojiMessage, 'text')
    setSelectedEmojis([])
    setIsMultiSelectMode(false)
    setShowEmojiPicker(false)
  }

  function setReply(message: Message) {
    setReplyTo(message)
  }

  function cancelReply() {
    setReplyTo(null)
  }

  // Start video recording
  async function startVideoRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      streamRef.current = stream

      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder

      const chunks: BlobPart[] = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'video/webm' })

        const formData = new FormData()
        formData.append('file', blob, 'video.webm')
        formData.append('eventId', eventId)
        formData.append('chatId', chatId)

        try {
          const uploadRes = await fetch('/api/upload-message-media', {
            method: 'POST',
            body: formData,
          })

          if (uploadRes.ok) {
            const data = await uploadRes.json()
            if (data.url) {
              await sendMessage(data.url, data.type || 'video')
            }
          } else {
            console.error('Upload failed:', await uploadRes.text())
          }
        } catch (err) {
          console.error('Upload error:', err)
        }

        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
        }
      }

mediaRecorder.start(250) // shorter chunks for immediate send
      setIsRecording(true)
      setRecordingType('video')
      setRecordingTime(0)

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)

    } catch (error) {
      console.error('Video recording error:', error)
    }
  }

  // Start audio recording
  async function startAudioRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder

      const chunks: BlobPart[] = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' })

        const formData = new FormData()
        formData.append('file', blob, 'audio.webm')
        formData.append('eventId', eventId)
        formData.append('chatId', chatId)

        const uploadRes = await fetch('/api/upload-message-media', {
          method: 'POST',
          body: formData,
        })

        if (uploadRes.ok) {
          const { url, type } = await uploadRes.json()
          await sendMessage(url, type)
        }

        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
        }
      }

      mediaRecorder.start(1000)
      setIsRecording(true)
      setRecordingType('audio')
      setRecordingTime(0)

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 14) {
            stopRecording()
            return 15
          }
          return prev + 1
        })
      }, 1000)

    } catch (error) {
      console.error('Audio recording error:', error)
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && isRecording && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
    }
    setIsRecording(false)
    setRecordingType(null)
    setRecordingTime(0)
  }

  // Beep sound
  const playBeep = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = 800
      oscillator.type = 'sine'

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.2)
      setTimeout(() => audioContext.close(), 300)
    } catch (e) {
      console.warn('Audio not supported', e)
    }
  }, [])

  // Browser notification
  const showNotification = useCallback((content: string, username: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('New message from ' + username, {
        body: content.length > 50 ? content.slice(0, 50) + '...' : content,
        icon: '/logo.png',
        tag: 'chat-' + chatId,
      })
    }
  }, [chatId])

  if (isLoading || !session) {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-background">
        <Spinner className="w-8 h-8" />
      </main>
    )
  }

  return (
    <main className="min-h-dvh flex flex-col bg-background">
      {/* Recording Overlay */}
{isRecording && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center">
          <div className="text-center space-y-4">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-red-500 animate-pulse flex items-center justify-center">
                {recordingType === 'video' ? (
                  <Video className="w-12 h-12 text-white" />
                ) : (
                  <Mic className="w-12 h-12 text-white" />
                )}
              </div>
              <div className="absolute -top-2 -right-2 bg-white text-black rounded-full px-2 py-1 text-sm font-bold">
                {recordingTime}s
              </div>
            </div>
            <p className="text-white text-lg font-semibold">
              Recording {recordingType === 'video' ? 'video' : 'voice note'}...
            </p>
            <div className="flex gap-3">
              <Button 
                onClick={stopRecording}
                className="bg-white hover:bg-gray-100 text-black px-6"
              >
                Cancel
              </Button>
              <Button 
                onClick={stopRecording}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-6"
              >
                Send
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border/50 shadow-lg">
        {event && timeRemaining && (
          <div className="w-full p-3 bg-gradient-to-r from-primary/20 to-primary/10 border-b border-primary/30">
            <div className="flex items-center justify-center gap-2 font-mono font-bold text-lg">
              <Clock className="h-5 w-5" />
              <span>{timeRemaining}</span>
            </div>
          </div>
        )}
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/show/${eventId}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>

          {partner?.selfie_url ? (
            <div className="relative">
              <img
                src={partner.selfie_url}
                alt={partner.username}
                className="w-10 h-10 rounded-full object-cover"
              />
            </div>
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
            const messageType = message.message_type
              || 'text'

            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}
              >
                <div
                  className={`max-w-[70%] px-4 py-2 rounded-2xl relative ${isOwn
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-secondary text-secondary-foreground rounded-bl-md'
                    }`}
                >
                  {messageType === 'video' && message.content && (
                    <video
                      src={message.content}
                      controls
                      playsInline
                      className="max-w-full rounded-lg max-h-[300px]"
                    />
                  )}

                  {messageType === 'audio' && message.content && (
                    <audio
                      src={message.content}
                      controls
                      className="max-w-full"
                      controlsList="nodownload"
                    />
                  )}

                  {messageType === 'text' && (
                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                  )}

                  <p className={`text-xs mt-1 ${isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                    {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 -m-1 rounded-full hover:bg-accent/50 cursor-pointer">
                        <MoreVertical className="h-3 w-3" />
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent sideOffset={5} align="end" className="w-32 p-1">
                      <DropdownMenuItem
                        onClick={() => setReply(message)}
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
            <button onClick={cancelReply} className="text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" />
            </button>
            <p className="text-xs text-muted-foreground flex-1">
              Replying to: {replyTo.content.length > 50 ? replyTo.content.slice(0, 50) + '...' : replyTo.content}
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={startVideoRecording}
            title="Record video (15 seconds max)"
          >
            <Video className="h-5 w-5" />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={startAudioRecording}
            title="Record voice note (15 seconds max)"
          >
            <Mic className="h-5 w-5" />
          </Button>

          <div className="relative">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              title="Add emoji"
            >
              <Sticker className="h-5 w-5" />
            </Button>

            {showEmojiPicker && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="relative bg-background rounded-lg p-2 shadow-xl max-w-xs w-full mx-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">
                      {selectedEmojis.length > 0 ? `${selectedEmojis.length} selected` : 'Stickers'}
                    </span>
                    <button
                      onClick={toggleMultiSelectMode}
                      className={`text-xs px-2 py-1 rounded ${isMultiSelectMode ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
                    >
                      {isMultiSelectMode ? 'Multi' : 'Single'}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedEmojis([])
                        setShowEmojiPicker(false)
                      }}
                      className="p-1 rounded-full hover:bg-accent"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <EmojiPicker
                    onEmojiClick={onEmojiClick}
                    autoFocusSearch={false}
                    skinTonesDisabled
                    width={280}
                    height={320}
                  />
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleTextSubmit} className="flex-1 flex gap-2">
            <Input
              ref={inputRef}
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 bg-input"
              autoComplete="off"
            />
            <Button
              type="submit"
              size="icon"
              disabled={(isMultiSelectMode && selectedEmojis.length === 0) || (!isMultiSelectMode && !newMessage.trim()) || isSending}
            >
              {isSending ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </div>
    </main>
  )
}