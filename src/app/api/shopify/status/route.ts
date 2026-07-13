import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

// Reports connection status only — shop_domain/scopes/installed_at, never the
// access_token itself. Admin-gated the same way the install route is.
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user: caller },
  } = await supabase.auth.getUser()
  if (!caller) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  const { data: callerProfile } = await supabase.from("profiles").select("role").eq("id", caller.id).single()
  if (callerProfile?.role !== "admin") {
    return NextResponse.json({ error: "Only admins can view this" }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data } = await admin
    .from("shopify_settings")
    .select("shop_domain, scopes, installed_at")
    .eq("id", 1)
    .maybeSingle()

  return NextResponse.json({
    connected: !!data?.installed_at,
    shopDomain: data?.shop_domain ?? null,
    scopes: data?.scopes ?? null,
    installedAt: data?.installed_at ?? null,
  })
}
