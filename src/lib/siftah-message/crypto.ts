import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Encrypt message bodies at rest. Key is derived from MESSAGE_ENCRYPTION_KEY
 * (or DATABASE_URL / a fixed dev fallback) so plaintext is not stored in Postgres.
 * This is server-side encryption — not full E2E Signal-style crypto.
 */
function keyBytes(): Buffer {
  const secret =
    process.env.MESSAGE_ENCRYPTION_KEY ||
    process.env.BETTER_AUTH_SECRET ||
    process.env.DATABASE_URL ||
    "looters-siftah-message-dev-key";
  return createHash("sha256").update(secret).digest();
}

export function encryptBody(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyBytes(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64url")}:${tag.toString("base64url")}:${enc.toString("base64url")}`;
}

export function decryptBody(blob: string): string {
  if (!blob.startsWith("v1:")) return blob;
  const parts = blob.split(":");
  if (parts.length !== 4) return "[unable to decrypt]";
  try {
    const iv = Buffer.from(parts[1], "base64url");
    const tag = Buffer.from(parts[2], "base64url");
    const data = Buffer.from(parts[3], "base64url");
    const decipher = createDecipheriv("aes-256-gcm", keyBytes(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return "[unable to decrypt]";
  }
}

export function newId(prefix = "sm") {
  return `${prefix}_${randomBytes(12).toString("hex")}`;
}
