import { HydratedDocument, Types } from "mongoose";
import {
  BadRequestException,
  NotFoundException,
} from "../../common/exceptions";
import { IComment, IPost, IUser } from "../../common/interfaces";
import {
  notificationService,
  NotificationService,
  redisService,
  RedisService,
} from "../../common/services";
import { getPostsAvailability } from "../../common/utils/post";
import { CommentRepo, PostRepo, UserRepo } from "../../DB/repository";
import {
  S3Service,
  s3Service,
} from "./../../common/services/aws-sdk/s3.service";
import {
  CreateCommentBodyDto,
  CreateCommentParamsDto,
  CreateReplyBodyDto,
  CreateReplyParamsDto,
} from "./comment.dto";

export class CommentService {
  private readonly userRepo: UserRepo;
  private readonly redis: RedisService;
  private readonly commentRepo: CommentRepo;
  private readonly notification: NotificationService;
  private readonly postRepo: PostRepo;
  private readonly s3: S3Service;
  constructor() {
    this.userRepo = new UserRepo();
    this.redis = redisService;
    this.postRepo = new PostRepo();
    this.notification = notificationService;
    this.s3 = s3Service;
    this.commentRepo = new CommentRepo();
  }
  async createComment(
    { postId }: CreateCommentParamsDto,
    { content, files, tags }: CreateCommentBodyDto,
    user: HydratedDocument<IUser>,
  ): Promise<IComment> {
    const post = await this.postRepo.findOne({
      filter: { _id: postId, $or: getPostsAvailability(user) },
    });
    if (!post) {
      throw new BadRequestException("Failed to comment on this post");
    }
    const mentions: Types.ObjectId[] = [];
    const fcmTokens: string[] = [];
    if (tags?.length) {
      const mentionedAccounts = await this.userRepo.find({
        // testing to check if the tagged user exists in the users collection
        filter: { _id: { $in: tags } },
      });
      if (mentionedAccounts.length !== tags.length) {
        throw new NotFoundException("Couldn't find mentioned user accounts");
      }
      tags.map(async (tag) => {
        mentions.push(Types.ObjectId.createFromHexString(tag));
        ((await this.redis.getFCMs(tag)) || []).map((token) => {
          fcmTokens.push(token);
        });
      });
    }
    let attachments: string[] = [];
    const folderId = post.folderId;

    if (files?.length) {
      attachments = await this.s3.uploadMultipleAssets({
        files: files as Express.Multer.File[],
        path: `Post/${folderId}`,
      });
    }
    const comment = await this.commentRepo.createOne({
      data: {
        createdBy: user._id,
        content,
        attachments,
        postId: post._id,
        tags: mentions,
      },
    });
    if (!comment) {
      if (attachments?.length) {
        /////////// s3 multiple files functions require a certain format for the Keys {Key:attachment||Key}
        await this.s3.deleteMultipleAssets({
          Keys: attachments.map((attachment) => {
            return { Key: attachment };
          }),
        });
      }
      throw new BadRequestException("Failed to create comment");
    }
    if (fcmTokens.length) {
      await this.notification.sendMultipleNotifications({
        data: {
          title: "Comment mention",
          body: JSON.stringify({
            message: `${user.username} mentioned you in a recent comment`,
            postId: post._id,
            commentId: comment._id,
          }),
        },
        tokens: fcmTokens,
      });
    }
    return comment.toJSON();
  }
  async createCommentReply(
    { postId, commentId }: CreateReplyParamsDto,
    { content, files, tags }: CreateReplyBodyDto,
    user: HydratedDocument<IUser>,
  ): Promise<IComment> {
    const comment = await this.commentRepo.findOne({
      filter: { _id: commentId, postId },
      options: {
        populate: [
          { path: "postId", match: { $or: getPostsAvailability(user) } },
        ],
      },
    });

    if (!comment?.postId) {
      throw new BadRequestException("Failed to reply to this comment");
    }
    const mentions: Types.ObjectId[] = [];
    const fcmTokens: string[] = [];
    if (tags?.length) {
      const mentionedAccounts = await this.userRepo.find({
        // testing to check if the tagged user exists in the users collection
        filter: { _id: { $in: tags } },
      });
      if (mentionedAccounts.length !== tags.length) {
        throw new NotFoundException("Couldn't find mentioned user accounts");
      }
      tags.map(async (tag) => {
        mentions.push(Types.ObjectId.createFromHexString(tag));
        ((await this.redis.getFCMs(tag)) || []).map((token) => {
          fcmTokens.push(token);
        });
      });
    }
    let attachments: string[] = [];
    const post = comment.postId as HydratedDocument<IPost>;
    const folderId = post.folderId;

    if (files?.length) {
      attachments = await this.s3.uploadMultipleAssets({
        files: files as Express.Multer.File[],
        path: `Post/${folderId}`,
      });
    }
    const reply = await this.commentRepo.createOne({
      data: {
        createdBy: user._id,
        content,
        attachments,
        postId: comment.postId,
        commentId: comment._id,
        tags: mentions,
      },
    });
    if (!reply) {
      if (attachments?.length) {
        /////////// s3 multiple files functions require a certain format for the Keys {Key:attachment||Key}
        await this.s3.deleteMultipleAssets({
          Keys: attachments.map((attachment) => {
            return { Key: attachment };
          }),
        });
      }
      throw new BadRequestException("Failed to create reply");
    }
    if (fcmTokens.length) {
      await this.notification.sendMultipleNotifications({
        data: {
          title: "Comment mention",
          body: JSON.stringify({
            message: `${user.username} mentioned you in a recent reply`,
            postId: post._id,
            commentId: comment._id,
            replyId: reply._id,
          }),
        },
        tokens: fcmTokens,
      });
    }
    return reply.toJSON();
  }
  // async updateComment(
  //   { postId }: UpdatePostParamsDto,
  //   {
  //     availability,
  //     content,
  //     files,
  //     tags,
  //     removeFiles,
  //     removeTags,
  //   }: UpdatePostBodyDto,
  //   user: HydratedDocument<IUser>,
  // ) {
  //   const post = await this.postRepo.findOne({
  //     filter: {
  //       _id: postId,
  //       createdBy: user._id,
  //     },
  //   });

  //   // handling if not posts are found for this user
  //   if (!post) {
  //     throw new NotFoundException("Failed to find posts for this user");
  //   }
  //   // handling if the user is trying to create an empty post
  //   if (
  //     !content &&
  //     !post?.content &&
  //     !files?.length &&
  //     (removeFiles?.length ?? 0) >= (post.attachments?.length ?? 0)
  //   ) {
  //     throw new BadRequestException("Posts can't be empty");
  //   }
  //   const mentions: Types.ObjectId[] = [];
  //   const fcmTokens: string[] = [];
  //   if (tags?.length) {
  //     const mentionedAccounts = await this.userRepo.find({
  //       // testing to check if the tagged user exists in the users collection
  //       filter: { _id: { $in: tags } },
  //     });
  //     if (mentionedAccounts.length !== tags.length) {
  //       throw new NotFoundException("Couldn't find mentioned user accounts");
  //     }
  //     if (tags.length) {
  //       await Promise.all(
  //         tags.map(async (tag) => {
  //           mentions.push(Types.ObjectId.createFromHexString(tag));
  //           ((await this.redis.getFCMs(tag)) || []).forEach((token) => {
  //             fcmTokens.push(token);
  //           });
  //         }),
  //       );
  //     }
  //   }
  //   const folderId = post.folderId;
  //   let attachments: string[] = [];
  //   if (files?.length) {
  //     attachments = await this.s3.uploadMultipleAssets({
  //       files: files as Express.Multer.File[],
  //       path: `Post/${folderId}`,
  //     });
  //   }
  //   ///////////// using update aggregation pipeline
  //   const updatedPost = await this.postRepo.findOneAndUpdate({
  //     filter: { _id: postId, createdBy: user._id },
  //     update: [
  //       {
  //         $set: {
  //           content: content ?? post.content,
  //           availability: Number(availability ?? post.availability),
  //           folderId,
  //           attachments: {
  //             $setUnion: [
  //               {
  //                 $setDifference: [
  //                   { $ifNull: ["$attachments", []] },
  //                   removeFiles ?? [],
  //                 ],
  //               },
  //               attachments,
  //             ],
  //           },
  //           tags: {
  //             $setUnion: [
  //               {
  //                 $setDifference: [
  //                   "$tags",
  //                   (removeTags ?? []).map((tag) =>
  //                     Types.ObjectId.createFromHexString(tag),
  //                   ),
  //                 ],
  //               },
  //               mentions.map((id) => id),
  //             ],
  //           },
  //         },
  //       },
  //     ],
  //   });
  //   if (!updatedPost) {
  //     if (attachments?.length) {
  //       /////////// s3 multiple files functions require a certain format for the Keys =====> {Key:attachment||Key}
  //       await this.s3.deleteMultipleAssets({
  //         Keys: attachments.map((attachment) => {
  //           return { Key: attachment };
  //         }),
  //       });
  //     }
  //     throw new BadRequestException("Failed to create post");
  //   }
  //   if (removeFiles?.length) {
  //     /////////// s3 multiple files functions require a certain format for the Keys =====> {Key:attachment||Key}
  //     await this.s3.deleteMultipleAssets({
  //       Keys: removeFiles.map((file) => {
  //         return { Key: file };
  //       }),
  //     });
  //   }
  //   // handling login from multiple browsers
  //   if (fcmTokens.length) {
  //     await this.notification.sendMultipleNotifications({
  //       data: {
  //         title: "Post mention",
  //         body: JSON.stringify({
  //           message: `${user.username} mentioned you in a recent post`,
  //           postId: post,
  //         }),
  //       },
  //       tokens: fcmTokens,
  //     });
  //   }

  //   return updatedPost.toJSON();
  // }

  // async reactToComment(
  //   { postId }: ReactToPostParamsDTO,
  //   { react }: ReactToPostQueryDTO,
  //   user: HydratedDocument<IUser>,
  // ) {
  //   // const currentPost = await this.postRepo.findOne({
  //   //   filter: { likes:{} },
  //   // });
  //   // console.log(currentPost);
  //   const post = await this.postRepo.findOneAndUpdate({
  //     filter: { _id: postId, $or: getPostsAvailability(user) },
  //     update: {
  //       // implementing like / remove like functionality
  //       ...(Number(react) > ReactEnums.REMOVE_LIKE
  //         ? { $addToSet: { likes: { user: user._id, react: Number(react) } } }
  //         : { $pull: { likes: user._id, react } }),
  //     },
  //   });
  //   if (!post) {
  //     throw new NotFoundException(
  //       "You are not eligible to like this user's post",
  //     );
  //   }
  //   return post.toJSON();
  // }
}

export const commentService = new CommentService();
