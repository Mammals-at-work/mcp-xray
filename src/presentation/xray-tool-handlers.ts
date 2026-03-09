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
    .describe("Formato del reporte a importar en Xray."),
  reportContent: z.string().min(1).describe("Contenido completo del reporte de ejecucion."),
  projectKey: z.string().min(1).optional().describe("Clave del proyecto Jira/Xray."),
  testExecKey: z.string().min(1).optional().describe("Clave de la Test Execution existente.")
});

const graphQlSchema = z.object({
  query: z.string().min(1).describe("Consulta GraphQL a ejecutar contra Xray."),
  variables: z.record(z.string(), z.unknown()).optional().describe("Variables de la consulta.")
});

const issueKeySchema = z.object({
  issueKey: z.string().min(1).describe("Clave del issue de Jira/Xray, por ejemplo CALC-123."),
  fields: z.array(z.string().min(1)).optional().describe("Campos a solicitar en la respuesta de Jira.")
});

const searchIssuesSchema = z.object({
  projectKey: z.string().min(1).optional().describe("Proyecto sobre el que filtrar."),
  jql: z.string().min(1).optional().describe("JQL adicional para combinar con el tipo de issue."),
  maxResults: z.number().int().positive().max(100).optional().describe("Numero maximo de resultados."),
  fields: z.array(z.string().min(1)).optional().describe("Campos de Jira a incluir.")
});

const createTrackedIssueSchema = z.object({
  projectKey: z.string().min(1).describe("Clave del proyecto Jira/Xray."),
  summary: z.string().min(1).describe("Resumen del issue."),
  description: z.string().min(1).optional().describe("Descripcion del issue."),
  fields: z.record(z.string(), z.unknown()).optional().describe("Campos adicionales de Jira/Xray.")
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