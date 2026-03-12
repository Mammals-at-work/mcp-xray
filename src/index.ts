import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { AuthTokenProvider } from "./application/auth-token-provider.js";
import { XrayClient } from "./application/xray-client.js";
import { loadConfig } from "./infrastructure/config/load-config.js";
import { FetchHttpClient } from "./infrastructure/http/fetch-http-client.js";
import { createMcpServer } from "./presentation/create-mcp-server.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const httpClient = new FetchHttpClient();
  const tokenProvider = new AuthTokenProvider(httpClient, config);
  const xrayClient = new XrayClient(httpClient, tokenProvider, config);
  const server = createMcpServer(xrayClient);
  const transport = new StdioServerTransport();

  await server.connect(transport);
}

main().catch((error: unknown) => {
  const normalizedError = error instanceof Error ? error : new Error(String(error));
  console.error(normalizedError.message);
  process.exitCode = 1;
});