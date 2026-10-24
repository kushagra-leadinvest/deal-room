import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractFromTranscript, geminiConfigured } from "@/lib/gemini";

/**
 * Run Gemini on a saved note and write the results into the note's AI fields.
 * Fills the company's summary fields only where they are still empty.
 * Always answers 200 with a status, so the client never treats AI as blocking.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ status: "failed", message: "Not signed in" }, { status: 401 });

  const { noteId } = (await request.json().catch(() => ({}))) as { noteId?: string };
  if (!noteId) return NextResponse.json({ status: "failed", message: "Missing noteId" }, { status: 400 });

  const { data: note } = await supabase
    .from("notes")
    .select("id, company_id, raw_transcript")
    .eq("id", noteId)
    .maybeSingle();
  if (!note) return NextResponse.json({ status: "failed", message: "Note not found" }, { status: 404 });

  if (!geminiConfigured()) {
    await supabase.from("notes").update({ ai_status: "skipped", ai_error: "no Gemini key set" }).eq("id", noteId);
    return NextResponse.json({ status: "skipped", message: "no Gemini key set" });
  }
  if (!note.raw_transcript?.trim()) {
    await supabase.from("notes").update({ ai_status: "skipped", ai_error: "empty transcript" }).eq("id", noteId);
    return NextResponse.json({ status: "skipped", message: "empty transcript" });
  }

  try {
    const x = await extractFromTranscript(note.raw_transcript);

    await supabase
      .from("notes")
      .update({
        ai_summary: x.summary,
        ai_revenue: x.revenue,
        ai_traction: x.traction,
        ai_raise_ask: x.raise_ask,
        ai_status: "ok",
        ai_error: null,
      })
      .eq("id", noteId);

    // Fill empty company fields; never overwrite what someone typed.
    const { data: company } = await supabase
      .from("companies")
      .select("ai_summary, revenue_metrics, traction_metrics, raise_ask")
      .eq("id", note.company_id)
      .single();
    if (company) {
      const patch: Record<string, string> = {};
      if (!company.ai_summary && x.summary) patch.ai_summary = x.summary;
      if (!company.revenue_metrics && x.revenue) patch.revenue_metrics = x.revenue;
      if (!company.traction_metrics && x.traction) patch.traction_metrics = x.traction;
      if (!company.raise_ask && x.raise_ask) patch.raise_ask = x.raise_ask;
      if (Object.keys(patch).length) {
        await supabase.from("companies").update(patch).eq("id", note.company_id);
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (e) {
    const message = e instanceof Error ? e.message.slice(0, 200) : "extraction failed";
    await supabase.from("notes").update({ ai_status: "failed", ai_error: message }).eq("id", noteId);
    return NextResponse.json({ status: "failed", message });
  }
}
