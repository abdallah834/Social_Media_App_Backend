import { IComment } from "../../common/interfaces";
import { commentModel } from "../models";
import { DataBaseRepo } from "./base.repo";

export class CommentRepo extends DataBaseRepo<IComment> {
  constructor() {
    super(commentModel);
  }
}
