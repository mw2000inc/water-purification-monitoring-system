import { supabase } from "@/lib/supabase/client"

export async function logActivity(userId: string, action: string): Promise<void> {
  if (!userId) return
  const now = new Date()
  await supabase.from("activity_logs").insert({
    user_id: userId,
    action,
    date: now.toISOString().slice(0, 10),
    time: now.toTimeString().slice(0, 5),
    ip_address: "",
  })
}
