import type { Request } from "express";
import { FileFilterCallback } from "multer";
import { BadRequestException } from "../../exceptions";
export const fileFieldValidation = {
  image: ["image/jpeg", "image/jpg", "image/png"],
  video: ["video/mp4"],
};

export const fileFilter = (validation: string[]) => {
  return function (
    req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback,
  ) {
    // if the uploaded image extension | type doesn't match the value in the validation array.
    // the second argument for the cb method is to either save the uploaded image or not (bool)
    if (!validation.includes(file.mimetype)) {
      return cb(new BadRequestException("Invalid file format"));
    }
    return cb(null, true);
  };
};
