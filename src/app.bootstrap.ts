import cors from "cors";
import type { Express, NextFunction, Request, Response } from "express";
import express from "express";
import { PORT } from "./common/config/config";
import { redisService } from "./common/services/redis";
import { mongoDBConnection } from "./DB/db.connections";
import { authentication, globalErrorHandler } from "./middleware";
import { authRouter, gqlSchema, postRouter } from "./modules";
import { userRouter } from "./modules/user";
import { commentRouter } from "./modules/comment";
import { createHandler } from "graphql-http/lib/use/express";

// Takes a function following the common error-first callback style, i.e. taking an (err, value) => ... callback as the last argument, and returns a version that returns promises.
// const s3WriteStream = promisify(pipeline);
export const bootstrap = async () => {
  const app: Express = express();
  //////////// DB connections
  await mongoDBConnection();
  await redisService.connect();
  //////////// global middlewares
  app.use(cors(), express.json());

  //////////////////using GQL
  app.all(
    "/graphql",
    authentication(),
    createHandler({
      schema: gqlSchema,
      context: (req) => ({
        user: req.raw.user,
        decodedToken: req.raw.decoded,
      }),
    }),
  );
  //////////// APIs
  app.use("/auth", authRouter);
  app.use("/user", userRouter);
  app.use("/post", postRouter);
  app.use("/comment", commentRouter);

  ////////////// Invalid Routing
  app.use("/*dummy", (req, res, next) => {
    return res.status(404).json({ Error: "Invalid route" });
  });
  app.get("/", (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({ Success: "Landing page" });
  });
  ////////////// global error handling
  app.use(globalErrorHandler);
  ////////////// checking port connection

  app.listen(PORT, (err) => {
    try {
      console.log("app is running on port 3100");
    } catch (error) {
      console.error(err);
    }
  });
};

//eMeK_PIEj40JJ9mwkXTRrO:APA91bGQ1pCAJV26me1BUfVhuYPwDUm4EQAWTFmkJYI_y3WvMLoyaRo_irV_-il2vX8Rg6vPn6r1Ymzpttqbdg6QIVnRXWvgQS4cN1TiSRm5Y8Is6MSrA_s
