import { and, eq } from "drizzle-orm";
import { cartItems, db, products } from "@kidstoys/db";

export interface CartItemRow {
  cartItemId: number;
  quantity: number;
  productId: number;
  productName: string;
  productSlug: string;
  productImages: string[];
  priceCents: number;
  stock: number;
}

const cartItemColumns = {
  cartItemId: cartItems.id,
  quantity: cartItems.quantity,
  productId: products.id,
  productName: products.name,
  productSlug: products.slug,
  productImages: products.images,
  priceCents: products.priceCents,
  stock: products.stock,
};

/** Every cart line of a customer, with the current product details. */
export async function listCartItems(userId: number): Promise<CartItemRow[]> {
  return db
    .select(cartItemColumns)
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .where(eq(cartItems.userId, userId));
}

export async function findCartItem(
  userId: number,
  productId: number,
): Promise<CartItemRow | null> {
  const [row] = await db
    .select(cartItemColumns)
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .where(and(eq(cartItems.userId, userId), eq(cartItems.productId, productId)))
    .limit(1);

  return row ?? null;
}

export async function findProduct(productId: number) {
  const [row] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  return row ?? null;
}

/** Writes the quantity of a cart line, creating the line when it is new. */
export async function saveCartItem(
  userId: number,
  productId: number,
  quantity: number,
): Promise<void> {
  const existing = await db
    .select({ id: cartItems.id })
    .from(cartItems)
    .where(and(eq(cartItems.userId, userId), eq(cartItems.productId, productId)))
    .limit(1);

  if (existing[0]) {
    await db
      .update(cartItems)
      .set({ quantity })
      .where(and(eq(cartItems.userId, userId), eq(cartItems.productId, productId)));
    return;
  }

  await db.insert(cartItems).values({ userId, productId, quantity });
}

export async function deleteCartItem(userId: number, productId: number): Promise<void> {
  await db
    .delete(cartItems)
    .where(and(eq(cartItems.userId, userId), eq(cartItems.productId, productId)));
}

export async function deleteAllCartItems(userId: number): Promise<void> {
  await db.delete(cartItems).where(eq(cartItems.userId, userId));
}
