import {
  CompleteMultipartUploadCommandOutput,
  DeleteObjectCommand,
  DeleteObjectCommandOutput,
  DeleteObjectsCommand,
  DeleteObjectsCommandOutput,
  GetObjectCommand,
  GetObjectCommandOutput,
  ListObjectsV2Command,
  ListObjectsV2CommandOutput,
  ObjectCannedACL,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import {
  AWS_ACCESS_KEY_ID,
  AWS_BUCKET_NAME,
  AWS_EXPIRES_IN,
  AWS_REGION,
  AWS_SECRET_ACCESS_KEY,
} from "../../config/config";
import { StorageApproachEnum, UploadApproachEnum } from "../../enums";
import { internalServerError } from "../../exceptions";
/////////////////// implementing AWS-S3 bucket cloud storage for uploaded files
export class S3Service {
  private client: S3Client;
  constructor() {
    this.client = new S3Client({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
      },
    });
  }
  async uploadAsset({
    storageApproach = StorageApproachEnum.MEMORY,
    Bucket = "Social_App",
    path = "General",
    file,
    ACL = ObjectCannedACL.private,
    ContentType,
  }: {
    storageApproach?: StorageApproachEnum;
    Bucket?: string | undefined;
    path?: string;
    file: Express.Multer.File;
    ACL?: ObjectCannedACL;
    ContentType?: string | undefined;
  }): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: AWS_BUCKET_NAME,
      Key: `Social_App/${path}/${randomUUID()}__${file.originalname}`,
      ACL,
      Body:
        storageApproach === StorageApproachEnum.MEMORY
          ? file.buffer
          : createReadStream(file.path),
      ContentType: file.mimetype || ContentType,
    });
    if (!command.input.Key) {
      throw new internalServerError("Failed to upload this asset");
    }
    await this.client.send(command);
    return command.input?.Key;
  }
  async uploadLargeAssets({
    storageApproach = StorageApproachEnum.DISK,
    Bucket = "Social_App",
    path = "General",
    file,
    ACL = ObjectCannedACL.private,
    ContentType,
    partSize = 5,
  }: {
    storageApproach?: StorageApproachEnum;
    Bucket?: string | undefined;
    path?: string;
    file: Express.Multer.File;
    ACL?: ObjectCannedACL;
    ContentType?: string | undefined;
    partSize?: number;
  }): Promise<CompleteMultipartUploadCommandOutput> {
    const uploadFile = new Upload({
      client: this.client,
      params: {
        Bucket: AWS_BUCKET_NAME,
        Key: `Social_App/${path}/${randomUUID()}__${file.originalname}`,
        ACL,
        Body:
          storageApproach === StorageApproachEnum.MEMORY
            ? file.buffer
            : createReadStream(file.path),
        ContentType: file.mimetype || ContentType,
      },
      partSize: partSize * 1024 * 1024,
    });
    uploadFile.on("httpUploadProgress", (progress) => {
      console.log(progress);
      console.log(
        `File upload is at ${((progress.loaded as number) / (progress.total as number)) * 100}%`,
      );
    });
    return await uploadFile.done();
  }
  async uploadMultipleAssets({
    storageApproach = StorageApproachEnum.MEMORY,
    uploadApproach = UploadApproachEnum.SMALL,
    Bucket,
    path = "General",
    files,
    ACL = ObjectCannedACL.private,
    ContentType,
  }: {
    storageApproach?: StorageApproachEnum;
    uploadApproach?: UploadApproachEnum;
    Bucket?: string;
    path?: string;
    files: Express.Multer.File[];
    ACL?: ObjectCannedACL;
    ContentType?: string;
  }): Promise<string[]> {
    let urls: string[] = [];
    if (uploadApproach === UploadApproachEnum.LARGE) {
      const data = await Promise.all(
        files.map((file) => {
          return this.uploadLargeAssets({
            storageApproach,
            file,
            ACL,
            Bucket,
            ContentType,
            path,
          });
        }),
      );
      urls = data.map((urls) => urls.Key as string);
    } else {
      await Promise.all(
        files.map((file) => {
          return this.uploadAsset({
            storageApproach,
            file,
            ACL,
            Bucket,
            ContentType,
            path,
          });
        }),
      );
    }

    return urls;
  }
  //////////// creating a presigned link for file upload
  async createPresignedUploadLink({
    Bucket = AWS_BUCKET_NAME,
    path,
    ContentType,
    expiresIn = AWS_EXPIRES_IN,
    originalName,
  }: {
    Bucket?: string | undefined;
    path?: string | undefined;
    ContentType: string;
    expiresIn?: number;
    originalName: string;
  }): Promise<{ url: string; Key: string }> {
    const command = new PutObjectCommand({
      Bucket,
      Key: `Social_App/${path}/${randomUUID()}__${originalName}`,
      ContentType,
    });
    const url = await getSignedUrl(this.client, command, {
      expiresIn,
    });
    if (!command.input.Key) {
      throw new internalServerError("Failed to upload this asset");
    }
    return { url, Key: command.input.Key };
  }
  //////////// creating a presigned link for getting or fetching file

  async createPresignedFetchLink({
    Bucket = AWS_BUCKET_NAME,
    Key,
    expiresIn = AWS_EXPIRES_IN,
    filename,
    download,
  }: {
    Bucket?: string | undefined;
    Key: string;
    expiresIn?: number;
    filename?: string;
    download?: string;
  }): Promise<string> {
    const command = new GetObjectCommand({
      Bucket,
      // Key is received by the params from front-end
      Key,
      ResponseContentDisposition:
        download === "true"
          ? `attachment; filename="${filename || Key.split("/").pop()}"`
          : undefined,
    });
    const url = await getSignedUrl(this.client, command, {
      expiresIn,
    });
    if (!Key) {
      throw new internalServerError(
        "Failed to get this asset no specified key received",
      );
    }
    return url;
  }
  ///////////// getting and deleting assets
  async getAsset({
    Bucket = "Social_App",
    Key,
  }: {
    Bucket?: string | undefined;
    Key: string;
  }): Promise<GetObjectCommandOutput> {
    // to fetch or get an existing asset/file we use GetObjectCommand()
    const command = new GetObjectCommand({
      Bucket: AWS_BUCKET_NAME,
      // the key is received from the frontend in order to get the specified file
      Key,
    });
    if (!Key) {
      throw new internalServerError(
        "Failed to get this asset no specified key received",
      );
    }
    return await this.client.send(command);
  }
  async deleteMultipleAssets({
    Bucket = "Social_App",
    Keys,
  }: {
    Bucket?: string | undefined;
    Keys: { Key: string }[];
  }): Promise<DeleteObjectsCommandOutput> {
    const command = new DeleteObjectsCommand({
      Bucket: AWS_BUCKET_NAME,
      Delete: {
        Objects: Keys,
        // Quiet returns extra info about the deleted file it's true by default
        Quiet: false,
      },
    });
    if (!Keys) {
      throw new internalServerError(
        "Failed to get this asset no specified key received",
      );
    }
    return await this.client.send(command);
  }
  async deleteAsset({
    Bucket = "Social_App",
    Key,
  }: {
    Bucket?: string | undefined;
    Key: string;
  }): Promise<DeleteObjectCommandOutput> {
    const command = new DeleteObjectCommand({
      Bucket: AWS_BUCKET_NAME,
      Key,
    });
    if (!Key) {
      throw new internalServerError(
        "Failed to get this asset no specified key received",
      );
    }
    return await this.client.send(command);
  }
  async listFolderDir({
    Bucket = "Social_App",
    prefix,
  }: {
    Bucket?: string | undefined;
    prefix: string;
  }): Promise<ListObjectsV2CommandOutput> {
    const command = new ListObjectsV2Command({
      Bucket,
      Prefix: `Social_App/${prefix}`,
    });
    if (!prefix) {
      throw new internalServerError(
        "A prefix is required in order to list folder dir",
      );
    }
    return await this.client.send(command);
  }
  async deleteFolderByPrefix({
    Bucket = "Social_App",
    prefix,
  }: {
    Bucket?: string | undefined;
    prefix: string;
  }): Promise<DeleteObjectsCommandOutput> {
    const result = await this.listFolderDir({ Bucket, prefix });
    const keys = result.Contents?.map((content) => {
      return { Key: content.Key };
    }) as { Key: string }[];
    return await this.deleteMultipleAssets({ Bucket, Keys: keys });
  }
}
export const s3Service = new S3Service();
