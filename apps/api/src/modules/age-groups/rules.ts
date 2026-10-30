import { ApiError } from "../../shared/errors";

export function assertAgeGroupCanBeDeleted(productCount: number): void {
  if (productCount > 0) {
    throw ApiError.conflict("Remove this age group from its products first");
  }
}

export function assertAgeGroupNameIsUnique(isTaken: boolean): void {
  if (isTaken) {
    throw ApiError.conflict("An age group with this name already exists");
  }
}

export function assertAgeRange(startAge: number, endAge: number | null): void {
  if (endAge !== null && endAge < startAge) {
    throw ApiError.badRequest("Please check the highlighted fields", {
      endAge: "End age must be at least the start age",
    });
  }
}
