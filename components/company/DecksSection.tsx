"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AddedBy from "@/components/ui/AddedBy";
import Section from "@/components/ui/Section";
import ErrorText from "@/components/ui/ErrorText";
import { useMutation } from "@/lib/useMutation";
import type { Deck, Profile } from "@/types";

export default function DecksSection({
  companyId,
  decks,
  profiles,
  driveEnabled,
}: {
  companyId: string;
  decks: Deck[];
  profiles: Profile[];
  driveEnabled: boolean;
}) {
  const router = useRouter();
  const { run, pending, error, setError } = useMutation();
  const [uploading, setUploading] = useState(false);
  const [uploadFailed, setUploadFailed] = useState(false);
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setUploading(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    form.append("companyId", companyId);
    try {
      const res = await fetch("/api/drive/upload", { method: "POST", body: form });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? `Upload failed (${res.status})`);
      router.refresh();
    } catch (e) {
      // Never block: fall back to the paste-link field.
      setUploadFailed(true);
      setName(file.name);
      setError(`${e instanceof Error ? e.message : "Upload failed"}. Paste a link instead.`);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function addLink(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    const ok = await run((db) =>
      db.from("decks").insert({ company_id: companyId, url: url.trim(), file_name: name.trim() || null, source: "link" }),
    );
    if (ok) {
      setUrl("");
      setName("");
    }
  }

  const showPaste = !driveEnabled || uploadFailed;

  return (
    <Section title="Decks">
      <ul className="space-y-2 mb-3">
        {decks.map((d) => (
          <li key={d.id} className="text-sm">
            <a href={d.url} target="_blank" rel="noreferrer" className="text-brand hover:underline break-all">
              {d.file_name || d.url}
            </a>
            <div className="flex gap-2 items-center">
              <span className="text-[11px] text-gray-400">{d.source === "drive" ? "Drive" : "Link"}</span>
              <AddedBy by={d.created_by} at={d.created_at} profiles={profiles} />
            </div>
          </li>
        ))}
        {decks.length === 0 && <li className="text-sm text-gray-400">No decks yet.</li>}
      </ul>

      {driveEnabled && (
        <div className="mb-2">
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.ppt,.pptx,.key,application/pdf"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
          />
          <button className="btn-primary w-full" disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? "Uploading to Drive…" : "Upload deck to Drive"}
          </button>
        </div>
      )}

      {showPaste ? (
        <form onSubmit={addLink} className="space-y-2">
          {!driveEnabled && <p className="text-xs text-gray-500">Drive isn&apos;t connected. Paste a link to the deck.</p>}
          <input value={url} onChange={(e) => setUrl(e.target.value)} type="url" placeholder="https://…" className="input" />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (optional)" className="input" />
          <button type="submit" className="btn-secondary w-full" disabled={pending || !url.trim()}>
            Save link
          </button>
        </form>
      ) : (
        <button className="text-xs text-gray-500 hover:text-black" onClick={() => setUploadFailed(true)}>
          Or paste a link
        </button>
      )}
      <ErrorText error={error} />
    </Section>
  );
}
