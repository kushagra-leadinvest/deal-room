"use client";

import { useDroppable } from "@dnd-kit/core";
import type { BoardCard } from "@/lib/board";
import type { Profile } from "@/types";
import DealCard from "./DealCard";

export default function Column({
  stage,
  label,
  cards,
  ownerOf,
  today,
}: {
  stage: string;
  label: string;
  cards: BoardCard[];
  ownerOf: (id: string | null) => Profile | undefined;
  today: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  // Flagged cards first, then soonest next action.
  const sorted = [...cards].sort((a, b) => {
    const fa = a.revisitDue || a.overdueTasks > 0 ? 0 : 1;
    const fb = b.revisitDue || b.overdueTasks > 0 ? 0 : 1;
    if (fa !== fb) return fa - fb;
    return (a.deal.next_action_date ?? "9999").localeCompare(b.deal.next_action_date ?? "9999");
  });

  return (
    <section
      ref={setNodeRef}
      className={`w-72 flex-shrink-0 flex flex-col rounded-xl border transition-colors ${
        isOver ? "border-brand bg-brand-light/40" : "border-gray-200 bg-gray-50"
      }`}
    >
      <header className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200">
        <h2 className="text-sm font-semibold">{label}</h2>
        <span className="text-xs text-gray-500">{cards.length}</span>
      </header>
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-24">
        {sorted.map((c) => (
          <DealCard key={c.deal.id} card={c} owner={ownerOf(c.deal.owner)} today={today} />
        ))}
        {cards.length === 0 && <p className="text-xs text-gray-400 text-center py-6">No deals</p>}
      </div>
    </section>
  );
}
