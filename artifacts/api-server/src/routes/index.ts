import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import slackRouter from "./slack";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(slackRouter);

export default router;
