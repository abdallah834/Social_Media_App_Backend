import z from "zod";
import { createPost, reactPost, updatePost } from "./post.validation";

export type CreatePostBodyDto = z.infer<typeof createPost.body>;
export type UpdatePostBodyDto = z.infer<typeof updatePost.body>;
export type UpdatePostParamsDto = z.infer<typeof updatePost.params>;
export type ReactToPostQueryDTO = z.infer<typeof reactPost.query>;
export type ReactToPostParamsDTO = z.infer<typeof reactPost.params>;
