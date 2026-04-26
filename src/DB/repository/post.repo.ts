import { IPost } from "../../common/interfaces";
import { postModel } from "../models";
import { DataBaseRepo } from "./base.repo";

export class PostRepo extends DataBaseRepo<IPost> {
  constructor() {
    super(postModel);
  }
}
