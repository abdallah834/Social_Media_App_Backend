import { HydratedDocument, Types } from "mongoose";
import { REFRESH_TOKEN_EXPIRATION_TIME } from "../../common/config/config";
import {
  LoggedOutDevices,
  StorageApproachEnum,
  UploadApproachEnum,
} from "../../common/enums";
import { ConflictException, NotFoundException } from "../../common/exceptions";
import { IUser } from "../../common/interfaces";
import {
  redisService,
  RedisService,
  s3Service,
  S3Service,
  TokenService,
} from "../../common/services";
import { UserRepo } from "../../DB/repository/user.repo";

export class UserService {
  private readonly userRepo: UserRepo;
  private readonly redis: RedisService;
  private readonly tokenService: TokenService;
  private readonly s3: S3Service;
  constructor() {
    this.userRepo = new UserRepo();
    this.tokenService = new TokenService();
    this.redis = redisService;
    this.s3 = s3Service;
  }
  async profile(user: HydratedDocument<IUser>): Promise<any> {
    const userProfile = await this.userRepo.findOne({
      filter: {
        _id: user._id,
      },
      options: { populate: [{ path: "friends" }] },
    });
    if (!userProfile) {
      throw new NotFoundException("No user matches this info");
    }
    return userProfile.toJSON();
  }
  async profileImage(
    {
      ContentType,
      originalName,
    }: { ContentType: string; originalName: string },
    user: HydratedDocument<IUser>,
  ): Promise<{ user: IUser; url: string }> {
    ///////////////// uploading small assets to (memory) using uploadAsset function
    // user.profileImage = await this.s3.uploadAsset({
    //   file,
    //   path: `Users/${user._id.toString()}/Profile`,
    //   // in order to have assets saved to disk storage we enable it from the controller and uncomment that line
    //   // storageApproach: StorageApproachEnum.DISK,
    // });

    ///////////////// uploading large assets to (disk) using uploadLargeAssets function
    // const { Key } = await this.s3.uploadLargeAssets({
    //   file,
    //   path: `Users/${user._id.toString()}/Profile`,
    //   // in order to have assets saved to disk storage we enable it from the controller and uncomment that line
    //   storageApproach: StorageApproachEnum.DISK,
    // });
    // user.profileImage = Key as string;
    // await user.save();
    // return user.toJSON();
    // const oldImage = user.profileImage;
    const { url } = await this.s3.createPresignedUploadLink({
      path: `Users/${user._id.toString()}/Profile-Image`,
      ContentType,
      originalName,
    });
    // // storing the key after creating the presigned upload link then saving
    // user.profileImage = Key as string;
    // //deleting any old profile images from S3 and replacing them with a newer one from database as well
    // if (oldImage) {
    //   await this.s3.deleteAsset({ Key: oldImage });
    // }
    // await user.save();
    return { user, url };
  }
  async profileCoverImages(
    files: Express.Multer.File[],
    user: HydratedDocument<IUser>,
  ) {
    const oldUrls = user.coverImages;
    const urls = await this.s3.uploadMultipleAssets({
      files,
      path: `Users/${user._id.toString()}/Profile/CoverImages`,
      // in order to have assets saved to disk storage we enable it from the controller
      // large files have to be stored to disk storage
      storageApproach: StorageApproachEnum.DISK,
      uploadApproach: UploadApproachEnum.LARGE,
    });
    user.coverImages = urls;
    if (oldUrls?.length) {
      await this.s3.deleteMultipleAssets({
        Keys: oldUrls.map((url) => {
          return { Key: url };
        }),
      });
    }
    await user.save();
    return user.toJSON();
  }
  async logout(
    { flag }: { flag: LoggedOutDevices },
    user: HydratedDocument<IUser>,
    {
      jti,
      iat,
      sub,
    }: { jti: string; iat: number; sub: string | Types.ObjectId },
  ): Promise<number> {
    let statusCode = 200;
    // implementing logout from multiple devices or one device
    switch (flag) {
      case LoggedOutDevices.ALL:
        await this.userRepo.findByIdAndUpdate({
          _id: user._id,
          update: { changedCredentialsTime: new Date() },
        });
        await this.redis.redisDelKeys(
          await this.redis.redisKeys(this.redis.redisBaseRevokeTokenKey(sub)),
        );
        statusCode = 201;

        break;

      default:
        await this.tokenService.createRevokeToken({
          userId: sub,
          jti,
          ttl: iat + Number(REFRESH_TOKEN_EXPIRATION_TIME),
        });
        statusCode = 201;
        break;
    }

    return statusCode;
  }

  async rotateToken(
    user: HydratedDocument<IUser>,
    {
      sub,
      jti,
      iat,
    }: { jti: string; iat: number; sub: string | Types.ObjectId },
    issuer: string,
  ) {
    // checking if the token is about to expire (5mins before expiration at least 25min passed)

    if (Date.now() - iat < 25 * 60 * 1000) {
      throw new ConflictException("Current access token is still valid");
    }
    await this.tokenService.createRevokeToken({
      userId: sub,
      jti,
      ttl: iat + Number(REFRESH_TOKEN_EXPIRATION_TIME),
    });

    return await this.tokenService.createLoginTokens(user, issuer);
  }
  async deleteProfile(user: HydratedDocument<IUser>) {
    const userAccount = await this.userRepo.deleteOne({
      filter: { _id: user._id, force: true },
    });
    if (!userAccount.deletedCount) {
      throw new NotFoundException("No matching accounts found with this ID");
    }
    await this.s3.deleteFolderByPrefix({
      prefix: `Users/${user.id}`,
    });
    return userAccount;
  }
}

export default new UserService();
