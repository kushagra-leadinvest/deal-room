"use client";

import { useMemo, useState } from "react";
import EditableField from "@/components/ui/EditableField";
import AddedBy from "@/components/ui/AddedBy";
import Section from "@/components/ui/Section";
import ErrorText from "@/components/ui/ErrorText";
import { useMutation } from "@/lib/useMutation";
import { leafTagIds, tagIndex } from "@/lib/board";
import type { Company, MarketResearch, Profile, SectorTag } from "@/types";

export default function OurTake({
  company,
  research,
  tagIds,
  tags,
  profiles,
}: {
  company: Company;
  research: MarketResearch[];
  tagIds: string[];
  tags: SectorTag[];
  profiles: Profile[];
}) {
  const { run, pending, error } = useMutation();
  const [path, setPath] = useState("");
  const [rUrl, setRUrl] = useState("");
  const [rTitle, setRTitle] = useState("");
  const [rBody, setRBody] = useState("");

  const index = useMemo(() => tagIndex(tags), [tags]);
  const leaves = leafTagIds(tagIds, tags);
  const allPaths = useMemo(() => index.ordered().map((t) => index.path(t.id)), [index]);

  async function addPath(e: React.FormEvent) {
    e.preventDefault();
    if (!path.trim()) return;
    const ok = await run((db) => db.rpc("add_sector_path", { p_company_id: company.id, p_path: path }));
    if (ok) setPath("");
  }

  // Remove a leaf and any of its ancestors no other remaining tag on this company needs.
  function removePath(leafId: string) {
    const keep = new Set<string>();
    for (const other of leaves) {
      if (other === leafId) continue;
      let t: SectorTag | undefined = index.byId.get(other);
      while (t) {
        keep.add(t.id);
        t = t.parent_id ? index.byId.get(t.parent_id) : undefined;
      }
    }
    const drop: string[] = [];
    let t: SectorTag | undefined = index.byId.get(leafId);
    while (t) {
      if (!keep.has(t.id)) drop.push(t.id);
      t = t.parent_id ? index.byId.get(t.parent_id) : undefined;
    }
    return run((db) => db.from("company_sector_tags").delete().eq("company_id", company.id).in("tag_id", drop));
  }

  async function addResearch(e: React.FormEvent) {
    e.preventDefault();
    if (!rUrl.trim() && !rBody.trim()) return;
    const ok = await run((db) =>
      db.from("market_research").insert({
        company_id: company.id,
        url: rUrl.trim() || null,
        title: rTitle.trim() || null,
        body: rBody.trim() || null,
      }),
    );
    if (ok) {
      setRUrl("");
      setRTitle("");
      setRBody("");
    }
  }

  return (
    <Section title="Our take">
      <h3 className="label">Sector map</h3>
      <ul className="flex flex-wrap gap-1.5 mb-2">
        {leaves.map((id) => (
          <li key={id} className="flex items-center gap-1 px-2 py-0.5 rounded bg-brand-light text-brand text-xs">
            {index.path(id)}
            <button
              aria-label={`Remove ${index.path(id)}`}
              className="text-brand/60 hover:text-brand"
              disabled={pending}
              onClick={() => removePath(id)}
            >
              ×
            </button>
          </li>
        ))}
        {leaves.length === 0 && <li className="text-sm text-gray-400">No sector tags yet.</li>}
      </ul>
      <form onSubmit={addPath} className="flex gap-2 mb-4">
        <input
          value={path}
          onChange={(e) => setPath(e.target.value)}
          list="sector-paths"
          placeholder="Energy > Battery > LFP"
          className="input"
        />
        <datalist id="sector-paths">
          {allPaths.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
        <button type="submit" className="btn-secondary" disabled={pending || !path.trim()}>Add</button>
      </form>

      <EditableField
        label="Thesis notes"
        value={company.thesis_notes}
        kind="textarea"
        placeholder="Why this could be a fit, risks, open questions"
        onSave={(v) => run((db) => db.from("companies").update({ thesis_notes: v }).eq("id", company.id))}
        className="mb-4"
      />

      <h3 className="label">Market research</h3>
      <ul className="space-y-2 mb-2">
        {research.map((r) => (
          <li key={r.id} className="text-sm border-l-2 border-gray-200 pl-2">
            {r.url ? (
              <a href={r.url} target="_blank" rel="noreferrer" className="text-brand hover:underline break-all">
                {r.title || r.url}
              </a>
            ) : (
              r.title && <span className="font-medium">{r.title}</span>
            )}
            {r.body && <p className="text-xs text-gray-700 whitespace-pre-wrap mt-0.5">{r.body}</p>}
            <div className="flex items-center gap-2">
              <AddedBy by={r.created_by} at={r.created_at} profiles={profiles} />
              <button
                className="text-[11px] text-gray-400 hover:text-red-700"
                disabled={pending}
                onClick={() => run((db) => db.from("market_research").delete().eq("id", r.id))}
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
      <form onSubmit={addResearch} className="space-y-2">
        <input value={rUrl} onChange={(e) => setRUrl(e.target.value)} type="url" placeholder="Link (optional)" className="input" />
        <input value={rTitle} onChange={(e) => setRTitle(e.target.value)} placeholder="Title (optional)" className="input" />
        <textarea value={rBody} onChange={(e) => setRBody(e.target.value)} placeholder="Paste text (optional)" rows={2} className="input" />
        <button type="submit" className="btn-secondary w-full" disabled={pending || (!rUrl.trim() && !rBody.trim())}>
          Add research
        </button>
      </form>
      <ErrorText error={error} />
    </Section>
  );
}
