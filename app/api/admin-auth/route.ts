import { NextRequest, NextResponse } from "next/server"

// SHA-256 hash of the admin password - computed at build time, never exposed to client
// Password: hashed server-side, the plaintext is never sent to the browser
const ADMIN_PASSWORD_HASH = "8c7af328825992f15a497652913a8d766e3da5a96389d350a50395da063bb162"

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

// Generate a secure random session token
function generateSessionToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

// Store active session tokens in memory (resets on deploy, which is fine for admin)
const activeSessions = new Set<string>()

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    if (!password) {
      return NextResponse.json({ error: "Password required" }, { status: 400 })
    }

    const inputHash = await hashPassword(password)

    if (inputHash !== ADMIN_PASSWORD_HASH) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 })
    }

    // Generate session token
    const sessionToken = generateSessionToken()
    activeSessions.add(sessionToken)

    // Set HTTP-only cookie
    const response = NextResponse.json({ success: true })
    response.cookies.set("admin_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    })

    return response
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const sessionToken = request.cookies.get("admin_session")?.value

  if (!sessionToken || !activeSessions.has(sessionToken)) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  return NextResponse.json({ authenticated: true })
}

export async function DELETE(request: NextRequest) {
  const sessionToken = request.cookies.get("admin_session")?.value

  if (sessionToken) {
    activeSessions.delete(sessionToken)
  }

  const response = NextResponse.json({ success: true })
  response.cookies.delete("admin_session")
  return response
}
