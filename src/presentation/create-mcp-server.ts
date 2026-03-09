import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { XrayClient } from "../application/xray-client.js";
import { createToolHandlers, toolSchemas } from "./xray-tool-handlers.js";

export function createMcpServer(client: XrayClient): McpServer {
  const server = new McpServer({
    name: "mcp-xray",
    version: "0.2.0"
  });

  const handlers = createToolHandlers(client);

  server.registerTool(
    "xray_check_connection",
    {
      description: "Validates authentication against the configured Xray deployment and Jira, when applicable.",
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
      description: "Imports automated execution results into Xray.",
      inputSchema: toolSchemas.importExecutionResults.shape
    },
    async (input) => handlers.importExecutionResults(input)
  );

  server.registerTool(
    "xray_get_test_execution",
    {
      description: "Fetches a Test Execution issue from Jira/Xray.",
      inputSchema: toolSchemas.getTestExecution.shape
    },
    async (input) => handlers.getTestExecution(input)
  );

  server.registerTool(
    "xray_search_test_executions",
    {
      description: "Searches Test Execution issues using Jira JQL filters.",
      inputSchema: toolSchemas.searchTestExecutions.shape
    },
    async (input) => handlers.searchTestExecutions(input)
  );

  server.registerTool(
    "xray_create_test_execution",
    {
      description: "Creates a new Test Execution issue in Jira/Xray.",
      inputSchema: toolSchemas.createTestExecution.shape
    },
    async (input) => handlers.createTestExecution(input)
  );

  server.registerTool(
    "xray_get_test_plan",
    {
      description: "Fetches a Test Plan issue from Jira/Xray.",
      inputSchema: toolSchemas.getTestPlan.shape
    },
    async (input) => handlers.getTestPlan(input)
  );

  server.registerTool(
    "xray_search_test_plans",
    {
      description: "Searches Test Plan issues using Jira JQL filters.",
      inputSchema: toolSchemas.searchTestPlans.shape
    },
    async (input) => handlers.searchTestPlans(input)
  );

  server.registerTool(
    "xray_create_test_plan",
    {
      description: "Creates a new Test Plan issue in Jira/Xray.",
      inputSchema: toolSchemas.createTestPlan.shape
    },
    async (input) => handlers.createTestPlan(input)
  );

  return server;
}