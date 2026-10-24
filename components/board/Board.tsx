"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
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
import { PIPELINE_STAGES, DEAL_STATUSES, REVISIT_BUCKETS, labelOf } from "@/lib/constants";
import { columnOf, tagIndex, PASSED_COLUMN_DAYS, type BoardCard, type BoardColumn } from "@/lib/board";
import type { Deal, PipelineStage, Profile, SectorTag } from "@/types";
import Column from "./Column";
import DealTable from "./DealTable";

const VIEW_KEY = "dealroom.boardView";
const WATCHLIST_KEY = "dealroom.showWatchlist";

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
  // Pick up fresh server data after router.refresh().
  useEffect(() => setCards(initial), [initial]);
  const [sector, setSector] = useState("");
  const [owner, setOwner] = useState("");
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [showWatchlist, setShowWatchlist] = useState(true);
  const [passing, setPassing] = useState<BoardCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"board" | "table">("board");

  // Remember the last view per browser.
  useEffect(() => {
    try {
      if (localStorage.getItem(VIEW_KEY) === "table") setView("table");
      if (localStorage.getItem(WATCHLIST_KEY) === "false") setShowWatchlist(false);
    } catch {}
  }, []);
  function toggleWatchlist(v: boolean) {
    setShowWatchlist(v);
    try {
      localStorage.setItem(WATCHLIST_KEY, String(v));
    } catch {}
  }
  function chooseView(v: "board" | "table") {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {}
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const index = useMemo(() => tagIndex(tags), [tags]);
  const sectorSet = useMemo(() => (sector ? index.descendants(sector) : null), [sector, index]);

  const visible = cards.filter((c) => {
    if (!showWatchlist && c.deal.end_state === "watchlist") return false;
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

  function handleDragEnd(e: DragEndEvent) {
    const target = e.over?.id as BoardColumn | undefined;
    if (!target) return;
    const card = cards.find((c) => c.deal.id === String(e.active.id));
    if (!card || columnOf(card.deal) === target && !card.revisitDue) return;
    if (target === "passed") {
      setPassing(card); // ask for a reason first
    } else if (target === "watchlist") {
      updateDeal(card, { end_state: "watchlist" });
    } else {
      moveDeal(card.deal.id, target);
    }
  }

  function moveDeal(dealId: string, stage: PipelineStage) {
    const card = cards.find((c) => c.deal.id === dealId);
    if (!card) return;
    // Moving a passed, watchlisted or revisit-due deal into a stage puts it back in the pipeline.
    const reactivate = card.revisitDue || card.deal.end_state !== "none";
    if (card.deal.pipeline_stage === stage && !reactivate) return;
    updateDeal(
      card,
      reactivate
        ? { pipeline_stage: stage, end_state: "none", revisit_bucket: "none", revisit_date: null }
        : { pipeline_stage: stage },
    );
  }

  async function updateDeal(card: BoardCard, patch: Partial<Deal>) {
    const before = cards;
    // Mirror the DB trigger so the card shows where it was rejected straight away.
    const optimistic: Partial<Deal> =
      patch.end_state === "passed" || patch.end_state === "lost"
        ? { ...patch, rejected_at_stage: card.deal.pipeline_stage, closed_at: new Date().toISOString() }
        : patch;
    setCards((cs) =>
      cs.map((c) =>
        c.deal.id === card.deal.id
          ? { ...c, deal: { ...c.deal, ...optimistic }, revisitDue: patch.end_state || patch.revisit_bucket ? false : c.revisitDue }
          : c,
      ),
    );
    setError(null);
    const { error } = await createClient().from("deals").update(patch).eq("id", card.deal.id);
    if (error) {
      setCards(before);
      setError(`Couldn't update ${card.company.name}: ${error.message}`);
    } else {
      router.refresh();
    }
  }

  const ownerName = (id: string | null) => profiles.find((p) => p.id === id);

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 px-4 md:px-6 py-3 border-b border-gray-200">
        <h1 className="text-lg font-semibold mr-1">Pipeline</h1>
        <div className="inline-flex rounded-lg border border-gray-300 p-0.5 mr-2" role="tablist" aria-label="View">
          {(["board", "table"] as const).map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              onClick={() => chooseView(v)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
                view === v ? "bg-brand text-white" : "text-gray-600 hover:text-black"
              }`}
            >
              {v === "board" ? "Board" : "Table"}
            </button>
          ))}
        </div>
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
            onChange={(e) => toggleWatchlist(e.target.checked)}
            className="accent-brand"
          />
          Show watchlist
        </label>
        <Link href="/add" className="btn-primary ml-auto">
          + Add company
        </Link>
      </div>

      {error && <p className="mx-4 md:mx-6 mt-3 text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      {view === "table" ? (
        <DealTable cards={visible} ownerOf={ownerName} today={today} onStageChange={moveDeal} />
      ) : (
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-3 p-4 md:px-6 min-w-max h-full">
            {PIPELINE_STAGES.map((s) => (
              <Fragment key={s.value}>
                <Column
                  id={s.value}
                  label={s.label}
                  cards={visible.filter((c) => columnOf(c.deal) === s.value)}
                  ownerOf={ownerName}
                  today={today}
                />
                {/* Passed sits right after Term sheet, before Invested */}
                {s.value === "term_sheet" && (
                  <Column
                    id="passed"
                    label="Passed"
                    hint={`Last ${PASSED_COLUMN_DAYS} days`}
                    quiet
                    cards={visible.filter((c) => columnOf(c.deal) === "passed")}
                    ownerOf={ownerName}
                    today={today}
                  />
                )}
              </Fragment>
            ))}
            {showWatchlist && (
              <Column
                id="watchlist"
                label="Watchlist"
                quiet
                cards={visible.filter((c) => columnOf(c.deal) === "watchlist")}
                ownerOf={ownerName}
                today={today}
              />
            )}
          </div>
        </div>
      </DndContext>
      )}

      {passing && (
        <PassDialog
          card={passing}
          onCancel={() => setPassing(null)}
          onConfirm={(reason, bucket) => {
            updateDeal(passing, { end_state: "passed", pass_reason: reason || null, revisit_bucket: bucket });
            setPassing(null);
          }}
        />
      )}
    </div>
  );
}

function PassDialog({
  card,
  onCancel,
  onConfirm,
}: {
  card: BoardCard;
  onCancel: () => void;
  onConfirm: (reason: string, bucket: Deal["revisit_bucket"]) => void;
}) {
  const [reason, setReason] = useState(card.deal.pass_reason ?? "");
  const [bucket, setBucket] = useState<Deal["revisit_bucket"]>("none");

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={onCancel}>
      <div
        role="dialog"
        aria-labelledby="pass-title"
        className="card w-full max-w-md p-5 space-y-3 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="pass-title" className="font-semibold">Pass on {card.company.name}</h2>
        <p className="text-sm text-gray-500">
          Rejected at <span className="font-medium text-black">{labelOf(PIPELINE_STAGES, card.deal.pipeline_stage)}</span>.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why are we passing?"
          rows={3}
          autoFocus
          className="input"
        />
        <div className="flex items-center gap-2">
          <label htmlFor="pass-bucket" className="text-xs text-gray-500">Revisit</label>
          <select
            id="pass-bucket"
            value={bucket}
            onChange={(e) => setBucket(e.target.value as Deal["revisit_bucket"])}
            className="input w-40"
          >
            {REVISIT_BUCKETS.map((b) => (
              <option key={b.value} value={b.value}>{b.label}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn-primary" onClick={() => onConfirm(reason.trim(), bucket)}>Mark as passed</button>
        </div>
      </div>
    </div>
  );
}
