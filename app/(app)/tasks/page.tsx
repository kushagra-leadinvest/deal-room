import { getSessionContext } from "@/lib/queries";
import { today } from "@/lib/format";
import Section from "@/components/ui/Section";
import TaskList, { type TaskRow } from "@/components/tasks/TaskList";
import NewTaskForm from "@/components/tasks/NewTaskForm";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const { supabase, profiles, userId } = await getSessionContext();
  const t = today();

  const [{ data: tasks, error }, { data: companies }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*, company:companies(id, name)")
      .or(`assignee.eq.${userId},created_by.eq.${userId}`)
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase.from("companies").select("id, name").order("name"),
  ]);

  if (error) return <div className="p-6 text-sm text-red-700">Could not load tasks: {error.message}</div>;

  const rows = (tasks ?? []) as TaskRow[];
  const mine = rows.filter((x) => x.assignee === userId);
  const byMe = rows.filter((x) => x.created_by === userId && x.assignee !== userId);

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Tasks</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section title={`Assigned to me (${mine.filter((x) => x.status === "open").length})`}>
          <TaskList tasks={mine} profiles={profiles} userId={userId} today={t} emptyText="Nothing on your plate." />
        </Section>
        <Section title={`Assigned by me (${byMe.filter((x) => x.status === "open").length})`}>
          <TaskList tasks={byMe} profiles={profiles} userId={userId} today={t} emptyText="You haven't assigned anything open." />
        </Section>
      </div>
      <Section title="New task" className="md:max-w-md">
        <NewTaskForm profiles={profiles} userId={userId} companies={companies ?? []} />
      </Section>
    </div>
  );
}
