import { Router } from "express";
import { authentication } from "../../middleware";
import type { Request, Response, NextFunction } from "express";
import { successResponse } from "../../common/response";
import { chatService } from "./chat.service";
import {
  cloudFileUpload,
  fileFieldValidation,
} from "../../common/utils/multer";
const router = Router({ mergeParams: true });

router.get(
  "/",
  authentication(),
  async (req: Request, res: Response, next: NextFunction) => {
    const chat = await chatService.getChat(
      req.params.userId as string,
      req.query as { page: string; size: string },
      req.user,
    );
    successResponse({ res, message: "Getting messages", data: { chat } });
  },
);
router.post(
  "/group",
  authentication(),
  cloudFileUpload({ validation: fileFieldValidation.image }).single(
    "attachment",
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    const chat = await chatService.createGroupChat(
      req.body,
      req.user,
      req.file as Express.Multer.File,
    );
    successResponse({ res, message: "Group message sent", data: { chat } });
  },
);
router.get(
  "/group/:groupId",
  authentication(),
  async (req: Request, res: Response, next: NextFunction) => {
    const chat = await chatService.getGroupChat(
      req.params.groupId as string,
      req.query,
      req.user,
    );
    successResponse({ res, message: "Getting group messages", data: { chat } });
  },
);
export default router;
