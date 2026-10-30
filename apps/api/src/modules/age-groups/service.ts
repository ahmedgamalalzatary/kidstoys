import type { AgeGroupDTO } from "@kidstoys/shared";
import { ApiError } from "../../shared/errors";
import { uniqueSlug } from "../../shared/slug";
import { toAgeGroupDTO } from "./mappers";
import {
  ageGroupNameExists,
  ageGroupSlugExists,
  countProductsForAgeGroup,
  deleteAgeGroup,
  findAgeGroupById,
  insertAgeGroup,
  listAgeGroups,
  updateAgeGroup,
} from "./repository";
import { assertAgeGroupCanBeDeleted, assertAgeGroupNameIsUnique, assertAgeRange } from "./rules";

interface AgeGroupInput {
  name?: string;
  startAge?: number;
  endAge?: number | null;
  isActive?: boolean;
}

export async function listPublicAgeGroups(): Promise<AgeGroupDTO[]> {
  return (await listAgeGroups(true)).map(toAgeGroupDTO);
}

export async function listAllAgeGroups(): Promise<AgeGroupDTO[]> {
  return (await listAgeGroups(false)).map(toAgeGroupDTO);
}

export async function createAgeGroup(
  input: AgeGroupInput & { name: string; startAge: number },
): Promise<AgeGroupDTO> {
  assertAgeGroupNameIsUnique(await ageGroupNameExists(input.name));
  const created = await insertAgeGroup({
    name: input.name,
    slug: await uniqueSlug(input.name, ageGroupSlugExists),
    startAge: input.startAge,
    endAge: input.endAge ?? null,
    isActive: input.isActive ?? true,
  });
  return toAgeGroupDTO(created);
}

export async function updateAgeGroupById(id: number, input: AgeGroupInput): Promise<AgeGroupDTO> {
  const existing = await findAgeGroupById(id);
  if (!existing) throw ApiError.notFound("That age group no longer exists");
  if (input.name !== undefined) {
    assertAgeGroupNameIsUnique(await ageGroupNameExists(input.name, id));
  }
  assertAgeRange(input.startAge ?? existing.startAge, input.endAge === undefined ? existing.endAge : input.endAge);
  return toAgeGroupDTO(await updateAgeGroup(id, input));
}

export async function removeAgeGroup(id: number): Promise<void> {
  const existing = await findAgeGroupById(id);
  if (!existing) throw ApiError.notFound("That age group no longer exists");
  assertAgeGroupCanBeDeleted(await countProductsForAgeGroup(id));
  await deleteAgeGroup(id);
}
