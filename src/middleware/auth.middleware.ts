import type { Request, NextFunction, Response } from "express";
import { TokenType } from "../common/enums";
import { BadRequestException } from "../common/exceptions";
import { TokenService } from "../common/services";

export const authentication = (tokenType: TokenType = TokenType.ACCESS) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const tokenService = new TokenService();
    if (!req.headers?.authorization) {
      throw new BadRequestException("Missing authorization key");
    }
    // using bearer token
    const { authorization } = req.headers;
    const [flag, token] = authorization.split(" ");

    if (!flag || !token) {
      throw new BadRequestException("Missing authorization parts");
    }
    switch (flag) {
      default: {
        // "Bearer"
        const { decodedToken, userAccount } = await tokenService.decodeToken({
          token,
          tokenType,
        });
        req.user = userAccount;
        req.decoded = decodedToken;
        break;
      }
    }
    next();
  };
};
