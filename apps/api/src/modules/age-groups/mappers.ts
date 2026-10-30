import type { AgeGroupDTO } from "@kidstoys/shared";
import type { ageGroups } from "@kidstoys/db";

export type AgeGroupRow = Pick<
  typeof ageGroups.$inferSelect,
  "id" | "name" | "slug" | "startAge" | "endAge" | "isActive"
> & { productCount?: number };

export function toAgeGroupDTO(row: AgeGroupRow): AgeGroupDTO {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    startAge: row.startAge,
    endAge: row.endAge,
    isActive: row.isActive,
    productCount: row.productCount ?? 0,
  };
}
