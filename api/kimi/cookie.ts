import type { CookieOptions } from "hono/utils/cookie";
import { setCookie } from "hono/cookie";
import type { Context } from "hono";
import { Session } from "@contracts/constants";

function isLocalhost(headers: Headers): boolean {
  const host = headers.get("host") || "";
  return host.startsWith("localhost:") || host.startsWith("127.0.0.1:");
}

export function getSessionCookieOptions(headers: Headers): CookieOptions {
  const localhost = isLocalhost(headers);
  return {
    httpOnly: true,
    path: "/",
    sameSite: localhost ? "Lax" : "None",
    secure: !localhost,
    maxAge: Math.floor(Session.maxAgeMs / 1000),
  };
}

export function setSessionCookie(
  c: Context,
  token: string,
) {
  const options = getSessionCookieOptions(c.req.raw.headers);
  setCookie(c, Session.cookieName, token, options);
}

export function parseCookieHeader(headers: Headers, name: string): string | undefined {
  const cookie = headers.get("cookie");
  if (!cookie) return undefined;
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match?.[1];
}
