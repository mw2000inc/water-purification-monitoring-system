import "server-only"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

// Service-role client — server-only (route handlers), never import from client components.
// Bypasses RLS entirely, so every call site must do its own authorization check first.
//
// IMPORTANT: SUPABASE_SERVICE_ROLE_KEY must be the legacy JWT-format key (starts
// with "eyJ...", from Project Settings > API > Project API keys), NOT the newer
// "sb_secret_..." format — the Auth Admin API (auth.admin.createUser/deleteUser)
// rejects the new format with a raw HTML error instead of JSON.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
