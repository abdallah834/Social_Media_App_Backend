import { HydratedDocument } from "mongoose";
import { IUser } from "../interfaces";
import { AvailabilityEnum } from "../enums";

export const getPostsAvailability = (user: HydratedDocument<IUser>) => {
  return [
    { availability: AvailabilityEnum.PUBLIC },
    { availability: AvailabilityEnum.ONLY_ME, createdBy: user._id },
    {
      availability: AvailabilityEnum.FRIENDS,
      ///////// getting a post that is created by logged in user's friends or himself
      createdBy: { $in: [user._id, ...(user.friends || [])] },
    },
    { tags: { $in: [user._id] } },
  ];
};
