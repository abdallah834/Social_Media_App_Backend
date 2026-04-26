import { Types } from "mongoose";
import { GenderEnum, RoleEnum } from "../enums";

export interface IUser {
  firstName: string;
  lastName: string;
  slug: string;
  username?: string;
  email: string;
  password?: string;
  phone?: string;
  bio?: string;
  friends?: Types.ObjectId[] | IUser[];
  DOB?: Date;
  provider: number;
  confirmedAt?: Date;
  profileImage?: string;
  coverImages?: string[];
  role: RoleEnum;
  gender: GenderEnum;
  createdAt?: Date;
  updatedAt?: Date;
  paranoid?: boolean;
  deletedAt?: Date;
  restoredAt?: Date;
  changedCredentialsTime?: Date;
}
