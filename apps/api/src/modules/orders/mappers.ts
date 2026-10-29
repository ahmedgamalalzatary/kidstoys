import type { OrderDTO, OrderItemDTO } from "@kidstoys/shared";
import type { OrderItemRow, OrderRow } from "./repository";

export function toOrderItemDTO(row: OrderItemRow): OrderItemDTO {
  return {
    id: row.id,
    productId: row.productId,
    productName: row.productName,
    productSlug: row.productSlug,
    unitPriceCents: row.unitPriceCents,
    quantity: row.quantity,
    lineTotalCents: row.unitPriceCents * row.quantity,
  };
}

export function toOrderDTO(row: OrderRow, items: OrderItemRow[]): OrderDTO {
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    userId: row.userId,
    status: row.status,
    paymentMethod: row.paymentMethod,
    paymentStatus: row.paymentStatus,
    subtotalCents: row.subtotalCents,
    shippingCents: row.shippingCents,
    totalCents: row.totalCents,
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    customerPhone: row.customerPhone,
    city: row.city,
    shippingAddress: row.shippingAddress,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    items: items.map(toOrderItemDTO),
  };
}
