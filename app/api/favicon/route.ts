import { createClient } from "@/lib/supabase/server"
import { getBrandConfig } from "@/lib/brands"

export const dynamic = "force-dynamic"

export async function GET() {
  let brandId = "coinbase"
  
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "active_brand")
      .maybeSingle()
    
    if (data?.value) {
      brandId = data.value
    }
  } catch {
    // fallback to coinbase
  }

  const brand = getBrandConfig(brandId)
  
  // Ledger uses an external URL favicon - redirect to it
  if (brand.faviconUrl) {
    return Response.redirect(brand.faviconUrl, 302)
  }
  
  return new Response(brand.faviconSvg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  })
}
