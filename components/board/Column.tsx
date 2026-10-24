"use client";

import { useDroppable } from "@dnd-kit/core";
import type { BoardCard } from "@/lib/board";
import type { Profile } from "@/types";
import DealCard from "./DealCard";

export default function Column({
  id,
  label,
  hint,
  quiet = false,
  cards,
  ownerOf,
  today,
}: {
  id: string;
  label: string;
  hint?: string;
  /** Passed / Watchlist: muted so the live stages stand out */
  quiet?: boolean;
  cards: BoardCard[];
  ownerOf: (id: string | null) => Profile | undefined;
  today: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  // Flagged cards first, then soonest next action (most recently passed, in the Passed column).
  const sorted = [...cards].sort((a, b) => {
    const fa = a.revisitDue || a.overdueTasks > 0 ? 0 : 1;
    const fb = b.revisitDue || b.overdueTasks > 0 ? 0 : 1;
    if (fa !== fb) return fa - fb;
    if (id === "passed") return (b.deal.closed_at ?? "").localeCompare(a.deal.closed_at ?? "");
    return (a.deal.next_action_date ?? "9999").localeCompare(b.deal.next_action_date ?? "9999");
  });

  return (
    <section
      ref={setNodeRef}
      className={`${quiet ? "w-64" : "w-72"} flex-shrink-0 flex flex-col rounded-xl border transition-colors ${
        isOver
          ? "border-brand bg-brand-light/40"
          : quiet
          ? "border-dashed border-gray-200 bg-white"
          : "border-gray-200 bg-gray-50"
      }`}
    >
      <header className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200">
        <h2 className={`text-sm font-semibold ${quiet ? "text-gray-400" : ""}`}>
          {label}
          {hint && <span className="ml-1.5 text-[10px] font-normal text-gray-400">{hint}</span>}
        </h2>
        <span className="text-xs text-gray-400">{cards.length}</span>
      </header>
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-24">
        {sorted.map((c) => (
          <DealCard key={c.deal.id} card={c} owner={ownerOf(c.deal.owner)} today={today} quiet={quiet} />
        ))}
        {cards.length === 0 && <p className="text-xs text-gray-400 text-center py-6">No deals</p>}
      </div>
    </section>
  );
}
