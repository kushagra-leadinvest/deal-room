import { notFound } from "next/navigation";
import { getSessionContext } from "@/lib/queries";
import { formatDate, today } from "@/lib/format";
import { driveConfigured } from "@/lib/drive";
import SummaryCard from "@/components/company/SummaryCard";
import DealsSection from "@/components/company/DealsSection";
import NotesSection from "@/components/company/NotesSection";
import DecksSection from "@/components/company/DecksSection";
import OurTake from "@/components/company/OurTake";
import PeopleSection from "@/components/company/PeopleSection";
import TaskList from "@/components/tasks/TaskList";
import NewTaskForm from "@/components/tasks/NewTaskForm";
import Section from "@/components/ui/Section";
import type {
  Company, CompanyPerson, Deal, Deck, MarketResearch, Note, SectorTag, Task,
} from "@/types";

export const dynamic = "force-dynamic";

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profiles, userId } = await getSessionContext();

  const { data: company } = await supabase.from("companies").select("*").eq("id", id).maybeSingle();
  if (!company) notFound();

  const [deals, notes, tasks, people, links, tags, research, decks] = await Promise.all([
    supabase.from("deals").select("*").eq("company_id", id).order("created_at", { ascending: false }),
    supabase.from("notes").select("*").eq("company_id", id).order("created_at", { ascending: false }),
    supabase.from("tasks").select("*").eq("company_id", id).order("due_date", { ascending: true, nullsFirst: false }),
    supabase.from("company_people").select("*, person:people(*)").eq("company_id", id).order("created_at"),
    supabase.from("company_sector_tags").select("tag_id").eq("company_id", id),
    supabase.from("sector_tags").select("id, name, parent_id, level"),
    supabase.from("market_research").select("*").eq("company_id", id).order("created_at", { ascending: false }),
    supabase.from("decks").select("*").eq("company_id", id).order("created_at", { ascending: false }),
  ]);

  const c = company as Company;
  const dealList = (deals.data ?? []) as Deal[];
  const companyTasks = (tasks.data ?? []) as Task[];

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-2xl font-semibold">{c.name}</h1>
        {c.domain && (
          <a
            href={c.website.startsWith("http") ? c.website : `https://${c.website}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-brand hover:underline"
          >
            {c.domain}
          </a>
        )}
        <span className="text-xs text-gray-400 ml-auto">Last touched {formatDate(c.last_touched)}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <SummaryCard company={c} profiles={profiles} />
          <DealsSection companyId={c.id} deals={dealList} profiles={profiles} today={today()} />
          <NotesSection
            companyId={c.id}
            notes={(notes.data ?? []) as Note[]}
            deals={dealList}
            profiles={profiles}
            company={c}
          />
        </div>
        <div className="space-y-4">
          <OurTake
            company={c}
            research={(research.data ?? []) as MarketResearch[]}
            tagIds={(links.data ?? []).map((l) => l.tag_id as string)}
            tags={(tags.data ?? []) as SectorTag[]}
            profiles={profiles}
          />
          <DecksSection
            companyId={c.id}
            decks={(decks.data ?? []) as Deck[]}
            profiles={profiles}
            driveEnabled={driveConfigured()}
          />
          <PeopleSection companyId={c.id} links={(people.data ?? []) as CompanyPerson[]} />
          <Section title="Tasks">
            <TaskList tasks={companyTasks} profiles={profiles} userId={userId} today={today()} showCompany={false} />
            <NewTaskForm profiles={profiles} userId={userId} companyId={c.id} deals={dealList} />
          </Section>
        </div>
      </div>
    </div>
  );
}
