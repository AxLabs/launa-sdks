import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const ALGO = "aes-256-gcm";

export function encryptSecret(plaintext: string, secret: string): string {
  const key = scryptSync(secret, "launa-shopify", 32);
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptSecret(payload: string, secret: string): string {
  const key = scryptSync(secret, "launa-shopify", 32);
  const buf = Buffer.from(payload, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export type ShopCredentials = {
  apiKey: string;
  apiId: string;
};

export function storeCredentials(creds: ShopCredentials, secret: string): string {
  return encryptSecret(JSON.stringify(creds), secret);
}

export function loadCredentials(blob: string, secret: string): ShopCredentials {
  return JSON.parse(decryptSecret(blob, secret)) as ShopCredentials;
}
