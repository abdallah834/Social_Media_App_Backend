import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import { Types } from "mongoose";
import { StorageApproachEnum, TokenType } from "../../common/enums";
import { successResponse } from "../../common/response";
import { s3Service } from "../../common/services";
import {
  cloudFileUpload,
  fileFieldValidation,
} from "../../common/utils/multer";
import { authentication, authorization } from "../../middleware";
import { endpoint } from "./user.authorization";
import userService from "./user.service";

const router = Router();
router.get(
  "/profile",
  authentication(),
  authorization(endpoint.profile),
  async (req: Request, res: Response, next: NextFunction) => {
    const data = await userService.profile(req.user);
    return successResponse({ res, data });
  },
);

router.post(
  "/logout",
  authentication(),
  async (req: Request, res: Response, next: NextFunction) => {
    const data = await userService.logout(
      req.body,
      req.user,
      req.decoded as { jti: string; iat: number; sub: string | Types.ObjectId },
    );
    return successResponse({
      res,
      data,
      message:
        req.body.flag === 0
          ? "Logged out from all devices successfully"
          : "Logged out from one device successfully",
    });
  },
);
router.post(
  "/rotateToken",
  authentication(TokenType.REFRESH),
  async (req: Request, res: Response, next: NextFunction) => {
    const data = await userService.rotateToken(
      req.user,
      req.decoded as { jti: string; iat: number; sub: string | Types.ObjectId },
      `${req.protocol}://${req.host}`,
    );
    return successResponse({
      res,
      message: "Updated profile image successfully",
      data,
    });
  },
);
////////////////////////////////////////////////////// profile images
// uploading a single file to Disk or memory
router.patch(
  "/profile-image",
  authentication(),
  //////////////// using multer with AWS-S3Bucket
  // for files to be stored in memory we pass the storageApproach to the cloudFileUpload function must be a buffer and for disk must be a string
  // validation,
  // cloudFileUpload({
  //   // storageApproach: StorageApproachEnum.DISK,
  //   storageApproach: StorageApproachEnum.MEMORY,
  //   validation: fileFieldValidation.image,
  // }).single("attachment"),
  async (req: Request, res: Response, next: NextFunction) => {
    const data = await userService.profileImage(req.body, req.user);
    return successResponse({ res, data });
  },
);
// uploading multiple files to disk or memory
router.patch(
  "/profile-cover-images",
  authentication(),
  // for files to be stored in memory we pass the storageApproach to the cloudFileUpload function must be a buffer and for disk must be a string
  // validation,
  cloudFileUpload({
    // storageApproach: StorageApproachEnum.DISK,
    storageApproach: StorageApproachEnum.MEMORY,
    validation: fileFieldValidation.image,
  }).array("attachments", 2),
  async (req: Request, res: Response, next: NextFunction) => {
    const data = await userService.profileCoverImages(
      req.files as Express.Multer.File[],
      req.user,
    );
    return successResponse({
      res,
      message: "Updated profile cover images successfully",
      data,
    });
  },
);
/////////////////returning a presigned url to front end in order to get a file
router.get(
  "/presigned/*path",
  async (req: Request, res: Response, next: NextFunction) => {
    // destructuring filename from query in order to set the downloaded file name
    const { download, filename } = req.query as {
      download: string;
      filename: string;
    };
    const { path } = req.params as { path: string[] };
    const Key = path.join("/");
    const url = await s3Service.createPresignedFetchLink({
      Key,
      download,
      filename,
    });
    //////reading and writing the returned S3 stream from Body to res
    // {
    // the result of getting a specific file or asset from the s3 bucket is a stream and therefore we use pipeline along with promisify
    // const { Body, ContentType } = await s3Service.getAsset({ Key });
    // console.log(Body, ContentType);
    // // to specify the content type of the file to front end
    // res.setHeader("Content-Type", ContentType || "application/octet-stream");
    // // we use res.set("Cross-Origin-Resource-Policy", "cross-origin") to set Cross-Origin-Resource-Policy to cross-origin in order to avoid any conflicts with the front-end
    // res.set("Cross-Origin-Resource-Policy", "cross-origin");
    // // if we would like to download a file from the S3 bucket we use the following line
    // if (download === "true") {
    //   res.setHeader(
    //     "Content-Disposition",
    //     `attachment; filename="${filename || Key.split("/").pop()}"`,
    //   );
    // }
    // we read the stream from the Body and we write the stream to the res
    // return await s3WriteStream(Body as NodeJS.ReadableStream, res);
    // successResponse({ res, data: { params: req.params, Key, responseFile } });
    // }
    // returns a presigned url tha's valid for 2 minutes
    return successResponse({ res, data: { url } });
  },
);
/////////////////Deleting multiple user files/assets

router.delete(
  "/",
  authentication(),
  async (req: Request, res: Response, next: NextFunction) => {
    const data = await userService.deleteProfile(req.user);
    successResponse({ res, message: "Account deleted successfully", data });
  },
);

export default router;
