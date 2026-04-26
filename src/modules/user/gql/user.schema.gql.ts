import { profileArgs } from "./user.args.gql";
import { userGQLResolver, UserResolver } from "./user.resolver";
import { GraphQLObjectType, GraphQLString } from "graphql";
import { profileType } from "./user.types.gql";

///////////////// this file includes all user related queries
export class UserGQLSchemaFields {
  private userResolver: UserResolver;
  constructor() {
    this.userResolver = userGQLResolver;
  }
  registerQuery() {
    return {
      // API
      // sayHi: {
      //   type: new GraphQLObjectType({
      //     name: "testApi",
      //     fields: {
      //       greeting: {
      //         type: new GraphQLNonNull(GraphQLInt),
      //         // declaring arguments that are passed to the value included within the sayHi endpoint
      //         args: {
      //           search: {
      //             // declaring a required argument
      //             type: new GraphQLNonNull(GraphQLString),
      //             description: "Search Key",
      //           },
      //           name: { type: GraphQLString, description: "Name Key" },
      //           greetingArg: {
      //             type: new GraphQLInputObjectType({
      //               name: "greetingArgumentObject",
      //               fields: {
      //                 match: { type: GraphQLBoolean },
      //               },
      //             }),
      //             description: "Name Key",
      //           },
      //         },
      //         resolve: (parent, args) => {
      //           // console.log(args);
      //           return 12;
      //         },
      //       },
      //       message: {
      //         type: GraphQLString,
      //         // resolve: () => "12",
      //       },
      //     },
      //   }),
      //   //resolve returns a response for the fields or the endpoint
      //   //resolve can be used individually or in the (APIs) sayHi object
      //   resolve: (parent, args): { message: string; greeting: number } => {
      //     ////////////////// args can't be accessed outside of the scope of the fields (ex:greeting)
      //     ///////////// args here are related to the arguments that are passed to the endpoint itself
      //     // console.log(args);
      //     return { greeting: 240, message: "240" };
      //   },
      // },
      profile: {
        description: "register profile",
        type: profileType,
        args: profileArgs,
        resolve: this.userResolver.profile,
      },
    };
  }
  registerMutation() {
    return {
      sayHi: {
        type: new GraphQLObjectType({
          name: "testMutationApi",
          fields: {
            greeting: { type: GraphQLString },
          },
        }),
        //resolve returns a response for the fields or the endpoint
        resolve: (): { greeting: string } => {
          return { greeting: "240" };
        },
      },
    };
  }
}
const userGQLSchemaFields = new UserGQLSchemaFields();
export default userGQLSchemaFields;
