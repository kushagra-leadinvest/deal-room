import type { Company, Deal, SectorTag, Task } from "@/types";

/** A deal is "parked" while it has a revisit bucket set. */
export function isParked(deal: Pick<Deal, "revisit_bucket">) {
  return deal.revisit_bucket !== "none";
}

/** Revisit date reached (any end state). */
export function isRevisitDue(deal: Pick<Deal, "revisit_date">, today: string) {
  return !!deal.revisit_date && deal.revisit_date <= today;
}

/**
 * Board rule (DECISIONS.md): open, unparked deals, plus any deal whose revisit
 * date has arrived, which comes back flagged.
 */
export function isOnBoard(deal: Deal, today: string) {
  return (deal.end_state === "none" && !isParked(deal)) || isRevisitDue(deal, today);
}

/** Map of tag id → tag, and helpers to walk the hierarchy. */
export function tagIndex(tags: SectorTag[]) {
  const byId = new Map(tags.map((t) => [t.id, t]));
  const children = new Map<string, SectorTag[]>();
  for (const t of tags) {
    if (!t.parent_id) continue;
    children.set(t.parent_id, [...(children.get(t.parent_id) ?? []), t]);
  }

  function descendants(id: string): Set<string> {
    const out = new Set<string>([id]);
    const stack = [id];
    while (stack.length) {
      for (const c of children.get(stack.pop()!) ?? []) {
        if (!out.has(c.id)) {
          out.add(c.id);
          stack.push(c.id);
        }
      }
    }
    return out;
  }

  /** "Energy > Battery > LFP" for a tag */
  function path(id: string): string {
    const parts: string[] = [];
    let t = byId.get(id);
    while (t) {
      parts.unshift(t.name);
      t = t.parent_id ? byId.get(t.parent_id) : undefined;
    }
    return parts.join(" > ");
  }

  /** Tags in tree order (parents before children, alphabetical), for pickers */
  function ordered(): SectorTag[] {
    const out: SectorTag[] = [];
    const walk = (list: SectorTag[]) => {
      for (const t of [...list].sort((a, b) => a.name.localeCompare(b.name))) {
        out.push(t);
        walk(children.get(t.id) ?? []);
      }
    };
    walk(tags.filter((t) => !t.parent_id));
    return out;
  }

  return { byId, children, descendants, path, ordered };
}

/**
 * Deepest tags only (drop any tag that is an ancestor of another tag on the
 * same company), so "Energy, Battery, LFP" shows as one path.
 */
export function leafTagIds(tagIds: string[], tags: SectorTag[]) {
  const byId = new Map(tags.map((t) => [t.id, t]));
  const ancestors = new Set<string>();
  for (const id of tagIds) {
    let p = byId.get(id)?.parent_id;
    while (p) {
      ancestors.add(p);
      p = byId.get(p)?.parent_id ?? null;
    }
  }
  return tagIds.filter((id) => !ancestors.has(id));
}

export interface BoardCard {
  deal: Deal;
  company: Company;
  sectors: string[];       // level-1 tag names
  tagIds: string[];
  overdueTasks: number;
  revisitDue: boolean;
}

export function buildCards(
  deals: Deal[],
  companies: Company[],
  links: { company_id: string; tag_id: string }[],
  tags: SectorTag[],
  openTasks: Pick<Task, "company_id" | "deal_id" | "due_date">[],
  today: string,
): BoardCard[] {
  const companyById = new Map(companies.map((c) => [c.id, c]));
  const tagById = new Map(tags.map((t) => [t.id, t]));
  const tagsByCompany = new Map<string, string[]>();
  for (const l of links) {
    tagsByCompany.set(l.company_id, [...(tagsByCompany.get(l.company_id) ?? []), l.tag_id]);
  }

  return deals
    .filter((d) => companyById.has(d.company_id))
    .map((deal) => {
      const tagIds = tagsByCompany.get(deal.company_id) ?? [];
      const sectors = tagIds
        .map((id) => tagById.get(id))
        .filter((t): t is SectorTag => !!t && t.level === 1)
        .map((t) => t.name);
      // Overdue tasks on this deal, or on the company with no deal attached.
      const overdueTasks = openTasks.filter(
        (t) =>
          !!t.due_date &&
          t.due_date < today &&
          (t.deal_id === deal.id || (t.deal_id === null && t.company_id === deal.company_id)),
      ).length;
      return {
        deal,
        company: companyById.get(deal.company_id)!,
        sectors,
        tagIds,
        overdueTasks,
        revisitDue: isRevisitDue(deal, today),
      };
    });
}
