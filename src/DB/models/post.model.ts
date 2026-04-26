import { HydratedDocument, model, models, Schema, Types } from "mongoose";
import { AvailabilityEnum } from "../../common/enums";
import { IPost } from "../../common/interfaces";
// import { BadRequestException } from "../../common/exceptions";

const postSchema = new Schema<IPost>(
  {
    folderId: { type: String, required: true },
    content: {
      type: String,
      required: function (this) {
        return !this.attachments?.length;
      },
    },
    attachments: { type: [String], default: [] },
    availability: {
      type: Number,
      enum: AvailabilityEnum,
      default: AvailabilityEnum.PUBLIC,
    },
    likes: {
      type: [{ user: Types.ObjectId, react: Number }],
      ref: "User",
      default: [],
      _id: false,
      unique: true,
    },
    tags: { type: [{ type: Types.ObjectId }], ref: "User", default: [] },
    createdBy: { type: Types.ObjectId, required: true, ref: "User" },
    updatedBy: { type: Types.ObjectId, ref: "User" },
    deletedAt: { type: Date },
    restoredAt: { type: Date },
  },
  {
    timestamps: true,
    strict: true,
    strictQuery: true,
    collection: "Posts",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);
postSchema.virtual("comments", {
  localField: "_id",
  foreignField: "postId",
  ref: "Comment",
  justOne: true,
});
////////////////////////////////////////// Mongoose middlewares
////////////////////////// Document middlewares
////////// the mongoose middlewares need a trigger value ("save","validate","find",etc...)

////////////////////////////// updateOne hook
//////// to avoid any conflicts with returning this keyword as a (query || document)  we use {document:true}
postSchema.pre("updateOne", { document: true }, function () {});
////////////////////////////// deleteOne hook
postSchema.pre("deleteOne", { document: true }, function () {});
////////////////////////////// insertMany hook

postSchema.pre("insertMany", function (docs) {
  // console.log(this, docs);
});
// after being stored in the data base.
postSchema.post("insertMany", function (docs) {
  // console.log(this, docs);
});
/////////////////////////////implementing soft delete
//////////////////////// Find
postSchema.pre(["findOne", "find", "countDocuments"], function () {
  //////// to check search query or filter
  // console.log(this.getFilter());
  const query = this.getFilter();
  if (query.paranoid === false) {
    this.setQuery({ ...query });
  }
  this.setQuery({ ...query, deletedAt: { $exists: false } });
});
//////////////////////// Update
postSchema.pre(["updateOne", "findOneAndUpdate"], function () {
  //////// to check search query or filter
  const updateQuery = this.getUpdate() as HydratedDocument<IPost>;
  if (Array.isArray(updateQuery)) return;
  if (updateQuery.deletedAt) {
    this.setUpdate({ ...updateQuery, $unset: { restoredAt: 1 } });
  }
  if (updateQuery.restoredAt) {
    this.setUpdate({ ...updateQuery, $unset: { deletedAt: 1 } });
    this.setQuery({ ...this.getQuery(), deletedAt: { $exists: true } });
  }
  const query = this.getFilter();
  if (query.paranoid === false) {
    this.setQuery({ ...query });
  } else {
    this.setQuery({ deletedAt: { $exists: false }, ...query });
  }
});

//////////////////////// Delete
postSchema.pre(["deleteOne", "findOneAndDelete"], function () {
  //////// to check search query or filter

  const query = this.getFilter();
  if (query.force) {
    this.setQuery({ ...query });
  } else {
    this.setQuery({ deletedAt: { $exists: true }, ...query });
  }
});
export const postModel = models.Post || model<IPost>("Post", postSchema);
