import { HydratedDocument } from "mongoose";
import { postService, PostService } from "../post.service";
import { IUser } from "../../../common/interfaces";

export class PostResolver {
  private postService: PostService;
  constructor() {
    this.postService = postService;
  }
  listPosts = async (parent: unknown, args: any) => {
    const data = await this.postService.allPosts(
      args,
      {} as HydratedDocument<IUser>,
    );
    return { message: "listed posts", data };
  };
}
export const postResolver = new PostResolver();
