import { JwtPayload } from "jsonwebtoken";
import { HydratedDocument } from "mongoose";
import { IUser } from "../interfaces";
import { Socket } from "socket.io";
declare global {
  namespace Express {
    interface Request {
      user: HydratedDocument<IUser>;
      decoded: JwtPayload;
    }
  }
}

export interface IAuthenticatedUser {
  user: HydratedDocument<IUser>;
  decoded: JwtPayload;
}

export interface IAuthSocket extends Socket {
  data: IAuthenticatedUser;
}
