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

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  shipped: "Shipped",
  delivered: "Delivered",
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

export type CharacterDTO = CategoryDTO;

export interface AgeGroupDTO {
  id: number;
  name: string;
  slug: string;
  startAge: number;
  endAge: number | null;
  isActive: boolean;
  productCount?: number;
}

export interface CharacterRefDTO {
  id: number;
  name: string;
  slug: string;
}

export interface AgeGroupRefDTO extends CharacterRefDTO {
  startAge: number;
  endAge: number | null;
}

export interface ProductDTO {
  id: number;
  name: string;
  slug: string;
  sku: string | null;
  shortDescription: string | null;
  description: string;
  priceCents: number;
  buyPriceCents?: number;
  compareAtCents: number | null;
  categoryId: number;
  categoryName?: string;
  categorySlug?: string;
  images: string[];
  videoUrl: string | null;
  stock: number;
  minStock: number;
  isActive: boolean;
  isNew: boolean;
  isBestSeller: boolean;
  characters: CharacterRefDTO[];
  ageGroups: AgeGroupRefDTO[];
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

export interface ClientDetailDTO extends ClientDTO {
  orders: OrderDTO[];
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
  costOfGoodsSoldCents: number;
  grossProfitCents: number;
  orderCount: number;
  pendingOrderCount: number;
  customerCount: number;
  productCount: number;
  lowStockCount: number;
  recentOrders: OrderDTO[];
  lowStockProducts: ProductDTO[];
}
