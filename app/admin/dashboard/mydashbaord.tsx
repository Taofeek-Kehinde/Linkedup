"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { Camera, Link2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import styles from "./mydashbaord.module.css";

const smileImages = [
  "one.jpg",
  "two.jpg",
  "three.jpg",
  "four.jpg",
  "five.jpg",
  "six.jpg",
  "seven.jpg",
  "eight.jpg",
  "nine.jpg",
  "ten.jpg",
];

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
  const [activeSmileIndex, setActiveSmileIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState("--:--:--");
  const [isPeepSheetOpen, setIsPeepSheetOpen] = useState(false);
  const [isCreatingPeepRequest, setIsCreatingPeepRequest] = useState(false);
  const [peepRequestError, setPeepRequestError] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(
        new Intl.DateTimeFormat(undefined, {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }).format(new Date())
      );
    };

    updateTime();
    const intervalId = window.setInterval(updateTime, 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveSmileIndex((index) => (index + 1) % smileImages.length);
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, []);

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

  const handleRequestPeep = useCallback(async () => {
    setIsCreatingPeepRequest(true);
    setPeepRequestError(null);
    try {
      const response = await fetch("/api/peep-requests", { method: "POST" });
      const result: { id?: string; error?: string } = await response.json();
      if (!response.ok || !result.id) {
        throw new Error(result.error || "Could not create a Peep request link.");
      }
      window.location.href = `/peep/request/${result.id}`;
    } catch (requestError) {
      setPeepRequestError(requestError instanceof Error ? requestError.message : "Could not create a Peep request link.");
      setIsCreatingPeepRequest(false);
    }
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
          onClick={() => {
            setPeepRequestError(null);
            setIsPeepSheetOpen(true);
          }}
          type="button"
          aria-label="Create a Peep"
          title="Record a 3-second Peep"
        >
          <div className={styles.timerGlow}></div>
          <div className={styles.timerInner}>
            {smileImages.map((image, index) => (
              <Image
                key={image}
                src={`/smiles/${image}`}
                alt=""
                fill
                loading="eager"
                unoptimized
                sizes="128px"
                style={{
                  opacity: index === activeSmileIndex ? 1 : 0,
                  transition: "opacity 300ms ease-in-out",
                }}
                className={styles.timerImage}
              />
            ))}
            <span className={styles.timerImageOverlay} aria-hidden="true" />
            <div className={styles.timerText}>
              <span className={styles.timerValue}>PEEP</span>
            </div>
          </div>
        </button>

        {/* Description */}
        <div className={styles.descriptionWrap}>
          <div className={styles.descriptionTrack}>
            <div className={styles.description}>REAL FACES in the MOMENT</div>
            <div className={styles.description}>... No Filters. No Fakes. No History</div>
          </div>
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
        <span className={styles.clockIndicator} aria-hidden="true" />
        <span className={styles.clockValue} aria-label={`Current local time ${currentTime}`}>{currentTime}</span>
      </button>

      <Sheet open={isPeepSheetOpen} onOpenChange={setIsPeepSheetOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl border-white/10 bg-zinc-950 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 text-white sm:px-8"
        >
          <SheetHeader className="px-0 text-left">
            <SheetTitle className="text-xl text-white">Choose your Peep</SheetTitle>
            <SheetDescription className="text-zinc-400">
              Record one yourself or invite someone to send you a 3-second video.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <Button
              className="h-auto min-h-20 justify-start rounded-2xl bg-gradient-to-r from-red-600 to-rose-500 px-5 py-4 text-left text-white shadow-lg shadow-red-950/30 hover:from-red-500 hover:to-rose-400"
              onClick={() => {
                setIsPeepSheetOpen(false);
                window.location.href = "/peep/create";
              }}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15">
                <Camera className="h-5 w-5" />
              </span>
              <span className="flex flex-col items-start gap-1">
                <span className="font-semibold">TAKE a PEEP</span>
                <span className="text-xs font-normal text-white/80">Record your own Peep</span>
              </span>
            </Button>
            <Button
              className="h-auto min-h-20 justify-start rounded-2xl border border-emerald-400/25 bg-gradient-to-r from-emerald-700 to-teal-600 px-5 py-4 text-left text-white shadow-lg shadow-emerald-950/30 hover:from-emerald-600 hover:to-teal-500"
              onClick={handleRequestPeep}
              disabled={isCreatingPeepRequest}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15">
                {isCreatingPeepRequest ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Link2 className="h-5 w-5" />}
              </span>
              <span className="flex flex-col items-start gap-1">
                <span>{isCreatingPeepRequest ? "Creating link..." : "REQUEST a PEEP"}</span>
                <span className="text-xs font-normal text-white/80">Invite someone to record for you</span>
              </span>
            </Button>
          </div>
          {peepRequestError && (
            <p className="mt-3 text-sm text-red-300" role="alert">{peepRequestError}</p>
          )}
        </SheetContent>
      </Sheet>

      {/* Footer */}
      <div className={styles.footer}>
        <h1>TalkingStage</h1>
        <p>&copy; MIKI - +2349033666403</p>
      </div>
    </div>
  );
}
