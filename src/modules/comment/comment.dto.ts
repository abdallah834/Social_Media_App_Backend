import z from "zod";
import { commentReplies, createComment } from "./comment.validation";
/////////////////////comment
export type CreateCommentBodyDto = z.infer<typeof createComment.body>;
export type CreateCommentParamsDto = z.infer<typeof createComment.params>;
/////////////////////reply
export type CreateReplyParamsDto = z.infer<typeof commentReplies.params>;
export type CreateReplyBodyDto = z.infer<typeof commentReplies.body>;
// export type UpdatePostBodyDto = z.infer<typeof updatePost.body>;
// export type ReactToPostQueryDTO = z.infer<typeof reactPost.query>;
// export type ReactToPostParamsDTO = z.infer<typeof reactPost.params>;
