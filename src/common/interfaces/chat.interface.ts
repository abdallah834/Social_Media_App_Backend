import { Types } from "mongoose";
import { IUser } from "./user.interface";
import { ChatParticipantsEnum } from "../enums";
export interface IMessage {
  attachments?: string[];
  likes?: Types.ObjectId[] | IUser[];
  tags?: Types.ObjectId[] | IUser[];
  content?: string;
  createdBy: Types.ObjectId | IUser;
  updatedBy: Types.ObjectId | IUser;
  createdAt: Date;
  deletedAt?: Date;
  restoredAt?: Date;
  updatedAt?: Date;
}
export interface IChat {
  participants: Types.ObjectId[] | IUser[];
  messages?: IMessage[];
  type: ChatParticipantsEnum;
  // OVM
  groupName: string;
  groupImage: string;
  roomId: string;

  createdBy: Types.ObjectId | IUser;
  updatedBy: Types.ObjectId | IUser;
  createdAt: Date;
  deletedAt?: Date;
  restoredAt?: Date;
  updatedAt?: Date;
}
