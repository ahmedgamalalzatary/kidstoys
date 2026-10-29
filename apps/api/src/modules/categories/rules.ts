import { ApiError } from "../../shared/errors";

/** A category that still holds products cannot be removed. */
export function assertCategoryCanBeDeleted(productCount: number): void {
  if (productCount > 0) {
    throw ApiError.conflict(
      `Move or delete the ${productCount} product(s) in this category first`,
    );
  }
}

/** Category names are unique. */
export function assertCategoryNameIsUnique(isTaken: boolean): void {
  if (isTaken) {
    throw ApiError.conflict("A category with this name already exists");
  }
}
