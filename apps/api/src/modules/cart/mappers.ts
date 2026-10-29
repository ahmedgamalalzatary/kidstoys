import type { CartDTO, CartItemDTO } from "@kidstoys/shared";
import type { CartItemRow } from "./repository";
import { shippingFor } from "./rules";

export function toCartItemDTO(row: CartItemRow): CartItemDTO {
  return {
    productId: row.productId,
    name: row.productName,
    slug: row.productSlug,
    image: Array.isArray(row.productImages) ? (row.productImages[0] ?? null) : null,
    unitPriceCents: row.priceCents,
    quantity: row.quantity,
    stock: row.stock,
    lineTotalCents: row.priceCents * row.quantity,
  };
}

export function toCartDTO(rows: CartItemRow[]): CartDTO {
  const items = rows.map(toCartItemDTO);
  const subtotalCents = items.reduce((total, item) => total + item.lineTotalCents, 0);
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const shippingCents = shippingFor(itemCount);

  return {
    items,
    subtotalCents,
    shippingCents,
    totalCents: subtotalCents + shippingCents,
    itemCount,
  };
}
