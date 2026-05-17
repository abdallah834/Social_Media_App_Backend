import cors from "cors";
import type { Express, NextFunction, Request, Response } from "express";
import express from "express";
import { createHandler } from "graphql-http/lib/use/express";
import { PORT } from "./common/config/config";
import { redisService } from "./common/services/redis";
import { mongoDBConnection } from "./DB/db.connections";
import { authentication, globalErrorHandler } from "./middleware";
import { authRouter, gqlSchema, postRouter, realtimeGateway } from "./modules";
import { commentRouter } from "./modules/comment";
import { userRouter } from "./modules/user";
import { chatRouter } from "./modules/chat";

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
  app.use("/chat", chatRouter);

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

  const httpServer = app.listen(PORT, (err) => {
    try {
      console.log("app is running on port 3100");
    } catch (error) {
      console.error(err);
    }
  });
  realtimeGateway.initializeIo(httpServer);
};
