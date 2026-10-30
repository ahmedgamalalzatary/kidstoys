import { Router } from "express";
import { adminClientQuerySchema } from "@kidstoys/shared";
import { requireRole } from "../../shared/middleware/auth";
import { parseId, parseQuery } from "../../shared/validation";
import { getCustomerForAdmin, listCustomers } from "./service";

const router = Router();
router.use(requireRole("admin"));

router.get("/clients", async (req, res) => {
  const query = parseQuery(adminClientQuerySchema, req.query);
  res.status(200).json(await listCustomers(query.q));
});

router.get("/clients/:id", async (req, res) => {
  res.status(200).json(await getCustomerForAdmin(parseId(req.params.id)));
});

export { router as clientsAdminRouter };
