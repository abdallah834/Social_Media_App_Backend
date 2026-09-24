import { IAuthenticatedUser } from "../../../common/types/express.types";
import {
  PaginateDTO,
  paginationValidationSchema,
} from "../../../common/validation";
import { GQLAuthorization, GqlValidation } from "../../../middleware";
import { endpoint } from "../../user/user.authorization";
import { ReactToPostGQLArgsDTO } from "../post.dto";

import { postService, PostService } from "../post.service";
import { gqlReactToPost } from "../post.validation";

export class PostResolver {
  private postService: PostService;

  constructor() {
    this.postService = postService;
  }
  listPosts = async (
    parent: unknown,
    args: PaginateDTO,
    { user, decodedToken }: IAuthenticatedUser,
  ) => {
    GQLAuthorization(endpoint.profile, user);
    await GqlValidation<PaginateDTO>(paginationValidationSchema.query, args);
    const data = await this.postService.allPosts(args, user);
    return { message: "listed posts", data };
  };
  reactToPost = async (
    parent: unknown,
    { postId, react }: ReactToPostGQLArgsDTO,
    { user, decodedToken }: IAuthenticatedUser,
  ) => {
    await GqlValidation<ReactToPostGQLArgsDTO>(gqlReactToPost, {
      postId,
      react,
    });
    const data = await this.postService.reactToPost(
      { postId },
      { react },
      user,
    );
    return { message: "react applied to post", data };
  };
}
export const postResolver = new PostResolver();
