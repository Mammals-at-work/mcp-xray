import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { XrayClient } from "../application/xray-client.js";
import { asErrorResult } from "./tool-result.js";
import { createToolHandlers, toolSchemas } from "./xray-tool-handlers.js";

function safe<TInput>(fn: (input: TInput) => Promise<CallToolResult>): (input: TInput) => Promise<CallToolResult> {
  return async (input: TInput) => {
    try {
      return await fn(input);
    } catch (error) {
      return asErrorResult(error);
    }
  };
}

export function createMcpServer(client: XrayClient): McpServer {
  const server = new McpServer({
    name: "mcp-xray",
    version: "0.2.0"
  });

  const handlers = createToolHandlers(client);

  server.registerTool(
    "xray_check_connection",
    {
      description:
        "Validates authentication against the configured Xray deployment (cloud or datacenter) and Jira instance. " +
        "Call this first to verify credentials are working before using other tools.",
      inputSchema: toolSchemas.checkConnection.shape
    },
    safe(async () => handlers.checkConnection())
  );

  server.registerTool(
    "xray_graphql",
    {
      description:
        "Executes a GraphQL query against Xray Cloud. Only available for cloud deployments. " +
        "Use this for advanced Xray-specific queries like fetching test runs, test steps, preconditions, or test sets.",
      inputSchema: toolSchemas.executeGraphQl.shape
    },
    safe((input) => handlers.executeGraphQl(input))
  );

  server.registerTool(
    "xray_import_execution_results",
    {
      description:
        "Imports automated test execution results into Xray. " +
        "Supports formats: junit, nunit, xunit, robot, testng, cucumber, behave, json. " +
        "Provide the full report content as a string. Optionally target a specific project or existing Test Execution issue.",
      inputSchema: toolSchemas.importExecutionResults.shape
    },
    safe((input) => handlers.importExecutionResults(input))
  );

  server.registerTool(
    "xray_get_test_execution",
    {
      description:
        "Fetches a single Test Execution issue from Jira by its issue key (e.g. 'OQA10-42', 'GAP-100'). " +
        "Returns the full Jira issue details. Use the 'fields' parameter to limit which fields are returned.",
      inputSchema: toolSchemas.getTestExecution.shape
    },
    safe((input) => handlers.getTestExecution(input))
  );

  server.registerTool(
    "xray_search_test_executions",
    {
      description:
        "Searches for Test Execution issues in Jira using filters. The issuetype filter is applied automatically. " +
        "Use 'projectKey' to filter by project (e.g. 'OQA10'), 'jql' for additional JQL conditions " +
        "(e.g. 'status = \"Done\"'), and 'orderBy' for sorting (e.g. 'created DESC'). " +
        "Example: to find recent test executions in project OQA10, use projectKey='OQA10' and orderBy='created DESC'.",
      inputSchema: toolSchemas.searchTestExecutions.shape
    },
    safe((input) => handlers.searchTestExecutions(input))
  );

  server.registerTool(
    "xray_create_test_execution",
    {
      description:
        "Creates a new Test Execution issue in Jira/Xray. Requires a project key and summary. " +
        "Optionally provide a description and additional Jira fields (e.g. labels, components).",
      inputSchema: toolSchemas.createTestExecution.shape
    },
    safe((input) => handlers.createTestExecution(input))
  );

  server.registerTool(
    "xray_get_test_plan",
    {
      description:
        "Fetches a single Test Plan issue from Jira by its issue key (e.g. 'GAP-12471'). " +
        "Returns the full Jira issue details. Use the 'fields' parameter to limit which fields are returned.",
      inputSchema: toolSchemas.getTestPlan.shape
    },
    safe((input) => handlers.getTestPlan(input))
  );

  server.registerTool(
    "xray_search_test_plans",
    {
      description:
        "Searches for Test Plan issues in Jira using filters. The issuetype filter is applied automatically. " +
        "Use 'projectKey' to filter by project (e.g. 'GAP'), 'jql' for additional JQL conditions, " +
        "and 'orderBy' for sorting (e.g. 'created DESC'). " +
        "Example: to find test plans in project GAP, use projectKey='GAP'.",
      inputSchema: toolSchemas.searchTestPlans.shape
    },
    safe((input) => handlers.searchTestPlans(input))
  );

  server.registerTool(
    "xray_create_test_plan",
    {
      description:
        "Creates a new Test Plan issue in Jira/Xray. Requires a project key and summary. " +
        "Optionally provide a description and additional Jira fields (e.g. labels, components).",
      inputSchema: toolSchemas.createTestPlan.shape
    },
    safe((input) => handlers.createTestPlan(input))
  );

  return server;
}