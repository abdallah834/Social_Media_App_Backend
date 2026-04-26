import admin from "firebase-admin";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
export class NotificationService {
  private client: admin.app.App;
  constructor() {
    const serviceAccount = JSON.parse(
      readFileSync(
        resolve(
          "./src/common/config/socialmediaappbe-firebase-adminsdk-fbsvc-ac7d2f8a1d.json",
        ),
      ) as unknown as string,
    );

    this.client = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
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
