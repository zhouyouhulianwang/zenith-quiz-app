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

// Hash a password with bcrypt
function hashPassword(pw: string): string {
  return bcrypt.hashSync(pw, 10);
}

// Validate credentials — auto-creates user on first login if not exists
async function findOrCreateUser(username: string, password: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (rows.length === 0) {
    // Auto-create user on first login attempt
    const result = await db.insert(users).values({
      username,
      password: hashPassword(password),
      name: `User ${username}`,
      role: "user",
      lastSignInAt: new Date(),
    });
    const insertId = result[0]?.insertId ? Number(result[0].insertId) : 0;

    // Create default settings
    await db.insert(userSettings).values({
      userId: insertId,
      dailyGoal: 20,
      reminderTime: "20:00",
      difficulty: 3,
      fontSize: "medium",
      questionLanguage: "entc",
      theme: "system",
    });

    return { id: insertId, username };
  }

  const user = rows[0];
  if (!user.password) {
    // User exists but has no password — set it
    await db
      .update(users)
      .set({ password: hashPassword(password) })
      .where(eq(users.id, user.id));
  } else if (!bcrypt.compareSync(password, user.password)) {
    // Wrong password
    return null;
  }

  return user;
}

export const simpleAuthRouter = createRouter({
  // Simple username/password login — auto-creates user on first login
  login: publicQuery
    .input(
      z.object({
        username: z.string().min(1),
        password: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const user = await findOrCreateUser(input.username, input.password);

      if (!user) {
        return { success: false, error: "用户名或密码错误" };
      }

      // Update last sign in
      const db = getDb();
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
