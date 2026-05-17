import { Server as httpServerType } from "node:http";
import { Server, Socket } from "socket.io";
import {
  RedisService,
  redisService,
  TokenService,
} from "../../common/services";
import { IAuthSocket } from "../../common/types/express.types";
import { chatGateway } from "../chat";

export class RealtimeGateWay {
  // to avoid any no initializer and is not definitely assigned in the constructor value error we use (!)
  private io!: Server;
  private tokenService: TokenService;
  private redisService: RedisService;
  constructor() {
    this.tokenService = new TokenService();
    this.redisService = redisService;
  }
  socketAuthentication = async (socket: Socket, next: any) => {
    try {
      const { userAccount, decodedToken } = await this.tokenService.decodeToken(
        {
          token:
            socket.handshake.auth.authorization ||
            socket.handshake.headers.authorization,
        },
      );
      // to pass data further from the middleware we use the roaming data for the socketIo
      socket.data = { userAccount, decodedToken };
      await this.redisService.addSocket(userAccount._id, socket.id);
      next();
    } catch (error) {
      //next param triggers the connect_error if it detects the error object
      next(error);
    }
  };
  initializeIo = (httpServer: httpServerType) => {
    this.io = new Server(httpServer, {
      cors: {
        origin: [
          "http://localhost:5500",
          "http://localhost:3000",
          "http://127.0.0.1:5500",
        ],
      },
    });
    // io middleware
    this.io.use(this.socketAuthentication);
    // to check the established connection
    this.io.on("connection", async (socket: IAuthSocket) => {
      chatGateway.registerEvents(socket, this.io);
      socket.on("sayHi", (data, callback) => {
        //////////////Socket.Io notes
        // console.log(data);
        // {
        // to send a message to the frontend when they emit a sayHi request
        // callback("Backend to Frontend");
        // io.emit sends the response to everyone and every open tab meanwhile socket.emit only sends a response to the one listening on the event
        // io.emit("hello", { 3: "4" });
        ////////////////////////////////////////////
        // this sends a response to everyone or every tab except the one who triggered the event
        // socket.broadcast.emit("hello", { 3: "4" });
        ////////////////////////////////////////////
        // this is commonly used to send a message to a certain person or a group of people
        // this sends the response "backend connected" to everyone in an array or a single person but not to the person who initiated the event
        // socket
        //   .to(connections.at(-2) as string)
        //   .emit("sayHi", "backend connected");
        // socket.to(connections).emit("sayHi", "backend connected");
        ////////////////////////////////////////////
        // the io.to sends a response to everyone including the one that initiated the event
        // io.to([connections.at(-2), connections.at(-3)] as string[]).emit(
        //   "sayHi",
        //   "Backend Connected IO to",
        // );
        ////////////////////////////////////////////
        // this is used to exclude someone from an event triggered by the user and the response doesn't also include the initializer.
        // socket.except().emit("sayHi","Backend Connected IO to")
        // io.except() is used to deliver a response to the user who triggered the event unlike socket.except()
        // io.except().emit("sayHi","Backend Connected IO to")
        // }
      });
      // handling offline status
      socket.on("disconnect", async () => {
        await this.redisService.removeSocket(socket.data.user._id, socket.id);
        const connections =
          (await this.redisService.getSockets(socket.data.user._id)) || [];
        if (connections.length < 1) {
          this.io.emit("user_offline", {
            userId: socket.data.user._id,
            status: "Offline",
          });
        }
      });
    });

    // multiplexing is when you create multiple connection channels
    // io.of("admin").on("connection", (socket) => {
    //   console.log(socket.id, "admin");
    // });
  };
  getIo = () => this.io;
}

export const realtimeGateway = new RealtimeGateWay();
