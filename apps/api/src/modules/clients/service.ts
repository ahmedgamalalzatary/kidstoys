import type { ClientDetailDTO, ClientDTO } from "@kidstoys/shared";
import { ApiError } from "../../shared/errors";
import { toOrderDTO } from "../orders/mappers";
import { toClientDTO } from "./mappers";
import {
  findClientById,
  listClients,
  listItemsForClientOrders,
  listOrdersForClient,
} from "./repository";

export async function listCustomers(q?: string): Promise<ClientDTO[]> {
  return (await listClients(q)).map(toClientDTO);
}

export async function getCustomerForAdmin(id: number): Promise<ClientDetailDTO> {
  const client = await findClientById(id);
  if (!client) throw ApiError.notFound("That customer could not be found");

  const orders = await listOrdersForClient(id);
  const items = await listItemsForClientOrders(orders.map((order) => order.id));
  return {
    ...toClientDTO(client),
    orders: orders.map((order) =>
      toOrderDTO(order, items.filter((item) => item.orderId === order.id)),
    ),
  };
}
