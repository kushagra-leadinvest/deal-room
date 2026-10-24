"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type Result = { error: { message: string } | null };

/**
 * Run a Supabase write from the browser (RLS applies), then refresh the
 * server-rendered page. Returns false and sets `error` on failure.
 */
export function useMutation() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: (db: SupabaseClient) => PromiseLike<Result>): Promise<boolean> {
    setPending(true);
    setError(null);
    try {
      const { error } = await fn(createClient());
      if (error) {
        setError(error.message);
        return false;
      }
      router.refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      return false;
    } finally {
      setPending(false);
    }
  }

  return { run, pending, error, setError };
}
