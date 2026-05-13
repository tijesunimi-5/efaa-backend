import authenticationRoute from "./authentication/index.mjs";
import adminRoute from "./admin/index.mjs";
import topicRoute from "./topics/route.mjs";
import protocolRoute from "./protocol/route.mjs";
import { Router } from "express";

const router = Router();

router.use(authenticationRoute);
router.use(adminRoute);
router.use(topicRoute);
router.use(protocolRoute);

export default router;
