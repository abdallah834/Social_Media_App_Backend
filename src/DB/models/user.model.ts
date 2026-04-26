import { HydratedDocument, model, models, Schema, Types } from "mongoose";
import { IUser } from "../../common/interfaces";
import { GenderEnum, RoleEnum } from "../../common/enums";
// import { BadRequestException } from "../../common/exceptions";
import { encrypt, generateHash } from "../../common/utils/security";

const userSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String },
    phone: { type: String, maxLength: 67 },
    bio: { type: String, maxLength: 200 },
    slug: { type: String, required: true },
    friends: [{ type: Types.ObjectId, ref: "User" }],
    DOB: { type: Date, required: false },
    profileImage: { type: String },
    coverImages: { type: [String] },
    confirmedAt: { type: Date },
    paranoid: { type: Boolean, default: false },
    deletedAt: { type: Date },
    restoredAt: { type: Date },
    role: {
      type: Number,
      enum: RoleEnum,
      default: RoleEnum.USER,
    },
    gender: {
      type: Number,
      enum: GenderEnum,
      default: GenderEnum.MALE,
    },
    provider: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    strict: true,
    strictQuery: true,
    collection: "Users",
    virtuals: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  },
);

//////////////important! any virtual fields run before mongoose middlewares and schema
userSchema
  .virtual("username")
  .get(function (this: IUser) {
    return `${this.firstName} ${this.lastName}`;
  })
  .set(function (this: IUser, value: string) {
    const [firstName, lastName] = value.split(" ");
    this.firstName = firstName as string;
    this.lastName = lastName as string;
  });

////////////////////////////////////////// Mongoose middlewares
////////////////////////// Document middlewares
////////// the mongoose middlewares need a trigger value ("save","validate","find",etc...)
userSchema.pre(
  "save",
  async function (this: HydratedDocument<IUser> & { wasNew: boolean }) {
    ////////////////////////////////// some mongoose hooks.

    /////// to check if any changes were made to the fields we use this.modifiedPaths | this.isModified and we do that to prevent bugs such as double hashing or encrypting.
    // console.log(this.modifiedPaths(), this.isModified("password"));

    ///////// to check wether a nested field is modified or not we use either this.isDirectModified("field"), to check the exact field otherwise we use this.isModified("field") to check generally for a change, to check all directly modified paths we use this.directModifiedPaths().
    // console.log(this.isModified("extra"), this.isDirectModified("extra._name"));

    ///////// to check for a direct selected field we use this.isDirectSelected(), this.isSelected() to generally check if a field is selected or not within a document
    /////ex: await userModel.find({}).select("filed")
    // console.log(this.isSelected("extra"), this.isDirectSelected("extra._name"));
    ///////// to check if the document was loaded or ready or not we use this.isInit()

    /////////////// to check if a document wasn't already stored in the data base or is newly created by a user we use this.isNew
    ///////ex:to check new posts.
    // console.log(this.isNew);
    this.wasNew = this.isNew;
    if (this.isModified("password")) {
      this.password = await generateHash(this.password as string);
    }

    if (this.phone && this.isModified("phone")) {
      this.phone = await encrypt(this.phone);
    }
  },
);

////////////////////////////// updateOne hook
//////// to avoid any conflicts with returning this keyword as a (query || document)  we use {document:true}
userSchema.pre("updateOne", { document: true }, function () {});
////////////////////////////// deleteOne hook
userSchema.pre("deleteOne", { document: true }, function () {});
////////////////////////////// insertMany hook

userSchema.pre("insertMany", function (docs) {
  // console.log(this, docs);
});
// after being stored in the data base.
userSchema.post("insertMany", function (docs) {
  // console.log(this, docs);
});

// userSchema.post("save", async function () {
//   const that = this as HydratedDocument<IUser> & { wasNew: boolean };
//   // to prevent multiple confirmation mails operations
//   // example: to check if a doc was newly created and then perform an operation on that doc (confirmation mail)
//   if (that.wasNew) {
//     // send email logic
//   }
// });
////////// if post middleware params are 2 the next post hook won't be called without calling the next param
// userSchema.post("save", function (docs,next) {
//   console.log("postSave", this);
// });

////////// if post middleware params are less than 2 which means to either include docs or not the next post hook will be called by default
// userSchema.post("save", function (docs) {});

/////////// Validate hooks have the highest priority in the execution order ("validate" Hook-->Zod validation-->schema validation(required,unique,length,etc...))
// userSchema.pre("validate", function () {
//   // if (this.provider === ProviderEnums.GOOGLE && this.password) {
//   //   throw new BadRequestException(
//   //     "Password shouldn't be included within google signup info",
//   //   );
//   // }
// });
// userSchema.post("validate", function () {
//
// });
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////// Query middlewares

//////////////////////// Find
userSchema.pre(["findOne", "find"], function () {
  //////// to check search query or filter
  // console.log(this.getFilter());
  const query = this.getFilter();
  if (query.paranoid === false) {
    this.setQuery({ ...query });
  }
  this.setQuery({ ...query, deletedAt: { $exists: false } });
});
//////////////////////// Update
userSchema.pre(["updateOne", "findOneAndUpdate"], function () {
  //////// to check search query or filter

  const updateQuery = this.getUpdate() as HydratedDocument<IUser>;
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
userSchema.pre(["deleteOne", "findOneAndDelete"], function () {
  //////// to check search query or filter

  const query = this.getFilter();
  if (query.force) {
    this.setQuery({ ...query });
  } else {
    this.setQuery({ deletedAt: { $exists: true }, ...query });
  }
});
export const userModel = models.User || model<IUser>("User", userSchema);
