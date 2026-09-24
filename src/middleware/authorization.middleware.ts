import type { NextFunction, Request, Response } from "express";
import { HydratedDocument } from "mongoose";
import { RoleEnum } from "../common/enums";
import {
  ForbiddenException,
  UnauthorizedException,
} from "../common/exceptions";
import { mapGQLError } from "../common/exceptions/gql.excepitions";
import { IUser } from "../common/interfaces";
export const authorization = (accessRoles: RoleEnum[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!accessRoles.includes(req.user?.role)) {
      throw new UnauthorizedException("Access denied");
    }
    next();
  };
};
export const GQLAuthorization = (
  accessRoles: RoleEnum[],
  user: HydratedDocument<IUser>,
) => {
  if (!accessRoles.includes(user?.role)) {
    throw mapGQLError(new ForbiddenException("Access denied"));
  }
  return true;
};
