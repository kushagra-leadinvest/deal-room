"use client";

import { useState } from "react";
import Section from "@/components/ui/Section";
import ErrorText from "@/components/ui/ErrorText";
import { useMutation } from "@/lib/useMutation";
import { PERSON_ROLES, labelOf } from "@/lib/constants";
import type { CompanyPerson, PersonRole } from "@/types";

export default function PeopleSection({ companyId, links }: { companyId: string; links: CompanyPerson[] }) {
  const { run, pending, error } = useMutation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<PersonRole>("founder");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const ok = await run(async (db) => {
      const { data, error } = await db
        .from("people")
        .insert({ name: name.trim(), email: email.trim() || null })
        .select("id")
        .single();
      if (error) return { error };
      return db.from("company_people").insert({ company_id: companyId, person_id: data.id, role });
    });
    if (ok) {
      setName("");
      setEmail("");
    }
  }

  const order: PersonRole[] = ["founder", "introducer", "contact"];
  const sorted = [...links].sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role));

  return (
    <Section title="People">
      <ul className="space-y-1.5 mb-3">
        {sorted.map((l) => (
          <li key={l.id} className="flex items-center gap-2 text-sm">
            <span className="font-medium">{l.person?.name}</span>
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{labelOf(PERSON_ROLES, l.role)}</span>
            {l.person?.email && (
              <a href={`mailto:${l.person.email}`} className="text-xs text-gray-500 hover:text-brand truncate">
                {l.person.email}
              </a>
            )}
            <button
              className="ml-auto text-[11px] text-gray-400 hover:text-red-700"
              disabled={pending}
              onClick={() => run((db) => db.from("company_people").delete().eq("id", l.id))}
            >
              Remove
            </button>
          </li>
        ))}
        {links.length === 0 && <li className="text-sm text-gray-400">No people linked yet.</li>}
      </ul>
      <form onSubmit={add} className="space-y-2">
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="input" />
          <select value={role} onChange={(e) => setRole(e.target.value as PersonRole)} className="input w-32">
            {PERSON_ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email (optional)" className="input" />
        <button type="submit" className="btn-secondary w-full" disabled={pending || !name.trim()}>Add person</button>
      </form>
      <ErrorText error={error} />
    </Section>
  );
}
