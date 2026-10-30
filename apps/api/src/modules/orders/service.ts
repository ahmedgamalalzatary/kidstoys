import type { OrderDTO, OrderStatus, PaginatedDTO, PaymentStatus } from "@kidstoys/shared";
import { db } from "@kidstoys/db";
import { ApiError } from "../../shared/errors";
import { shippingFor } from "../cart/rules";
import { toOrderDTO } from "./mappers";
import {
  countOrdersInYear,
  decrementStock,
  deleteCartItems,
  findOrderById,
  findOrderByNumber,
  insertOrder,
  insertOrderItems,
  listAdminOrders,
  listCartLines,
  listItemsForOrder,
  listItemsForOrders,
  listOrdersForUser,
  restoreStock,
  updateOrder,
} from "./repository";
import { assertCartIsNotEmpty, assertOrderTransition, buildOrderNumber } from "./rules";

/**
 * Places a cash on delivery order: the stock is taken, the order and its item
 * snapshots are written and the cart is emptied — all in one transaction, so a
 * failure leaves nothing behind.
 */
export async function placeOrder(
  userId: number,
  user: { name: string; email: string },
  delivery: {
    customerName: string;
    customerPhone: string;
    city: string;
    shippingAddress: string;
    notes?: string | null;
  },
): Promise<OrderDTO> {
  const year = new Date().getFullYear();

  const orderId = await db.transaction(async (tx) => {
    const lines = await listCartLines(tx, userId);
    assertCartIsNotEmpty(lines.length);

    for (const line of lines) {
      if (!line.isActive) {
        throw ApiError.conflict(`${line.productName} is no longer available`);
      }

      const moved = await decrementStock(tx, line.productId, line.quantity);
      if (!moved) {
        throw ApiError.conflict(`${line.productName} is out of stock`);
      }
    }

    const subtotalCents = lines.reduce(
      (total, line) => total + line.unitPriceCents * line.quantity,
      0,
    );
    const itemCount = lines.reduce((total, line) => total + line.quantity, 0);
    const shippingCents = shippingFor(itemCount);
    const ordersThisYear = await countOrdersInYear(tx, year);

    const createdId = await insertOrder(tx, {
      orderNumber: buildOrderNumber(year, ordersThisYear),
      userId,
      status: "pending",
      paymentMethod: "cod",
      paymentStatus: "unpaid",
      subtotalCents,
      shippingCents,
      totalCents: subtotalCents + shippingCents,
      customerName: delivery.customerName,
      customerEmail: user.email,
      customerPhone: delivery.customerPhone,
      city: delivery.city,
      shippingAddress: delivery.shippingAddress,
      notes: delivery.notes ?? null,
    });

    await insertOrderItems(
      tx,
      lines.map((line) => ({
        orderId: createdId,
        productId: line.productId,
        productName: line.productName,
        productSlug: line.productSlug,
        unitPriceCents: line.unitPriceCents,
        unitCostCents: line.unitCostCents,
        quantity: line.quantity,
      })),
    );

    await deleteCartItems(
      tx,
      userId,
      lines.map((line) => line.productId),
    );

    return createdId;
  });

  const order = await db.query.orders.findFirst({
    where: (orders, { eq }) => eq(orders.id, orderId),
  });
  if (!order) {
    throw new Error("Order was not created");
  }

  const items = await listItemsForOrder(db, orderId);
  return toOrderDTO(order, items);
}

export async function listCustomerOrders(userId: number): Promise<OrderDTO[]> {
  const rows = await listOrdersForUser(db, userId);
  const items = await listItemsForOrders(
    db,
    rows.map((row) => row.id),
  );

  return rows.map((row) =>
    toOrderDTO(
      row,
      items.filter((item) => item.orderId === row.id),
    ),
  );
}

export async function getCustomerOrder(
  userId: number,
  orderNumber: string,
): Promise<OrderDTO> {
  const order = await findOrderByNumber(db, orderNumber, userId);
  if (!order) {
    throw ApiError.notFound("That order could not be found");
  }

  const items = await listItemsForOrder(db, order.id);
  return toOrderDTO(order, items);
}

export async function listOrdersForAdmin(options: {
  q?: string;
  status: OrderStatus | "all";
  page: number;
  pageSize: number;
}): Promise<PaginatedDTO<OrderDTO>> {
  const { rows, total } = await listAdminOrders(options);
  const items = await listItemsForOrders(
    db,
    rows.map((row) => row.id),
  );

  return {
    items: rows.map((row) =>
      toOrderDTO(
        row,
        items.filter((item) => item.orderId === row.id),
      ),
    ),
    page: options.page,
    pageSize: options.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / options.pageSize)),
  };
}

export async function updateOrderByAdmin(
  id: number,
  input: { status?: OrderStatus; paymentStatus?: PaymentStatus },
): Promise<OrderDTO> {
  const existing = await findOrderById(db, id);
  if (!existing) {
    throw ApiError.notFound("That order could not be found");
  }

  if (input.status !== undefined) {
    assertOrderTransition(existing.status, input.status);
  }

  await db.transaction(async (tx) => {
    if (input.status === "cancelled") {
      const items = await listItemsForOrder(tx, id);
      for (const item of items) {
        if (item.productId !== null) {
          await restoreStock(tx, item.productId, item.quantity);
        }
      }
    }
    await updateOrder(tx, id, input);
  });

  const updated = await findOrderById(db, id);
  if (!updated) {
    throw new Error("Order was not updated");
  }
  return toOrderDTO(updated, await listItemsForOrder(db, id));
}
