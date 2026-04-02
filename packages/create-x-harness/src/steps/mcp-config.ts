import * as p from "@clack/prompts";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

interface McpConfigOptions {
  workerUrl: string;
  apiKey: string;
}

export function generateMcpConfig(options: McpConfigOptions): void {
  const mcpJsonPath = join(process.cwd(), ".mcp.json");

  const newServerConfig = {
    command: "npx",
    args: ["-y", "@x-harness/mcp-server@latest"],
    env: {
      X_HARNESS_API_URL: options.workerUrl,
      X_HARNESS_API_KEY: options.apiKey,
    },
  };

  let mcpConfig: Record<string, any> = {};

  if (existsSync(mcpJsonPath)) {
    try {
      mcpConfig = JSON.parse(readFileSync(mcpJsonPath, "utf-8"));
    } catch {
      // Invalid JSON, start fresh
    }
  }

  if (!mcpConfig.mcpServers) {
    mcpConfig.mcpServers = {};
  }

  // Don't overwrite existing x-harness config -- use a unique name
  let serverName = "x-harness";
  if (mcpConfig.mcpServers["x-harness"]) {
    const suffix = options.apiKey.slice(0, 8);
    serverName = `x-harness-${suffix}`;
    p.log.info(
      `既存の x-harness 設定があるため、${serverName} として追加します`,
    );
  }
  mcpConfig.mcpServers[serverName] = newServerConfig;

  writeFileSync(mcpJsonPath, JSON.stringify(mcpConfig, null, 2) + "\n");
  p.log.success(`.mcp.json に MCP 設定を追加しました（${serverName}）`);
}
