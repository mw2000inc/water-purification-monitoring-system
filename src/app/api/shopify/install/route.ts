import { NextResponse } from "next/server"
import crypto from "node:crypto"
import { createClient } from "@/lib/supabase/server"
import { shopifyAuthorizeUrl } from "@/lib/shopify"

const STATE_COOKIE = "shopify_oauth_state"

// Kicks off the one-time OAuth install: confirms the caller is a logged-in
// admin, stashes a CSRF nonce in a short-lived cookie, then redirects to
// Shopify's authorization screen. Visit this route yourself in the browser
// (logged in as an admin) to (re)connect the store — it's not meant to be
// called from a form/fetch, it's a full-page redirect flow.
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
    return NextResponse.json({ error: "Only admins can connect Shopify" }, { status: 403 })
  }

  const shop = process.env.SHOPIFY_SHOP_DOMAIN
  const clientId = process.env.SHOPIFY_CLIENT_ID
  const appUrl = process.env.SHOPIFY_APP_URL
  if (!shop || !clientId || !appUrl) {
    // TEMPORARY DEBUG — names exactly which var(s) are undefined at runtime,
    // rather than a vague "one of these three" message, so a Vercel env var
    // typo/scoping issue is obvious instead of guessed at.
    const missing = [
      !shop && "SHOPIFY_SHOP_DOMAIN",
      !clientId && "SHOPIFY_CLIENT_ID",
      !appUrl && "SHOPIFY_APP_URL",
    ].filter((v): v is string => !!v)
    return NextResponse.json({ error: `Missing env var(s): ${missing.join(", ")}` }, { status: 500 })
  }

  const state = crypto.randomBytes(24).toString("hex")
  const redirectUri = `${appUrl}/api/shopify/callback`
  const authorizeUrl = shopifyAuthorizeUrl({ shop, clientId, redirectUri, state })

  const response = NextResponse.redirect(authorizeUrl)
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  })
  return response
}
