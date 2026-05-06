import * as cookie from "cookie";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { users, userSettings } from "@db/schema";
import { signSessionToken } from "./kimi/session";
import { getSessionCookieOptions } from "./lib/cookies";
import { Session } from "@contracts/constants";
import bcrypt from "bcryptjs";

export const simpleAuthRouter = createRouter({
  // Simple username/password login
  login: publicQuery
    .input(
      z.object({
        username: z.string().min(1),
        password: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const rows = await db
        .select()
        .from(users)
        .where(eq(users.username, input.username))
        .limit(1);

      if (rows.length === 0) {
        return { success: false, error: "用户名或密码错误" };
      }

      const user = rows[0];
      if (!user.password || !bcrypt.compareSync(input.password, user.password)) {
        return { success: false, error: "用户名或密码错误" };
      }

      // Update last sign in
      await db
        .update(users)
        .set({ lastSignInAt: new Date() })
        .where(eq(users.id, user.id));

      // Create session token
      const token = await signSessionToken({
        username: user.username!,
        clientId: "zenith-simple",
      });

      // Set cookie via response headers
      const opts = getSessionCookieOptions(ctx.req.headers);
      ctx.resHeaders.append(
        "set-cookie",
        cookie.serialize(Session.cookieName, token, {
          httpOnly: opts.httpOnly,
          path: opts.path,
          sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
          secure: opts.secure,
          maxAge: opts.maxAge,
        }),
      );

      return { success: true };
    }),

  // Get current user info for simple auth
  me: publicQuery.query(async ({ ctx }) => {
    const user = ctx.user;
    if (!user) return null;

    // Get settings
    const db = getDb();
    const settingRows = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, user.id))
      .limit(1);

    const settings =
      settingRows.length > 0
        ? {
            dailyGoal: settingRows[0].dailyGoal,
            reminderTime: settingRows[0].reminderTime,
            difficulty: settingRows[0].difficulty,
            fontSize: settingRows[0].fontSize,
            questionLanguage: settingRows[0].questionLanguage,
          }
        : null;

    return {
      id: user.id,
      unionId: user.unionId,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      createdAt: user.createdAt,
      settings,
    };
  }),

  // Logout - clear cookie
  logout: publicQuery.mutation(async ({ ctx }) => {
    const opts = getSessionCookieOptions(ctx.req.headers);
    ctx.resHeaders.append(
      "set-cookie",
      cookie.serialize(Session.cookieName, "", {
        httpOnly: opts.httpOnly,
        path: opts.path,
        sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
        secure: opts.secure,
        maxAge: 0,
      }),
    );
    return { success: true };
  }),
});
