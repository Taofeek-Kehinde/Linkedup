type PeepVideoPlayerProps = {
  videoUrl: string
}

export function PeepVideoPlayer({ videoUrl }: PeepVideoPlayerProps) {
  return (
    <div className="relative aspect-square h-[min(92vw,58dvh,640px)] w-[min(92vw,58dvh,640px)] shrink-0 overflow-hidden rounded-full bg-black shadow-[0_0_60px_rgba(0,168,132,0.12)]">
      <video
        key={videoUrl}
        src={videoUrl}
        autoPlay
        loop
        muted
        playsInline
        controls
        className="absolute inset-0 h-full w-full rounded-full object-cover"
      />
      <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(0, 168, 132, 0.35)" strokeWidth="1.5" />
        <circle cx="50" cy="50" r="48" fill="none" stroke="#00a884" strokeWidth="1.5" />
      </svg>
    </div>
  )
}
