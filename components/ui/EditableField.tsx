"use client";

import { useEffect, useRef, useState } from "react";

type Kind = "text" | "textarea" | "number" | "date" | "select" | "list" | "url";

/**
 * Click-to-edit field. Saves on blur or Enter (Cmd/Ctrl+Enter for textarea),
 * Escape cancels. `onSave` receives the parsed value (null when emptied).
 */
export default function EditableField({
  label,
  value,
  kind = "text",
  options,
  placeholder = "Add",
  display,
  onSave,
  className = "",
}: {
  label?: string;
  value: string | number | string[] | null | undefined;
  kind?: Kind;
  options?: readonly { value: string; label: string }[];
  placeholder?: string;
  display?: React.ReactNode;
  onSave: (value: string | number | string[] | null) => Promise<boolean | void>;
  className?: string;
}) {
  const toText = (v: typeof value) =>
    Array.isArray(v) ? v.join(", ") : v === null || v === undefined ? "" : String(v);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(toText(value));
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement & HTMLSelectElement>(null);

  useEffect(() => {
    if (!editing) setDraft(toText(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editing]);

  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  function parse(text: string) {
    const t = text.trim();
    if (kind === "list") return t ? t.split(",").map((s) => s.trim()).filter(Boolean) : [];
    if (!t) return null;
    if (kind === "number") {
      const n = Number(t.replace(/[,₹\s]/g, ""));
      return Number.isFinite(n) ? n : null;
    }
    return t;
  }

  async function commit() {
    if (saving) return;
    if (draft === toText(value)) {
      setEditing(false);
      return;
    }
    setSaving(true);
    const ok = await onSave(parse(draft));
    setSaving(false);
    if (ok !== false) setEditing(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setDraft(toText(value));
      setEditing(false);
    } else if (e.key === "Enter" && (kind !== "textarea" || e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      commit();
    }
  }

  const empty = toText(value) === "";
  const shown =
    display ??
    (kind === "select" ? options?.find((o) => o.value === value)?.label : toText(value));

  return (
    <div className={className}>
      {label && <span className="label">{label}</span>}
      {editing ? (
        kind === "textarea" ? (
          <textarea
            ref={ref}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={onKeyDown}
            rows={4}
            disabled={saving}
            className="input"
          />
        ) : kind === "select" ? (
          <select
            ref={ref}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={onKeyDown}
            disabled={saving}
            className="input"
          >
            {options?.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            ref={ref}
            type={kind === "date" ? "date" : kind === "url" ? "url" : "text"}
            inputMode={kind === "number" ? "decimal" : undefined}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={onKeyDown}
            disabled={saving}
            placeholder={kind === "list" ? "Comma separated" : undefined}
            className="input"
          />
        )
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={`w-full text-left text-sm rounded-md px-1 -mx-1 py-0.5 hover:bg-gray-50 ${
            kind === "textarea" ? "whitespace-pre-wrap" : ""
          } ${empty ? "text-gray-400 italic" : "text-black"}`}
        >
          {empty ? placeholder : shown}
        </button>
      )}
    </div>
  );
}
