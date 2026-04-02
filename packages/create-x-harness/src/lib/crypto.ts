import { randomBytes } from "node:crypto";

export function generateApiKey(): string {
  return `xh_${randomBytes(16).toString("hex")}`;
}
