'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getLocalSession, setLocalSession } from '@/lib/utils/session'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Spinner } from '@/components/ui/spinner'
import { ArrowLeft, Unlock, Mail, Phone, Check, Sparkles } from 'lucide-react'
import Link from 'next/link'

export default function UpgradePage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params)
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Google auth
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  // Phone auth (simplified)
  const [phone, setPhone] = useState('')

  async function handleEmailUpgrade(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const session = getLocalSession()
    if (!session) {
      router.push('/')
      return
    }

    const supabase = createClient()

    // Sign up/in with email
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      // Try signing up
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
            `${window.location.origin}/auth/callback`,
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        setIsLoading(false)
        return
      }

      // Update event user
      if (signUpData.user) {
        await upgradeUser(session.eventUserId, signUpData.user.id)
      }
    } else if (data.user) {
      await upgradeUser(session.eventUserId, data.user.id)
    }
  }

  async function upgradeUser(eventUserId: string, authUserId: string) {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('event_users')
      .update({
        is_upgraded: true,
        auth_user_id: authUserId,
      })
      .eq('id', eventUserId)

    if (error) {
      setError('Failed to upgrade. Please try again.')
      setIsLoading(false)
      return
    }

    // Update local session
    const session = getLocalSession()
    if (session) {
      setLocalSession({ ...session, isUpgraded: true })
    }

    router.push(`/show/${eventId}`)
  }

  async function handlePhoneUpgrade(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // For demo purposes, just upgrade without real phone verification
    const session = getLocalSession()
    if (!session) {
      router.push('/')
      return
    }

    const supabase = createClient()
    
    const { error } = await supabase
      .from('event_users')
      .update({ is_upgraded: true })
      .eq('id', session.eventUserId)

    if (error) {
      setError('Failed to upgrade. Please try again.')
      setIsLoading(false)
      return
    }

    // Update local session
    setLocalSession({ ...session, isUpgraded: true })
    router.push(`/show/${eventId}`)
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href={`/show/${eventId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Upgrade Account</h1>
            <p className="text-sm text-muted-foreground">Unlock unlimited chats</p>
          </div>
        </div>

        {/* Benefits Card */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">What you get</h3>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                Unlimited chat connections
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                Save connections across events
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                Priority in the feed
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Auth Card */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Unlock className="h-5 w-5 text-primary" />
              Verify Your Identity
            </CardTitle>
            <CardDescription>
              Quick verification to unlock all features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="email">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="email">
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </TabsTrigger>
                <TabsTrigger value="phone">
                  <Phone className="h-4 w-4 mr-2" />
                  Phone
                </TabsTrigger>
              </TabsList>

              <TabsContent value="email">
                <form onSubmit={handleEmailUpgrade} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Create or enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="bg-input"
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <Spinner className="mr-2" />
                    ) : (
                      <Unlock className="mr-2 h-4 w-4" />
                    )}
                    Upgrade with Email
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="phone">
                <form onSubmit={handlePhoneUpgrade} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      className="bg-input"
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <Spinner className="mr-2" />
                    ) : (
                      <Unlock className="mr-2 h-4 w-4" />
                    )}
                    Upgrade with Phone
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Demo: Phone verification is simplified
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Skip option */}
        <div className="text-center">
          <Link href={`/show/${eventId}`}>
            <Button variant="ghost" className="text-muted-foreground">
              Maybe later
            </Button>
          </Link>
        </div>
      </div>
    </main>
  )
}
