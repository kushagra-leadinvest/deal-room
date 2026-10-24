import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types";

/** The signed-in user's profile plus everyone's, for "Added by" and assignee pickers. */
export async function getSessionContext() {
  const supabase = await createClient();
  const [{ data: { user } }, { data: profiles }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("profiles").select("id, email, full_name, initials").order("created_at"),
  ]);
  const all = (profiles ?? []) as Profile[];
  return {
    supabase,
    userId: user?.id ?? null,
    me: all.find((p) => p.id === user?.id) ?? null,
    profiles: all,
  };
}
