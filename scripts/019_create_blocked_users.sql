CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  blocker_id UUID NOT NULL REFERENCES event_users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES event_users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocked_users_event_id ON blocked_users(event_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker_id ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked_id ON blocked_users(blocked_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_pair ON blocked_users(event_id, blocker_id, blocked_id);

ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view blocks they are part of" ON blocked_users;
CREATE POLICY "Users can view blocks they are part of" ON blocked_users
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM event_users viewer
      WHERE viewer.session_token IS NOT NULL
        AND viewer.event_id = blocked_users.event_id
        AND viewer.id IN (blocked_users.blocker_id, blocked_users.blocked_id)
    )
    OR blocked_users.event_id IN (
      SELECT id FROM events WHERE host_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create blocks" ON blocked_users;
CREATE POLICY "Users can create blocks" ON blocked_users
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM event_users viewer
      WHERE viewer.session_token IS NOT NULL
        AND viewer.event_id = blocked_users.event_id
        AND viewer.id = blocked_users.blocker_id
    )
  );

DROP POLICY IF EXISTS "Users can view others in same event" ON event_users;
CREATE POLICY "Users can view unblocked users in same event" ON event_users
  FOR SELECT USING (
    event_users.event_id IN (
      SELECT id FROM events WHERE host_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM event_users viewer
      WHERE viewer.session_token IS NOT NULL
        AND viewer.event_id = event_users.event_id
        AND (
          viewer.id = event_users.id
          OR NOT EXISTS (
            SELECT 1
            FROM blocked_users bu
            WHERE bu.event_id = viewer.event_id
              AND (
                (bu.blocker_id = viewer.id AND bu.blocked_id = event_users.id)
                OR (bu.blocked_id = viewer.id AND bu.blocker_id = event_users.id)
              )
          )
        )
    )
  );

DROP POLICY IF EXISTS "Users can update own profile" ON event_users;
CREATE POLICY "Users can update own profile" ON event_users
  FOR UPDATE
  USING (
    event_users.event_id IN (
      SELECT id FROM events WHERE host_id = auth.uid()
    )
    OR event_users.auth_user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM event_users eu
      WHERE eu.id = event_users.id
        AND eu.session_token IS NOT NULL
    )
  )
  WITH CHECK (
    event_users.event_id IN (
      SELECT id FROM events WHERE host_id = auth.uid()
    )
    OR event_users.auth_user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM event_users eu
      WHERE eu.id = event_users.id
        AND eu.session_token IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Users can view own chats" ON chats;
CREATE POLICY "Users can view own unblocked chats" ON chats
  FOR SELECT USING (
    chats.event_id IN (
      SELECT id FROM events WHERE host_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM event_users viewer
      WHERE viewer.session_token IS NOT NULL
        AND viewer.event_id = chats.event_id
        AND viewer.id IN (chats.user1_id, chats.user2_id)
        AND NOT EXISTS (
          SELECT 1
          FROM blocked_users bu
          WHERE bu.event_id = chats.event_id
            AND (
              (bu.blocker_id = viewer.id AND bu.blocked_id IN (chats.user1_id, chats.user2_id))
              OR (bu.blocked_id = viewer.id AND bu.blocker_id IN (chats.user1_id, chats.user2_id))
            )
        )
    )
  );

DROP POLICY IF EXISTS "Users can create chats" ON chats;
CREATE POLICY "Users can create unblocked chats" ON chats
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM event_users viewer
      WHERE viewer.session_token IS NOT NULL
        AND viewer.event_id = chats.event_id
        AND viewer.id IN (chats.user1_id, chats.user2_id)
        AND NOT EXISTS (
          SELECT 1
          FROM blocked_users bu
          WHERE bu.event_id = chats.event_id
            AND bu.blocker_id IN (chats.user1_id, chats.user2_id)
            AND bu.blocked_id IN (chats.user1_id, chats.user2_id)
        )
    )
  );

DROP POLICY IF EXISTS "Users can update own chats" ON chats;
CREATE POLICY "Users can update own unblocked chats" ON chats
  FOR UPDATE
  USING (
    chats.event_id IN (
      SELECT id FROM events WHERE host_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM event_users viewer
      WHERE viewer.session_token IS NOT NULL
        AND viewer.event_id = chats.event_id
        AND viewer.id IN (chats.user1_id, chats.user2_id)
        AND NOT EXISTS (
          SELECT 1
          FROM blocked_users bu
          WHERE bu.event_id = chats.event_id
            AND (
              (bu.blocker_id = viewer.id AND bu.blocked_id IN (chats.user1_id, chats.user2_id))
              OR (bu.blocked_id = viewer.id AND bu.blocker_id IN (chats.user1_id, chats.user2_id))
            )
        )
        OR EXISTS (
          SELECT 1
          FROM blocked_users bu
          WHERE bu.event_id = chats.event_id
            AND bu.blocker_id = viewer.id
            AND bu.blocked_id IN (chats.user1_id, chats.user2_id)
        )
    )
  )
  WITH CHECK (
    chats.event_id IN (
      SELECT id FROM events WHERE host_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM event_users viewer
      WHERE viewer.session_token IS NOT NULL
        AND viewer.event_id = chats.event_id
        AND viewer.id IN (chats.user1_id, chats.user2_id)
        AND NOT EXISTS (
          SELECT 1
          FROM blocked_users bu
          WHERE bu.event_id = chats.event_id
            AND (
              (bu.blocker_id = viewer.id AND bu.blocked_id IN (chats.user1_id, chats.user2_id))
              OR (bu.blocked_id = viewer.id AND bu.blocker_id IN (chats.user1_id, chats.user2_id))
            )
        )
        OR EXISTS (
          SELECT 1
          FROM blocked_users bu
          WHERE bu.event_id = chats.event_id
            AND bu.blocker_id = viewer.id
            AND bu.blocked_id IN (chats.user1_id, chats.user2_id)
        )
    )
  );

DROP POLICY IF EXISTS "Users can view messages" ON messages;
CREATE POLICY "Users can view messages in unblocked chats" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM chats c
      WHERE c.id = messages.chat_id
        AND (
          c.event_id IN (
            SELECT id FROM events WHERE host_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1
            FROM event_users participant
            WHERE participant.id IN (c.user1_id, c.user2_id)
              AND participant.session_token IS NOT NULL
              AND participant.event_id = c.event_id
              AND NOT EXISTS (
                SELECT 1
                FROM blocked_users bu
                WHERE bu.event_id = c.event_id
                  AND (
                    (bu.blocker_id = participant.id AND bu.blocked_id IN (c.user1_id, c.user2_id))
                    OR (bu.blocked_id = participant.id AND bu.blocker_id IN (c.user1_id, c.user2_id))
                  )
              )
          )
        )
    )
  );

DROP POLICY IF EXISTS "Users can send messages" ON messages;
CREATE POLICY "Users can send messages in unblocked chats" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM chats c
      JOIN event_users sender ON sender.id = messages.sender_id
      WHERE c.id = messages.chat_id
        AND sender.session_token IS NOT NULL
        AND sender.event_id = c.event_id
        AND sender.id IN (c.user1_id, c.user2_id)
        AND NOT EXISTS (
          SELECT 1
          FROM blocked_users bu
          WHERE bu.event_id = c.event_id
            AND (
              (bu.blocker_id = sender.id AND bu.blocked_id IN (c.user1_id, c.user2_id))
              OR (bu.blocked_id = sender.id AND bu.blocker_id IN (c.user1_id, c.user2_id))
            )
        )
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS blocked_users;
