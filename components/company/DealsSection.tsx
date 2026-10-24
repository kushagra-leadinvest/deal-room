"use client";

import { useState } from "react";
import Link from "next/link";
import EditableField from "@/components/ui/EditableField";
import AddedBy from "@/components/ui/AddedBy";
import Section from "@/components/ui/Section";
import ErrorText from "@/components/ui/ErrorText";
import { useMutation } from "@/lib/useMutation";
import {
  PIPELINE_STAGES, DEAL_STATUSES, END_STATES, REVISIT_BUCKETS, labelOf,
} from "@/lib/constants";
import { daysFromToday, formatDate, short } from "@/lib/format";
import { isRevisitDue } from "@/lib/board";
import type { Deal, EndState, Profile } from "@/types";

export default function DealsSection({
  companyId,
  deals,
  profiles,
  today,
}: {
  companyId: string;
  deals: Deal[];
  profiles: Profile[];
  today: string;
}) {
  const { run, pending, error } = useMutation();

  return (
    <Section
      title="Deals"
      action={
        <button
          className="btn-secondary py-1 text-xs"
          disabled={pending}
          onClick={() => run((db) => db.from("deals").insert({ company_id: companyId }))}
        >
          + New round
        </button>
      }
    >
      {deals.length === 0 && <p className="text-sm text-gray-400">No deals yet.</p>}
      <div className="space-y-3">
        {deals.map((d) => (
          <DealEditor key={d.id} deal={d} profiles={profiles} today={today} />
        ))}
      </div>
      <ErrorText error={error} />
    </Section>
  );
}

function DealEditor({ deal, profiles, today }: { deal: Deal; profiles: Profile[]; today: string }) {
  const { run, pending, error } = useMutation();
  const [closing, setClosing] = useState<EndState | null>(null);
  const [passReason, setPassReason] = useState("");
  const [closeBucket, setCloseBucket] = useState("none");

  const update = (patch: Partial<Deal>) => run((db) => db.from("deals").update(patch).eq("id", deal.id));
  const save = (field: keyof Deal) => (value: unknown) => update({ [field]: value } as Partial<Deal>);
  const ownerOptions = profiles.map((p) => ({ value: p.id, label: p.full_name }));
  const revisitDue = isRevisitDue(deal, today);

  // Passed/lost asks for a reason and optional revisit first.
  function onEndState(v: unknown) {
    const next = v as EndState;
    if (next === "passed" || next === "lost") {
      setClosing(next);
      setPassReason(deal.pass_reason ?? "");
      return Promise.resolve(true);
    }
    return update({ end_state: next });
  }

  async function confirmClose() {
    if (!closing) return;
    const ok = await update({
      end_state: closing,
      pass_reason: passReason.trim() || null,
      revisit_bucket: closeBucket as Deal["revisit_bucket"],
    });
    if (ok) setClosing(null);
  }

  async function convertToTask() {
    await run(async (db) => {
      const { data, error } = await db
        .from("tasks")
        .insert({
          title: deal.next_action,
          due_date: deal.next_action_date,
          assignee: deal.owner,
          company_id: deal.company_id,
          deal_id: deal.id,
          source: "next_action",
        })
        .select("id")
        .single();
      if (error) return { error };
      return db.from("deals").update({ next_action_task_id: data.id }).eq("id", deal.id);
    });
  }

  // "Revisit due" resolution: back to pipeline, or park again.
  const reactivate = () => update({ end_state: "none", revisit_bucket: "none", status: "active" });

  return (
    <div className={`rounded-lg border p-3 ${revisitDue ? "border-red-300 bg-red-50/40" : "border-gray-200"}`}>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="font-semibold text-sm">{deal.stage || "Round"}</span>
        {deal.round_size ? <span className="text-sm text-gray-500">{short(deal.round_size)}</span> : null}
        <span className="px-1.5 py-0.5 rounded bg-brand-light text-brand text-[11px] font-medium">
          {labelOf(PIPELINE_STAGES, deal.pipeline_stage)}
        </span>
        {deal.end_state !== "none" && (
          <span className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-700 text-[11px]">
            {labelOf(END_STATES, deal.end_state)}
            {(deal.end_state === "passed" || deal.end_state === "lost") &&
              ` at ${labelOf(PIPELINE_STAGES, deal.rejected_at_stage ?? deal.pipeline_stage)}`}
            {(deal.end_state === "passed" || deal.end_state === "lost") && deal.closed_at && ` · ${formatDate(deal.closed_at)}`}
          </span>
        )}
        <AddedBy by={deal.created_by} at={deal.created_at} profiles={profiles} className="ml-auto" />
      </div>

      {revisitDue && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[11px] font-semibold">Revisit due</span>
          <span className="text-gray-700">since {formatDate(deal.revisit_date)}.</span>
          <button className="btn-primary py-1 text-xs" disabled={pending} onClick={reactivate}>
            Back to pipeline
          </button>
          <button className="btn-secondary py-1 text-xs" disabled={pending} onClick={() => update({ revisit_bucket: "45d", revisit_date: daysFromToday(45) })}>
            Park 45 days
          </button>
          <button className="btn-secondary py-1 text-xs" disabled={pending} onClick={() => update({ revisit_bucket: "90d", revisit_date: daysFromToday(90) })}>
            Park 90 days
          </button>
          <button
            className="btn-secondary py-1 text-xs"
            disabled={pending}
            onClick={() => update({ revisit_bucket: "none", end_state: deal.end_state === "none" ? "passed" : deal.end_state })}
          >
            Close
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3">
        <EditableField label="Round" value={deal.stage} placeholder="e.g. Series A" onSave={save("stage")} />
        <EditableField label="Round size (₹)" value={deal.round_size} kind="number" display={short(deal.round_size)} onSave={save("round_size")} />
        <EditableField label="Pipeline stage" value={deal.pipeline_stage} kind="select" options={PIPELINE_STAGES} onSave={save("pipeline_stage")} />
        <EditableField label="Status" value={deal.status} kind="select" options={DEAL_STATUSES} onSave={save("status")} />
        <EditableField label="Outcome" value={deal.end_state} kind="select" options={END_STATES} onSave={onEndState} />
        <EditableField label="Revisit" value={deal.revisit_bucket} kind="select" options={REVISIT_BUCKETS} onSave={save("revisit_bucket")} />
        <EditableField label="Revisit date" value={deal.revisit_date} kind="date" display={formatDate(deal.revisit_date)} onSave={save("revisit_date")} />
        <EditableField label="Owner" value={deal.owner ?? ""} kind="select" options={ownerOptions} onSave={save("owner")} />
        {(deal.end_state === "passed" || deal.end_state === "lost") && (
          <EditableField label={`Pass reason · rejected at ${labelOf(PIPELINE_STAGES, deal.rejected_at_stage ?? deal.pipeline_stage)}`} value={deal.pass_reason} kind="textarea" onSave={save("pass_reason")} className="col-span-2 sm:col-span-4" />
        )}
      </div>

      {closing && (
        <div className="mt-3 rounded-lg bg-gray-50 border border-gray-200 p-3 space-y-2">
          <p className="text-sm font-medium">Mark as {labelOf(END_STATES, closing).toLowerCase()}</p>
          <textarea
            value={passReason}
            onChange={(e) => setPassReason(e.target.value)}
            placeholder="Why? (pass reason)"
            rows={2}
            className="input"
          />
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-gray-500">Revisit</label>
            <select value={closeBucket} onChange={(e) => setCloseBucket(e.target.value)} className="input w-40">
              {REVISIT_BUCKETS.map((b) => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </select>
            <button className="btn-primary py-1.5 text-xs" disabled={pending} onClick={confirmClose}>Save</button>
            <button className="btn-secondary py-1.5 text-xs" onClick={() => setClosing(null)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-[1fr_10rem_auto] gap-3 items-end">
        <EditableField label="Next action" value={deal.next_action} onSave={save("next_action")} />
        <EditableField
          label="Due"
          value={deal.next_action_date}
          kind="date"
          display={
            <span className={deal.next_action_date && deal.next_action_date < today ? "text-red-700 font-medium" : ""}>
              {formatDate(deal.next_action_date)}
            </span>
          }
          onSave={save("next_action_date")}
        />
        {deal.next_action_task_id ? (
          <Link href="/tasks" className="btn-secondary py-1.5 text-xs">View task</Link>
        ) : (
          <button
            className="btn-secondary py-1.5 text-xs"
            disabled={pending || !deal.next_action}
            title={deal.next_action ? "Create a task from this next action" : "Add a next action first"}
            onClick={convertToTask}
          >
            Make task
          </button>
        )}
      </div>
      <ErrorText error={error} />
    </div>
  );
}
