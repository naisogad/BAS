import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const PORT = Number(process.env.PORT || 3000);
const HOST = "0.0.0.0";
const ROOT_DIR = process.cwd();
const PREVIEW_DIR = path.join(ROOT_DIR, "output", "preview");
const DEFAULT_HTML = path.join(PREVIEW_DIR, "render01.html");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".wav": "audio/wav",
};

function ensurePreviewBuilt() {
  if (!fs.existsSync(DEFAULT_HTML)) {
    execFileSync(
      process.execPath,
      [
        path.join(ROOT_DIR, "src", "builders", "build_render_html_template.mjs"),
        "--episode",
        "ep02",
        "--render",
        "01",
        "--title",
        "Template Smoke Validation",
        "--duration",
        "2.0",
      ],
      { cwd: ROOT_DIR, stdio: "inherit" }
    );
  }
}

function resolveRequestFile(reqUrl) {
  const rawPath = decodeURIComponent((reqUrl || "/").split("?")[0]);
  if (rawPath === "/" || rawPath === "/index.html") {
    return DEFAULT_HTML;
  }

  const normalized = path.posix.normalize(rawPath).replace(/^\/+/, "");
  if (normalized.startsWith("..")) {
    return null;
  }

  const candidates = [
    path.join(PREVIEW_DIR, normalized),
    path.join(ROOT_DIR, normalized),
  ];

  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    if (
      (resolved.startsWith(PREVIEW_DIR + path.sep) || resolved.startsWith(ROOT_DIR + path.sep)) &&
      fs.existsSync(resolved) &&
      fs.statSync(resolved).isFile()
    ) {
      return resolved;
    }
  }
  return null;
}

ensurePreviewBuilt();

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  const filePath = resolveRequestFile(req.url);
  if (!filePath) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
    "Cache-Control": "no-store",
  });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, HOST, () => {
  console.log(`BAS preview server listening at http://${HOST}:${PORT}`);
});
