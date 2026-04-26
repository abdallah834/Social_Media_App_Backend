import { postListArgs } from "./post.args.gql";
import { PostResolver, postResolver } from "./post.resolver";
import { postListType } from "./post.types.gql";

export class PostGQLSchema {
  private postResolver: PostResolver;
  constructor() {
    this.postResolver = postResolver;
  }
  registerQuery() {
    return {
      // fields
      postList: {
        type: postListType,
        args: postListArgs,
        /////////// the argument is resolve not resolver...
        resolve: this.postResolver.listPosts,
      },
    };
  }
  registerMutation() {
    return {
      // fields
      // postList: {
      //   type: postListType,
      //   args: postListArgs,
      //   /////////// the argument is resolve not resolver...
      //   resolve: this.postResolver.listPosts,
      // },
    };
  }
}

export const postGQLSchema = new PostGQLSchema();
