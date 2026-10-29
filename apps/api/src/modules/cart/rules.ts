import { ApiError } from "../../shared/errors";

/** Flat delivery fee. Still an open business decision (contract §10.4). */
export const SHIPPING_FLAT_CENTS = 500;

/** A cart line can never hold more than the stock that is actually available. */
export function clampQuantity(requested: number, stock: number): number {
  return Math.max(0, Math.min(requested, stock));
}

/** A product with no stock cannot be put in a cart. */
export function assertProductIsAvailable(stock: number, name: string): void {
  if (stock <= 0) {
    throw ApiError.conflict(`${name} is out of stock`);
  }
}

/** Delivery is charged once, and not at all for an empty cart. */
export function shippingFor(itemCount: number): number {
  return itemCount > 0 ? SHIPPING_FLAT_CENTS : 0;
}
