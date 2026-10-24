"use client";

import { useState } from "react";
import ErrorText from "@/components/ui/ErrorText";
import { useMutation } from "@/lib/useMutation";
import type { Deal, Profile } from "@/types";

export default function NewTaskForm({
  profiles,
  userId,
  companyId,
  deals = [],
  companies,
}: {
  profiles: Profile[];
  userId: string | null;
  companyId?: string;
  deals?: Deal[];
  companies?: { id: string; name: string }[];
}) {
  const { run, pending, error } = useMutation();
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState(userId ?? "");
  const [due, setDue] = useState("");
  const [company, setCompany] = useState(companyId ?? "");
  const [dealId, setDealId] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const ok = await run((db) =>
      db.from("tasks").insert({
        title: title.trim(),
        assignee: assignee || null,
        due_date: due || null,
        company_id: company || null,
        deal_id: dealId || null,
      }),
    );
    if (ok) {
      setTitle("");
      setDue("");
      setDealId("");
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 pt-3 border-t border-gray-100 space-y-2">
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New task" className="input" />
      <div className="grid grid-cols-2 gap-2">
        <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className="input" aria-label="Assignee">
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.id === userId ? "Me" : p.full_name}
            </option>
          ))}
        </select>
        <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="input" aria-label="Due date" />
      </div>
      {companies && (
        <select value={company} onChange={(e) => setCompany(e.target.value)} className="input" aria-label="Company">
          <option value="">No company</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      )}
      {deals.length > 1 && (
        <select value={dealId} onChange={(e) => setDealId(e.target.value)} className="input" aria-label="Round">
          <option value="">Any round</option>
          {deals.map((d) => (
            <option key={d.id} value={d.id}>{d.stage || "Round"}</option>
          ))}
        </select>
      )}
      <button type="submit" className="btn-secondary w-full" disabled={pending || !title.trim()}>
        Add task
      </button>
      <ErrorText error={error} />
    </form>
  );
}
