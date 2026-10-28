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
  suggestions,
  onSave,
  className = "",
}: {
  label?: string;
  value: string | number | string[] | null | undefined;
  kind?: Kind;
  options?: readonly { value: string; label: string }[];
  placeholder?: string;
  display?: React.ReactNode;
  /** Text fields only: a dropdown of common values, still free to type anything */
  suggestions?: readonly string[];
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

  async function commit(text = draft) {
    if (saving) return;
    if (text === toText(value)) {
      setEditing(false);
      return;
    }
    setDraft(text);
    setSaving(true);
    const ok = await onSave(parse(text));
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

  // Show every suggestion until the user starts typing, then filter by what they typed
  const q = draft.trim().toLowerCase();
  const matches =
    suggestions && kind === "text"
      ? draft === toText(value) || !q
        ? suggestions
        : suggestions.filter((s) => s.toLowerCase().includes(q))
      : [];

  const empty = toText(value) === "";
  const shown =
    display ??
    (kind === "select" ? options?.find((o) => o.value === value)?.label : toText(value));

  return (
    <div className={`min-w-0 ${className}`}>
      {label && <span className="label">{label}</span>}
      {editing ? (
        kind === "textarea" ? (
          <textarea
            ref={ref}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => commit()}
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
            onBlur={() => commit()}
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
          <div className="relative">
          <input
            ref={ref}
            type={kind === "date" ? "date" : kind === "url" ? "url" : "text"}
            inputMode={kind === "number" ? "decimal" : undefined}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => commit()}
            onKeyDown={onKeyDown}
            disabled={saving}
            placeholder={kind === "list" ? "Comma separated" : matches.length ? "Pick or type" : undefined}
            className="input"
          />
          {matches.length > 0 && !saving && (
            <ul className="absolute z-20 left-0 right-0 mt-1 max-h-60 overflow-auto rounded-md border border-gray-200 bg-white shadow-lg py-1 text-sm">
              {matches.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    // mousedown, not click: keeps the input from blurring and saving the half-typed text first
                    onMouseDown={(e) => {
                      e.preventDefault();
                      commit(s);
                    }}
                    className={`w-full text-left px-3 py-1.5 hover:bg-brand-light hover:text-brand ${s === draft ? "font-medium" : ""}`}
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          )}
          </div>
        )
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={`w-full text-left text-sm rounded-md px-1 -mx-1 py-0.5 hover:bg-gray-50 [overflow-wrap:anywhere] ${
            kind === "textarea" ? "whitespace-pre-wrap" : ""
          } ${empty ? "text-gray-400 italic" : "text-black"}`}
        >
          {empty ? placeholder : shown}
        </button>
      )}
    </div>
  );
}
