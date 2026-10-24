"use client";

import { useState } from "react";
import Link from "next/link";
import { PIPELINE_STAGES, DEAL_STATUSES, END_STATES, labelOf } from "@/lib/constants";
import { formatDate, short, shortDate } from "@/lib/format";
import type { BoardCard } from "@/lib/board";
import type { PipelineStage, Profile } from "@/types";

type SortKey =
  | "company" | "sector" | "stage" | "pipeline" | "round" | "lastRound"
  | "owner" | "status" | "next" | "touched";

const STAGE_ORDER = PIPELINE_STAGES.map((s) => s.value as string);

export default function DealTable({
  cards,
  ownerOf,
  today,
  onStageChange,
}: {
  cards: BoardCard[];
  ownerOf: (id: string | null) => Profile | undefined;
  today: string;
  onStageChange: (dealId: string, stage: PipelineStage) => void;
}) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "pipeline", dir: 1 });

  const value = (c: BoardCard, key: SortKey): string | number => {
    switch (key) {
      case "company": return c.company.name.toLowerCase();
      case "sector": return c.sectors.join(", ").toLowerCase() || "~";
      case "stage": return c.company.stage ?? "~";
      case "pipeline": return STAGE_ORDER.indexOf(c.deal.pipeline_stage);
      case "round": return Number(c.deal.round_size ?? -1);
      case "lastRound": return Number(c.company.last_round_size ?? -1);
      case "owner": return ownerOf(c.deal.owner)?.full_name ?? "~";
      case "status": return c.deal.status;
      case "next": return c.deal.next_action_date ?? "9999";
      case "touched": return c.company.last_touched;
    }
  };

  const sorted = [...cards].sort((a, b) => {
    const va = value(a, sort.key), vb = value(b, sort.key);
    const cmp = va < vb ? -1 : va > vb ? 1 : a.company.name.localeCompare(b.company.name);
    return cmp * sort.dir;
  });

  const header = (key: SortKey, label: string, className = "") => (
    <th className={`px-3 py-2 text-left font-medium whitespace-nowrap ${className}`}>
      <button
        className="inline-flex items-center gap-1 hover:text-black"
        onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : 1 }))}
      >
        {label}
        <span className="text-[10px] text-gray-400">{sort.key === key ? (sort.dir === 1 ? "▲" : "▼") : ""}</span>
      </button>
    </th>
  );

  return (
    <div className="flex-1 overflow-auto p-4 md:px-6">
      <table className="w-full text-sm border border-gray-200 rounded-xl overflow-hidden">
        <thead className="bg-gray-50 text-xs text-gray-500 sticky top-0 z-10">
          <tr>
            {header("company", "Company")}
            {header("sector", "Sector")}
            {header("stage", "Stage")}
            {header("pipeline", "Pipeline")}
            {header("round", "Round")}
            {header("lastRound", "Last round")}
            <th className="px-3 py-2 text-left font-medium">Investors</th>
            {header("owner", "Owner")}
            {header("status", "Status")}
            {header("next", "Next action")}
            {header("touched", "Last touched")}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sorted.map((c) => {
            const { deal, company } = c;
            const nextOverdue = !!deal.next_action_date && deal.next_action_date < today;
            const flagged = c.revisitDue || c.overdueTasks > 0;
            return (
              <tr key={deal.id} className={`align-top hover:bg-gray-50 ${flagged ? "bg-red-50/40" : ""}`}>
                <td className={`px-3 py-2 ${flagged ? "border-l-4 border-l-red-600" : ""}`}>
                  <Link href={`/company/${company.id}`} className="font-semibold hover:text-brand">
                    {company.name}
                  </Link>
                  {company.one_liner && <p className="text-xs text-gray-500 max-w-xs truncate">{company.one_liner}</p>}
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {c.revisitDue && <span className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[10px] font-semibold">Revisit due</span>}
                    {c.overdueTasks > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[10px] font-semibold">
                        {c.overdueTasks} overdue task{c.overdueTasks > 1 ? "s" : ""}
                      </span>
                    )}
                    {deal.end_state !== "none" && (
                      <span className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-700 text-[10px]">{labelOf(END_STATES, deal.end_state)}</span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 text-xs">{c.sectors.join(", ") || "—"}</td>
                <td className="px-3 py-2 text-xs whitespace-nowrap">{company.stage ?? "—"}</td>
                <td className="px-3 py-2">
                  <select
                    value={deal.pipeline_stage}
                    onChange={(e) => onStageChange(deal.id, e.target.value as PipelineStage)}
                    className="text-xs border border-gray-200 rounded-md px-1.5 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-brand"
                    aria-label={`Pipeline stage for ${company.name}`}
                  >
                    {PIPELINE_STAGES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2 text-xs whitespace-nowrap">
                  {deal.stage ?? "—"}
                  {deal.round_size ? <span className="text-gray-500"> · {short(deal.round_size)}</span> : null}
                </td>
                <td className="px-3 py-2 text-xs whitespace-nowrap">
                  {company.last_round_stage ?? "—"}
                  {company.last_round_size ? <span className="text-gray-500"> · {short(company.last_round_size)}</span> : null}
                </td>
                <td className="px-3 py-2 text-xs max-w-[12rem]">
                  <span className="line-clamp-2" title={company.existing_investors.join(", ")}>
                    {company.existing_investors.join(", ") || "—"}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs whitespace-nowrap">{ownerOf(deal.owner)?.full_name ?? "—"}</td>
                <td className="px-3 py-2 text-xs whitespace-nowrap">{labelOf(DEAL_STATUSES, deal.status)}</td>
                <td className={`px-3 py-2 text-xs min-w-[12rem] ${nextOverdue ? "text-red-700" : ""}`}>
                  {deal.next_action ? (
                    <>
                      {deal.next_action}
                      {deal.next_action_date && (
                        <span className={`whitespace-nowrap ${nextOverdue ? "font-semibold" : "text-gray-500"}`}>
                          {" "}· {shortDate(deal.next_action_date)}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-gray-400 italic">None</span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs whitespace-nowrap text-gray-500">{formatDate(company.last_touched)}</td>
              </tr>
            );
          })}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={11} className="px-3 py-8 text-center text-sm text-gray-400">No deals match these filters.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
