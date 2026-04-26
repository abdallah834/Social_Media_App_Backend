import { GraphQLInt, GraphQLString } from "graphql";

export const postListArgs = {
  page: { type: GraphQLInt },
  limit: { type: GraphQLInt },
  search: { type: GraphQLString },
};
