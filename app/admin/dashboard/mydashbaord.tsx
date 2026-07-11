// app/dashboard/page.tsx
import { Phone, User, MoreHorizontal, Sparkles, Clock } from 'lucide-react';

export default function Dashboard() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-[#111111] rounded-3xl shadow-2xl shadow-black/50 border border-white/5 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white/60 text-xs font-medium tracking-wider uppercase">Online</span>
          </div>
          <div className="flex items-center gap-3 text-white/40">
            <Phone size={18} className="hover:text-white/70 transition-colors cursor-pointer" />
            <MoreHorizontal size={18} className="hover:text-white/70 transition-colors cursor-pointer" />
          </div>
        </div>

        {/* Avatar & Name */}
        <div className="flex flex-col items-center pt-8 pb-6 px-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-600/30 to-pink-600/30 flex items-center justify-center border-2 border-white/10 shadow-xl shadow-purple-500/10 animate-in zoom-in duration-700 delay-200">
              <User size={44} className="text-white/70" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-[#111111] flex items-center justify-center animate-in fade-in zoom-in duration-500 delay-500">
              <span className="text-[10px] text-white font-bold">✓</span>
            </div>
          </div>

          <h1 className="mt-4 text-2xl font-semibold text-white tracking-tight animate-in slide-in-from-bottom-3 duration-500 delay-300">
            MIKI
          </h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Sparkles size={12} className="text-purple-400" />
            <span className="text-white/40 text-sm font-light">+234 903 366 6403</span>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex justify-center px-4 -mt-1">
          <div className="bg-white/5 backdrop-blur-sm rounded-full px-4 py-1.5 border border-white/5 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-400">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white/70 text-xs font-medium tracking-wide">Talking Stage</span>
            <Clock size={12} className="text-white/30" />
          </div>
        </div>

        {/* Chat / Action Card */}
        <div className="mt-6 mx-4 p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm transition-all hover:bg-white/10 duration-300 group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0 border border-white/5">
              <Phone size={18} className="text-white/60 group-hover:text-white transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white/90 text-sm font-medium truncate">No Contact. No Profile.</p>
              <p className="text-white/40 text-xs truncate">Just Talk.</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-white/20 text-[10px] font-mono">03:45</span>
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/20">
                <span className="text-emerald-400 text-[10px] font-bold">→</span>
              </div>
            </div>
          </div>
          {/* subtle progress bar */}
          <div className="mt-3 w-full h-0.5 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full w-2/3 bg-gradient-to-r from-purple-500/60 to-pink-500/60 rounded-full animate-pulse" />
          </div>
        </div>

        {/* Footer / meta */}
        <div className="mt-6 pb-5 px-4 flex justify-between items-center text-white/20 text-[10px] font-mono tracking-wider">
          <span className="flex items-center gap-1">
            <span className="inline-block w-1 h-1 rounded-full bg-white/10" />
            active now
          </span>
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-white/5 flex items-center justify-center">⚡</span>
            talking stage
          </span>
        </div>

        {/* decorative glow */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-12 bg-purple-500/10 blur-3xl rounded-full pointer-events-none" />
      </div>
    </main>
  );
}