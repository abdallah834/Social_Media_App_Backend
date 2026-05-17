import { Server } from "socket.io";
import { IAuthSocket } from "../../../common/types/express.types";
import { chatService, ChatService } from "../chat.service";
import { SocketIoValidation } from "../../../middleware";
import * as socketValidators from "../chat.validation";
import { redisService, RedisService } from "../../../common/services";
export class ChatEvents {
  private chatService: ChatService;
  private redisService: RedisService;
  constructor() {
    this.chatService = chatService;
    this.redisService = redisService;
  }
  sayHi = (socket: IAuthSocket, io?: Server) => {
    return socket.on("sayHi", async (socketData: { name: string }) => {
      try {
        SocketIoValidation<{ name: string }>(
          socketValidators.sayHi,
          socketData,
        );
        console.log(socketData);
        const data = this.chatService.sayHi();
        socket.emit("sayHi", data);
      } catch (error) {
        socket.emit("custom_error", error);
      }
    });
  };
  sendMessageEvent = (socket: IAuthSocket, io?: Server) => {
    return socket.on(
      "sendMessage",
      async ({ content, sendTo }: { sendTo: string; content: string }) => {
        try {
          // SocketIoValidation<{ sendTo: string; content: string }>(
          //   socketValidators.sendMessage,
          //   socketData,
          // );
          await this.chatService.sendMessage(
            { content, sendTo },
            socket.data.user,
          );
          // after saving the message to the DB we trigger a successMessage event for frontend to listen to
          io?.to(
            // getting redis current socket to listen to the message getting saved to the db
            await this.redisService.getSockets(socket.data.user._id),
          ).emit("successMessage", {
            content,
            sendTo,
          });
          const messageReceiverSocketIds =
            await this.redisService.getSockets(sendTo);
          if (messageReceiverSocketIds.length) {
            socket.to(messageReceiverSocketIds).emit("newMessage", {
              content,
              from: socket.data.user,
            });
          }
        } catch (error) {
          socket.emit("custom_error", error);
        }
      },
    );
  };
  sendGroupMessageEvent = (socket: IAuthSocket, io?: Server) => {
    return socket.on(
      "sendGroupMessage",
      async ({ content, groupId }: { groupId: string; content: string }) => {
        try {
          // SocketIoValidation<{ sendTo: string; content: string }>(
          //   socketValidators.sendMessage,
          //   socketData,
          // );
          const roomId = await this.chatService.sendGroupMessage(
            { content, groupId },
            socket.data.user,
          );
          // after saving the message to the DB we trigger a successMessage event for frontend to listen to
          io?.to(
            // getting redis current socket to listen to the message getting saved to the db
            await this.redisService.getSockets(socket.data.user._id),
          ).emit("successMessage", {
            content,
            sendTo: groupId,
          });
          socket.to(roomId).emit("newMessage", {
            content,
            groupId,
          });
          // const messageReceiverSocketIds =
          //   await this.redisService.getSockets(groupId);
          // if (messageReceiverSocketIds.length) {
          //   socket.to(messageReceiverSocketIds).emit("newMessage", {
          //     content,
          //     from: socket.data.userAccount,
          //   });
          // }
        } catch (error) {
          socket.emit("custom_error", error);
        }
      },
    );
  };
  joinRoom = (socket: IAuthSocket, io?: Server) => {
    return socket.on("join_room", async (roomId: string) => {
      try {
        socket.join(roomId);
      } catch (error) {
        console.log(error);
        socket.emit("custom_error", error);
      }
    });
  };
}
export const chatEvents = new ChatEvents();
