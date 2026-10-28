"use client";

import Link from "next/link";
import { useDraggable } from "@dnd-kit/core";
import { short, shortDate } from "@/lib/format";
import { labelOf, DEAL_STATUSES, END_STATES, PIPELINE_STAGES } from "@/lib/constants";
import type { BoardCard } from "@/lib/board";
import type { Profile } from "@/types";

export default function DealCard({
  card,
  owner,
  today,
  quiet = false,
}: {
  card: BoardCard;
  owner: Profile | undefined;
  today: string;
  /** In the Passed / Watchlist columns: muted, shows rejection info */
  quiet?: boolean;
}) {
  const { deal, company, sectors, overdueTasks, revisitDue } = card;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: deal.id });

  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  const nextOverdue = !!deal.next_action_date && deal.next_action_date < today;
  const dimmed = !revisitDue && (deal.status !== "active" || deal.end_state !== "none");
  const muted = quiet && !revisitDue && !isDragging;
  const rejected = deal.end_state === "passed" || deal.end_state === "lost";
  const flagged = revisitDue || overdueTasks > 0;

  return (
    <article
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`card p-3 text-sm cursor-grab active:cursor-grabbing select-none ${
        isDragging ? "shadow-lg ring-2 ring-brand z-50 relative" : "hover:border-gray-300"
      } ${flagged ? "border-l-4 border-l-red-600" : ""} ${muted ? "bg-gray-50 text-gray-500 opacity-80" : dimmed && !isDragging ? "opacity-70" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/company/${company.id}`}
          className="font-semibold leading-tight hover:text-brand"
          onClick={(e) => isDragging && e.preventDefault()}
        >
          {company.name}
        </Link>
        {owner && (
          <span
            title={`Owner: ${owner.full_name}`}
            className="w-5 h-5 rounded-full bg-gray-200 text-[10px] font-semibold flex items-center justify-center flex-shrink-0"
          >
            {owner.initials}
          </span>
        )}
      </div>

      {/* Flags */}
      {(revisitDue || overdueTasks > 0 || deal.status !== "active" || (deal.end_state !== "none" && !quiet)) && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {revisitDue && <span className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[10px] font-semibold">Revisit due</span>}
          {overdueTasks > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[10px] font-semibold">
              {overdueTasks} overdue task{overdueTasks > 1 ? "s" : ""}
            </span>
          )}
          {deal.status !== "active" && (
            <span className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-700 text-[10px] font-medium">
              {labelOf(DEAL_STATUSES, deal.status)}
            </span>
          )}
          {deal.end_state !== "none" && !quiet && (
            <span className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-700 text-[10px] font-medium">
              {labelOf(END_STATES, deal.end_state)}
            </span>
          )}
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-1 text-[11px]">
        {sectors.map((s) => (
          <span key={s} className={`px-1.5 py-0.5 rounded font-medium ${muted ? "bg-gray-100 text-gray-500" : "bg-brand-light text-brand"}`}>{s}</span>
        ))}
        {company.stage && <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">{company.stage}</span>}
      </div>

      {!quiet && (
      <dl className="mt-2 space-y-0.5 text-xs text-gray-800">
        {(company.last_round_stage || company.last_round_size) && (
          <div>
            <dt className="inline text-gray-500">Last round </dt>
            <dd className="inline font-semibold">
              {company.last_round_stage ?? "—"}
              {company.last_round_size ? ` · ${short(company.last_round_size)}` : ""}
            </dd>
          </div>
        )}
        {company.existing_investors.length > 0 && (
          <div className="truncate" title={company.existing_investors.join(", ")}>
            <dt className="inline text-gray-500">Investors </dt>
            <dd className="inline font-semibold">{company.existing_investors.join(", ")}</dd>
          </div>
        )}
      </dl>
      )}

      {rejected ? (
        <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-600">
          <span className="font-medium">
            {deal.end_state === "lost" ? "Lost" : "Passed"} at {labelOf(PIPELINE_STAGES, deal.rejected_at_stage ?? deal.pipeline_stage)}
          </span>
          {deal.closed_at && <span className="text-gray-400"> · {shortDate(deal.closed_at)}</span>}
          {deal.pass_reason && <p className="mt-0.5 line-clamp-2 italic">{deal.pass_reason}</p>}
        </div>
      ) : (
        <div className={`mt-2 pt-2 border-t border-gray-100 text-xs ${quiet ? "text-gray-500" : "text-brand"}`}>
          {deal.next_action ? (
            <>
              <span className="font-medium">Next:</span> {deal.next_action}
              {deal.next_action_date && (
                <span className={`whitespace-nowrap ${nextOverdue && !quiet ? "font-semibold text-red-700" : ""}`}>
                  {" "}· {shortDate(deal.next_action_date)}
                  {nextOverdue && !quiet && " · overdue"}
                </span>
              )}
            </>
          ) : (
            <span className="text-gray-400 italic">No next action</span>
          )}
        </div>
      )}
    </article>
  );
}
