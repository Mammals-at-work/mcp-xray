import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import {
  CreateTrackedIssueRequest,
  ImportExecutionRequest,
  SearchIssuesRequest,
  XrayClient
} from "../application/xray-client.js";
import { asJsonResult } from "./tool-result.js";

const importExecutionSchema = z.object({
  format: z
    .enum(["junit", "nunit", "xunit", "robot", "testng", "cucumber", "behave", "json"])
    .describe("Format of the test report to import into Xray."),
  reportContent: z.string().min(1).describe("Full content of the test execution report as a string."),
  projectKey: z.string().min(1).optional().describe("Jira project key, e.g. 'OQA10', 'GAP'."),
  testExecKey: z.string().min(1).optional().describe("Key of an existing Test Execution issue to update, e.g. 'OQA10-42'.")
});

const graphQlSchema = z.object({
  query: z.string().min(1).describe("GraphQL query string to execute against the Xray Cloud API."),
  variables: z.record(z.string(), z.unknown()).optional().describe("Variables for the GraphQL query.")
});

const issueKeySchema = z.object({
  issueKey: z.string().min(1).describe("Jira issue key, e.g. 'GAP-12471', 'OQA10-42'."),
  fields: z.array(z.string().min(1)).optional().describe("Jira fields to include, e.g. ['summary', 'status', 'assignee'].")
});

const searchIssuesSchema = z.object({
  projectKey: z
    .string()
    .min(1)
    .optional()
    .describe("Jira project key to filter by, e.g. 'OQA10', 'GAP', 'CALC'."),
  jql: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Additional JQL filter conditions to combine with the issue type. Do NOT include 'issuetype' or 'ORDER BY' here — those are handled automatically. Example: 'status = \"Done\" AND assignee = currentUser()'"
    ),
  orderBy: z
    .string()
    .min(1)
    .optional()
    .describe(
      "JQL ORDER BY clause without the 'ORDER BY' keyword. Example: 'created DESC' to sort by creation date descending."
    ),
  maxResults: z.number().int().positive().max(100).optional().describe("Maximum number of results to return (1-100, default 25)."),
  fields: z
    .array(z.string().min(1))
    .optional()
    .describe("Jira fields to include in the response, e.g. ['summary', 'status', 'assignee', 'created'].")
});

const createTrackedIssueSchema = z.object({
  projectKey: z.string().min(1).describe("Jira project key, e.g. 'OQA10', 'GAP'."),
  summary: z.string().min(1).describe("Summary / title for the new issue."),
  description: z.string().min(1).optional().describe("Description for the new issue."),
  fields: z.record(z.string(), z.unknown()).optional().describe("Additional Jira fields, e.g. { labels: ['nightly'], components: [{ name: 'Backend' }] }.")
});

export function createToolHandlers(client: XrayClient) {
  return {
    checkConnection: async (): Promise<CallToolResult> => {
      const status = await client.checkConnection();
      return asJsonResult(status);
    },
    executeGraphQl: async (input: z.infer<typeof graphQlSchema>): Promise<CallToolResult> => {
      const parsedInput = graphQlSchema.parse(input);
      const result = await client.graphQl(parsedInput.query, parsedInput.variables);
      return asJsonResult(result);
    },
    importExecutionResults: async (
      input: z.infer<typeof importExecutionSchema>
    ): Promise<CallToolResult> => {
      const parsedInput = importExecutionSchema.parse(input);
      const request: ImportExecutionRequest = {
        format: parsedInput.format,
        reportContent: parsedInput.reportContent,
        ...(parsedInput.projectKey ? { projectKey: parsedInput.projectKey } : {}),
        ...(parsedInput.testExecKey ? { testExecKey: parsedInput.testExecKey } : {})
      };
      const result = await client.importExecutionResults(request);

      return asJsonResult(result ?? { success: true });
    },
    getTestExecution: async (input: z.infer<typeof issueKeySchema>): Promise<CallToolResult> => {
      const parsedInput = issueKeySchema.parse(input);
      const result = await client.getTestExecution(parsedInput.issueKey, parsedInput.fields);
      return asJsonResult(result);
    },
    searchTestExecutions: async (input: z.infer<typeof searchIssuesSchema>): Promise<CallToolResult> => {
      const parsedInput = searchIssuesSchema.parse(input);
      const request: Omit<SearchIssuesRequest, "issueType"> = {
        ...(parsedInput.projectKey ? { projectKey: parsedInput.projectKey } : {}),
        ...(parsedInput.jql ? { jql: parsedInput.jql } : {}),
        ...(parsedInput.orderBy ? { orderBy: parsedInput.orderBy } : {}),
        ...(parsedInput.maxResults ? { maxResults: parsedInput.maxResults } : {}),
        ...(parsedInput.fields ? { fields: parsedInput.fields } : {})
      };
      const result = await client.searchTestExecutions(request);
      return asJsonResult(result);
    },
    createTestExecution: async (input: z.infer<typeof createTrackedIssueSchema>): Promise<CallToolResult> => {
      const parsedInput = createTrackedIssueSchema.parse(input);
      const request: Omit<CreateTrackedIssueRequest, "issueType"> = {
        projectKey: parsedInput.projectKey,
        summary: parsedInput.summary,
        ...(parsedInput.description ? { description: parsedInput.description } : {}),
        ...(parsedInput.fields ? { fields: parsedInput.fields } : {})
      };
      const result = await client.createTestExecution(request);
      return asJsonResult(result);
    },
    getTestPlan: async (input: z.infer<typeof issueKeySchema>): Promise<CallToolResult> => {
      const parsedInput = issueKeySchema.parse(input);
      const result = await client.getTestPlan(parsedInput.issueKey, parsedInput.fields);
      return asJsonResult(result);
    },
    searchTestPlans: async (input: z.infer<typeof searchIssuesSchema>): Promise<CallToolResult> => {
      const parsedInput = searchIssuesSchema.parse(input);
      const request: Omit<SearchIssuesRequest, "issueType"> = {
        ...(parsedInput.projectKey ? { projectKey: parsedInput.projectKey } : {}),
        ...(parsedInput.jql ? { jql: parsedInput.jql } : {}),
        ...(parsedInput.orderBy ? { orderBy: parsedInput.orderBy } : {}),
        ...(parsedInput.maxResults ? { maxResults: parsedInput.maxResults } : {}),
        ...(parsedInput.fields ? { fields: parsedInput.fields } : {})
      };
      const result = await client.searchTestPlans(request);
      return asJsonResult(result);
    },
    createTestPlan: async (input: z.infer<typeof createTrackedIssueSchema>): Promise<CallToolResult> => {
      const parsedInput = createTrackedIssueSchema.parse(input);
      const request: Omit<CreateTrackedIssueRequest, "issueType"> = {
        projectKey: parsedInput.projectKey,
        summary: parsedInput.summary,
        ...(parsedInput.description ? { description: parsedInput.description } : {}),
        ...(parsedInput.fields ? { fields: parsedInput.fields } : {})
      };
      const result = await client.createTestPlan(request);
      return asJsonResult(result);
    }
  };
}

export const toolSchemas = {
  checkConnection: z.object({}),
  executeGraphQl: graphQlSchema,
  importExecutionResults: importExecutionSchema,
  getTestExecution: issueKeySchema,
  searchTestExecutions: searchIssuesSchema,
  createTestExecution: createTrackedIssueSchema,
  getTestPlan: issueKeySchema,
  searchTestPlans: searchIssuesSchema,
  createTestPlan: createTrackedIssueSchema
};