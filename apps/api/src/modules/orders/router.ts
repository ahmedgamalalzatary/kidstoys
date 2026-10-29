import { Router } from "express";
import { checkoutSchema } from "@kidstoys/shared";
import { requireAuth } from "../../shared/middleware/auth";
import { parseBody } from "../../shared/validation";
import { getCustomerOrder, listCustomerOrders, placeOrder } from "./service";

const router = Router();

router.use(requireAuth);

router.get("/orders", async (req, res) => {
  res.status(200).json(await listCustomerOrders(req.user!.id));
});

router.get("/orders/:orderNumber", async (req, res) => {
  res.status(200).json(await getCustomerOrder(req.user!.id, req.params.orderNumber));
});

router.post("/orders", async (req, res) => {
  const input = parseBody(checkoutSchema, req.body);
  const order = await placeOrder(req.user!.id, req.user!, input);
  res.status(201).json(order);
});

export { router as ordersRouter };
