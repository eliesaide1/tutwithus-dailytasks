import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The backend folder (where package.json and .env live). Found by walking up, so it works
// both from src/ (tsx) and from the bundled dist/index.js.
function findServerRoot() {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  while (!existsSync(path.join(dir, "package.json")) && path.dirname(dir) !== dir) dir = path.dirname(dir);
  return dir;
}
const serverRoot = findServerRoot();

// Minimal .env loader (avoids a dotenv dependency). Real env vars take precedence.
try {
  for (const line of readFileSync(path.join(serverRoot, ".env"), "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]!] === undefined) process.env[m[1]!] = m[2]!.replace(/^["']|["']$/g, "");
  }
} catch {
  // no .env file: rely on the environment
}

function required(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}. See server/.env.example.`);
  return v;
}

const jwtSecret = required("JWT_SECRET");
if (jwtSecret.length < 32) throw new Error("JWT_SECRET must be at least 32 characters.");

// Object storage for task attachments (DigitalOcean Spaces). Optional: when these are
// unset the attachment endpoints answer 503 and the rest of the app is unaffected.
function spacesConfig() {
  const { SPACES_KEY, SPACES_SECRET, SPACES_BUCKET, SPACES_REGION, SPACES_ENDPOINT } = process.env;
  if (!SPACES_KEY || !SPACES_SECRET || !SPACES_BUCKET) return null;
  const region = SPACES_REGION ?? "fra1";
  return {
    key: SPACES_KEY,
    secret: SPACES_SECRET,
    bucket: SPACES_BUCKET,
    region,
    endpoint: SPACES_ENDPOINT ?? `https://${region}.digitaloceanspaces.com`,
  };
}

export const config = {
  env: process.env.NODE_ENV ?? "development",
  isProd: process.env.NODE_ENV === "production",
  port: Number(process.env.PORT ?? 4000),
  mongoUri: required("MONGODB_URI"),
  jwtSecret,
  // Origins of the frontend when it is hosted separately from the API (credentials allowed).
  appOrigins: (process.env.APP_ORIGINS ?? "http://localhost:5173")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  serverRoot,
  clientDist: path.resolve(serverRoot, "..", "frontend", "dist"),
  spaces: spacesConfig(),
  /** Largest attachment accepted, in bytes. */
  maxAttachmentBytes: Number(process.env.MAX_ATTACHMENT_MB ?? 25) * 1024 * 1024,
};
