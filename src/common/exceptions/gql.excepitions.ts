import { GraphQLError } from "graphql";
import { ApplicationException } from "./application.exception";

export const mapGQLError = (error: ApplicationException) => {
  throw new GraphQLError(error.message || "Internal server error", {
    extensions: {
      statusCode: error.statusCode || 500,
      cause: error.cause || [],
    },
  });
};
