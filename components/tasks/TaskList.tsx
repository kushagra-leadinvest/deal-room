"use client";

import Link from "next/link";
import ErrorText from "@/components/ui/ErrorText";
import { useMutation } from "@/lib/useMutation";
import { formatDate } from "@/lib/format";
import type { Profile, Task } from "@/types";

export type TaskRow = Task & { company?: { id: string; name: string } | null };

export default function TaskList({
  tasks,
  profiles,
  userId,
  today,
  showCompany = true,
  emptyText = "No tasks.",
}: {
  tasks: TaskRow[];
  profiles: Profile[];
  userId: string | null;
  today: string;
  showCompany?: boolean;
  emptyText?: string;
}) {
  const { run, pending, error } = useMutation();
  const name = (id: string | null) =>
    id === userId ? "me" : profiles.find((p) => p.id === id)?.full_name ?? "Unknown";

  const open = tasks.filter((t) => t.status === "open");
  const done = tasks.filter((t) => t.status === "done");

  const row = (t: TaskRow) => {
    const overdue = t.status === "open" && !!t.due_date && t.due_date < today;
    return (
      <li key={t.id} className="flex items-start gap-2 py-1.5">
        <input
          type="checkbox"
          checked={t.status === "done"}
          disabled={pending}
          onChange={(e) =>
            run((db) => db.from("tasks").update({ status: e.target.checked ? "done" : "open" }).eq("id", t.id))
          }
          className="mt-1 accent-brand"
          aria-label={`Mark "${t.title}" ${t.status === "done" ? "open" : "done"}`}
        />
        <div className="min-w-0 flex-1">
          <p className={`text-sm ${t.status === "done" ? "line-through text-gray-400" : ""}`}>{t.title}</p>
          <p className="text-[11px] text-gray-500">
            {t.due_date && (
              <span className={overdue ? "text-red-700 font-semibold" : ""}>
                {overdue ? "Overdue · " : "Due "}
                {formatDate(t.due_date)} ·{" "}
              </span>
            )}
            For {name(t.assignee)} · Added by {name(t.created_by)}
            {showCompany && t.company && (
              <>
                {" · "}
                <Link href={`/company/${t.company.id}`} className="text-brand hover:underline">
                  {t.company.name}
                </Link>
              </>
            )}
          </p>
        </div>
      </li>
    );
  };

  return (
    <div>
      <ul className="divide-y divide-gray-100">{open.map(row)}</ul>
      {open.length === 0 && <p className="text-sm text-gray-400 py-1">{emptyText}</p>}
      {done.length > 0 && (
        <details className="mt-2">
          <summary className="text-xs text-gray-500 cursor-pointer">{done.length} done</summary>
          <ul className="divide-y divide-gray-100">{done.map(row)}</ul>
        </details>
      )}
      <ErrorText error={error} />
    </div>
  );
}
