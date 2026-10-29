import { ApiError } from "../../shared/errors";
import { formatOrderNumber } from "@kidstoys/shared";

/** The cart must hold something before an order can be placed. */
export function assertCartIsNotEmpty(itemCount: number): void {
  if (itemCount === 0) {
    throw ApiError.badRequest("Your cart is empty", { cart: "Add a toy before checking out" });
  }
}

/** The stock has to be there when the order is written. */
export function assertStockIsAvailable(name: string): void {
  throw ApiError.conflict(`${name} is out of stock`);
}

/** Order numbers run per year: KT-2026-0001, KT-2026-0002, ... */
export function buildOrderNumber(year: number, ordersThisYear: number): string {
  return formatOrderNumber(year, ordersThisYear + 1);
}
