import {
  S3Service,
  s3Service,
} from "./../../common/services/aws-sdk/s3.service";
import { HydratedDocument, Types } from "mongoose";
import { IChat, IUser } from "../../common/interfaces";
import { ChatRepo, UserRepo } from "../../DB/repository";
import { NotFoundException } from "../../common/exceptions";
import { ChatParticipantsEnum } from "../../common/enums";
import { randomUUID } from "node:crypto";

export class ChatService {
  private chatRepo: ChatRepo;
  private userRepo: UserRepo;
  private s3Service: S3Service;
  constructor() {
    this.chatRepo = new ChatRepo();
    this.userRepo = new UserRepo();
    this.s3Service = s3Service;
  }
  sayHi = () => {
    return "Hi";
  };
  async getChat(
    participantId: string,
    { page, size }: { page?: string; size?: string },
    user: HydratedDocument<IUser>,
  ): Promise<IChat> {
    const chat = await this.chatRepo.findOneChat({
      filter: {
        participants: {
          $all: [user._id, Types.ObjectId.createFromHexString(participantId)],
        },
        type: ChatParticipantsEnum.ovo,
      },
      options: {
        populate: [{ path: "participants" }],
      },
      page,
      size,
    });
    if (!chat) {
      throw new NotFoundException(
        "There are no chats between you and this user",
      );
    }
    return chat.toJSON();
  }
  sendMessage = async (
    { content, sendTo }: { content: string; sendTo: string },
    user: HydratedDocument<IUser>,
  ) => {
    // const checkUserFriendsList=await this.userRepo.findOne({})
    let chat = await this.chatRepo.findOneAndUpdate({
      filter: {
        participants: {
          $all: [user._id, Types.ObjectId.createFromHexString(sendTo)],
        },
        type: ChatParticipantsEnum.ovo,
      },
      update: {
        $addToSet: {
          messages: {
            content,
            createdBy: user._id,
          },
        },
      },
    });
    if (!chat) {
      await this.chatRepo.createOne({
        data: {
          participants: [user._id, Types.ObjectId.createFromHexString(sendTo)],
          createdBy: user._id,
          type: ChatParticipantsEnum.ovo,
          messages: [
            {
              content,
              createdBy: user._id,
            },
          ],
        },
      });
    }
  };

  async createGroupChat(
    {
      participantIds,
      groupName,
    }: { participantIds: string[]; groupName: string },
    user: HydratedDocument<IUser>,
    file?: Express.Multer.File,
  ) {
    // to create a unique list of userIds we use
    const participantObjectIds = [
      ...new Set(
        participantIds.map((id) => Types.ObjectId.createFromHexString(id)),
      ),
    ];
    const checkExistingParticipants = await this.userRepo.find({
      filter: {
        _id: { $in: participantObjectIds },
        friends: { $in: [user._id] },
      },
    });

    if (checkExistingParticipants.length != participantObjectIds.length) {
      throw new NotFoundException("Failed to find all participants");
    }
    let groupImage: string | undefined = undefined;
    const roomId = randomUUID();
    const path = `Chat/group/${roomId}`;
    if (file) {
      groupImage = await this.s3Service.uploadAsset({ file, path });
    }
    const groupChat = await this.chatRepo.createOne({
      data: {
        participants: [...participantIds, user._id],
        createdBy: user._id,
        messages: [],
        type: ChatParticipantsEnum.ovm,
        roomId,
        groupName,
        groupImage,
      },
    });
    return groupChat.toJSON();
  }
  async getGroupChat(
    groupId: string,
    { page, size }: { page?: string; size?: string },
    user: HydratedDocument<IUser>,
  ): Promise<IChat> {
    const chat = await this.chatRepo.findOneChat({
      filter: {
        _id: Types.ObjectId.createFromHexString(groupId),
        participants: {
          $all: [user._id],
        },
        type: ChatParticipantsEnum.ovm,
      },
      options: {
        populate: [{ path: "participants" }, { path: "messages.createdBy" }],
      },
      page,
      size,
    });
    if (!chat) {
      throw new NotFoundException(
        "There are no chats between you and this user",
      );
    }
    return chat.toJSON();
  }

  async sendGroupMessage(
    { content, groupId }: { content: string; groupId: string },
    user: HydratedDocument<IUser>,
  ): Promise<string> {
    let chat = await this.chatRepo.findOneAndUpdate({
      filter: {
        _id: Types.ObjectId.createFromHexString(groupId),
        participants: { $in: [user._id] },
        type: ChatParticipantsEnum.ovm,
      },
      update: { $addToSet: { messages: { content, createdBy: user._id } } },
    });
    if (!chat) {
      throw new NotFoundException("No group chat messages were found");
    }
    return chat.roomId;
  }
}
export const chatService = new ChatService();
