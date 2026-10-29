import { ApiError } from "../../shared/errors";

/** A product that appears in an order cannot be deleted — it is deactivated instead. */
export function assertProductCanBeDeleted(orderCount: number): void {
  if (orderCount > 0) {
    throw ApiError.conflict(
      "This product appears in past orders, deactivate it instead of deleting it",
    );
  }
}

/** Stock can never be negative. */
export function assertStockIsNotNegative(stock: number): void {
  if (stock < 0) {
    throw ApiError.badRequest("Please check the highlighted fields", {
      stock: "Stock cannot be negative",
    });
  }
}
