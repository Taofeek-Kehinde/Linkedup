'use client'

import Link from 'next/link'
import { ArrowLeft, Compass, Home, Search } from 'lucide-react'

export default function NotFound() {
  return (
    <main className="relative isolate flex min-h-[calc(100dvh-4rem)] items-center justify-center overflow-hidden bg-zinc-950 px-5 py-16 text-white">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-32 top-[-8rem] h-96 w-96 animate-[not-found-drift_12s_ease-in-out_infinite] rounded-full bg-fuchsia-600/20 blur-[100px]" />
        <div className="absolute -right-32 bottom-[-8rem] h-96 w-96 animate-[not-found-drift_15s_ease-in-out_infinite_reverse] rounded-full bg-cyan-500/15 blur-[100px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(9,9,11,0.65)_70%)]" />
      </div>

      <section className="w-full max-w-xl text-center">
        <div className="relative mx-auto mb-8 flex h-36 w-36 items-center justify-center sm:h-44 sm:w-44">
          <div className="absolute inset-0 animate-[not-found-orbit_18s_linear_infinite] rounded-full border border-dashed border-fuchsia-300/30" />
          <div className="absolute inset-3 animate-[not-found-orbit_12s_linear_infinite_reverse] rounded-full border border-cyan-200/20" />
          <div className="absolute inset-7 animate-pulse rounded-full bg-gradient-to-br from-fuchsia-500/20 to-cyan-400/10 blur-xl" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] shadow-[0_0_60px_rgba(217,70,239,0.18)] backdrop-blur-xl sm:h-24 sm:w-24">
            <Compass className="h-10 w-10 animate-[not-found-compass_8s_ease-in-out_infinite] text-fuchsia-200 sm:h-12 sm:w-12" strokeWidth={1.4} />
          </div>
          <span className="absolute right-4 top-5 h-2 w-2 animate-ping rounded-full bg-cyan-200" />
          <span className="absolute bottom-5 left-3 h-1.5 w-1.5 animate-pulse rounded-full bg-fuchsia-200" />
        </div>

        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium uppercase tracking-[0.24em] text-zinc-400">
          <Search className="h-3.5 w-3.5 text-fuchsia-300" />
          Lost in the moment
        </p>
        <h1 className="text-7xl font-semibold tracking-[-0.08em] sm:text-8xl">
          <span className="bg-gradient-to-b from-white via-white to-zinc-500 bg-clip-text text-transparent">404</span>
        </h1>
        <h2 className="mt-4 text-xl font-medium tracking-tight sm:text-2xl">This page isn’t here.</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-400 sm:text-base">
          Looks like this link wandered off. Let’s get you back to the good stuff.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-500 px-6 text-sm font-semibold text-white shadow-lg shadow-fuchsia-950/30 transition duration-300 hover:-translate-y-0.5 hover:shadow-fuchsia-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-300"
          >
            <Home className="h-4 w-4 transition-transform group-hover:scale-110" />
            Back to home
          </Link>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-6 text-sm font-medium text-zinc-200 transition duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <ArrowLeft className="h-4 w-4" />
            Go back
          </button>
        </div>

        <p className="mt-10 text-xs tracking-wide text-zinc-600">REAL FACES in the MOMENT</p>
      </section>

      <style>{`
        @keyframes not-found-drift {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(24px, -18px, 0) scale(1.08); }
        }
        @keyframes not-found-orbit {
          to { transform: rotate(360deg); }
        }
        @keyframes not-found-compass {
          0%, 100% { transform: rotate(-12deg); }
          50% { transform: rotate(12deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            scroll-behavior: auto !important;
          }
        }
      `}</style>
    </main>
  )
}
