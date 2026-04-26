import { GraphQLObjectType, GraphQLSchema } from "graphql";
import userGQLSchemaFields from "../user/gql/user.schema.gql";
import { postGQLSchema } from "../post";

/////////////////////////this file basically acts as the main component of the gql
const query = new GraphQLObjectType({
  ////////////// all fields within the query execute at the same time not line by line
  // names can't be duplicated
  name: "RootQuerySchema",
  description: "Additional info for the api",
  fields: {
    ...userGQLSchemaFields.registerQuery(),
    ...postGQLSchema.registerQuery(),
  },
});
const mutation = new GraphQLObjectType({
  ////////////// all fields within the mutation execute line by line
  // names can't be duplicated
  name: "RootMutationSchema",
  description: "Additional info for the api",
  fields: {
    ...userGQLSchemaFields.registerMutation(),
    ...postGQLSchema.registerMutation(),
  },
});
///////////graphql-http package is required to function.
export const gqlSchema = new GraphQLSchema({
  // query is mandatory for graphql schema
  query,
  // mutation is not as mandatory for graphql schema
  mutation,
});
