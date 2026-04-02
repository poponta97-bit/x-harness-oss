import * as p from "@clack/prompts";
import { wrangler } from "../lib/wrangler.js";

interface SecretsOptions {
  workerName: string;
  apiKey: string;
  xAccessToken: string;
  workerUrl: string;
}

export async function setSecrets(options: SecretsOptions): Promise<void> {
  const s = p.spinner();
  s.start("シークレット設定中...");

  const secrets: Record<string, string> = {
    API_KEY: options.apiKey,
    X_ACCESS_TOKEN: options.xAccessToken,
    X_REFRESH_TOKEN: "",
    WORKER_URL: options.workerUrl,
  };

  // Use secret:bulk to set all secrets at once
  const jsonPayload = JSON.stringify(secrets);
  try {
    await wrangler(["secret", "bulk", "--name", options.workerName], {
      input: jsonPayload,
    });
  } catch {
    // Fallback: set one by one with versions secret put + deploy
    for (const [name, value] of Object.entries(secrets)) {
      await wrangler(
        ["versions", "secret", "put", name, "--name", options.workerName],
        { input: value },
      );
    }
    // Deploy the latest version with secrets
    await wrangler([
      "versions",
      "deploy",
      "--name",
      options.workerName,
      "--yes",
    ]);
  }

  s.stop("シークレット設定完了");
}
