import {
  GraphQLEnumType,
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from "graphql";
import { OneUserType } from "../../user/gql/user.types.gql";
import { AvailabilityEnum } from "../../../common/enums";

export const gqlAvailabilityEnum = new GraphQLEnumType({
  name: "gqlAvailabilityEnum",
  values: {
    Friends: { value: AvailabilityEnum.FRIENDS },
    Only_Me: { value: AvailabilityEnum.ONLY_ME },
    Public: { value: AvailabilityEnum.PUBLIC },
  },
});
export const singlePostType = new GraphQLObjectType({
  name: "singlePostType",
  fields: {
    _id: { type: new GraphQLNonNull(GraphQLID) },
    folderId: { type: new GraphQLNonNull(GraphQLString) },
    content: { type: GraphQLString },
    attachments: { type: new GraphQLList(GraphQLString) },
    likes: {
      type: new GraphQLList(OneUserType),
    },
    tags: {
      /////// tags should include tagged user profiles
      // type: new GraphQLList(OneUserType),
      type: new GraphQLList(GraphQLID),
    },
    availability: { type: gqlAvailabilityEnum },
    createdBy: { type: new GraphQLNonNull(OneUserType) },
    updatedBy: { type: OneUserType },
    createdAt: { type: new GraphQLNonNull(GraphQLString) },
    deletedAt: { type: GraphQLString },
    restoredAt: { type: GraphQLString },
    updatedAt: { type: GraphQLString },
  },
});
export const postListType = new GraphQLObjectType({
  name: "postListResponse",
  fields: {
    message: { type: new GraphQLNonNull(GraphQLString) },
    data: {
      type: new GraphQLObjectType({
        name: "postPaginationResponse",
        fields: {
          docs: { type: new GraphQLList(singlePostType) },
          currentPage: { type: GraphQLInt },
          size: { type: GraphQLInt },
          pages: { type: GraphQLInt },
        },
      }),
    },
  },
});
export const reactToPost = new GraphQLObjectType({
  name: "ReactToPostResponse",
  fields: {
    message: { type: new GraphQLNonNull(GraphQLString) },
    data: { type: singlePostType },
  },
});
// new GraphQLList(
//         new GraphQLObjectType({
//           name: "likesInfo",
//           fields: {
//             user: { type: GraphQLID },
//             react: { type: GraphQLInt },
//           },
//         }),
//       ),
