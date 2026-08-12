"use client"

export function OnePassFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-card/50">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-4 py-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0572EC]">
              <span className="text-xs font-bold text-white">1P</span>
            </div>
            <span className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} AgileBits Inc. All rights reserved.
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="cursor-pointer transition-colors hover:text-foreground">Privacy</span>
            <span className="cursor-pointer transition-colors hover:text-foreground">Terms of Service</span>
            <span className="cursor-pointer transition-colors hover:text-foreground">Security</span>
            <span className="cursor-pointer transition-colors hover:text-foreground">Support</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
