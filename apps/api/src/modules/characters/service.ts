import type { CharacterDTO } from "@kidstoys/shared";
import { ApiError } from "../../shared/errors";
import { uniqueSlug } from "../../shared/slug";
import { toCharacterDTO } from "./mappers";
import {
  characterNameExists,
  characterSlugExists,
  countProductsForCharacter,
  deleteCharacter,
  findCharacterById,
  insertCharacter,
  listCharacters,
  updateCharacter,
} from "./repository";
import { assertCharacterCanBeDeleted, assertCharacterNameIsUnique } from "./rules";

interface CharacterInput {
  name?: string;
  description?: string | null;
  imageUrl?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

export async function listPublicCharacters(): Promise<CharacterDTO[]> {
  return (await listCharacters(true)).map(toCharacterDTO);
}

export async function listAllCharacters(): Promise<CharacterDTO[]> {
  return (await listCharacters(false)).map(toCharacterDTO);
}

export async function createCharacter(input: CharacterInput & { name: string }): Promise<CharacterDTO> {
  assertCharacterNameIsUnique(await characterNameExists(input.name));
  const created = await insertCharacter({
    name: input.name,
    slug: await uniqueSlug(input.name, characterSlugExists),
    description: input.description ?? null,
    imageUrl: input.imageUrl ?? null,
    sortOrder: input.sortOrder ?? 0,
    isActive: input.isActive ?? true,
  });
  return toCharacterDTO(created);
}

export async function updateCharacterById(id: number, input: CharacterInput): Promise<CharacterDTO> {
  const existing = await findCharacterById(id);
  if (!existing) throw ApiError.notFound("That character no longer exists");
  if (input.name !== undefined) {
    assertCharacterNameIsUnique(await characterNameExists(input.name, id));
  }
  return toCharacterDTO(await updateCharacter(id, input));
}

export async function removeCharacter(id: number): Promise<void> {
  const existing = await findCharacterById(id);
  if (!existing) throw ApiError.notFound("That character no longer exists");
  assertCharacterCanBeDeleted(await countProductsForCharacter(id));
  await deleteCharacter(id);
}
