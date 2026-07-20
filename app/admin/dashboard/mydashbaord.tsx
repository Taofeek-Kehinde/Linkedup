"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./mydashbaord.module.css";

type ActiveEvent = {
  id: string;
  event_code: string;
  location: string | null;
  show_name: string | null;
};

export default function MyDashboard() {

  function secondsUntilNext3pm() {
    const now = new Date();
    const target = new Date(now);
    target.setHours(15, 0, 0, 0);
    if (now >= target) target.setDate(target.getDate() + 1);
    return Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
  }

  const [remaining, setRemaining] = useState<number>(0);
  const [mounted, setMounted] = useState<boolean>(false);
  const [hasEvent, setHasEvent] = useState<boolean>(false);
  const [isCheckingEvent, setIsCheckingEvent] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string>("");
  const [activeEvent, setActiveEvent] = useState<ActiveEvent | null>(null);
  const [isInviteOpen, setIsInviteOpen] = useState<boolean>(false);
  const [joinLink, setJoinLink] = useState<string>("");
  const [copyLabel, setCopyLabel] = useState<string>("Copy link");
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const initial = secondsUntilNext3pm();
    setRemaining(initial);
    setMounted(true);

    const id = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) return secondsUntilNext3pm();
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let ignore = false;

    async function checkEvent() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

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
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const hrs = Math.floor(remaining / 3600);
  const mins = Math.floor((remaining % 3600) / 60);
  const secs = remaining % 60;
  const timeStr = mounted
    ? `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
    : "00:00:00";

  const handleShowupClick = () => {
    if (!hasEvent || !activeEvent) {
      setToastMessage("There is no any active event");
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
      toastTimerRef.current = setTimeout(() => {
        setToastMessage("");
      }, 1800);
      return;
    }

    window.location.href = "/admin/create";
  };

  const closeInvite = () => {
    setIsInviteOpen(false);
    setCopyLabel("Copy link");
  };

  const copyInviteLink = async () => {
    if (!joinLink) return;

    try {
      await navigator.clipboard.writeText(joinLink);
      setCopyLabel("Copied!");
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = setTimeout(() => {
        setCopyLabel("Copy link");
      }, 1600);
    } catch {
      setCopyLabel("Copy failed");
    }
  };

  return (
    <div className={styles.page}>
      {toastMessage ? <div className={styles.toast}>{toastMessage}</div> : null}

      <div className={styles.background}>
        <div className={styles.blurOverlay} />
      </div>

      {isInviteOpen ? (
        <div className={styles.inviteOverlay} onClick={closeInvite}>
          <div className={styles.inviteCard} onClick={(event) => event.stopPropagation()}>
            <button className={styles.inviteClose} onClick={closeInvite} type="button" aria-label="Close invite">
              ×
            </button>

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

            <button className={styles.copyButton} onClick={copyInviteLink} type="button">
              {copyLabel}
            </button>
          </div>
        </div>
      ) : null}

      <div className={styles.glassCard}>
        <div className={styles.glassReflection}></div>

        <div className={styles.timerOuter}>
          <div className={styles.timerGlow}></div>
          <div className={styles.timerInner}>
            <div className={styles.timerText}>
              <span className={styles.timerValue}>{timeStr}</span>
              <span className={styles.timerLabel}>PULLUP</span>
            </div>
          </div>
        </div>

        <div className={styles.descriptionWrap}>
          <div className={styles.description}>
            No Contact. No Profile. Just Talk.
          </div>
          <span className={styles.descriptionDivider} />
        </div>

        <div className={styles.buttonRow}>
          <button
            className={styles.circleButton}
            onClick={() => {
              window.location.href = "/admin/link/create";
            }}
            type="button"
          >
            <Image src="/link.png" alt="Link" width={70} height={70} className="object-contain" />
          </button>

          <button
            className={styles.circleButton}
            onClick={() => {
              window.location.href = "/admin/create";
            }}
            type="button"
          >
            <Image src="/user.png" alt="User" width={70} height={70} className="object-contain" />
          </button>
        </div>
      </div>

      <div className={styles.footer}>
        <h1>Talking Stage</h1>
        <p>© MIKI - +2349033666403</p>
      </div>
    </div>
  );
}