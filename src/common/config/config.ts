import dotenv from "dotenv";
dotenv.config({ path: `.env.${process.env.NODE_ENV ?? `development`}` });
export const PORT = process.env.PORT;
// encryption
export const ENCRYPTION_SECRET_KEY = process.env
  .ENCRYPTION_SECRET_KEY as string;
export const IV_LENGTH = Number(process.env.IV_LENGTH);
// JWT
export const ACCESS_TOKEN_EXPIRATION_TIME =
  process.env.ACCESS_TOKEN_EXPIRATION_TIME;
export const REFRESH_TOKEN_EXPIRATION_TIME =
  process.env.REFRESH_TOKEN_EXPIRATION_TIME;
export const REFRESH_ROTATION_GRACE_SECONDS =
  process.env.REFRESH_ROTATION_GRACE_SECONDS;
export const ROTATION_GRACE = process.env.ROTATION_GRACE;
export const SYS_REFRESH_TOKEN_SECRET_KEY =
  process.env.SYS_REFRESH_TOKEN_SECRET_KEY;
export const SYSTEM_TOKEN_SECRET_KEY = process.env.SYSTEM_TOKEN_SECRET_KEY;
export const USER_REFRESH_TOKEN_SECRET_KEY =
  process.env.USER_REFRESH_TOKEN_SECRET_KEY;
export const USER_TOKEN_SECRET_KEY = process.env.USER_TOKEN_SECRET_KEY;
// noedeMailer
export const WEB_CLIENT_ID = process.env.WEB_CLIENT_ID;
// Mongodb
export const DB_URI = process.env.DB_URI;
// Redis
export const REDIS_URL = process.env.REDIS_URL as string;
// Google
export const GOOGLE_EMAIL = process.env.GOOGLE_EMAIL;
export const GOOGLE_APP_PASSWORD = process.env.GOOGLE_APP_PASSWORD;
// AWS
export const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID as string;
export const AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME as string;
export const AWS_SECRET_ACCESS_KEY = process.env
  .AWS_SECRET_ACCESS_KEY as string;
export const AWS_REGION = process.env.AWS_REGION as string;
export const AWS_EXPIRES_IN = Number(process.env.AWS_EXPIRES_IN) as number;
