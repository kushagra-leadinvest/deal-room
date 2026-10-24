"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import EditableField from "@/components/ui/EditableField";
import AddedBy from "@/components/ui/AddedBy";
import Section from "@/components/ui/Section";
import ErrorText from "@/components/ui/ErrorText";
import { createClient } from "@/lib/supabase/client";
import { useMutation } from "@/lib/useMutation";
import { formatDate } from "@/lib/format";
import type { Company, Deal, Note, Profile } from "@/types";

/** Ask the server to run Gemini on a saved note. Never throws: AI is optional. */
async function extract(noteId: string): Promise<{ status: string; message?: string }> {
  try {
    const res = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteId }),
    });
    return (await res.json()) as { status: string; message?: string };
  } catch {
    return { status: "failed", message: "Couldn't reach the extraction service" };
  }
}

export default function NotesSection({
  companyId,
  company,
  notes,
  deals,
  profiles,
}: {
  companyId: string;
  company: Company;
  notes: Note[];
  deals: Deal[];
  profiles: Profile[];
}) {
  const router = useRouter();
  const [transcript, setTranscript] = useState("");
  const [attendees, setAttendees] = useState("");
  const [actionItems, setActionItems] = useState("");
  const [dealId, setDealId] = useState(deals[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!transcript.trim() && !actionItems.trim()) return;
    setSaving(true);
    setError(null);
    setStatus("Saving note…");

    // 1. Save the note first, so nothing is lost if AI fails.
    const { data, error } = await createClient()
      .from("notes")
      .insert({
        company_id: companyId,
        deal_id: dealId || null,
        raw_transcript: transcript,
        attendees: attendees.split(",").map((s) => s.trim()).filter(Boolean),
        action_items: actionItems.trim() || null,
        ai_status: transcript.trim() ? "pending" : "skipped",
      })
      .select("id")
      .single();

    if (error) {
      setError(`Note not saved: ${error.message}`);
      setSaving(false);
      setStatus(null);
      return;
    }

    setTranscript("");
    setAttendees("");
    setActionItems("");
    router.refresh();

    // 2. Then try extraction. Whatever happens, the note stays.
    if (transcript.trim()) {
      setStatus("Note saved. Extracting summary and metrics…");
      const result = await extract(data.id);
      setStatus(
        result.status === "ok"
          ? "Note saved and AI fields filled. Check them below."
          : `Note saved. AI extraction ${result.status === "skipped" ? "is off" : "failed"}${
              result.message ? ` (${result.message})` : ""
            }, so fill in the fields by hand.`,
      );
      router.refresh();
    } else {
      setStatus("Note saved.");
    }
    setSaving(false);
  }

  return (
    <Section title="Notes">
      <form onSubmit={save} className="space-y-2 mb-4">
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Paste a call transcript or meeting notes"
          rows={5}
          className="input"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            value={attendees}
            onChange={(e) => setAttendees(e.target.value)}
            placeholder="Attendees (comma separated)"
            className="input"
          />
          {deals.length > 0 && (
            <select value={dealId} onChange={(e) => setDealId(e.target.value)} className="input">
              <option value="">Not tied to a round</option>
              {deals.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.stage || "Round"} ({d.pipeline_stage.replace("_", " ")})
                </option>
              ))}
            </select>
          )}
        </div>
        <textarea
          value={actionItems}
          onChange={(e) => setActionItems(e.target.value)}
          placeholder="Action items (optional)"
          rows={2}
          className="input"
        />
        <div className="flex items-center gap-3">
          <button type="submit" className="btn-primary" disabled={saving || (!transcript.trim() && !actionItems.trim())}>
            {saving ? "Working…" : "Save note"}
          </button>
          {status && <span className="text-xs text-gray-600">{status}</span>}
        </div>
        <ErrorText error={error} />
      </form>

      <ol className="space-y-3">
        {notes.map((n) => (
          <NoteItem key={n.id} note={n} company={company} profiles={profiles} />
        ))}
        {notes.length === 0 && <p className="text-sm text-gray-400">No notes yet.</p>}
      </ol>
    </Section>
  );
}

function NoteItem({ note, company, profiles }: { note: Note; company: Company; profiles: Profile[] }) {
  const { run, pending, error } = useMutation();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const save = (field: keyof Note) => (value: unknown) =>
    run((db) => db.from("notes").update({ [field]: value }).eq("id", note.id));

  const hasAi = !!(note.ai_summary || note.ai_revenue || note.ai_traction || note.ai_raise_ask);

  function applyToCompany() {
    const patch: Partial<Company> = {};
    if (note.ai_summary) patch.ai_summary = note.ai_summary;
    if (note.ai_revenue) patch.revenue_metrics = note.ai_revenue;
    if (note.ai_traction) patch.traction_metrics = note.ai_traction;
    if (note.ai_raise_ask) patch.raise_ask = note.ai_raise_ask;
    return run((db) => db.from("companies").update(patch).eq("id", company.id));
  }

  async function retry() {
    setRetrying(true);
    await extract(note.id);
    setRetrying(false);
    router.refresh();
  }

  return (
    <li className="rounded-lg border border-gray-200 p-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold text-sm">{formatDate(note.created_at)}</span>
        {note.attendees.length > 0 && <span className="text-gray-500">with {note.attendees.join(", ")}</span>}
        <AddedBy by={note.created_by} profiles={profiles} className="ml-auto" />
      </div>

      {(note.ai_status === "failed" || note.ai_status === "skipped") && note.raw_transcript && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600 bg-gray-50 rounded-md px-2 py-1.5">
          <span>
            AI extraction {note.ai_status === "skipped" ? "didn't run" : "failed"}
            {note.ai_error ? `: ${note.ai_error}` : ""}. Fill in the fields by hand.
          </span>
          <button className="text-brand hover:underline" disabled={retrying} onClick={retry}>
            {retrying ? "Retrying…" : "Retry"}
          </button>
        </div>
      )}
      {note.ai_status === "pending" && note.raw_transcript && (
        <p className="mt-2 text-xs text-gray-500">
          Extraction pending.{" "}
          <button className="text-brand hover:underline" disabled={retrying} onClick={retry}>
            {retrying ? "Running…" : "Run now"}
          </button>
        </p>
      )}

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
        <EditableField label="Summary" value={note.ai_summary} kind="textarea" onSave={save("ai_summary")} className="sm:col-span-2" />
        <EditableField label="Revenue" value={note.ai_revenue} kind="textarea" onSave={save("ai_revenue")} />
        <EditableField label="Traction" value={note.ai_traction} kind="textarea" onSave={save("ai_traction")} />
        <EditableField label="Raise ask" value={note.ai_raise_ask} onSave={save("ai_raise_ask")} />
        <EditableField label="Action items" value={note.action_items} kind="textarea" onSave={save("action_items")} />
      </div>

      <div className="mt-2 flex flex-wrap gap-3 text-xs">
        {note.raw_transcript && (
          <button className="text-gray-500 hover:text-black" onClick={() => setOpen((o) => !o)}>
            {open ? "Hide transcript" : "Show transcript"}
          </button>
        )}
        {hasAi && (
          <button className="text-brand hover:underline" disabled={pending} onClick={applyToCompany}>
            Copy to company summary
          </button>
        )}
      </div>
      {open && (
        <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap text-xs bg-gray-50 rounded-md p-2 font-sans">
          {note.raw_transcript}
        </pre>
      )}
      <ErrorText error={error} />
    </li>
  );
}
