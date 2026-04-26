import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import { successResponse } from "../../common/response";
import {
  cloudFileUpload,
  fileFieldValidation,
} from "../../common/utils/multer";
import { authentication, validation } from "../../middleware";
import { commentService } from "./comment.service";
import * as validators from "./comment.validation";
import { CreateCommentParamsDto, CreateReplyParamsDto } from "./comment.dto";
import { IComment } from "../../common/interfaces";

const router = Router({ mergeParams: true });

router.post(
  "/",
  authentication(),
  cloudFileUpload({ validation: fileFieldValidation.image }).array(
    "attachments",
    2,
  ),
  validation(validators.createComment),
  async (req: Request, res: Response, next: NextFunction) => {
    const comment = await commentService.createComment(
      req.params as CreateCommentParamsDto,
      req.body,
      req.user,
    );
    successResponse<IComment>({
      res,
      message: "Comment created successfully",
      data: comment,
      status: 201,
    });
  },
);
router.post(
  "/:commentId/reply",
  authentication(),
  cloudFileUpload({ validation: fileFieldValidation.image }).array(
    "attachments",
    2,
  ),
  validation(validators.commentReplies),
  async (req: Request, res: Response, next: NextFunction) => {
    const comment = await commentService.createCommentReply(
      req.params as CreateReplyParamsDto,
      req.body,
      req.user,
    );
    successResponse<IComment>({
      res,
      message: "Reply created successfully",
      data: comment,
      status: 201,
    });
  },
);

export default router;
