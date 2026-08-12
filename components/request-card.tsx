"use client"

import { useState } from "react"
import { Check, X, Clock, Calendar, FileText, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type RequestStatus = "pending" | "approved" | "denied"

export interface LedgerRequest {
  id: string
  requester: string
  category: string
  description: string
  date: string
  status: RequestStatus
}

interface RequestCardProps {
  request: LedgerRequest
  onApprove: (id: string) => void
  onDeny: (id: string) => void
}

export function RequestCard({ request, onApprove, onDeny }: RequestCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleApprove = async () => {
    setIsProcessing(true)
    await new Promise((resolve) => setTimeout(resolve, 300))
    onApprove(request.id)
    setIsProcessing(false)
  }

  const handleDeny = async () => {
    setIsProcessing(true)
    await new Promise((resolve) => setTimeout(resolve, 300))
    onDeny(request.id)
    setIsProcessing(false)
  }

  const statusConfig = {
    pending: {
      label: "Pending",
      className: "bg-warning/10 text-warning border-warning/20",
      icon: Clock,
    },
    approved: {
      label: "Approved",
      className: "bg-success/10 text-success border-success/20",
      icon: Check,
    },
    denied: {
      label: "Denied",
      className: "bg-destructive/10 text-destructive border-destructive/20",
      icon: X,
    },
  }

  const StatusIcon = statusConfig[request.status].icon

  return (
    <Card className={cn("border-border bg-card transition-all duration-200", request.status === "approved" && "border-success/30", request.status === "denied" && "border-destructive/30")}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground sm:text-base">{request.requester}</h3>
                <Badge variant="outline" className={cn("text-[10px] sm:text-xs shrink-0", statusConfig[request.status].className)}>
                  <StatusIcon className="mr-1 h-3 w-3" />
                  {statusConfig[request.status].label}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground sm:text-sm">{request.category}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground sm:hidden">{request.date}</p>
            </div>
          </div>

          <div className="hidden sm:block">
            <p className="text-xs text-muted-foreground">{request.date}</p>
          </div>

          {request.status === "pending" && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleDeny} disabled={isProcessing} className="flex-1 border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 text-xs sm:text-sm">
                <X className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                Deny
              </Button>
              <Button size="sm" onClick={handleApprove} disabled={isProcessing} className="flex-1 bg-success text-success-foreground hover:bg-success/80 cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 text-xs sm:text-sm">
                <Check className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                Approve
              </Button>
            </div>
          )}

          <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>

        {expanded && (
          <div className="mt-3 border-t border-border pt-3 space-y-2">
            <div className="flex items-start gap-2">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-foreground">Description</p>
                <p className="text-xs text-muted-foreground">{request.description}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-foreground">Submitted</p>
                <p className="text-xs text-muted-foreground">{request.date}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
