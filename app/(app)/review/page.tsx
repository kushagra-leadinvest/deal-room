import Link from "next/link";
import { getSessionContext } from "@/lib/queries";
import { daysFromToday, daysSince, formatDate, today } from "@/lib/format";
import { isOnBoard, isParked } from "@/lib/board";
import { PIPELINE_STAGES, STALLED_DAYS, labelOf } from "@/lib/constants";
import Section from "@/components/ui/Section";
import TaskList, { type TaskRow } from "@/components/tasks/TaskList";
import type { Company, Deal, Profile } from "@/types";

export const dynamic = "force-dynamic";

const RECENT_PASS_DAYS = 30;

type Row = Deal & { company: Pick<Company, "id" | "name" | "last_touched"> };

export default async function ReviewPage() {
  const { supabase, profiles, userId } = await getSessionContext();
  const t = today();
  const weekOut = daysFromToday(7);

  const [{ data: deals, error }, { data: tasks }] = await Promise.all([
    supabase.from("deals").select("*, company:companies(id, name, last_touched)"),
    supabase
      .from("tasks")
      .select("*, company:companies(id, name)")
      .eq("status", "open")
      .lt("due_date", t)
      .order("due_date"),
  ]);

  if (error) return <div className="p-6 text-sm text-red-700">Could not load the review: {error.message}</div>;

  const rows = ((deals ?? []) as Row[]).filter((d) => d.company);
  // In the live pipeline: open, not parked, not already invested.
  const live = rows.filter((d) => d.end_state === "none" && !isParked(d) && d.pipeline_stage !== "invested");

  const stalled = live
    .filter((d) => daysSince(d.company.last_touched) >= STALLED_DAYS)
    .sort((a, b) => a.company.last_touched.localeCompare(b.company.last_touched));
  const noNext = live.filter((d) => !d.next_action?.trim());
  // Passed or lost in the last 30 days, newest first.
  const passSince = daysFromToday(-RECENT_PASS_DAYS);
  const passes = rows
    .filter((d) => (d.end_state === "passed" || d.end_state === "lost") && d.closed_at && d.closed_at.slice(0, 10) >= passSince)
    .sort((a, b) => b.closed_at!.localeCompare(a.closed_at!));
  const passesByStage = PIPELINE_STAGES.map((s) => ({
    label: s.label,
    count: passes.filter((d) => (d.rejected_at_stage ?? d.pipeline_stage) === s.value).length,
  })).filter((x) => x.count > 0);

  const revisits = rows
    .filter((d) => d.revisit_date && d.revisit_date <= weekOut)
    .sort((a, b) => a.revisit_date!.localeCompare(b.revisit_date!));

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Weekly review</h1>
        <p className="text-sm text-gray-500">Week of {formatDate(t)}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section title={`Stalled ${STALLED_DAYS}+ days (${stalled.length})`}>
          <DealList
            rows={stalled}
            profiles={profiles}
            empty="Nothing stalled."
            detail={(d) => `${daysSince(d.company.last_touched)} days since last touch`}
          />
        </Section>

        <Section title={`No next action (${noNext.length})`}>
          <DealList rows={noNext} profiles={profiles} empty="Every live deal has a next action." />
        </Section>

        <Section title={`Revisits due this week (${revisits.length})`}>
          <DealList
            rows={revisits}
            profiles={profiles}
            empty="No revisits due."
            detail={(d) =>
              d.revisit_date! <= t
                ? `Due ${d.revisit_date === t ? "today" : `since ${formatDate(d.revisit_date)}`}`
                : `Due ${formatDate(d.revisit_date)}`
            }
            danger={(d) => d.revisit_date! <= t}
          />
        </Section>

        <Section title={`Overdue tasks (${tasks?.length ?? 0})`}>
          <TaskList
            tasks={(tasks ?? []) as TaskRow[]}
            profiles={profiles}
            userId={userId}
            today={t}
            emptyText="No overdue tasks."
          />
        </Section>
      </div>

      <Section title={`Recent passes, last ${RECENT_PASS_DAYS} days (${passes.length})`}>
        {passesByStage.length > 0 && (
          <p className="text-xs text-gray-500 mb-2">
            Rejected at: {passesByStage.map((x) => `${x.label} ${x.count}`).join(" · ")}
          </p>
        )}
        {passes.length === 0 ? (
          <p className="text-sm text-gray-400">No passes in the last {RECENT_PASS_DAYS} days.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-500 text-left">
                <tr>
                  <th className="py-1.5 pr-3 font-medium">Company</th>
                  <th className="py-1.5 pr-3 font-medium">Outcome</th>
                  <th className="py-1.5 pr-3 font-medium">Rejected at</th>
                  <th className="py-1.5 pr-3 font-medium">Reason</th>
                  <th className="py-1.5 pr-3 font-medium">Date</th>
                  <th className="py-1.5 font-medium">Owner</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {passes.map((d) => (
                  <tr key={d.id} className="align-top">
                    <td className="py-2 pr-3">
                      <Link href={`/company/${d.company.id}`} className="font-medium hover:text-brand">{d.company.name}</Link>
                      {d.stage && <span className="text-xs text-gray-500"> · {d.stage}</span>}
                    </td>
                    <td className="py-2 pr-3 text-xs">{d.end_state === "lost" ? "Lost" : "Passed"}</td>
                    <td className="py-2 pr-3 text-xs font-medium whitespace-nowrap">
                      {labelOf(PIPELINE_STAGES, d.rejected_at_stage ?? d.pipeline_stage)}
                    </td>
                    <td className="py-2 pr-3 text-xs text-gray-700">{d.pass_reason || <span className="text-gray-400 italic">No reason given</span>}</td>
                    <td className="py-2 pr-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(d.closed_at)}</td>
                    <td className="py-2 text-xs text-gray-500">{profiles.find((p) => p.id === d.owner)?.initials}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <p className="text-xs text-gray-400">
        {rows.filter((d) => isOnBoard(d, t)).length} deals on the board right now.
      </p>
    </div>
  );
}

function DealList({
  rows,
  profiles,
  empty,
  detail,
  danger,
}: {
  rows: Row[];
  profiles: Profile[];
  empty: string;
  detail?: (d: Row) => string;
  danger?: (d: Row) => boolean;
}) {
  if (rows.length === 0) return <p className="text-sm text-gray-400">{empty}</p>;
  return (
    <ul className="divide-y divide-gray-100">
      {rows.map((d) => (
        <li key={d.id} className="py-2 text-sm">
          <div className="flex items-baseline gap-2">
            <Link href={`/company/${d.company.id}`} className="font-medium hover:text-brand">
              {d.company.name}
            </Link>
            <span className="text-xs text-gray-500">
              {d.stage ? `${d.stage} · ` : ""}
              {labelOf(PIPELINE_STAGES, d.pipeline_stage)}
            </span>
            <span className="ml-auto text-[11px] text-gray-400">
              {profiles.find((p) => p.id === d.owner)?.initials}
            </span>
          </div>
          {detail && (
            <p className={`text-xs ${danger?.(d) ? "text-red-700 font-medium" : "text-gray-500"}`}>{detail(d)}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
