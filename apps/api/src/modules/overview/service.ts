import type { OverviewDTO } from "@kidstoys/shared";
import { toOrderDTO } from "../orders/mappers";
import { toProductDTO } from "../products/mappers";
import { getOverviewData } from "./repository";

export async function getOverview(): Promise<OverviewDTO> {
  const data = await getOverviewData();
  return {
    revenueCents: data.revenueCents,
    costOfGoodsSoldCents: data.costOfGoodsSoldCents,
    grossProfitCents: data.revenueCents - data.costOfGoodsSoldCents,
    orderCount: data.orderCount,
    pendingOrderCount: data.pendingOrderCount,
    customerCount: data.customerCount,
    productCount: data.productCount,
    lowStockCount: data.lowStockCount,
    recentOrders: data.recentOrders.map((order) =>
      toOrderDTO(order, data.recentOrderItems.filter((item) => item.orderId === order.id)),
    ),
    lowStockProducts: data.lowStockProducts.map(({ product, categoryName, categorySlug }) =>
      toProductDTO({ ...product, categoryName, categorySlug }),
    ),
  };
}
