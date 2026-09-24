import {
  GraphQLEnumType,
  GraphQLID,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLString,
} from "graphql";

export const reactGQLEnumTypes = new GraphQLEnumType({
  name: "reactTypes",
  values: { Dislike: { value: 0 }, like: { value: 1 } },
});
export const postListArgs = {
  page: { type: GraphQLInt },
  limit: { type: GraphQLInt },
  search: { type: GraphQLString },
};
export const postReactArgs = {
  postId: { type: new GraphQLNonNull(GraphQLID) },
  react: {
    type: reactGQLEnumTypes,
  },
};
