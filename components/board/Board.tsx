"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { createClient } from "@/lib/supabase/client";
import { PIPELINE_STAGES, DEAL_STATUSES } from "@/lib/constants";
import { isOnBoard, tagIndex, type BoardCard } from "@/lib/board";
import type { PipelineStage, Profile, SectorTag } from "@/types";
import Column from "./Column";

export default function Board({
  cards: initial,
  tags,
  profiles,
  userId,
  today,
}: {
  cards: BoardCard[];
  tags: SectorTag[];
  profiles: Profile[];
  userId: string | null;
  today: string;
}) {
  const router = useRouter();
  const [cards, setCards] = useState(initial);
  const [sector, setSector] = useState("");
  const [owner, setOwner] = useState("");
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [showWatchlist, setShowWatchlist] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const index = useMemo(() => tagIndex(tags), [tags]);
  const sectorSet = useMemo(() => (sector ? index.descendants(sector) : null), [sector, index]);

  const visible = cards.filter((c) => {
    if (!showWatchlist && !isOnBoard(c.deal, today)) return false;
    if (sectorSet && !c.tagIds.some((id) => sectorSet.has(id))) return false;
    if (owner && c.deal.owner !== owner) return false;
    if (status && c.deal.status !== status) return false;
    if (query) {
      const q = query.toLowerCase();
      const hay = `${c.company.name} ${c.company.one_liner ?? ""} ${c.company.domain ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  async function handleDragEnd(e: DragEndEvent) {
    const dealId = String(e.active.id);
    const stage = e.over?.id as PipelineStage | undefined;
    if (!stage) return;
    const card = cards.find((c) => c.deal.id === dealId);
    if (!card) return;
    // Dropping a revisit-due or watchlist card into a column puts it back in the pipeline.
    const reactivate = card.revisitDue || card.deal.end_state !== "none";
    if (card.deal.pipeline_stage === stage && !reactivate) return;

    const patch = reactivate
      ? { pipeline_stage: stage, end_state: "none" as const, revisit_bucket: "none" as const, revisit_date: null }
      : { pipeline_stage: stage };

    const before = cards;
    setCards((cs) =>
      cs.map((c) =>
        c.deal.id === dealId ? { ...c, deal: { ...c.deal, ...patch }, revisitDue: reactivate ? false : c.revisitDue } : c,
      ),
    );
    setError(null);
    const { error } = await createClient().from("deals").update(patch).eq("id", dealId);
    if (error) {
      setCards(before);
      setError(`Couldn't move ${card.company.name}: ${error.message}`);
    } else {
      router.refresh();
    }
  }

  const ownerName = (id: string | null) => profiles.find((p) => p.id === id);

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 px-4 md:px-6 py-3 border-b border-gray-200">
        <h1 className="text-lg font-semibold mr-2">Board</h1>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search companies"
          className="input w-44"
        />
        <select value={sector} onChange={(e) => setSector(e.target.value)} className="input w-52">
          <option value="">All sectors</option>
          {index.ordered().map((t) => (
            <option key={t.id} value={t.id}>
              {"  ".repeat(t.level - 1)}
              {t.name}
            </option>
          ))}
        </select>
        <select value={owner} onChange={(e) => setOwner(e.target.value)} className="input w-36">
          <option value="">Any owner</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.id === userId ? `${p.full_name} (me)` : p.full_name}
            </option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input w-32">
          <option value="">Any status</option>
          {DEAL_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-gray-700 ml-1">
          <input
            type="checkbox"
            checked={showWatchlist}
            onChange={(e) => setShowWatchlist(e.target.checked)}
            className="accent-brand"
          />
          Show watchlist
        </label>
        <Link href="/add" className="btn-primary ml-auto">
          + Add company
        </Link>
      </div>

      {error && <p className="mx-4 md:mx-6 mt-3 text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      {/* Columns */}
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-3 p-4 md:px-6 min-w-max h-full">
            {PIPELINE_STAGES.map((s) => (
              <Column
                key={s.value}
                stage={s.value}
                label={s.label}
                cards={visible.filter((c) => c.deal.pipeline_stage === s.value)}
                ownerOf={ownerName}
                today={today}
              />
            ))}
          </div>
        </div>
      </DndContext>
    </div>
  );
}
