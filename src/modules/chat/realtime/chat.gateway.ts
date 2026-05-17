import { Server } from "socket.io";
import { IAuthSocket } from "../../../common/types/express.types";
import { chatEvents, ChatEvents } from "./chat.events";

export class ChatGateway {
  private chatEvents: ChatEvents;
  constructor() {
    this.chatEvents = chatEvents;
  }
  registerEvents = (socket: IAuthSocket, io: Server) => {
    this.chatEvents.sayHi(socket, io);
    this.chatEvents.sendMessageEvent(socket, io);
    this.chatEvents.sendGroupMessageEvent(socket, io);
    this.chatEvents.joinRoom(socket, io);
  };
}

export const chatGateway = new ChatGateway();
