import authenticationRoute from "./authentication/index.mjs"
import { Router } from "express"

const router = Router();

router.use(authenticationRoute)

export default router;