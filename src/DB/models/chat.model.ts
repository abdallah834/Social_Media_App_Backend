import { HydratedDocument, model, models, Schema, Types } from "mongoose";

import { IChat, IMessage } from "../../common/interfaces";
import { ChatParticipantsEnum } from "../../common/enums";
// import { BadRequestException } from "../../common/exceptions";
const messageSchema = new Schema<IMessage>({
  attachments: {
    type: [String],
    default: [],
    required: function (this) {
      return !this.content;
    },
  },
  content: {
    type: String,
    required: function (this) {
      return !this.attachments?.length;
    },
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
  deletedAt: { type: Date },
  restoredAt: { type: Date },
});
const chatSchema = new Schema<IChat>(
  {
    participants: [{ type: Types.ObjectId, ref: "User", required: true }],
    messages: { type: [messageSchema], required: true },
    type: {
      type: String,
      enum: ChatParticipantsEnum,
      default: ChatParticipantsEnum.ovo,
    },
    // OVM
    groupName: {
      type: String,
      required: function (this) {
        return this.type === ChatParticipantsEnum.ovm;
      },
    },
    groupImage: {
      type: String,
    },
    roomId: {
      type: String,
      required: function (this) {
        return this.type === ChatParticipantsEnum.ovm;
      },
    },
    createdBy: { type: Types.ObjectId, required: true, ref: "User" },
    deletedAt: { type: Date },
    restoredAt: { type: Date },
  },
  {
    timestamps: true,
    strict: true,
    strictQuery: true,
    collection: "Chats",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

////////////////////////////////////////// Mongoose middlewares
////////////////////////// Document middlewares (Soft and hard delete)
////////// the mongoose middlewares need a trigger value ("save","validate","find",etc...)
////////////////////////////// updateOne hook
//////// to avoid any conflicts with returning this keyword as a (query || document)  we use {document:true}
chatSchema.pre("updateOne", { document: true }, function () {});
////////////////////////////// deleteOne hook
chatSchema.pre("deleteOne", { document: true }, function () {});
////////////////////////////// insertMany hook

chatSchema.pre("insertMany", function (docs) {
  // console.log(this, docs);
});
// after being stored in the data base.
chatSchema.post("insertMany", function (docs) {
  // console.log(this, docs);
});
/////////////////////////////implementing soft delete
//////////////////////// Find
chatSchema.pre(["findOne", "find", "countDocuments"], function () {
  //////// to check search query or filter
  // console.log(this.getFilter());
  const query = this.getFilter();
  if (query.paranoid === false) {
    this.setQuery({ ...query });
  }
  this.setQuery({ ...query, deletedAt: { $exists: false } });
});
//////////////////////// Update
chatSchema.pre(["updateOne", "findOneAndUpdate"], function () {
  //////// to check search query or filter
  const updateQuery = this.getUpdate() as HydratedDocument<IChat>;
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
chatSchema.pre(["deleteOne", "findOneAndDelete"], function () {
  //////// to check search query or filter

  const query = this.getFilter();
  if (query.force) {
    this.setQuery({ ...query });
  } else {
    this.setQuery({ deletedAt: { $exists: true }, ...query });
  }
});
export const chatModel = models.Chat || model<IChat>("Chat", chatSchema);
