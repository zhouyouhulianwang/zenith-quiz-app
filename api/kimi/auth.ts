import { eq } from "drizzle-orm";
import { Session } from "@contracts/constants";
import { env } from "../lib/env";
import { findUserByUnionId } from "../queries/users";
import { verifySessionToken, signSessionToken } from "./session";
import { setSessionCookie, parseCookieHeader } from "./cookie";
import type { SessionPayload, UserProfile } from "./types";
import { getDb } from "../queries/connection";
import { users } from "@db/schema";

export async function authenticateRequest(req: Request) {
  const token = parseCookieHeader(req.headers, Session.cookieName);
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  let user: Awaited<ReturnType<typeof findUserByUnionId>> | undefined;

  // Support both OAuth (unionId) and simple auth (username) modes
  if (payload.unionId) {
    user = await findUserByUnionId(payload.unionId);
  } else if (payload.username) {
    const rows = await getDb()
      .select()
      .from(users)
      .where(eq(users.username, payload.username))
      .limit(1);
    user = rows[0];
  }

  if (!user) {
    console.warn(
      `[auth] User not found for session: unionId=${payload.unionId}, username=${payload.username}`
    );
    return null;
  }

  return user;
}

export async function ensureUser(
  payload: SessionPayload,
  profile: UserProfile,
) {
  const unionId = payload.unionId;
  if (!unionId) throw new Error("unionId required for OAuth user");
  let user = await findUserByUnionId(unionId);

  if (user) {
    return user;
  }

  console.log("[auth] Creating new user from OAuth profile:", unionId);

  await upsertUser({
    unionId: unionId,
    name: profile.name,
    avatar_url: profile.avatar_url,
  });

  user = await findUserByUnionId(unionId);

  if (!user) {
    throw new Error("Failed to create or retrieve user after upsert");
  }

  return user;
}

export async function upsertUser(
  data: { unionId: string; name: string; avatar_url: string },
) {
  const values = {
    unionId: data.unionId,
    name: data.name || null,
    email: null,
    avatar: data.avatar_url || null,
    lastSignInAt: new Date(),
  };

  const updateSet: Record<string, unknown> = {
    ...values,
  };

  if (
    values.unionId &&
    values.unionId === env.ownerUnionId
  ) {
    updateSet.role = "admin";
  }

  await getDb()
    .insert(users)
    .values(values)
    .onDuplicateKeyUpdate({ set: updateSet });
}

export async function exchangeAuthCode(
  authCode: string,
): Promise<{ token: string; clientId: string }> {
  const clientId = env.clientId;
  const clientSecret = env.clientSecret;

  const tokenResponse = await fetch(`${env.apiBase}/connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: authCode,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: env.appUrl + "/api/oauth/callback",
    }),
  });

  if (!tokenResponse.ok) {
    console.error("[auth] Token exchange failed:", await tokenResponse.text());
    throw new Error("OAuth token exchange failed");
  }

  const { access_token } = (await tokenResponse.json()) as {
    access_token: string;
  };

  return { token: access_token, clientId };
}

export async function verifyAccessToken(
  accessToken: string,
): Promise<UserProfile> {
  const response = await fetch(`${env.apiBase}/api/users/profile`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error("Failed to verify access token");
  }

  const user = (await response.json()) as UserProfile;
  return user;
}

import type { MiddlewareHandler } from "hono";

export function createOAuthCallbackHandler(): MiddlewareHandler {
  return async (c) => {
    const code = c.req.query("code");
    const state = c.req.query("state");
    if (!code) {
      return c.json({ error: "Missing authorization code" }, 400);
    }

    try {
      const { token } = await exchangeAuthCode(code);
      const profile = await verifyAccessToken(token);
      const payload: SessionPayload = {
        unionId: profile.user_id,
        clientId: env.clientId,
      };
      const sessionToken = await signSessionToken(payload);
      await ensureUser(payload, profile);
      setSessionCookie(c, sessionToken);

      const redirectUri = state ? atob(state) : "/";
      return c.redirect(redirectUri);
    } catch (err) {
      console.error("[oauth] callback error:", err);
      return c.json({ error: "OAuth callback failed" }, 500);
    }
  };
}
