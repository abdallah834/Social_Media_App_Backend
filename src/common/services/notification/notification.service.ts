import admin from "firebase-admin";

export class NotificationService {
  private client: admin.app.App;
  constructor() {
    ///////////// local approach
    // const serviceAccount = JSON.parse(
    //   readFileSync(
    //     resolve(
    //       "./src/common/config/*-firebase-*-*-*.json",
    //     ),
    //   ) as unknown as string,
    // );

    this.client = admin.apps.length
      ? admin.app()
      : admin.initializeApp({
          credential: admin.credential.applicationDefault(),
        });
  }
  async sendNotification({
    token,
    data,
  }: {
    token: string;
    data: { title: string; body: string };
  }) {
    const message = {
      token,
      data,
    };
    return await this.client.messaging().send(message);
  }
  async sendMultipleNotifications({
    tokens,
    data,
  }: {
    tokens: string[];
    data: { title: string; body: string };
  }) {
    // to send all notifications when ready allSettled()
    return await Promise.allSettled(
      tokens.map((token) => {
        return this.sendNotification({ token, data });
      }),
    );
  }
}

export const notificationService = new NotificationService();
