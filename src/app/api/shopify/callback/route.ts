import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { exchangeCodeForAccessToken, registerOrderCreateWebhook, verifyOAuthCallbackHmac } from "@/lib/shopify"

const STATE_COOKIE = "shopify_oauth_state"

function redirectToSettings(appUrl: string, status: "connected" | "error", message?: string) {
  const url = new URL("/settings", appUrl)
  url.searchParams.set("shopify", status)
  if (message) url.searchParams.set("shopify_message", message)
  const response = NextResponse.redirect(url)
  response.cookies.delete(STATE_COOKIE)
  return response
}

// Shopify redirects the admin's browser here after they approve the install.
// This exchanges the one-time `code` for a PERMANENT access token — that
// exchange can only ever happen once per code, so this route is meant to be
// hit exactly once per /api/shopify/install redirect, not called directly.
export async function GET(request: Request) {
  const appUrl = process.env.SHOPIFY_APP_URL
  const shop = process.env.SHOPIFY_SHOP_DOMAIN
  const clientId = process.env.SHOPIFY_CLIENT_ID
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET
  if (!appUrl || !shop || !clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Missing SHOPIFY_APP_URL, SHOPIFY_SHOP_DOMAIN, SHOPIFY_CLIENT_ID, or SHOPIFY_CLIENT_SECRET env vars" },
      { status: 500 }
    )
  }

  const { searchParams } = new URL(request.url)
  const returnedShop = searchParams.get("shop")
  const code = searchParams.get("code")
  const state = searchParams.get("state")

  // TEMPORARY DEBUG — remove once the shop-mismatch issue is diagnosed.
  // JSON.stringify reveals invisible characters (stray whitespace, smart
  // quotes pasted into the Vercel env var field, etc.) that a visual check
  // of the dashboard value wouldn't catch.
  console.log("[SHOPIFY_DEBUG] full callback URL:", request.url)
  console.log("[SHOPIFY_DEBUG] returnedShop:", JSON.stringify(returnedShop), "length:", returnedShop?.length)
  console.log("[SHOPIFY_DEBUG] env SHOPIFY_SHOP_DOMAIN:", JSON.stringify(shop), "length:", shop?.length)
  console.log("[SHOPIFY_DEBUG] strict equal:", returnedShop === shop)

  // Only ever accept a callback for the one store this app is wired to —
  // this is a single-tenant custom app, not a public multi-store app.
  if (returnedShop !== shop) {
    return redirectToSettings(appUrl, "error", "Unexpected shop in callback")
  }
  if (!code || !state) {
    return redirectToSettings(appUrl, "error", "Missing code or state")
  }

  // CSRF check: the state must match the nonce this same browser was handed
  // by /api/shopify/install a moment ago.
  const cookieStore = request.headers.get("cookie") ?? ""
  const expectedState = cookieStore
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${STATE_COOKIE}=`))
    ?.slice(STATE_COOKIE.length + 1)
  if (!expectedState || expectedState !== state) {
    return redirectToSettings(appUrl, "error", "State mismatch — please retry the connection")
  }

  // Integrity check: Shopify signs the whole callback query string with the
  // client secret, independent of the state cookie above.
  if (!verifyOAuthCallbackHmac(searchParams, clientSecret)) {
    return redirectToSettings(appUrl, "error", "Invalid callback signature")
  }

  const supabase = await createClient()
  const {
    data: { user: caller },
  } = await supabase.auth.getUser()
  if (!caller) {
    return redirectToSettings(appUrl, "error", "Your session expired — log in and try again")
  }
  const { data: callerProfile } = await supabase.from("profiles").select("role").eq("id", caller.id).single()
  if (callerProfile?.role !== "admin") {
    return redirectToSettings(appUrl, "error", "Only admins can connect Shopify")
  }

  let accessToken: string
  let scope: string
  try {
    const result = await exchangeCodeForAccessToken({ shop, clientId, clientSecret, code })
    accessToken = result.accessToken
    scope = result.scope
  } catch (err) {
    return redirectToSettings(appUrl, "error", err instanceof Error ? err.message : "Token exchange failed")
  }

  const admin = createAdminClient()
  const { data: systemCustomer } = await admin.from("customers").select("id").eq("is_system", true).limit(1).maybeSingle()

  const { error: settingsError } = await admin
    .from("shopify_settings")
    .update({
      shop_domain: shop,
      scopes: scope,
      access_token: accessToken,
      installed_at: new Date().toISOString(),
      system_customer_id: systemCustomer?.id ?? null,
      system_profile_id: caller.id,
    })
    .eq("id", 1)
  if (settingsError) {
    return redirectToSettings(appUrl, "error", "Saved token failed to persist — check server logs")
  }

  // Best-effort — the connection itself is already saved even if this fails
  // (e.g. a webhook for this topic already exists from a previous install).
  try {
    await registerOrderCreateWebhook({
      shop,
      accessToken,
      callbackUrl: `${appUrl}/api/webhooks/shopify/orders-create`,
    })
  } catch (err) {
    return redirectToSettings(
      appUrl,
      "error",
      `Connected, but webhook registration failed: ${err instanceof Error ? err.message : "unknown error"}`
    )
  }

  return redirectToSettings(appUrl, "connected")
}
