import authenticationRoute from "./authentication/index.mjs"
import adminRoute from "./admin/index.mjs"
import { Router } from "express"

const router = Router();

router.use(authenticationRoute)
router.use(adminRoute)

export default router;