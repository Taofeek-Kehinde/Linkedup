'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, ExternalLink, Save, Trash2 } from 'lucide-react'
import Link from 'next/link'

export default function PullupSettingsPage() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [savedUrl, setSavedUrl] = useState('')
  const [isSaved, setIsSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('pullup_url')
    if (stored) {
      setUrl(stored)
      setSavedUrl(stored)
    }
  }, [])

  function isValidUrl(str: string) {
    try {
      new URL(str)
      return true
    } catch {
      return false
    }
  }

  function handleSave() {
    if (!url.trim()) {
      setError('Please enter a URL')
      return
    }

    // Auto-prepend https:// if missing
    let finalUrl = url.trim()
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl
    }

    if (!isValidUrl(finalUrl)) {
      setError('Please enter a valid URL')
      return
    }

    localStorage.setItem('pullup_url', finalUrl)
    setSavedUrl(finalUrl)
    setUrl(finalUrl)
    setIsSaved(true)
    setError(null)
    setTimeout(() => setIsSaved(false), 2000)
  }

  function handleReset() {
    localStorage.removeItem('pullup_url')
    setUrl('')
    setSavedUrl('')
    setError(null)
  }

  return (
    <main className="min-h-dvh p-4 pb-24">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/admin/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">PULLUP SETTINGS</h1>
            <p className="text-sm text-muted-foreground">Set the redirect URL for the TAP TO PULLUP button</p>
          </div>
        </div>

        {/* Form Card */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <ExternalLink className="h-5 w-5 text-primary" />
              Redirect URL
            </CardTitle>
            <CardDescription>
              When users tap the TAP TO PULLUP button during 3:00-3:15, they will be redirected to this URL.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="pullup-url">Destination URL</Label>
              <Input
                id="pullup-url"
                type="url"
                placeholder="https://vm.tiktok.com/..."
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value)
                  setIsSaved(false)
                  setError(null)
                }}
                className="bg-input"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Enter any URL (TikTok, Instagram, YouTube, your own site, etc.)
              </p>
            </div>

            {error && (
              <p className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md">
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <Button onClick={handleSave} className="flex-1" disabled={!url.trim()}>
                <Save className="mr-2 h-4 w-4" />
                {isSaved ? 'Saved!' : 'Save URL'}
              </Button>
              {savedUrl && (
                <Button variant="destructive" onClick={handleReset} className="flex-shrink-0">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Current URL Info */}
        {savedUrl && (
          <Card className="border-border/50 bg-card/30">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Current redirect URL:</strong>
                <br />
                <a href={savedUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline break-all">
                  {savedUrl}
                </a>
              </p>
            </CardContent>
          </Card>
        )}

        {/* Info */}
        <Card className="border-border/50 bg-card/30">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">What you get:</strong>
              <br />
              During 3:00 PM - 3:15 PM, the timer button changes to "TAP TO PULLUP" and clicking it will redirect users to your configured URL. If no URL is set, it defaults to TikTok.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

