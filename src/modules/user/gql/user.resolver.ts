import { IAuthenticatedUser } from "../../../common/types/express.types";
import { GQLAuthorization, GqlValidation } from "../../../middleware";
import { endpoint } from "../../user/user.authorization";
import userService, { UserService } from "../user.service";
import { profileGQLValidation } from "../user.valdation";
export class UserResolver {
  private userService: UserService;

  constructor() {
    this.userService = userService;
  }
  profile = async (
    parent: unknown,
    args: { search?: string },
    /////////// destructuring the current user data along with their decoded JWTPayload info from the bootstrap auth middleware.
    { user, decodedToken }: IAuthenticatedUser,
  ) => {
    //authentication
    //validation
    //authorization
    GQLAuthorization(endpoint.profile, user);
    await GqlValidation<{ search?: string }>(profileGQLValidation, args);
    // this keyword can't be accessed therefore it will be undefined and in order to fix that issue we use an arrow function instead to inherit the (this) keyword
    const data = await this.userService.profile(user);
    return { message: "User", data };
  };
}

export const userGQLResolver = new UserResolver();
