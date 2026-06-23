import type { CookieOptions } from "hono/utils/cookie";
import { Session } from "@contracts/constants";

function isLocalhost(headers: Headers): boolean {
  const host = headers.get("host") || "";
  return host.startsWith("localhost:") || host.startsWith("127.0.0.1:");
}

function isHttps(headers: Headers): boolean {
  // Check forwarded proto (for reverse proxy setups)
  const forwardedProto = headers.get("x-forwarded-proto");
  if (forwardedProto) return forwardedProto === "https";
  
  // Direct HTTPS detection
  return false; // Default to HTTP for IP-based access
}

export function getSessionCookieOptions(headers: Headers): CookieOptions {
  const localhost = isLocalhost(headers);
  const https = isHttps(headers);

  return {
    httpOnly: true,
    path: "/",
    sameSite: (localhost || !https) ? "Lax" : "None",
    secure: !localhost && https,
    maxAge: Math.floor(Session.maxAgeMs / 1000),
  };
}
