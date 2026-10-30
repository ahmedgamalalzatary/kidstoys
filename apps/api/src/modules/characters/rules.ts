import { ApiError } from "../../shared/errors";

export function assertCharacterCanBeDeleted(productCount: number): void {
  if (productCount > 0) {
    throw ApiError.conflict("Remove this character from its products first");
  }
}

export function assertCharacterNameIsUnique(isTaken: boolean): void {
  if (isTaken) {
    throw ApiError.conflict("A character with this name already exists");
  }
}
