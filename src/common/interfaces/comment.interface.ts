import { Types } from "mongoose";
import { IPost } from "./post.interface";
import { IUser } from "./user.interface";

interface IPostLikes {
  user: Types.ObjectId;
  react: number;
}
export interface IComment {
  content?: string;
  attachments?: string[];
  likes?: IPostLikes[] | IUser[];
  tags?: Types.ObjectId[] | IUser[];
  postId: Types.ObjectId | IPost;
  commentId: Types.ObjectId | IComment;
  createdBy: Types.ObjectId | IUser;
  updatedBy: Types.ObjectId | IUser;
  createdAt: Date;
  deletedAt?: Date;
  restoredAt?: Date;
  updatedAt?: Date;
}
