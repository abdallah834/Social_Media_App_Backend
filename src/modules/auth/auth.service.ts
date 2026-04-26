import {
  NotificationService,
  notificationService,
} from "./../../common/services/notification/notification.service";
// import { BadRequestException } from "../../common/exceptions";
import { OAuth2Client, TokenPayload } from "google-auth-library";
import { WEB_CLIENT_ID } from "../../common/config/config";
import { EmailConfig, EmailEnum } from "../../common/enums";
import { ProviderEnums } from "../../common/enums/provider.enums";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "../../common/exceptions";
import { IUser } from "../../common/interfaces";
import { TokenService } from "../../common/services/jwt";
import { redisService, RedisService } from "../../common/services/redis";
import { emailEmitter, generateOTP, sendEmail } from "../../common/utils/email";
import {
  compareHash,
  decrypt,
  generateHash,
} from "../../common/utils/security";
import { UserRepo } from "../../DB/repository/user.repo";
import {
  ConfirmEmailDto,
  LoginDto,
  resendConfirmationEmailDto,
  SignupDto,
} from "./auth.dto";

class AuthService {
  private readonly userRepo: UserRepo;
  private readonly redis: RedisService;
  private readonly tokenService: TokenService;
  private readonly notification: NotificationService;
  constructor() {
    this.userRepo = new UserRepo();
    this.redis = redisService;
    this.tokenService = new TokenService();
    this.notification = notificationService;
  }
  async signup({
    username,
    email,
    password,
    phone,
  }: SignupDto): Promise<IUser> {
    // await userModel.create({ username, email, password });
    const checkExistingUser = await this.userRepo.findOne({
      filter: { email },
      projection: "email",
      options: { lean: true },
    });

    if (checkExistingUser) {
      throw new ConflictException("This email already exists");
    }
    const user =
      (await this.userRepo.createOne({
        data: {
          username,
          email,
          slug: username.split(" ").join("-"),
          password: password,
          phone: phone ? phone : null,
        },
      })) || [];

    if (!user) {
      throw new BadRequestException("Failed to create account");
    }
    emailEmitter.emit(EmailEnum.CONFIRM_EMAIL, async () => {
      await this.generateAndSendConfirmationOtp(email, {
        subject: EmailEnum.CONFIRM_EMAIL,
        title: "Email verification",
      });
    });

    return user;
  }
  async login(
    { email, password, FCM }: LoginDto,
    issuer: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.userRepo.findOne({
      filter: {
        email,
        provider: ProviderEnums.SYSTEM,
        confirmedAt: { $exists: true },
      },
    });
    if (!user) {
      throw new NotFoundException(
        "Please make sure to verify your account before login",
      );
    }

    if (!(await compareHash(user.password as string, password))) {
      throw new BadRequestException("Invalid login credentials");
    }

    user.phone = await decrypt(user.phone as string);
    ///////////////// handling 2FA
    // if (user.TFAEnabled) {
    //   await generateAndSendConfirmationOtp(user.email);
    //   await redisSet({
    //     key: otp2FAVerification(user.email),
    //     value: await createLoginTokens(user, issuer),
    //     ttl: 120,
    //   });
    //   return "2FA";
    // }
    // handling multiple FCM tokens
    if (FCM) {
      await this.redis.addFCM(user.id as string, FCM);
      const tokens = await this.redis.getFCMs(user.id);
      if (tokens.length) {
        const currentDate = new Date().toLocaleString().split(",");

        await this.notification.sendMultipleNotifications({
          tokens,
          data: {
            title: "Logged in successfully",
            body: `Logged in on ${currentDate[0]} at ${currentDate[1]}`,
          },
        });
      }
    }
    //////////////////////////////////////////// using a secret key based on the user's role (admin | user)
    // return await createLoginTokens(user, issuer);
    return this.tokenService.createLoginTokens(user, issuer);
  }
  private async generateAndSendConfirmationOtp(
    email: string,
    {
      subject = EmailEnum.CONFIRM_EMAIL,
      title = "Email verification",
    }: { subject?: EmailEnum; title?: string } = {},
  ) {
    /////////////// checking if there is a blocked timer
    const blockKey = this.redis.otpBlockKey(email, { type: subject });
    const maxRequests = this.redis.maxOtpRequestsKey(email, {
      type: subject,
    });
    const [remainingBlockTime, checkMaxOtpRequests, maxRequestsTtl] =
      await Promise.all([
        this.redis.redisGetTtl(blockKey),
        Number(this.redis.redisGet(maxRequests) || 0),
        this.redis.redisGetTtl(this.redis.maxOtpRequestsKey(email)),
      ]);

    if (remainingBlockTime > 0) {
      throw new ConflictException(
        `You have been blocked from requesting newer OTPs try again after ${remainingBlockTime} ${remainingBlockTime > 1 ? `seconds` : `second`}`,
      );
    }

    /////////////// handling max attempts for OTP requests

    if (checkMaxOtpRequests >= 3) {
      await this.redis.redisSet({
        key: blockKey,
        value: 1,
        ttl: 7 * 60,
      });
      throw new ConflictException(
        `You have reached the maximum amount of requests for the OTP try again after ${maxRequestsTtl} ${maxRequestsTtl > 1 ? `second` : `seconds`}`,
      );
    }
    const generatedOtp = generateOTP();
    await this.redis.redisSet({
      key: this.redis.otpKey(email, { type: subject }),
      value: await generateHash(`${generatedOtp}`),
      ttl: 120,
    });
    checkMaxOtpRequests > 0
      ? await this.redis.redisIncrKey(maxRequests)
      : await this.redis.redisSet({ key: maxRequests, value: 1, ttl: 300 });

    await sendEmail({
      to: email,
      subject: EmailConfig[subject].title,
      html: `<span>The confirmation code for your account is</span><h2>${generatedOtp}</h2>`,
    });

    return;
  }
  public async confirmEmail({ email, otp }: ConfirmEmailDto) {
    const existingAcc = await this.userRepo.findOne({
      filter: {
        email,
        confirmedAt: { $exists: false },
        provider: ProviderEnums.SYSTEM,
      },
      options: { lean: true },
    });
    if (!existingAcc) {
      throw new NotFoundException(
        "This account is either already verified or doesn't exist",
      );
    }

    const hashedOtp = await this.redis.redisGet(
      this.redis.otpKey(email, { type: EmailEnum.CONFIRM_EMAIL }),
    );

    if (!hashedOtp) {
      throw new NotFoundException("Expired OTP");
    }

    if (!(await compareHash(`${hashedOtp}`, `${otp}`))) {
      throw new BadRequestException("Invalid OTP");
    }

    await this.userRepo.updateOne({
      filter: { email },
      update: { confirmedAt: new Date() },
    });
    await this.redis.redisDelKeys(
      await this.redis.redisKeys(
        this.redis.otpKey(email, { type: EmailEnum.CONFIRM_EMAIL }),
      ),
    );
    return;
  }

  async resendConfirmationEmail({ email }: resendConfirmationEmailDto) {
    const account = await this.userRepo.findOne({
      filter: {
        email,
        confirmedAt: { $exists: false },
        provider: ProviderEnums.SYSTEM,
      },
    });

    if (!account) {
      throw new NotFoundException(
        "Account is either already verified or not found",
      );
    }
    const otpTtl = await this.redis.redisGetTtl(
      this.redis.otpKey(email, { type: EmailEnum.CONFIRM_EMAIL }),
    );

    if (otpTtl > 0) {
      throw new ConflictException(
        `Can't send a new OTP while the older OTP is still valid try again after ${otpTtl} ${otpTtl > 1 ? `seconds` : `second`}.`,
      );
    }
    emailEmitter.emit(EmailEnum.CONFIRM_EMAIL, async () => {
      await this.generateAndSendConfirmationOtp(email);
    });
    return;
  }
  //////////////// Google
  private async verifyGoogleAccount(idToken: string): Promise<TokenPayload> {
    const client = new OAuth2Client();

    const ticket = await client.verifyIdToken({
      idToken,
      audience: WEB_CLIENT_ID as string, // Specify the WEB_CLIENT_ID of the app that accesses the backend
      // Or, if multiple clients access the backend:
      //[WEB_CLIENT_ID_1, WEB_CLIENT_ID_2, WEB_CLIENT_ID_3]
    });
    const payload = ticket.getPayload();
    if (!payload) throw new BadRequestException("No payload found");
    if (!payload.email_verified) {
      throw new BadRequestException(
        "Failed to authenticate this account with gmail",
      );
    }
    return payload;
  }
  async loginWithGmail(idToken: string, issuer: string) {
    const payload = await this.verifyGoogleAccount(idToken);
    const existingUser = await this.userRepo.findOne({
      filter: {
        email: payload.email as string,
        provider: ProviderEnums.GOOGLE,
      },
    });
    if (!existingUser) {
      throw new BadRequestException(
        "Invalid login credentials or not a registered account",
      );
    }

    return await this.tokenService.createLoginTokens(existingUser, issuer);
  }
  async signupWithGmail(idToken: string, issuer: string) {
    const payload = await this.verifyGoogleAccount(idToken);

    const existingUser = await this.userRepo.findOne({
      filter: {
        email: payload.email as string,
      },
    });
    if (existingUser) {
      if (existingUser.provider === ProviderEnums.SYSTEM) {
        throw new ConflictException(
          "Account already exists with different provider",
        );
      }
      const account = await this.loginWithGmail(idToken, issuer);
      return { account, status: 200 };
    }
    const createdUser = await this.userRepo.createOne({
      data: {
        firstName: payload.given_name,
        lastName: payload.family_name,
        email: payload.email,
        provider: ProviderEnums.GOOGLE,
        profileImage: payload.picture,
        confirmedAt: new Date(),
      },
    });

    return await this.tokenService.createLoginTokens(createdUser, issuer);
  }
  /////////////// Forget & update password
  async reqForgetPasswordOTP({ email }: { email: string }) {
    const checkExistingOTP = await this.redis.redisGetTtl(
      this.redis.otpKey(email, { type: EmailEnum.FORGOT_PASSWORD }),
    );

    if (checkExistingOTP > 0) {
      throw new ConflictException(
        "Can't request a new OTP while the older one is still valid",
      );
    }
    const userAccount = await this.userRepo.findOne({
      filter: {
        email,
        confirmedAt: { $exists: true },
        provider: ProviderEnums.SYSTEM,
      },
    });
    if (!userAccount) {
      throw new NotFoundException("Make sure to enter an existing account");
    }

    emailEmitter.emit(EmailEnum.CONFIRM_EMAIL, async () => {
      await this.generateAndSendConfirmationOtp(email, {
        subject: EmailEnum.FORGOT_PASSWORD,
        title: "Reset Password",
      });
    });
  }
  async verifyForgetPasswordOTP({
    email,
    otp,
  }: {
    email: string;
    otp: string;
  }) {
    const hashedOTP = await this.redis.redisGet(
      this.redis.otpKey(email, { type: EmailEnum.FORGOT_PASSWORD }),
    );
    if (!hashedOTP) {
      throw new NotFoundException("No OTP found for this account");
    }
    if (!(await compareHash(hashedOTP, otp))) {
      throw new NotFoundException("The OTP you entered is invalid");
    }
  }
  async changeForgottenPassword({
    email,
    otp,
    newPassword,
  }: {
    email: string;
    otp: string;
    newPassword: string;
  }) {
    await this.verifyForgetPasswordOTP({ email, otp });
    const userAccount = await this.userRepo.findOneAndUpdate({
      filter: {
        email,
        confirmedAt: { $exists: true },
        provider: ProviderEnums.SYSTEM,
      },
      update: {
        password: await generateHash(newPassword),
        changedCredentialsTime: new Date(),
      },
    });
    if (!userAccount) {
      throw new NotFoundException("Account doesn't exist");
    }
    const allOtpKeys = await this.redis.redisKeys(
      this.redis.otpKey(email, { type: EmailEnum.FORGOT_PASSWORD }),
    );
    const tokenKeys = await this.redis.redisKeys(
      this.redis.redisBaseRevokeTokenKey(userAccount._id),
    );
    await this.redis.redisDelKeys([...allOtpKeys, ...tokenKeys]);
  }
}

// single tone design pattern instead of taking an instance on each use we export the instance itself
export default new AuthService();

//       { email, confirmEmail: { $exists: true }, provider: providerEnum.system },
//
