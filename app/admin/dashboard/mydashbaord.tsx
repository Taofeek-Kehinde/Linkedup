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

// ── Component ────────────────────────────────────────────────────
export default function MyDashboard() {
  const [hasEvent, setHasEvent] = useState<boolean>(false);
  const [isCheckingEvent, setIsCheckingEvent] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string>("");
  const [activeEvent, setActiveEvent] = useState<ActiveEvent | null>(null);
  const [isInviteOpen, setIsInviteOpen] = useState<boolean>(false);
  const [joinLink, setJoinLink] = useState<string>("");
  const [copyLabel, setCopyLabel] = useState<string>("Copy link");
  const [pullupUrl, setPullupUrl] = useState<string>("");
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let ignore = false;
    const loadPullupUrl = async () => {
      try {
        const response = await fetch("/api/admin/pullup-url", { cache: "no-store" });
        if (!response.ok) throw new Error("Could not load redirect URL");
        const result: { url?: string } = await response.json();
        if (!ignore) setPullupUrl(result.url || "");
      } catch {
        if (!ignore) setPullupUrl("");
      }
    };

    void loadPullupUrl();
    window.addEventListener("focus", loadPullupUrl);

    return () => {
      ignore = true;
      window.removeEventListener("focus", loadPullupUrl);
    };
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

  // ── handlers ──────────────────────────────────────────────────
  const handleBrowseEvents = useCallback(() => {
    window.location.href = "/events";
  }, []);

  const handleCreateQR = useCallback(() => {
    window.location.href = "/admin/create";
  }, []);

  const handleClockClick = useCallback(() => {
    if (pullupUrl) window.location.assign(pullupUrl);
  }, [pullupUrl]);

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

        {/* Center label */}
        <button
          className={styles.timerOuter}
          onClick={() => { window.location.href = "/peep/create"; }}
          type="button"
          aria-label="Create a Peep"
          title="Record a 3-second Peep"
        >
          <div className={styles.timerGlow}></div>
          <div className={styles.timerInner}>
            <div className={styles.timerText}>
              <span className={styles.timerValue}>PEEP</span>
            </div>
          </div>
        </button>

        {/* Description */}
        <div className={styles.descriptionWrap}>
          <div className={styles.description}>No Contact. No Profile. Just Talk.</div>
          <span className={styles.descriptionDivider} />
        </div>

        {/* Buttons – Always accessible */}
        <div className={styles.buttonRow}>
          <button
            className={styles.actionButtonLink}
            onClick={handleBrowseEvents}
            type="button"
            title="Browse live events"
          >
            JOIN
          </button>
          <button
            className={styles.actionButtonShowup}
            onClick={handleCreateQR}
            type="button"
            title="Create QR Event"
          >
            CREATE
          </button>
        </div>
      </div>

      <button
        className={`${styles.clockDisplay} ${pullupUrl ? styles.clockConfigured : ""}`}
        onClick={handleClockClick}
        type="button"
        disabled={!pullupUrl}
        aria-label={pullupUrl ? "Open configured link" : "No redirect link configured"}
        title={pullupUrl ? "Open configured link" : "Set a redirect URL in the admin page"}
      >
        00:00:00
      </button>

      {/* Footer */}
      <div className={styles.footer}>
        <h1>TalkingStage</h1>
        <p>&copy; MIKI - +2349033666403</p>
      </div>
    </div>
  );
}
