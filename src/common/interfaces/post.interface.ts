import { Types } from "mongoose";
import { AvailabilityEnum } from "../enums";
import { IUser } from "./user.interface";

interface IPostLikes {
  user: Types.ObjectId;
  react: number;
}
export interface IPost {
  folderId: string;
  content?: string;
  attachments?: string[];
  likes?: IPostLikes[] | IUser[];
  tags?: Types.ObjectId[] | IUser[];
  availability: AvailabilityEnum;
  createdBy: Types.ObjectId | IUser;
  updatedBy: Types.ObjectId | IUser;
  createdAt: Date;
  deletedAt?: Date;
  restoredAt?: Date;
  updatedAt?: Date;
}
