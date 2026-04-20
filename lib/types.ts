// Database types
export interface Event {
  id: string
  event_code: string
  show_name: string
  location: string | null
  locations: string[] | null
  duration_hours: number
  status: 'live' | 'ended' | 'archived'
  host_id: string | null
  started_at: string | null
  ends_at: string | null
  scheduled_start_at: string | null
  created_at: string
}

export interface EventUser {
  id: string
  event_id: string
  username: string
  vibe_key: string
  selfie_url: string | null
  session_token: string
  is_upgraded: boolean
  auth_user_id: string | null
  created_at: string
}

export interface Chat {
  id: string
  event_id: string
  user1_id: string
  user2_id: string
  is_active: boolean
  created_at: string
}

export interface Message {
  id: string
  chat_id: string
  sender_id: string
  content: string
  created_at: string
}

// Extended types with relations
export interface EventUserWithEvent extends EventUser {
  event?: Event
}

export interface ChatWithUsers extends Chat {
  user1?: EventUser
  user2?: EventUser
  messages?: Message[]
}

export interface MessageWithSender extends Message {
  sender?: EventUser
}

// Session types
export interface UserSession {
  eventUserId: string
  eventId: string
  username: string
  vibeKey: string
  sessionToken: string
  selfieUrl: string | null
  isUpgraded: boolean
}

// Form types
export interface CreateEventForm {
  showName: string
  locations: string[]
  durationHours: number
  scheduledStartAt?: string
}

export interface JoinEventForm {
  eventCode: string
}

export interface RejoinForm {
  username: string
  vibeKey: string
}
