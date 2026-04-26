import type { Request } from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { StorageApproachEnum } from "../../enums";
import { fileFilter } from "./validation.multer";

export const cloudFileUpload = ({
  storageApproach = StorageApproachEnum.MEMORY,
  validation = [],
  maxSize = 2,
}: {
  storageApproach?: StorageApproachEnum;
  validation?: string[];
  maxSize?: number;
}) => {
  ///// storing uploaded files in RAM for better read/write performance or (maybe use SSD to store)
  // const storage = multer.memoryStorage();
  const storage =
    storageApproach === StorageApproachEnum.MEMORY
      ? multer.memoryStorage()
      : multer.diskStorage({
          destination(
            req: Request,
            file: Express.Multer.File,
            callback: (error: Error | null, destination: string) => void,
          ) {
            callback(null, tmpdir());
          },
          filename(
            req: Request,
            file: Express.Multer.File,
            callback: (error: Error | null, destination: string) => void,
          ) {
            callback(null, `${randomUUID()}__${file.originalname}`);
          },
        });
  return multer({
    fileFilter: fileFilter(validation),
    storage,
    limits: { fileSize: maxSize * 1024 * 1024 },
  });
};
