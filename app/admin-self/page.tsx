'use client'

import { Suspense, useState } from 'react'
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

  const handleSelfieCapture = (blob: Blob | null) => {
    if (blob) {
      const reader = new FileReader()
      reader.onload = () => {
        setSelfieUrl(reader.result as string)
        console.log('Selfie captured:', reader.result)
      }
      reader.readAsDataURL(blob)
    } else {
      console.log('No blob received')
    }
  }

  const handleSaveSelfie = async () => {
    if (!eventId || !selfieUrl) {
      toast({
        title: 'Error',
        description: 'Event ID or selfie missing',
        variant: 'destructive'
      })
      return
    }

    setIsUploading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast({
          title: 'Error',
          description: 'Not authenticated',
          variant: 'destructive'
        })
        return
      }

      const { error } = await supabase
        .from('events')
        .update({ host_selfie_url: selfieUrl })
        .eq('id', eventId)
        .eq('host_id', user.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Host profile photo saved!'
      })

      router.push(`/admin/event/${eventId}/host-setup`)
    } catch (error) {
      console.error('Save error:', error)
      toast({
        title: 'Error',
        description: 'Failed to save photo',
        variant: 'destructive'
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <main className="min-h-dvh flex flex-col bg-gradient-to-br from-black to-gray-900">
      <div className="p-6 space-y-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </Button>
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-white">Host Profile Setup</h1>
          <p className="text-gray-300">Take a selfie for your host profile</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <SelfieCapture 
          username="Host"
          onCapture={(blob) => {
            if (blob) {
              const reader = new FileReader()
              reader.onload = () => setSelfieUrl(reader.result as string)
              reader.readAsDataURL(blob)
            }
          }}
          onBack={() => {}}
          isLoading={false}
          error={null}
        />
      </div>

      <div className="p-6">
        <Button 
          onClick={handleSaveSelfie}
          disabled={!selfieUrl || isUploading}
          className="w-full h-14 text-lg font-bold"
        >
          {isUploading ? (
            <>
              <Spinner className="mr-2" />
              Saving...
            </>
          ) : (
            'Save Host Photo'
          )}
        </Button>
      </div>
    </main>
  )
}

export default function AdminSelfPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-dvh">
      <Spinner className="w-8 h-8" />
    </div>}>
      <AdminSelfContent />
    </Suspense>
  )
}

