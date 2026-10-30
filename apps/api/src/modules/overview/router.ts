import { Router } from "express";
import { requireRole } from "../../shared/middleware/auth";
import { getOverview } from "./service";

const router = Router();
router.get("/overview", requireRole("admin"), async (_req, res) => {
  res.status(200).json(await getOverview());
});

export { router as overviewAdminRouter };
