import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "active_brand")
    .maybeSingle()

  if (error || !data) {
    return Response.json({ brand: "coinbase" })
  }
  return Response.json({ brand: data.value })
}

export async function POST(request: Request) {
  const { brand } = await request.json()
  const supabase = createAdminClient()
  
  const { error } = await supabase
    .from("settings")
    .upsert({ key: "active_brand", value: brand, updated_at: new Date().toISOString() }, { onConflict: "key" })

  if (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
  return Response.json({ success: true })
}
