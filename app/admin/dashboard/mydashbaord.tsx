"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./mydashbaord.module.css";

type ActiveEvent = {
  id: string;
  event_code: string;
  location: string | null;
  show_name: string | null;
};

type TimerMode = "preGate" | "gateOpen" | "postGate";

// ── configuration ────────────────────────────────────────────────
const DEFAULT_PULLUP_URL = "https://vm.tiktok.com/ZS9r59EeLmR6h-8wpkw/"; // fallback TikTok page

// ── helpers ──────────────────────────────────────────────────────
function computeSecondsUntil3pm(): number {
  const now = new Date();
  const target = new Date(now);
  target.setHours(15, 0, 0, 0);
  if (now >= target) target.setDate(target.getDate() + 1);
  return Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
}

function computeSecondsUntilGateCloses(): number {
  const now = new Date();
  const close = new Date(now);
  close.setHours(15, 15, 0, 0);
  return Math.max(0, Math.floor((close.getTime() - now.getTime()) / 1000));
}

function getTimerMode(): TimerMode {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const s = now.getSeconds();

  const totalSeconds = h * 3600 + m * 60 + s;
  const gateStart = 15 * 3600;           // 15:00:00
  const gateEnd   = 15 * 3600 + 15 * 60; // 15:15:00

  if (totalSeconds < gateStart) return "preGate";
  if (totalSeconds < gateEnd)   return "gateOpen";
  return "postGate";
}

function computeRemaining(mode: TimerMode): number {
  switch (mode) {
    case "preGate":  return computeSecondsUntil3pm();
    case "gateOpen": return computeSecondsUntilGateCloses();
    case "postGate": return computeSecondsUntil3pm();
  }
}

// ── Component ────────────────────────────────────────────────────
export default function MyDashboard() {
  const [remaining, setRemaining] = useState<number>(0);
  const [mounted, setMounted] = useState<boolean>(false);
  const [timerMode, setTimerMode] = useState<TimerMode>("postGate");
  const [hasEvent, setHasEvent] = useState<boolean>(false);
  const [isCheckingEvent, setIsCheckingEvent] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string>("");
  const [activeEvent, setActiveEvent] = useState<ActiveEvent | null>(null);
  const [isInviteOpen, setIsInviteOpen] = useState<boolean>(false);
  const [joinLink, setJoinLink] = useState<string>("");
  const [copyLabel, setCopyLabel] = useState<string>("Copy link");
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── tick every second ─────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      const mode = getTimerMode();
      setTimerMode(mode);
      setRemaining(computeRemaining(mode));
    };

    tick();                // initial
    setMounted(true);

    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // ── check for existing event ──────────────────────────────────
  useEffect(() => {
    let ignore = false;

    async function checkEvent() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user || ignore) {
          if (!ignore) {
            setHasEvent(false);
            setIsCheckingEvent(false);
          }
          return;
        }

        const { data, error } = await supabase
          .from("events")
          .select("id, event_code, location, show_name")
          .eq("host_id", user.id)
          .in("status", ["live", "upcoming"])
          .order("created_at", { ascending: false })
          .limit(1);

        if (!ignore) {
          const event = !error && Array.isArray(data) && data.length > 0 ? data[0] : null;
          setHasEvent(Boolean(event));
          setActiveEvent(event);
          setIsCheckingEvent(false);
        }
      } catch {
        if (!ignore) {
          setHasEvent(false);
          setIsCheckingEvent(false);
        }
      }
    }

    checkEvent();

    return () => {
      ignore = true;
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  // ── computed display ──────────────────────────────────────────
  const isGateOpen = timerMode === "gateOpen";

  const hrs = Math.floor(remaining / 3600);
  const mins = Math.floor((remaining % 3600) / 60);
  const secs = remaining % 60;
  const mmss = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  const hhmmss = `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  const timerDisplay = mounted
    ? timerMode === "gateOpen"
      ? "TAP TO PULLUP"
      : hhmmss
    : "00:00:00";

  // ── handlers ──────────────────────────────────────────────────
  const getPullupUrl = useCallback((): string => {
    if (typeof window !== 'undefined') {
      const customUrl = localStorage.getItem('pullup_url')
      if (customUrl) return customUrl
    }
    return DEFAULT_PULLUP_URL
  }, [])

  const handleTimerClick = useCallback(() => {
    if (!isGateOpen) return;              // only clickable during gate window
    const url = getPullupUrl()
    window.open(url, "_blank", "noopener,noreferrer");
  }, [isGateOpen, getPullupUrl]);

  const handleCreateLink = useCallback(() => {
    window.location.href = "/admin/link/create";
  }, []);

  const handleCreateQR = useCallback(() => {
    window.location.href = "/admin/create";
  }, []);

  const closeInvite = useCallback(() => {
    setIsInviteOpen(false);
    setCopyLabel("Copy link");
  }, []);

  const copyInviteLink = useCallback(async () => {
    if (!joinLink) return;
    try {
      await navigator.clipboard.writeText(joinLink);
      setCopyLabel("Copied!");
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopyLabel("Copy link"), 1600);
    } catch {
      setCopyLabel("Copy failed");
    }
  }, [joinLink]);

  // ── render ────────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      {/* Toast */}
      {toastMessage ? <div className={styles.toast}>{toastMessage}</div> : null}

      {/* Background */}
      <div className={styles.background}>
        <div className={styles.blurOverlay} />
      </div>

      {/* Invite modal */}
      {isInviteOpen && (
        <div className={styles.inviteOverlay} onClick={closeInvite}>
          <div className={styles.inviteCard} onClick={(e) => e.stopPropagation()}>
            <button className={styles.inviteClose} onClick={closeInvite} type="button" aria-label="Close invite">&times;</button>
            <div className={styles.inviteBadge}>Live invite</div>
            <h3 className={styles.inviteTitle}>Share this event</h3>
            <p className={styles.inviteSubtitle}>Send a polished invite so people can join instantly.</p>
            <div className={styles.inviteField}>
              <span className={styles.inviteLabel}>Location</span>
              <div className={styles.inviteValue}>{activeEvent?.location || "Location coming soon"}</div>
            </div>
            <div className={styles.inviteField}>
              <span className={styles.inviteLabel}>Join link</span>
              <div className={styles.inviteLinkBox}>
                <span className={styles.inviteLinkText}>{joinLink || "Preparing link..."}</span>
              </div>
            </div>
            <button className={styles.copyButton} onClick={copyInviteLink} type="button">{copyLabel}</button>
          </div>
        </div>
      )}

      {/* Glass card */}
      <div className={styles.glassCard}>
        <div className={styles.glassReflection}></div>

        {/* Timer – Clickable only during 3:00–3:15 */}
        <div
          className={`${styles.timerOuter} ${isGateOpen ? styles.timerClickable : ""}`}
          onClick={handleTimerClick}
          role="button"
          tabIndex={isGateOpen ? 0 : -1}
          aria-label={isGateOpen ? "Tap to pullup" : "Gate timer"}
          onKeyDown={(e) => { if (e.key === "Enter" && isGateOpen) handleTimerClick(); }}
        >
          <div className={styles.timerGlow}></div>
          <div
            className={styles.timerInner}
            style={
              isGateOpen
                ? { background: "radial-gradient(circle at top, #22c55e, #16a34a, #15803d)" }
                : undefined
            }
          >
            <div className={styles.timerText}>
              <span
                className={styles.timerValue}
                style={isGateOpen ? { color: "#fff", textShadow: "0 0 20px rgba(34,197,94,0.8)" } : undefined}
              >
                {timerDisplay}
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className={styles.descriptionWrap}>
          <div className={styles.description}>No Contact. No Profile. Just Talk.</div>
          <span className={styles.descriptionDivider} />
        </div>

        {/* Buttons – Always accessible */}
        <div className={styles.buttonRow}>
          <button
            className={styles.actionButtonLink}
            onClick={handleCreateLink}
            type="button"
            title="Create Linkup Event"
          >
            LINKUP
          </button>
          <button
            className={styles.actionButtonShowup}
            onClick={handleCreateQR}
            type="button"
            title="Create QR Event"
          >
            SHOWUP
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <h1>TalkingStage</h1>
        <p>&copy; MIKI - +2349033666403</p>
      </div>
    </div>
  );
}
