import type { CartDTO, CartItemDTO } from "@kidstoys/shared";
import { ApiError } from "../../shared/errors";
import { toCartItemDTO, toCartDTO } from "./mappers";
import {
  deleteCartItem,
  findCartItem,
  findProduct,
  listCartItems,
  saveCartItem,
} from "./repository";
import { assertProductIsAvailable, clampQuantity, shippingFor } from "./rules";

export async function getCart(userId: number): Promise<CartDTO> {
  const rows = await listCartItems(userId);
  return toCartDTO(rows);
}

export async function addToCart(
  userId: number,
  productId: number,
  requestedQuantity: number,
): Promise<CartDTO> {
  const product = await findProduct(productId);
  if (!product || !product.isActive) {
    throw ApiError.notFound("That product no longer exists");
  }

  assertProductIsAvailable(product.stock, product.name);

  const existing = await findCartItem(userId, productId);
  const quantity = clampQuantity((existing?.quantity ?? 0) + requestedQuantity, product.stock);

  await saveCartItem(userId, productId, quantity);

  return getCart(userId);
}

export async function setCartQuantity(
  userId: number,
  productId: number,
  requestedQuantity: number,
): Promise<CartDTO> {
  const existing = await findCartItem(userId, productId);
  if (!existing) {
    throw ApiError.notFound("That product is not in your cart");
  }

  const quantity = clampQuantity(requestedQuantity, existing.stock);

  if (quantity === 0) {
    await deleteCartItem(userId, productId);
  } else {
    await saveCartItem(userId, productId, quantity);
  }

  return getCart(userId);
}

export async function removeFromCart(userId: number, productId: number): Promise<CartDTO> {
  const existing = await findCartItem(userId, productId);
  if (!existing) {
    throw ApiError.notFound("That product is not in your cart");
  }

  await deleteCartItem(userId, productId);

  return getCart(userId);
}

/** Folds a guest cart into the signed-in cart. Unknown, withdrawn or sold-out products are skipped. */
export async function mergeCart(
  userId: number,
  items: { productId: number; quantity: number }[],
): Promise<CartDTO> {
  for (const item of items) {
    const product = await findProduct(item.productId);
    if (!product || !product.isActive || product.stock <= 0) {
      continue;
    }

    const existing = await findCartItem(userId, item.productId);
    const quantity = clampQuantity((existing?.quantity ?? 0) + item.quantity, product.stock);

    await saveCartItem(userId, item.productId, quantity);
  }

  return getCart(userId);
}

export { toCartItemDTO, toCartDTO, shippingFor };
export type { CartDTO, CartItemDTO };
