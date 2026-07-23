'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Lock, Save, ExternalLink, Trash2 } from 'lucide-react'

const ADMIN_PASSWORD = '1234'

export default function AdminPage() {
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState(false)

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

  function handleUnlock() {
    if (password === ADMIN_PASSWORD) {
      setIsUnlocked(true)
      setPasswordError(false)
    } else {
      setPasswordError(true)
    }
  }

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

  // Lock screen
  if (!isUnlocked) {
    return (
      <main className="min-h-dvh flex items-center justify-center p-4 bg-black">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center">
                <Lock className="h-6 w-6 text-zinc-400" />
              </div>
            </div>
            <h1 className="text-xl font-bold text-white">Admin Access</h1>
            <p className="text-sm text-zinc-400">Enter password to continue</p>
          </div>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-password" className="text-zinc-300">Password</Label>
                <Input
                  id="admin-password"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setPasswordError(false)
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                  autoFocus
                />
                {passwordError && (
                  <p className="text-sm text-red-400">Incorrect password. Try 1234</p>
                )}
              </div>
              <Button onClick={handleUnlock} className="w-full bg-white text-black hover:bg-zinc-200">
                Unlock
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  // URL settings form
  return (
    <main className="min-h-dvh p-4 pb-24 bg-black">
      <div className="max-w-md mx-auto space-y-6">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="redirect-url" className="text-zinc-300 flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                Redirect URL
              </Label>
              <Input
                id="redirect-url"
                type="url"
                placeholder="https://vm.tiktok.com/..."
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value)
                  setIsSaved(false)
                  setError(null)
                }}
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                autoFocus
              />
              <p className="text-xs text-zinc-500">
                When users tap TAP TO PULLUP (3:00-3:15), they&apos;ll be redirected here.
              </p>
            </div>

            {error && (
              <p className="text-sm font-medium text-red-400 bg-red-400/10 p-3 rounded-md">
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <Button onClick={handleSave} className="flex-1 bg-white text-black hover:bg-zinc-200" disabled={!url.trim()}>
                <Save className="mr-2 h-4 w-4" />
                {isSaved ? 'Saved!' : 'Save URL'}
              </Button>
              {savedUrl && (
                <Button variant="destructive" onClick={handleReset} className="flex-shrink-0">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            {savedUrl && (
              <div className="p-3 rounded-md bg-zinc-800 border border-zinc-700">
                <p className="text-sm text-zinc-400">
                  <span className="text-zinc-200 font-medium">Current:</span>
                  <br />
                  <a href={savedUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline break-all">
                    {savedUrl}
                  </a>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

