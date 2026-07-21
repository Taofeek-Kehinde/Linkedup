# Scaling Guide — 300+ Concurrent Users

## 🚀 Immediate Fixes (Code Changes - No Cost)

### 1. Add Pagination to User Loading
**File:** `components/show/show-feed.tsx`
- Currently loads ALL users at once → change to load 20 at a time
- As user swipes, load more in background

### 2. Cache Supabase Queries
**File:** `components/show/show-feed.tsx`
- Add `useMemo` for user lists
- Don't re-fetch users on every render cycle

### 3. Reduce Realtime Subscriptions
**File:** `components/show/show-feed.tsx`
- Currently each user subscribes to `event-users-{id}` changes
- Switch to `broadcast` channel instead of `postgres_changes` for high traffic
- This reduces database load drastically

### 4. Lazy Load Images/Videos
**File:** `components/show/user-card.tsx`
- Only load selfie images for users currently visible (max 3 at a time)
- Use `loading="lazy"` on all images
- Compress selfies to smaller sizes (< 100KB)

### 5. Optimize Blocked Users Query
**File:** `components/show/show-feed.tsx`
- Cache blocked users list in localStorage (refresh every 30s)
- Avoid querying `blocked_users` table on every user load

### 6. Reduce Timer Intervals
- Change timer from 1s to 5s updates — save CPU on mobile devices

## ✅ Infrastructure Upgrades (Cost Involved)

### **Supabase (Database & Storage)**

| Feature | Free Tier | Paid ($25/mo) |
|---------|-----------|----------------|
| Database connections | 200 | 600+ |
| Storage | 1GB | 100GB |
| Bandwidth | 2GB | 100GB |

**Recommendation:** Upgrade to **Pro plan ($25/mo)** for 300 users

### **Render (Hosting)**

| Feature | Free Tier | Paid ($7/mo Starter) |
|---------|-----------|----------------------|
| Memory | 512MB | 1GB+ |
| CPU | Shared | Dedicated |
| Sleep after inactivity | 15 min | Never |

**Recommendation:** Upgrade to **Starter ($7/mo)** or **Pro ($20/mo)**

## 🔧 Code Optimizations to Implement

### 1. Add Debouncing to Real-time Events
```typescript
// Instead of re-fetching on every change:
// Use a debounce of 2 seconds
```

### 2. Implement Virtual Scrolling for User Cards
- Only render 3 user cards at a time
- Preload next/previous in background

### 3. Compress Selfie Videos on Upload
**File:** `app/api/upload/route.ts`
- Reduce video quality to 480p instead of 720p
- Limit video duration to 3 seconds
- This reduces storage AND bandwidth by 60%

### 4. Database Indexes (Free - Supabase SQL Editor)
Run these SQL commands in Supabase SQL Editor:
```sql
-- Speed up user lookups
CREATE INDEX IF NOT EXISTS idx_event_users_event_auth 
ON event_users(event_id, auth_user_id);

-- Speed up chat lookups
CREATE INDEX IF NOT EXISTS idx_chats_event_users
ON chats(event_id, user1_id, user2_id);

-- Speed up blocked users
CREATE INDEX IF NOT EXISTS idx_blocked_users_event
ON blocked_users(event_id, blocker_id, blocked_id);

-- Speed up ended events cleanup
CREATE INDEX IF NOT EXISTS idx_events_status_ended
ON events(status) WHERE status = 'ended';
```

## 📊 Estimated Capacity After Optimizations

| Optimization | Users Supported |
|-------------|-----------------|
| Current (no changes) | ~100-150 |
| + Code optimizations above | ~200-250 |
| + Supabase Pro ($25/mo) | ~300-400 |
| + Render Starter ($7/mo) | ~500+ |
| **All together** | **~500+ users** |

## 🎯 Quick Wins (Do These First - Free)

1. Add database indexes (SQL above) — **biggest free improvement**
2. Implement lazy loading for images — **reduces bandwidth by 70%**
3. Reduce timer from 1s to 5s — **save CPU**
4. Add pagination to user loading — **reduce memory usage**

## ❓ Need My Help?

I can implement any of these optimizations for you right now. Which ones should I start with?
