'use client'

import { Suspense, useState, useCallback, useEffect } from 'react'


import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { ArrowLeft } from 'lucide-react'
import { SelfieCapture } from '@/components/join/selfie-capture'
import { useToast } from '@/components/ui/use-toast'

function AdminSelfContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const eventId = searchParams.get('eventId')
  const { toast } = useToast()
  const [isUploading, setIsUploading] = useState(false)
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null)

  // no UI uses selfieUrl currently; keep state in case you expand later.


  // If host selfie already exists for this event, skip selfie capture.
  useEffect(() => {
    async function maybeRedirect() {
      if (!eventId) return

      try {
        const supabase = createClient()

        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) return

        const { data: eventData } = await supabase
          .from('events')
          .select('id, host_id, host_selfie_url')
          .eq('id', eventId)
          .eq('host_id', user.id)
          .single()

        const hasEventSelfie = Boolean(eventData?.host_selfie_url)

        if (hasEventSelfie) {
          router.replace(`/admin/event/${eventId}/host-setup`)
          return
        }

        const { data: hostEventUser } = await supabase
          .from('event_users')
          .select('id, selfie_url')
          .eq('event_id', eventId)
          .eq('auth_user_id', user.id)
          .single()

        if (hostEventUser?.selfie_url) {
          router.replace(`/admin/event/${eventId}/host-setup`)
          return
        }
      } catch {
        // Ignore and allow selfie capture.
      }
    }

    maybeRedirect()
  }, [eventId, router])

  const handleSelfieCapture = useCallback(
    async (blob: Blob | null) => {
      console.log('[admin-self] onCapture fired', { hasBlob: !!blob })
      if (!blob || !eventId) return
      if (isUploading) return

      setIsUploading(true)
      try {
        const reader = new FileReader()
        const dataUrl: string = await new Promise((resolve, reject) => {
          reader.onerror = () => reject(new Error('Failed to read blob'))
          reader.onload = () => resolve(reader.result as string)
          reader.readAsDataURL(blob)
        })

        const supabase = createClient()
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError) throw userError
        if (!user) throw new Error('Not authenticated')

        const { error: saveError } = await supabase
          .from('events')
          .update({ host_selfie_url: dataUrl })
          .eq('id', eventId)
          .eq('host_id', user.id)

        if (saveError) {
          console.error('[admin-self] Save error:', saveError)
          toast({
            title: 'Error',
            description: 'Failed to save photo: ' + saveError.message,
            variant: 'destructive',
          })
          return
        }

        toast({
          title: 'Success',
          description: 'Host profile photo saved as background!',
        })
        router.push(`/admin/event/${eventId}/host-setup`)
      } catch (error) {
        console.error('[admin-self] Auto-save error:', error)
        toast({
          title: 'Error',
          description: 'Failed to save photo',
          variant: 'destructive',
        })
      } finally {
        setIsUploading(false)
      }
    },
    [eventId, isUploading, router, toast]
  )

  return (
    <main className="fixed inset-0 w-full h-full overflow-y-auto overflow-x-hidden bg-black">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden">
        {/* Floating orbs */}
        <div className="absolute top-10 left-10 w-72 h-72 bg-purple-600 rounded-full mix-blend-screen filter blur-3xl animate-float-1 opacity-20"></div>
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-pink-600 rounded-full mix-blend-screen filter blur-3xl animate-float-2 opacity-20"></div>
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-blue-600 rounded-full mix-blend-screen filter blur-3xl animate-float-3 opacity-15"></div>
        <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-indigo-600 rounded-full mix-blend-screen filter blur-3xl animate-float-4 opacity-15"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-500 rounded-full mix-blend-screen filter blur-3xl animate-pulse-slow opacity-10"></div>
        
        {/* Animated gradient lines */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent animate-slide-right"></div>
          <div className="absolute top-2/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-pink-500 to-transparent animate-slide-left animation-delay-1000"></div>
          <div className="absolute top-3/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent animate-slide-right animation-delay-2000"></div>
        </div>

        {/* Twinkling stars */}
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute w-0.5 h-0.5 bg-white rounded-full animate-twinkle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Content - scrollable */}
      <div className="relative z-10 min-h-full flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 pt-6 px-6 pb-4">
          <Button variant="ghost" onClick={() => router.back()} className="text-white/80 hover:text-white mb-4">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back
          </Button>
          <div className="text-center space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Host Profile Setup</h1>
            <p className="text-gray-400 text-sm">Take a selfie for your host profile</p>
          </div>
        </div>

        {/* Camera Section - with proper spacing for buttons */}
        <div className="flex-1 flex flex-col items-center justify-start px-4 py-4">
          <div className="relative w-full max-w-md">
            {/* Animated rings */}
            <div className="absolute -inset-6 rounded-full bg-gradient-to-r from-purple-500/30 via-pink-500/30 to-indigo-500/30 animate-spin-slow blur-xl"></div>
            <div className="absolute -inset-3 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 animate-pulse-ring blur-md"></div>
            
            {/* Selfie Capture Component - fully visible */}
            <div className="relative transform transition-all duration-500 hover:scale-105">
              <div className="[&_.camera-container]:rounded-2xl [&_.camera-container]:overflow-hidden [&_.camera-container]:border-4 [&_.camera-container]:border-purple-500/50 [&_.camera-container]:shadow-2xl [&_.camera-container]:bg-black/50">
                <SelfieCapture
                  username="Host"
                  onCapture={handleSelfieCapture}
                  onBack={() => {}}
                  isLoading={isUploading}
                  error={null}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Extra bottom padding for scrolling */}
        <div className="flex-shrink-0 h-8"></div>
      </div>

      <style jsx>{`
        @keyframes float-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(50px, -30px) scale(1.1); }
          50% { transform: translate(80px, 20px) scale(1.2); }
          75% { transform: translate(30px, 50px) scale(1.05); }
        }
        
        @keyframes float-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(-40px, 40px) scale(1.15); }
          50% { transform: translate(-70px, -20px) scale(1.25); }
          75% { transform: translate(-20px, -50px) scale(1.1); }
        }
        
        @keyframes float-3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(60px, 60px) scale(1.2); }
          50% { transform: translate(90px, -10px) scale(1.3); }
          75% { transform: translate(40px, -40px) scale(1.15); }
        }
        
        @keyframes float-4 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(-60px, -60px) scale(1.1); }
          50% { transform: translate(-100px, 30px) scale(1.2); }
          75% { transform: translate(-50px, 60px) scale(1.05); }
        }
        
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.05; transform: scale(1); }
          50% { opacity: 0.15; transform: scale(1.1); }
        }
        
        @keyframes pulse-ring {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        
        @keyframes slide-right {
          0% { transform: translateX(-100%); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateX(100%); opacity: 0; }
        }
        
        @keyframes slide-left {
          0% { transform: translateX(100%); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateX(-100%); opacity: 0; }
        }
        
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes twinkle {
          0%, 100% { opacity: 0; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.5); }
        }
        
        .animate-float-1 { animation: float-1 12s ease-in-out infinite; }
        .animate-float-2 { animation: float-2 14s ease-in-out infinite; }
        .animate-float-3 { animation: float-3 10s ease-in-out infinite; }
        .animate-float-4 { animation: float-4 16s ease-in-out infinite; }
        .animate-pulse-slow { animation: pulse-slow 6s ease-in-out infinite; }
        .animate-pulse-ring { animation: pulse-ring 2s ease-in-out infinite; }
        .animate-slide-right { animation: slide-right 6s ease-in-out infinite; }
        .animate-slide-left { animation: slide-left 6s ease-in-out infinite; }
        .animate-spin-slow { animation: spin-slow 8s linear infinite; }
        .animate-twinkle { animation: twinkle 3s ease-in-out infinite; }
        
        .animation-delay-1000 { animation-delay: 1s; }
        .animation-delay-2000 { animation-delay: 2s; }
      `}</style>
    </main>
  )
}

export default function AdminSelfPage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 flex items-center justify-center bg-black">
      <Spinner className="w-8 h-8" />
    </div>}>
      <AdminSelfContent />
    </Suspense>
  )
}