import {
  GraphQLBoolean,
  GraphQLEnumType,
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from "graphql";
import { GenderEnum, ProviderEnums, RoleEnum } from "../../../common/enums";
import { HydratedDocument } from "mongoose";
import { IUser } from "../../../common/interfaces";

export const gqlGenderEnumType = new GraphQLEnumType({
  name: "genderEnumGQL",
  values: {
    Male: { value: GenderEnum.MALE },
    Female: { value: GenderEnum.FEMALE },
  },
});
export const gqlProviderEnumType = new GraphQLEnumType({
  name: "providerEnumGQL",
  values: {
    Google: { value: ProviderEnums.GOOGLE },
    System: { value: ProviderEnums.SYSTEM },
  },
});
export const gqlRoleEnumType = new GraphQLEnumType({
  name: "roleEnumGQL",
  values: {
    Admin: { value: RoleEnum.ADMIN },
    User: { value: RoleEnum.USER },
  },
});
export const OneUserType: GraphQLObjectType = new GraphQLObjectType({
  name: "oneUserType",
  ////////////////////Important!: using lazy loading for fields in order to populate the friends array
  fields: () => ({
    _id: {
      type: new GraphQLNonNull(GraphQLID),
      resolve: (parent: HydratedDocument<IUser>) => {
        console.log(parent);
        return parent.username;
      },
    },
    firstName: { type: new GraphQLNonNull(GraphQLString) },
    lastName: { type: new GraphQLNonNull(GraphQLString) },
    email: { type: new GraphQLNonNull(GraphQLString) },
    slug: { type: new GraphQLNonNull(GraphQLString) },
    coverImages: { type: new GraphQLList(GraphQLString) },
    friends: { type: new GraphQLList(OneUserType) },
    createdAt: {
      type: new GraphQLNonNull(GraphQLString),
    },
    password: { type: GraphQLString },
    username: { type: GraphQLString },
    phone: { type: GraphQLString },
    bio: { type: GraphQLString },
    DOB: { type: GraphQLString },
    confirmedAt: {
      type: GraphQLString,
    },
    updatedAt: {
      type: GraphQLString,
    },
    deletedAt: {
      type: GraphQLString,
    },
    restoredAt: {
      type: GraphQLString,
    },
    changedCredentialsTime: {
      type: GraphQLString,
    },
    profileImage: { type: GraphQLString },
    provider: { type: gqlProviderEnumType },
    role: { type: gqlRoleEnumType },
    gender: { type: gqlGenderEnumType },
    paranoid: { type: GraphQLBoolean },
  }),
});
export const profileType = new GraphQLNonNull(
  new GraphQLObjectType({
    name: "profileResponse",
    fields: {
      message: { type: GraphQLString },
      data: { type: OneUserType },
    },
  }),
);
