import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { XrayClient } from "../application/xray-client.js";
import { createToolHandlers, toolSchemas } from "./xray-tool-handlers.js";

export function createMcpServer(client: XrayClient): McpServer {
  const server = new McpServer({
    name: "mcp-xray",
    version: "0.1.0"
  });

  const handlers = createToolHandlers(client);

  server.registerTool(
    "xray_check_connection",
    {
      description: "Validates authentication against Xray Cloud and returns the active base URL.",
      inputSchema: toolSchemas.checkConnection.shape
    },
    async () => handlers.checkConnection()
  );

  server.registerTool(
    "xray_graphql",
    {
      description: "Executes a GraphQL query against Xray Cloud.",
      inputSchema: toolSchemas.executeGraphQl.shape
    },
    async (input) => handlers.executeGraphQl(input)
  );

  server.registerTool(
    "xray_import_execution_results",
    {
      description: "Imports automated execution results into Xray Cloud.",
      inputSchema: toolSchemas.importExecutionResults.shape
    },
    async (input) => handlers.importExecutionResults(input)
  );

  return server;
}