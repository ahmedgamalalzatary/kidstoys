import type { UserDTO } from "@kidstoys/shared";

export interface UserRowLike {
  id: number;
  name: string;
  email: string;
  role: "client" | "admin";
  phone: string | null;
  city: string | null;
  address: string | null;
  createdAt: Date;
}

export function toUserDTO(row: UserRowLike): UserDTO {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    phone: row.phone,
    city: row.city,
    address: row.address,
    createdAt: row.createdAt.toISOString(),
  };
}
