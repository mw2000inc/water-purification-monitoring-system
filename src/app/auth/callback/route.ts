import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Google (and any future OAuth provider) redirects the browser here after the
// admin approves on the provider's own consent screen. The URL carries a
// one-time `code` that must be exchanged for a session using the SERVER
// client specifically — that's what writes the resulting session into
// cookies, making it visible to both server and client on the next request.
// Relying on the browser client's automatic URL detection alone doesn't
// reliably complete this exchange with @supabase/ssr's cookie-based storage,
// which is why this route exists rather than redirecting straight to /login.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}/`)
    }
  }

  return NextResponse.redirect(`${origin}/login?oauth_error=1`)
}
