import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import { successResponse } from "../../common/response";
import {
  cloudFileUpload,
  fileFieldValidation,
} from "../../common/utils/multer";
import { authentication, validation } from "../../middleware";
import {
  ReactToPostParamsDTO,
  ReactToPostQueryDTO,
  UpdatePostParamsDto,
} from "./post.dto";
import { postService } from "./post.service";
import * as validators from "./post.validation";
import {
  PaginateDTO,
  paginationValidationSchema,
} from "../../common/validation";
import { commentRouter } from "../comment";
const router = Router();
router.use("/:postId/comment", commentRouter);

//////////////////create post
router.post(
  "/",
  authentication(),
  cloudFileUpload({ validation: fileFieldValidation.image }).array(
    "attachments",
    2,
  ),
  validation(validators.createPost),
  async (req: Request, res: Response, next: NextFunction) => {
    const data = await postService.createPost(
      {
        ...req.body,
        files: req.files,
      },
      req.user,
    );
    successResponse({ res, message: "Post created successfully", data });
  },
);

///////////////// Update post
router.patch(
  "/update/:postId",
  authentication(),
  cloudFileUpload({ validation: fileFieldValidation.image }).array("files", 2),
  validation(validators.updatePost),
  async (req: Request, res: Response, next: NextFunction) => {
    const updateResult = await postService.updatePost(
      req.params as UpdatePostParamsDto,
      {
        ...req.body,
        files: req.files,
      },
      req.user,
    );

    successResponse({ res, message: "Post updated", data: updateResult });
  },
);
//////////////////get all posts
router.get(
  "/list",
  authentication(),
  validation(paginationValidationSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    const posts = await postService.allPosts(
      req.query as PaginateDTO,
      req.user,
    );
    successResponse({ res, message: "All posts", data: posts });
  },
);
//////////////////liking a post

router.patch(
  "/:postId",
  authentication(),
  validation(validators.reactPost),
  async (req: Request, res: Response, next: NextFunction) => {
    const posts = await postService.reactToPost(
      req.params as ReactToPostParamsDTO,
      req.query as unknown as ReactToPostQueryDTO,
      req.user,
    );
    successResponse({ res, message: "All posts", data: posts });
  },
);
export default router;
