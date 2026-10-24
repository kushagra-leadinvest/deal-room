import { formatDate } from "@/lib/format";
import type { Profile } from "@/types";

export default function AddedBy({
  by,
  at,
  profiles,
  className = "",
}: {
  by: string | null;
  at?: string | null;
  profiles: Profile[];
  className?: string;
}) {
  const name = profiles.find((p) => p.id === by)?.full_name ?? "Unknown";
  return (
    <span className={`text-[11px] text-gray-400 ${className}`}>
      Added by {name}
      {at ? ` · ${formatDate(at)}` : ""}
    </span>
  );
}
