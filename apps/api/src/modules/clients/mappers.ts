import type { ClientDTO } from "@kidstoys/shared";

export interface ClientRow {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  createdAt: Date;
  orderCount: number;
  totalSpentCents: number | string;
  lastOrderAt: Date | string | null;
}

export function toClientDTO(row: ClientRow): ClientDTO {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    city: row.city,
    createdAt: row.createdAt.toISOString(),
    orderCount: Number(row.orderCount),
    totalSpentCents: Number(row.totalSpentCents),
    lastOrderAt: row.lastOrderAt ? new Date(row.lastOrderAt).toISOString() : null,
  };
}
