import type { Hono } from "hono";
import type { HttpBindings } from "@hono/node-server";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

type App = Hono<{ Bindings: HttpBindings }>;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
  ".otf": "font/otf",
};

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
}

export function serveStaticFiles(app: App) {
  const possiblePaths = [
    path.resolve(process.cwd(), "dist/public"),
    path.resolve(__dirname, "../../dist/public"),
    path.resolve(__dirname, "../../../dist/public"),
    "/mnt/agents/output/app/dist/public",
  ];

  let distPath = possiblePaths[0];
  for (const p of possiblePaths) {
    if (fs.existsSync(path.join(p, "index.html"))) {
      distPath = p;
      break;
    }
  }

  app.use("*", async (c) => {
    const url = new URL(c.req.url);
    const pathname = decodeURIComponent(url.pathname);

    if (pathname.includes("..") || pathname.includes("~")) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const filePath = path.join(distPath, pathname);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const content = fs.readFileSync(filePath);
      const mimeType = getMimeType(filePath);
      return new Response(content, {
        headers: { "Content-Type": mimeType },
      });
    }

    if (!pathname.startsWith("/api/")) {
      const indexHtml = path.join(distPath, "index.html");
      if (fs.existsSync(indexHtml)) {
        const content = fs.readFileSync(indexHtml, "utf-8");
        return c.html(content);
      }
    }

    return c.json({ error: "Not Found" }, 404);
  });
}
