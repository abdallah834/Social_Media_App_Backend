import type { Request, Response, NextFunction } from "express";

export interface IError extends Error {
  statusCode?: number;
}
export const globalErrorHandler = (
  err: IError,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (err.name === "MulterError") {
    err.statusCode = 400;
  }
  res.status(err.statusCode ?? 500).json({
    Error: err.message || "Internal server error",
    Stack: err.stack,
    cause: err.cause,
  });
};
