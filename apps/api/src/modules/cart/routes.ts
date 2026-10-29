import { Router } from "express";
import { cartAddSchema, cartMergeSchema, cartQuantitySchema } from "@kidstoys/shared";
import { requireAuth } from "../../shared/middleware/auth";
import { parseBody } from "../../shared/validation";
import { addToCart, getCart, mergeCart, removeFromCart, setCartQuantity } from "./service";

const router = Router();

router.use(requireAuth);

router.get("/cart", async (req, res) => {
  res.status(200).json(await getCart(req.user!.id));
});

router.post("/cart/items", async (req, res) => {
  const input = parseBody(cartAddSchema, req.body);
  res.status(200).json(await addToCart(req.user!.id, input.productId, input.quantity));
});

router.patch("/cart/items/:productId", async (req, res) => {
  const input = parseBody(cartQuantitySchema, req.body);
  res.status(200).json(await setCartQuantity(req.user!.id, Number(req.params.productId), input.quantity));
});

router.delete("/cart/items/:productId", async (req, res) => {
  res.status(200).json(await removeFromCart(req.user!.id, Number(req.params.productId)));
});

router.post("/cart/merge", async (req, res) => {
  const input = parseBody(cartMergeSchema, req.body);
  res.status(200).json(await mergeCart(req.user!.id, input.items));
});

export { router as cartRouter };
