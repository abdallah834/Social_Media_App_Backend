import type { JwtPayload, SignOptions } from "jsonwebtoken";
import jwt from "jsonwebtoken";
import { HydratedDocument, Types } from "mongoose";
import { randomUUID } from "node:crypto";
import {
  ACCESS_TOKEN_EXPIRATION_TIME,
  REFRESH_TOKEN_EXPIRATION_TIME,
  SYS_REFRESH_TOKEN_SECRET_KEY,
  SYSTEM_TOKEN_SECRET_KEY,
  USER_REFRESH_TOKEN_SECRET_KEY,
  USER_TOKEN_SECRET_KEY,
} from "../../config/config";
import { AudienceEnum, RoleEnum } from "../../enums";
import { BadRequestException, UnauthorizedException } from "../../exceptions";
import { IUser } from "../../interfaces";
import { redisService, RedisService } from "../redis";
import { UserRepo } from "./../../../DB/repository/user.repo";
import { TokenType } from "./../../enums/token.enums";
type SignaturesType = {
  accessSignature: string | undefined;
  refreshSignature: string | undefined;
};

export class TokenService {
  private readonly userRepo: UserRepo;
  private readonly redisRepo: RedisService;

  constructor() {
    this.userRepo = new UserRepo();
    this.redisRepo = redisService;
  }
  //////////////////////// Core functionality
  sign({
    payload,
    secretOrPrivateKey = USER_TOKEN_SECRET_KEY,
    options,
  }: {
    payload: object;
    secretOrPrivateKey?: string | undefined;
    options?: SignOptions;
  }): string {
    return jwt.sign(payload, secretOrPrivateKey as string, options);
  }
  verify({
    token,
    secretOrPrivateKey = USER_TOKEN_SECRET_KEY,
  }: {
    token: string;
    secretOrPrivateKey: string | undefined;
  }): JwtPayload {
    return jwt.verify(token, secretOrPrivateKey as string) as JwtPayload;
  }
  ///////////////////// JWT helper functions

  async getTokenSignature(role: RoleEnum | string | undefined): Promise<{
    signatures: SignaturesType;
    audience: AudienceEnum | string;
  }> {
    let signatures: SignaturesType;
    let audience = AudienceEnum.USER;
    switch (role) {
      case RoleEnum.ADMIN:
        signatures = {
          accessSignature: SYSTEM_TOKEN_SECRET_KEY,
          refreshSignature: SYS_REFRESH_TOKEN_SECRET_KEY,
        };

        audience = AudienceEnum.SYSTEM;
        break;
      default:
        signatures = {
          accessSignature: USER_TOKEN_SECRET_KEY,
          refreshSignature: USER_REFRESH_TOKEN_SECRET_KEY,
        };
        audience = AudienceEnum.USER;
        break;
    }
    return { signatures, audience };
  }

  async getSignatureLevel(
    tokenType = TokenType.ACCESS,
    signatureLevel: RoleEnum | undefined,
  ): Promise<string | undefined> {
    let signatures = (await this.getTokenSignature(signatureLevel)).signatures;
    let result;
    switch (tokenType) {
      case TokenType.REFRESH:
        result = signatures.refreshSignature;
        break;
      default:
        result = signatures.accessSignature;
        break;
    }
    return result;
  }

  async createLoginTokens(
    user: HydratedDocument<IUser>,
    issuer: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    // const { accessSignature, refreshSignature, audience } = (
    //   await this.getTokenSignature(user.role)
    // ).signatures;

    const [accessAndRefreshSigns, audience] = await Promise.all([
      (await this.getTokenSignature(user.role)).signatures,
      (await this.getTokenSignature(user.role)).audience,
    ]);

    const jtId = randomUUID();
    const accessToken = this.sign({
      payload: { sub: user._id },
      options: {
        issuer,
        audience: [
          TokenType.ACCESS as unknown as string,
          audience as unknown as string,
        ],
        expiresIn: Number(ACCESS_TOKEN_EXPIRATION_TIME),
        jwtid: jtId,
      },
    });
    const refreshToken = this.sign({
      payload: { sub: user._id },
      secretOrPrivateKey: accessAndRefreshSigns.refreshSignature,
      options: {
        issuer,
        audience: [
          TokenType.REFRESH as unknown as string,
          audience as unknown as string,
        ],
        expiresIn: Number(REFRESH_TOKEN_EXPIRATION_TIME),
        jwtid: jtId,
      },
    });
    return { accessToken, refreshToken };
  }

  async decodeToken({
    token,
    tokenType = TokenType.ACCESS,
  }: {
    token: string;
    tokenType?: TokenType | undefined;
  }): Promise<{
    userAccount: HydratedDocument<IUser>;
    decodedToken: JwtPayload;
  }> {
    const decodedToken = jwt.decode(token) as JwtPayload;
    if (!decodedToken?.aud?.length || decodedToken?.aud?.length <= 1) {
      throw new BadRequestException("Failed to decode token without audience");
    }

    const [decodedTokenType, audienceType] = decodedToken.aud;

    ///////////////
    const numDecodedTokenType = Number(decodedTokenType);
    const numAudienceType = Number(audienceType);
    if (numDecodedTokenType !== tokenType) {
      throw new BadRequestException("Invalid token type");
    }
    if (
      decodedToken.jti &&
      (await this.redisRepo.redisGet(
        this.redisRepo.redisRevokeTokenKey({
          userId: decodedToken.sub,
          jti: decodedToken.jti,
        }),
      ))
    ) {
      throw new UnauthorizedException("Invalid login token");
    }

    const signatureLevel = await this.getSignatureLevel(
      numDecodedTokenType,
      numAudienceType,
    );
    const { accessSignature, refreshSignature } = (
      await this.getTokenSignature(signatureLevel)
    ).signatures;
    // console.log({ accessSignature, refreshSignature });
    const verifiedData = this.verify({
      token,
      secretOrPrivateKey:
        tokenType === TokenType.REFRESH ? refreshSignature : accessSignature,
    });
    const userAccount = await this.userRepo.findOne({
      filter: { _id: verifiedData.sub },
    });
    if (!userAccount) {
      throw new UnauthorizedException("Not registered account");
    }

    if (
      userAccount.changedCredentialsTime &&
      userAccount.changedCredentialsTime?.getTime() >=
        ((decodedToken.iat as number) || 0) * 1000
    ) {
      throw new UnauthorizedException("Invalid login session");
    }

    return { userAccount, decodedToken };
  }
  async createRevokeToken({
    userId,
    jti,
    ttl,
  }: {
    userId: string | Types.ObjectId | undefined;
    jti: string | undefined;
    ttl: number | undefined;
  }) {
    await this.redisRepo.redisSet({
      key: this.redisRepo.redisRevokeTokenKey({ userId, jti }),
      value: jti,
      ttl,
    });
    return;
  }
}
