export const ROLES = ["client", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ["unpaid", "paid"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = ["cod"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PURCHASE_STATUSES = ["draft", "ordered", "received", "cancelled"] as const;
export type PurchaseStatus = (typeof PURCHASE_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const PURCHASE_STATUS_LABELS: Record<PurchaseStatus, string> = {
  draft: "Draft",
  ordered: "Ordered",
  received: "Received",
  cancelled: "Cancelled",
};

/** Statuses an order can move to from its current status. */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

export const PURCHASE_STATUS_TRANSITIONS: Record<PurchaseStatus, PurchaseStatus[]> = {
  draft: ["ordered", "cancelled"],
  ordered: ["received", "cancelled"],
  received: [],
  cancelled: [],
};

export interface UserDTO {
  id: number;
  name: string;
  email: string;
  role: Role;
  phone: string | null;
  city: string | null;
  address: string | null;
  createdAt: string;
}

export interface CategoryDTO {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  productCount?: number;
}

export interface ProductDTO {
  id: number;
  name: string;
  slug: string;
  sku: string | null;
  shortDescription: string | null;
  description: string;
  priceCents: number;
  compareAtCents: number | null;
  categoryId: number;
  categoryName?: string;
  categorySlug?: string;
  images: string[];
  stock: number;
  minStock: number;
  isActive: boolean;
  ageMin: number | null;
  ageMax: number | null;
  createdAt: string;
}

export interface CartItemDTO {
  productId: number;
  name: string;
  slug: string;
  image: string | null;
  unitPriceCents: number;
  quantity: number;
  stock: number;
  lineTotalCents: number;
}

export interface CartDTO {
  items: CartItemDTO[];
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  itemCount: number;
}

export interface OrderItemDTO {
  id: number;
  productId: number | null;
  productName: string;
  productSlug: string;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
}

export interface OrderDTO {
  id: number;
  orderNumber: string;
  userId: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  city: string;
  shippingAddress: string;
  notes: string | null;
  createdAt: string;
  items: OrderItemDTO[];
}

export interface SupplierDTO {
  id: number;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  purchaseCount?: number;
  createdAt: string;
}

export interface PurchaseItemDTO {
  id: number;
  productId: number;
  productName: string;
  productSlug: string;
  quantity: number;
  unitCostCents: number;
  receivedQuantity: number;
  lineTotalCents: number;
}

export interface PurchaseDTO {
  id: number;
  purchaseNumber: string;
  supplierId: number;
  supplierName?: string;
  status: PurchaseStatus;
  orderedAt: string | null;
  receivedAt: string | null;
  totalCents: number;
  notes: string | null;
  createdAt: string;
  items: PurchaseItemDTO[];
}

export interface ClientDTO {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  createdAt: string;
  orderCount: number;
  totalSpentCents: number;
  lastOrderAt: string | null;
}

export interface PaginatedDTO<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface OverviewDTO {
  revenueCents: number;
  orderCount: number;
  pendingOrderCount: number;
  customerCount: number;
  productCount: number;
  lowStockCount: number;
  openPurchaseCount: number;
  recentOrders: OrderDTO[];
  lowStockProducts: ProductDTO[];
  recentPurchases: PurchaseDTO[];
}
