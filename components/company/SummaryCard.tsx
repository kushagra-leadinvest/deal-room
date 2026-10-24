"use client";

import EditableField from "@/components/ui/EditableField";
import AddedBy from "@/components/ui/AddedBy";
import Section from "@/components/ui/Section";
import ErrorText from "@/components/ui/ErrorText";
import { useMutation } from "@/lib/useMutation";
import { COMPANY_STAGES } from "@/lib/constants";
import { formatDate, short } from "@/lib/format";
import type { Company, Profile } from "@/types";

const STAGE_OPTIONS = [{ value: "", label: "—" }, ...COMPANY_STAGES.map((s) => ({ value: s, label: s }))];

export default function SummaryCard({ company, profiles }: { company: Company; profiles: Profile[] }) {
  const { run, error } = useMutation();
  const save = (field: keyof Company) => (value: unknown) =>
    run((db) => db.from("companies").update({ [field]: value }).eq("id", company.id));

  return (
    <Section title="Summary" action={<AddedBy by={company.created_by} at={company.created_at} profiles={profiles} />}>
      <EditableField
        value={company.one_liner}
        placeholder="Add a one-liner"
        onSave={save("one_liner")}
        className="mb-3 font-medium"
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
        <EditableField label="Name" value={company.name} onSave={(v) => (v ? save("name")(v) : Promise.resolve(false))} />
        <EditableField label="Website" value={company.website} kind="url" onSave={(v) => (v ? save("website")(v) : Promise.resolve(false))} />
        <EditableField label="Stage" value={company.stage ?? ""} kind="select" options={STAGE_OPTIONS} onSave={(v) => save("stage")(v || null)} />
        <EditableField label="Location" value={company.location} onSave={save("location")} />
        <EditableField label="Last round" value={company.last_round_stage} placeholder="e.g. Seed" onSave={save("last_round_stage")} />
        <EditableField
          label="Last round size (₹)"
          value={company.last_round_size}
          kind="number"
          display={short(company.last_round_size)}
          onSave={save("last_round_size")}
        />
        <EditableField
          label="Last round date"
          value={company.last_round_date}
          kind="date"
          display={formatDate(company.last_round_date)}
          onSave={save("last_round_date")}
        />
        <EditableField
          label="Existing investors"
          value={company.existing_investors}
          kind="list"
          onSave={save("existing_investors")}
          className="col-span-2"
        />
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
        <EditableField
          label="What they do"
          value={company.ai_summary}
          kind="textarea"
          placeholder="Filled from call notes, or add by hand"
          onSave={save("ai_summary")}
          className="sm:col-span-2"
        />
        <EditableField label="Revenue" value={company.revenue_metrics} kind="textarea" onSave={save("revenue_metrics")} />
        <EditableField label="Traction" value={company.traction_metrics} kind="textarea" onSave={save("traction_metrics")} />
        <EditableField label="Raise ask" value={company.raise_ask} onSave={save("raise_ask")} />
      </div>
      <ErrorText error={error} />
    </Section>
  );
}
