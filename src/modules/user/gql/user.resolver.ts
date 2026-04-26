import { HydratedDocument } from "mongoose";
import userService, { UserService } from "../user.service";
import { IUser } from "../../../common/interfaces";

export class UserResolver {
  private userService: UserService;
  constructor() {
    this.userService = userService;
  }
  profile = async (parent: unknown, args: { search?: string }) => {
    //authentication
    //validation
    //authorization
    // this keyword can't be accessed therefore it will be undefined and in order to fix that issue we use an arrow function instead to inherit the (this) keyword

    const data = await this.userService.profile({} as HydratedDocument<IUser>);
    return { message: "User", data };
  };
}

export const userGQLResolver = new UserResolver();
