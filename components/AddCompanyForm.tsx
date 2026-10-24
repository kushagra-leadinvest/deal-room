"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { normalizeDomain } from "@/lib/domain";
import { COMPANY_STAGES } from "@/lib/constants";

export default function AddCompanyForm({ sectorPaths }: { sectorPaths: string[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [oneLiner, setOneLiner] = useState("");
  const [stage, setStage] = useState("");
  const [sector, setSector] = useState("");
  const [introducer, setIntroducer] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existing, setExisting] = useState<{ id: string; name: string } | null>(null);

  async function checkDuplicate() {
    const domain = normalizeDomain(website);
    if (!domain) return setExisting(null);
    const { data } = await createClient().from("companies").select("id, name").eq("domain", domain).maybeSingle();
    setExisting(data ?? null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !normalizeDomain(website)) return;
    setSaving(true);
    setError(null);
    const db = createClient();

    const { data: company, error } = await db
      .from("companies")
      .insert({
        name: name.trim(),
        website: website.trim(),
        one_liner: oneLiner.trim() || null,
        stage: stage || null,
      })
      .select("id")
      .single();

    if (error) {
      setSaving(false);
      if (error.code === "23505") {
        await checkDuplicate();
        setError("A company with this website already exists.");
      } else {
        setError(error.message);
      }
      return;
    }

    // Extras are best effort: the company exists either way.
    const extras: PromiseLike<{ error: { message: string } | null }>[] = [
      db.from("deals").insert({ company_id: company.id }),
    ];
    if (sector.trim()) extras.push(db.rpc("add_sector_path", { p_company_id: company.id, p_path: sector }));
    if (introducer.trim()) {
      extras.push(
        (async () => {
          const { data, error } = await db.from("people").insert({ name: introducer.trim() }).select("id").single();
          if (error) return { error };
          return db.from("company_people").insert({ company_id: company.id, person_id: data.id, role: "introducer" });
        })(),
      );
    }
    await Promise.all(extras);
    router.push(`/company/${company.id}`);
  }

  return (
    <form onSubmit={submit} className="card p-4 space-y-3">
      <div>
        <label className="label" htmlFor="name">Name *</label>
        <input id="name" value={name} onChange={(e) => setName(e.target.value)} required className="input" autoFocus />
      </div>
      <div>
        <label className="label" htmlFor="website">Website *</label>
        <input
          id="website"
          value={website}
          onChange={(e) => {
            setWebsite(e.target.value);
            setExisting(null);
          }}
          onBlur={checkDuplicate}
          placeholder="acme.com"
          required
          className="input"
        />
        {existing && (
          <p className="text-xs text-red-700 mt-1">
            Already in Deal Room:{" "}
            <Link href={`/company/${existing.id}`} className="underline font-medium">
              {existing.name}
            </Link>
          </p>
        )}
      </div>
      <div>
        <label className="label" htmlFor="oneliner">One-liner</label>
        <input id="oneliner" value={oneLiner} onChange={(e) => setOneLiner(e.target.value)} className="input" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="stage">Stage</label>
          <select id="stage" value={stage} onChange={(e) => setStage(e.target.value)} className="input">
            <option value="">—</option>
            {COMPANY_STAGES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="introducer">Introduced by</label>
          <input id="introducer" value={introducer} onChange={(e) => setIntroducer(e.target.value)} className="input" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="sector">Sector</label>
        <input
          id="sector"
          value={sector}
          onChange={(e) => setSector(e.target.value)}
          list="add-sector-paths"
          placeholder="Energy > Battery > LFP"
          className="input"
        />
        <datalist id="add-sector-paths">
          {sectorPaths.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      </div>
      {error && <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      <button type="submit" className="btn-primary w-full py-2.5" disabled={saving || !name.trim() || !website.trim() || !!existing}>
        {saving ? "Adding…" : "Add company"}
      </button>
    </form>
  );
}
