import { getSessionContext } from "@/lib/queries";
import AddCompanyForm from "@/components/AddCompanyForm";
import { tagIndex } from "@/lib/board";
import type { SectorTag } from "@/types";

export const dynamic = "force-dynamic";

export default async function AddPage() {
  const { supabase } = await getSessionContext();
  const { data: tags } = await supabase.from("sector_tags").select("id, name, parent_id, level");
  const index = tagIndex((tags ?? []) as SectorTag[]);
  const paths = index.ordered().map((t) => index.path(t.id));

  return (
    <div className="max-w-xl mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-semibold mb-1">Add company</h1>
      <p className="text-sm text-gray-500 mb-4">Name and website are enough. Everything else can be filled in later.</p>
      <AddCompanyForm sectorPaths={paths} />
    </div>
  );
}
