import { NextRequest, NextResponse } from "next/server"
import { getActivity, setActivity, getAllActivities, clearActivity, type UserActivity } from "@/lib/activity-store"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const visitorId = searchParams.get("visitorId")

  if (visitorId) {
    const activity = await getActivity(visitorId)
    return NextResponse.json({ activity: activity || null })
  }

  // Default: return all activities (for admin panel)
  const activities = await getAllActivities()
  return NextResponse.json({ activities })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Handle sendBeacon offline signal
    if (body.setOffline && body.visitorId) {
      const existingActivity = await getActivity(body.visitorId)
      if (existingActivity) {
        await setActivity(body.visitorId, {
          ...existingActivity,
          isOnline: false,
          lastHeartbeat: new Date().toISOString(),
        })
      }
      return NextResponse.json({ success: true })
    }
    
    const { visitorId, activity } = body as { visitorId: string; activity: UserActivity }

    if (!visitorId || !activity) {
      return NextResponse.json({ error: "Missing visitorId or activity" }, { status: 400 })
    }

    await setActivity(visitorId, activity)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Support both query param and body
    const { searchParams } = new URL(request.url)
    let visitorId = searchParams.get("visitorId")
    
    if (!visitorId) {
      const body = await request.json()
      visitorId = body.visitorId
    }

    if (!visitorId) {
      return NextResponse.json({ error: "Missing visitorId" }, { status: 400 })
    }

    await clearActivity(visitorId)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
