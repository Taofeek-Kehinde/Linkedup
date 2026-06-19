'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import type { Event, EventUser, Message } from '@/lib/types'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { ArrowLeft, Crown, MessageCircle, Send, User, X } from 'lucide-react'

interface ReportMessagePayload {
  type: 'user_report'
  reported_id: string
  reason: string
}

function parseReportMessage(content: string): ReportMessagePayload | null {
  try {
    const payload = JSON.parse(content)
    if (
      payload?.type === 'user_report' &&
      typeof payload.reported_id === 'string' &&
      typeof payload.reason === 'string'
    ) {
      return payload as ReportMessagePayload
    }
  } catch {
    // ignore
  }
  return null
}

type ReportRow = {
  id: string
  event_id: string
  reporter_id: string
  reported_id: string
  reason: string
  created_at: string
  reporter?: EventUser | null
  reported?: EventUser | null
}

export default function HostChatPage({ params }: { params: Promise<{ eventId: string }> }) {
  const router = useRouter()
  const { eventId } = (require('react') as typeof import('react')).use(params)

  const supabase = useMemo(() => createClient(), [])

  const [event, setEvent] = useState<Event | null>(null)
  const [currentUser, setCurrentUser] = useState<EventUser | null>(null)
  const [hostUser, setHostUser] = useState<EventUser | null>(null)

  // ALL attendee profiles for left sidebar (excluding hostUser)
  const [hostAllUsers, setHostAllUsers] = useState<EventUser[]>([])

  // Selected attendee
  const [targetUserId, setTargetUserId] = useState<string | null>(null)

  // Selected chatId between hostUser and targetUserId
  const [chatId, setChatId] = useState<string | null>(null)

  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isTyping, setIsTyping] = useState(false)

  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [reportedUsers, setReportedUsers] = useState<Record<string, EventUser>>({})
  const [reports, setReports] = useState<ReportRow[]>([])

  const [failedHostSelfie, setFailedHostSelfie] = useState(false)
  const [failedTargetSelfie, setFailedTargetSelfie] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  function formatTime(timestamp: string) {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  async function loadReportedUsers(messagesToScan: Message[]) {
    const reportedIds = Array.from(
      new Set(
        messagesToScan
          .map((m) => parseReportMessage(m.content)?.reported_id)
          .filter((id): id is string => Boolean(id))
      )
    )

    if (reportedIds.length === 0) return

    const { data } = await supabase
      .from('event_users')
      .select('*')
      .in('id', reportedIds)

    if (!data) return

    setReportedUsers((prev) => ({
      ...prev,
      ...Object.fromEntries(data.map((u) => [u.id, u]))
    }))
  }

  async function ensureChatForPair(userAId: string, userBId: string): Promise<string | null> {
    const { data: existingChat } = await supabase
      .from('chats')
      .select('id')
      .eq('event_id', eventId)
      .eq('is_active', true)
      .or(
        `and(user1_id.eq.${userAId},user2_id.eq.${userBId}),and(user1_id.eq.${userBId},user2_id.eq.${userAId})`
      )
      .single()

    if (existingChat?.id) return existingChat.id

    const { data: newChat } = await supabase
      .from('chats')
      .insert({
        event_id: eventId,
        user1_id: userAId,
        user2_id: userBId,
        is_active: true
      })
      .select('id')
      .single()

    return newChat?.id ?? null
  }

  async function openChatWithTarget(nextTargetUserId: string) {
    if (!hostUser || !currentUser) return

    const nextChatId = await ensureChatForPair(hostUser.id, nextTargetUserId)
    if (!nextChatId) return

    setTargetUserId(nextTargetUserId)
    setChatId(nextChatId)

    const { data: messagesData } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', nextChatId)
      .order('created_at', { ascending: true })

    const safeMessages = messagesData || []
    setMessages(safeMessages)
    setReportedUsers({})
    await loadReportedUsers(safeMessages)
  }

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      setIsLoading(true)

      const sessionStr = localStorage.getItem('linkedup_session')
      if (!sessionStr) {
        router.push('/join')
        return
      }

      try {
        const session = JSON.parse(sessionStr)

        const { data: currentUserData } = await supabase
          .from('event_users')
          .select('*')
          .eq('id', session.eventUserId)
          .single()

        if (cancelled) return
        if (!currentUserData) {
          router.push('/join')
          return
        }
        setCurrentUser(currentUserData)

        const { data: eventData } = await supabase
          .from('events')
          .select('*')
          .eq('id', eventId)
          .single()

        if (cancelled) return
        if (!eventData) {
          router.push('/')
          return
        }
        setEvent(eventData)

        const { data: hostRow } = await supabase
          .from('event_users')
          .select('*')
          .eq('event_id', eventId)
          .eq('username', 'HOST')
          .single()

        if (cancelled) return
        if (!hostRow) {
          router.push('/')
          return
        }
        setHostUser(hostRow)

        const { data: usersData } = await supabase
          .from('event_users')
          .select('*')
          .eq('event_id', eventId)
          .neq('id', hostRow.id)
          .order('created_at', { ascending: true })

        if (cancelled) return
        const attendees = (usersData || []) as EventUser[]
        setHostAllUsers(attendees)

        const initialTarget = attendees[0]?.id ?? null
        setTargetUserId(initialTarget)

        if (initialTarget) {
          const initialChatId = await ensureChatForPair(hostRow.id, initialTarget)
          if (cancelled) return

          if (initialChatId) {
            setChatId(initialChatId)
            const { data: messagesData } = await supabase
              .from('messages')
              .select('*')
              .eq('chat_id', initialChatId)
              .order('created_at', { ascending: true })

            const safeMessages = messagesData || []
            setMessages(safeMessages)
            await loadReportedUsers(safeMessages)
          }
        }
      } catch {
        if (!cancelled) router.push('/')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadData()
    return () => {
      cancelled = true
    }
  }, [eventId, router, supabase])

  // Poll reports
  useEffect(() => {
    if (!eventId) return

    let isMounted = true

    async function fetchLatestReports() {
      const { data } = await supabase
        .from('reports')
        .select('id,event_id,reporter_id,reported_id,reason,created_at')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (!isMounted) return

      const base = (data || []) as Omit<ReportRow, 'reporter' | 'reported'>[]
      const reporterIds = Array.from(new Set(base.map((r) => r.reporter_id)))
      const reportedIds = Array.from(new Set(base.map((r) => r.reported_id)))

      const { data: reporters } = await supabase
        .from('event_users')
        .select('id,username,selfie_url,vibe_key,session_token,is_upgraded,is_vip,is_active,last_seen,auth_user_id,location,created_at,event_id')
        .in('id', reporterIds)

      const { data: reportedUsersData } = await supabase
        .from('event_users')
        .select('id,username,selfie_url,vibe_key,session_token,is_upgraded,is_vip,is_active,last_seen,auth_user_id,location,created_at,event_id')
        .in('id', reportedIds)

      const reporterMap = new Map((reporters || []).map((u: any) => [u.id, u]))
      const reportedMap = new Map((reportedUsersData || []).map((u: any) => [u.id, u]))

      setReports(
        base.map((r) => ({
          ...r,
          reporter: reporterMap.get(r.reporter_id) || null,
          reported: reportedMap.get(r.reported_id) || null
        }))
      )
    }

    fetchLatestReports()
    const interval = setInterval(fetchLatestReports, 3000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [eventId, supabase])

  // Realtime messages ONLY for selected chat
  useEffect(() => {
    if (!chatId) return

    const channel = supabase
      .channel(`host-chat-${chatId}`)
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
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
          loadReportedUsers([newMsg])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [chatId, supabase])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleTyping() {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    if (!isTyping) setIsTyping(true)
    typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 1000)
  }

  async function sendMessage() {
    if (!newMessage.trim() || isSending || !chatId || !currentUser) return

    setIsSending(true)
    const { error } = await supabase.from('messages').insert({
      chat_id: chatId,
      sender_id: currentUser.id,
      content: newMessage.trim(),
      message_type: 'text'
    })

    if (!error) setNewMessage('')
    setIsSending(false)
  }

  const selectedTarget = hostAllUsers.find((u) => u.id === targetUserId) || null

  if (isLoading || !event || !hostUser || !currentUser) {
    return (
      <main className="h-dvh flex items-center justify-center bg-linear-to-br from-black to-gray-900">
        <Spinner className="w-8 h-8" />
      </main>
    )
  }

  return (
    <main className="h-dvh flex flex-col bg-linear-to-br from-gray-900 to-black">
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-lg border-b border-white/10">
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/admin/event/${eventId}/host-setup`)}
            className="text-white/70 hover:text-white"
          >
            Back
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="text-white/70 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-2 flex-1 justify-center">
            {(() => {
              const selfieUrl = (hostUser?.selfie_url || event?.host_selfie_url || '').trim()
              const showFallback = failedHostSelfie || selfieUrl.length === 0

              return showFallback ? (
                <div className="w-12 h-12 rounded-full bg-linear-to-r from-purple-600 to-pink-600 flex items-center justify-center ring-2 ring-purple-500">
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

            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-white">{hostUser.username}</h2>
                <Crown className="w-4 h-4 text-yellow-500" />
              </div>
              <div className="text-white/70 flex items-center justify-center">
                <Crown className="w-4 h-4 text-yellow-500" />
              </div>
            </div>

          </div>

          <div className="hidden md:flex items-center gap-2 min-w-[220px] justify-end">
            {selectedTarget ? (
              <div className="flex items-center gap-2">
                <div className="relative w-9 h-9 rounded-full overflow-hidden ring-1 ring-white/15">
                  {selectedTarget.selfie_url ? (
                    <Image
                      src={selectedTarget.selfie_url}
                      alt={selectedTarget.username}
                      fill
                      className="object-cover"
                      onError={() => setFailedTargetSelfie(true)}
                    />
                  ) : (
                    <div className="w-full h-full bg-white/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-white/60" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{selectedTarget.username}</p>
                  <p className="text-[10px] text-white/50 truncate">
                    {selectedTarget.is_active && !selectedTarget.last_seen
                      ? 'Online'
                      : selectedTarget.last_seen
                        ? `Last seen ${new Date(selectedTarget.last_seen).toLocaleTimeString()}`
                        : ''}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-xs text-white/50">Select a user</div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 sm:grid-cols-[320px_1fr] gap-4 p-4">
        {/* LEFT SIDEBAR */}
        <aside className="h-[calc(100vh-120px)] overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Users</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.push(`/admin/event/${eventId}/host-setup`)}
                  className="text-white/70 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <p className="text-xs text-white/50 mt-1">Pick a user to chat</p>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {hostAllUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <Spinner className="w-6 h-6" />
                  <p className="text-xs text-white/50 mt-2">Loading users...</p>
                </div>
              ) : (
                hostAllUsers.map((u) => {
                  const isActive = targetUserId === u.id
                  const selfieUrl = (u.selfie_url || '').trim()

                  return (
                    <button
                      key={u.id}
                      onClick={() => openChatWithTarget(u.id)}
                      className={`w-full text-left rounded-xl p-2 border transition-colors ${
                        isActive
                          ? 'border-purple-500/60 bg-purple-500/10'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {selfieUrl ? (
                          <div className="relative w-10 h-10 rounded-full overflow-hidden ring-1 ring-white/15">
                            <Image src={selfieUrl} alt={u.username} fill className="object-cover" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center ring-1 ring-white/15">
                            <User className="w-5 h-5 text-white/60" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-white truncate">{u.username}</p>
                          <p className="text-xs text-white/50 truncate">
                            {u.is_active && !u.last_seen
                              ? 'Online'
                              : u.last_seen
                                ? `Last seen ${new Date(u.last_seen).toLocaleTimeString()}`
                                : ''}
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </aside>

        {/* CHAT AREA */}
        <section className="overflow-y-auto p-2 space-y-3">
          {reports.length > 0 && (
            <div className="space-y-3">
              {reports.slice(0, 5).map((report) => (
                <div key={report.id} className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3">
                  <div className="flex items-start gap-3">
                    {(() => {
                      const selfieUrl = (report.reported?.selfie_url || '').trim()
                      const showFallback = !report.reported || selfieUrl.length === 0

                      return showFallback ? (
                        <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                          <User className="w-6 h-6 text-red-200" />
                        </div>
                      ) : (
                        <img
                          src={selfieUrl}
                          alt={report.reported?.username || 'Unknown user'}
                          className="w-12 h-12 rounded-full object-cover shrink-0"
                        />
                      )
                    })()}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-red-200">
                        Report from {report.reporter?.username || 'Unknown user'}
                      </p>
                      <p className="text-sm font-semibold truncate">
                        Reported: {report.reported?.username || 'Unknown user'}
                      </p>
                      <p className="text-sm text-white/80 wrap-break-word mt-1">{report.reason}</p>
                      <p className="text-[10px] text-white/40 mt-1">{formatTime(report.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 rounded-full bg-linear-to-r from-purple-600/20 to-pink-600/20 flex items-center justify-center mb-4">
                <MessageCircle className="w-10 h-10 text-purple-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">No messages yet</h3>
              <p className="text-white/50 text-sm">Pick a user to start chatting</p>
            </div>
          ) : (
            messages.map((msg) => {
              const reportPayload = parseReportMessage(msg.content)
              const isReport = Boolean(reportPayload)
              const isCurrentUser = !isReport && msg.sender_id === currentUser.id
              const reportedUser = reportPayload ? reportedUsers[reportPayload.reported_id] : null
              const reason = reportPayload?.reason || 'No reason provided'

              return (
                <div key={msg.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[90%] rounded-2xl px-4 py-2 ${
                      isCurrentUser
                        ? 'bg-linear-to-r from-purple-600 to-pink-600 text-white'
                        : isReport
                          ? 'bg-red-500/10 border border-red-500/30 text-white'
                          : 'bg-white/10 text-white'
                    }`}
                  >
                    {isReport ? (
                      <div className="flex items-start gap-3">
                        {(() => {
                          const selfieUrl = (reportedUser?.selfie_url || '').trim()
                          const showFallback = !reportedUser || selfieUrl.length === 0

                          return showFallback ? (
                            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                              <User className="w-6 h-6 text-red-200" />
                            </div>
                          ) : (
                            <img
                              src={selfieUrl}
                              alt={reportedUser.username}
                              className="w-12 h-12 rounded-full object-cover shrink-0"
                            />
                          )
                        })()}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-red-200">User report</p>
                          <p className="text-sm font-semibold truncate">
                            Reported: {reportedUser?.username || 'Unknown user'}
                          </p>
                          <p className="text-sm wrap-break-word mt-1">{reason}</p>
                          <p className="text-[10px] mt-1 text-white/40">{formatTime(msg.created_at)}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm wrap-break-word">{msg.content}</p>
                    )}

                    {!isReport && (
                      <p className={`text-[10px] mt-1 ${isCurrentUser ? 'text-white/60' : 'text-white/40'}`}>
                        {formatTime(msg.created_at)}
                      </p>
                    )}
                  </div>
                </div>
              )
            })
          )}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white/10 rounded-2xl px-4 py-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </section>
      </div>

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
            placeholder={targetUserId ? `Message ${selectedTarget?.username || ''}...` : 'Select a user...'}
            className="flex-1 bg-white/10 border border-white/20 rounded-full px-4 py-2 text-white placeholder-white/50 outline-none focus:border-purple-500 transition-colors"
            disabled={isSending || !chatId}
          />

          <Button
            onClick={sendMessage}
            disabled={!newMessage.trim() || isSending || !chatId}
            className="rounded-full w-10 h-10 p-0 bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg"
          >
            {isSending ? <Spinner className="w-4 h-4" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <style jsx>{`
        @keyframes bounce {
          0%,
          100% {
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

