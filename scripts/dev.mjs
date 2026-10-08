import path from "node:path";

const root = path.resolve(import.meta.dir, "..");
const port = Number(process.env.PORT || 4173);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

const notFound = Bun.file(path.join(root, "404.html"));

const server = Bun.serve({
  port,
  async fetch(request) {
    const url = new URL(request.url);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.endsWith("/")) pathname += "index.html";

    const filePath = path.normalize(path.join(root, pathname));
    if (!filePath.startsWith(root)) {
      return new Response("Forbidden", { status: 403 });
    }

    let file = Bun.file(filePath);
    if (!(await file.exists()) && !path.extname(filePath)) {
      const withHtml = Bun.file(`${filePath}.html`);
      if (await withHtml.exists()) file = withHtml;
    }

    if (await file.exists()) {
      const ext = path.extname(file.name || filePath).toLowerCase();
      const headers = { "content-type": types[ext] || "application/octet-stream" };
      return new Response(file, { headers });
    }

    if (await notFound.exists()) {
      return new Response(notFound, { status: 404, headers: { "content-type": types[".html"] } });
    }
    return new Response("Not found", { status: 404 });
  },
});

console.log(`Serving ${root}`);
console.log(`  http://localhost:${server.port}`);
