import Board from "@/components/board/Board";
import { buildCards, isOnBoard } from "@/lib/board";
import { today } from "@/lib/format";
import { getSessionContext } from "@/lib/queries";
import type { Company, Deal, SectorTag } from "@/types";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const { supabase, profiles, userId } = await getSessionContext();
  const t = today();

  const [deals, companies, links, tags, tasks] = await Promise.all([
    supabase.from("deals").select("*"),
    supabase.from("companies").select("*"),
    supabase.from("company_sector_tags").select("company_id, tag_id"),
    supabase.from("sector_tags").select("id, name, parent_id, level"),
    supabase.from("tasks").select("company_id, deal_id, due_date").eq("status", "open"),
  ]);

  const error = deals.error ?? companies.error ?? links.error ?? tags.error ?? tasks.error;
  if (error) {
    return <div className="p-6 text-sm text-red-700">Could not load the board: {error.message}</div>;
  }

  const allDeals = (deals.data ?? []) as Deal[];
  const cards = buildCards(
    allDeals,
    (companies.data ?? []) as Company[],
    links.data ?? [],
    (tags.data ?? []) as SectorTag[],
    tasks.data ?? [],
    t,
  );

  return (
    <Board
      cards={cards.filter((c) => isOnBoard(c.deal, t) || c.deal.end_state === "watchlist")}
      tags={(tags.data ?? []) as SectorTag[]}
      profiles={profiles}
      userId={userId}
      today={t}
    />
  );
}
