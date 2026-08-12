"use client"

import { useEffect, useRef } from "react"

export function useHeartbeat(visitorId: string, intervalMs = 10000) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!visitorId) return

    const sendHeartbeat = async () => {
      try {
        const res = await fetch(`/api/activity?visitorId=${visitorId}`)
        const data = await res.json()
        if (data.activity) {
          const updated = {
            ...data.activity,
            lastHeartbeat: new Date().toISOString(),
            isOnline: true,
          }
          await fetch("/api/activity", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ visitorId, activity: updated }),
          })
        }
      } catch {
        // ignore heartbeat errors
      }
    }

    // Send initial heartbeat
    sendHeartbeat()

    // Set up interval
    intervalRef.current = setInterval(sendHeartbeat, intervalMs)

    // Mark offline on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }

      // Best effort: mark offline
      if (visitorId) {
        fetch(`/api/activity?visitorId=${visitorId}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.activity) {
              fetch("/api/activity", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  visitorId,
                  activity: { ...data.activity, isOnline: false },
                }),
              })
            }
          })
          .catch(() => {})
      }
    }
  }, [visitorId, intervalMs])
}
