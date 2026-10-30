import { Router } from "express";
import { adminOrderQuerySchema, checkoutSchema, orderUpdateSchema } from "@kidstoys/shared";
import { requireAuth, requireRole } from "../../shared/middleware/auth";
import { parseBody, parseId, parseQuery } from "../../shared/validation";
import {
  getCustomerOrder,
  listCustomerOrders,
  listOrdersForAdmin,
  placeOrder,
  updateOrderByAdmin,
} from "./service";

const router = Router();
const adminRouter = Router();

router.use("/orders", requireAuth);

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

adminRouter.use(requireRole("admin"));

adminRouter.get("/orders", async (req, res) => {
  const query = parseQuery(adminOrderQuerySchema, req.query);
  res.status(200).json(await listOrdersForAdmin(query));
});

adminRouter.patch("/orders/:id", async (req, res) => {
  const input = parseBody(orderUpdateSchema, req.body);
  res.status(200).json(await updateOrderByAdmin(parseId(req.params.id), input));
});

export { router as ordersRouter, adminRouter as ordersAdminRouter };
