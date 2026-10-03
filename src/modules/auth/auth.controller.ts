// import type { Response, Request, NextFunction } from "express";
import { Router } from "express";
import { IUser } from "../../common/interfaces";
import { successResponse } from "../../common/response";
import { validation } from "../../middleware/validation.middleware";
import authService from "./auth.service";
import * as validators from "./auth.validation";
import userService from "../user/user.service";
import { LoggedOutDevices, TokenType } from "../../common/enums";
import { authentication } from "../../middleware";
import { IAuthTokenPayload } from "../../common/interfaces/jwtToken.interface";

const router = Router();
////////////////// System auth
router.post(
  "/signup",
  validation(validators.signup),
  async (req, res, next) => {
    const data = await authService.signup(req.body);
    successResponse<IUser>({
      message:
        "Account created successfully, a confirmation OTP was sent to your email",
      res,
      data,
      status: 201,
    });
  },
);
router.post("/login", validation(validators.login), async (req, res, next) => {
  const data = await authService.login(
    req.body,
    `${req.protocol}://${req.host}`,
  );
  successResponse({
    message: "Login success",
    res,
    data,
  });
});

router.patch(
  "/confirmEmail",
  validation(validators.confirmEmail),
  async (req, res, next) => {
    await authService.confirmEmail(req.body);
    return successResponse({
      res,
      message: "Account confirmation completed",
      status: 201,
    });
  },
);
router.patch(
  "/resendConfirmationEmail",
  validation(validators.resendConfirmationEmail),
  async (req, res, next) => {
    await authService.resendConfirmationEmail(req.body);
    return successResponse({
      res,
      message: "OTP resent successfully",
      status: 201,
    });
  },
);
router.post(
  "/rotateToken",
  authentication(TokenType.REFRESH),
  async (req, res, next) => {
    const data = await userService.rotateToken(
      req.user,
      req.decoded as IAuthTokenPayload,
      process.env.ISSUER as string, // fixed issuer, not `${req.protocol}://${req.host}`
    );
    return successResponse({ res, message: "Token rotation done", data });
  },
);

router.post("/logout", authentication(), async (req, res, next) => {
  await userService.logout(
    req.body,
    req.user,
    req.decoded as IAuthTokenPayload,
  );
  return successResponse({
    res,
    message:
      req.body.flag === LoggedOutDevices.ALL
        ? "Logged out from all devices successfully"
        : "Logged out from one device successfully",
  });
});

//for users whose access token has already expired send the refresh or expired access token as `Authorization: Bearer <token>`
router.post("/logout/session", async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (token) await userService.logoutByToken(token);
  return successResponse({
    res,
    message: "Logged out from one device successfully",
  });
});

////////////////// Google auth
router.post(
  "/signup/gmail",
  // validation(validators.gmailTokenAndIss),
  async (req, res, next) => {
    const account = await authService.signupWithGmail(
      req.body.idToken,
      `${req.protocol}://${req.host}`,
    );
    successResponse({
      message: "Account created successfully",
      res,
      data: account,
      status: 201,
    });
  },
);
router.post(
  "/login/gmail",
  // validation(validators.gmailTokenAndIss),
  async (req, res, next) => {
    const loginTokens = await authService.loginWithGmail(
      req.body.idToken,
      `${req.protocol}://${req.host}`,
    );
    successResponse({
      message: "Logged in using Gmail successfully",
      res,
      data: loginTokens,
      status: 201,
    });
  },
);
/////////////////// Forgot password
router.post(
  "/forgotPassword",
  validation(validators.resendConfirmationEmail),
  async (req, res, next) => {
    await authService.reqForgetPasswordOTP(req.body);
    successResponse({
      message: "An otp was sent to reset your password",
      res,
    });
  },
);
router.post(
  "/verify/forgotPassword",
  validation(validators.verifyPasswordReset),
  async (req, res, next) => {
    await authService.changeForgottenPassword(req.body);
    successResponse({
      message: "Your password was reset successfully",
      res,
    });
  },
);

export default router;
