import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { env } from "../../shared/config/env.config";
import { EmailIntegration } from "./emailIntegration.model";
import type { Types } from "mongoose";
import { redisClient } from "../../shared/config/redis.client";
import { logger } from "../../shared/config/logger";

const REDIS_TTL = 3600;
const REDIS_KEY_PREFIX = "email_integration:";

const clientsWithListeners = new WeakSet<OAuth2Client>();

class EmailIntegrationService {
  private getOAuthClient(): OAuth2Client {
    return new google.auth.OAuth2(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      env.GOOGLE_REDIRECT_URI ||
        "http://localhost:3000/api/v1/auth/google/callback",
    );
  }

  public getAuthUrl(userId: string): string {
    const oauth2Client = this.getOAuthClient();

    const scopes = [
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/userinfo.email",
    ];

    return oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: scopes,
      state: JSON.stringify({ userId, intent: "email_integration" }),
    });
  }

  public async handleCallback(code: string, userId: string): Promise<void> {
    const oauth2Client = this.getOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    await this.createOrUpdateIntegration(userId, tokens);
  }

  public async createOrUpdateIntegration(
    userId: string,
    tokens: any,
  ): Promise<void> {
    const oauth2Client = this.getOAuthClient();
    console.log("Creating/updating email integration for user", {
      userId,
      token: tokens,
    });
    console.log(
      "oauth2Client credentials before setting tokens",
      oauth2Client.credentials,
    );
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: "v2",
    });

    const userInfo = await oauth2.userinfo.get();
    const email = userInfo.data.email;

    if (!email) {
      throw new Error("Could not retrieve email address from Google");
    }

    const expiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : undefined;

    const integration = await EmailIntegration.findOneAndUpdate(
      { userId },
      {
        email,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        ...(expiresAt && { expiresAt }),
      },
      {
        upsert: true,
        new: true,
      },
    );

    const cacheKey = `${REDIS_KEY_PREFIX}${email}`;
    await redisClient.set(
      cacheKey,
      JSON.stringify(integration.toObject()),
      "EX",
      REDIS_TTL,
    );

    try {
      const projectId = env.GCP_PROJECT_ID;
      const topicName = env.GMAIL_PUBSUB_TOPIC;

      if (projectId && topicName) {
        console.log(topicName)
        const gmail = google.gmail({ version: "v1", auth: oauth2Client });
        const watchResponse = await gmail.users.watch({
          userId: "me",
          requestBody: {
            topicName: topicName,
            labelIds: ["INBOX"],
          },
        });

        console.log(watchResponse)

        const expiration = watchResponse.data.expiration
          ? new Date(Number(watchResponse.data.expiration))
          : undefined;

        const historyId = watchResponse.data.historyId;

        await EmailIntegration.updateOne(
          { _id: integration._id },
          {
            ...(expiration && { watchExpiration: expiration }),
            ...(historyId && { lastHistoryId: historyId }),
          },
        );

        logger.info("Gmail watch registered on callback", {
          email,
          watchExpiration: expiration?.toISOString(),
        });
      }
    } catch (watchError: any) {
      logger.warn("Failed to register Gmail watch on callback", {
        email,
        error: watchError.message,
      });
    }
  }

  public async getClientForUser(
    userId: string | Types.ObjectId,
    preloadedIntegration?: any,
  ): Promise<OAuth2Client> {
    let integration = preloadedIntegration;
    if (!integration) {
      integration = await EmailIntegration.findOne({ userId });
    }
    if (!integration) {
      throw new Error(
        "Email integration not found for user. Please connect your Gmail account.",
      );
    }

    const oauth2Client = this.getOAuthClient();
    oauth2Client.setCredentials({
      access_token: integration.accessToken,
      refresh_token: integration.refreshToken,
      expiry_date: integration.expiresAt
        ? new Date(integration.expiresAt).getTime()
        : undefined,
    });

    if (!clientsWithListeners.has(oauth2Client)) {
      clientsWithListeners.add(oauth2Client);

      oauth2Client.on("tokens", async (tokens) => {
        try {
          const updatePayload: Record<string, unknown> = {
            accessToken: tokens.access_token,
          };
          if (tokens.refresh_token) {
            updatePayload.refreshToken = tokens.refresh_token;
          }
          if (tokens.expiry_date) {
            updatePayload.expiresAt = new Date(tokens.expiry_date);
          }

          await EmailIntegration.findOneAndUpdate({ userId }, updatePayload);

          const updatedDoc = await EmailIntegration.findOne({ userId });
          if (updatedDoc) {
            const cacheKey = `${REDIS_KEY_PREFIX}${updatedDoc.email}`;
            await redisClient.set(
              cacheKey,
              JSON.stringify(updatedDoc.toObject()),
              "EX",
              REDIS_TTL,
            );
          }

          logger.info("OAuth tokens refreshed and cached", {
            userId: userId.toString(),
            hasNewRefreshToken: !!tokens.refresh_token,
          });
        } catch (error: any) {
          logger.error("Failed to persist refreshed tokens", {
            userId: userId.toString(),
            error: error.message,
          });
        }
      });
    }

    return oauth2Client;
  }

  public async sendEmail(
    userId: string | Types.ObjectId,
    to: string,
    subject: string,
    body: string,
  ): Promise<void> {
    const auth = await this.getClientForUser(userId);
    const gmail = google.gmail({ version: "v1", auth });

    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString("base64")}?=`;
    const messageParts = [
      `To: ${to}`,
      "Content-Type: text/html; charset=utf-8",
      "MIME-Version: 1.0",
      `Subject: ${utf8Subject}`,
      "",
      body,
    ];

    const message = messageParts.join("\n");

    const encodedMessage = Buffer.from(message)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodedMessage,
      },
    });
  }
}

export const emailIntegrationService = new EmailIntegrationService();
