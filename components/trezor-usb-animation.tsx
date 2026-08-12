"use client"

import { CircleCheck as CheckCircle2 } from "lucide-react"

export function TrezorUsbAnimation({ isConnecting, isConnected }: { isConnecting?: boolean; isConnected?: boolean }) {
  if (isConnected) {
    return (
      <div className="flex flex-col items-center gap-6 py-8">
        <div className="relative">
          <div className="h-24 w-24 rounded-full bg-success/10 flex items-center justify-center animate-in zoom-in duration-500">
            <CheckCircle2 className="h-12 w-12 text-success" />
          </div>
        </div>
        <p className="text-sm font-medium text-success">Trezor device connected</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <div className="relative">
        {/* USB Cable */}
        <svg width="120" height="120" viewBox="0 0 120 120" className="text-muted-foreground">
          {/* USB Connector Head */}
          <rect x="35" y="10" width="50" height="35" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
          {/* USB Inner Metal Part */}
          <rect x="42" y="16" width="36" height="22" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
          {/* USB Pins */}
          <rect x="48" y="22" width="4" height="10" rx="1" fill="currentColor" opacity="0.4" />
          <rect x="58" y="22" width="4" height="10" rx="1" fill="currentColor" opacity="0.4" />
          <rect x="68" y="22" width="4" height="10" rx="1" fill="currentColor" opacity="0.4" />
          {/* Cable */}
          <rect x="50" y="45" width="20" height="65" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>

        {/* Connecting Animation - Pulsing Ring */}
        {isConnecting && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-32 w-32 rounded-full border-2 border-primary/30 animate-ping" />
          </div>
        )}
      </div>

      {/* Status Text */}
      <div className="text-center">
        {isConnecting ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Waiting for connection</span>
            <div className="flex gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">Insert your Trezor device</span>
        )}
      </div>
    </div>
  )
}
