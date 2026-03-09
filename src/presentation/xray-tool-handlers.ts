import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { ImportExecutionRequest, XrayClient } from "../application/xray-client.js";
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
    }
  };
}

export const toolSchemas = {
  checkConnection: z.object({}),
  executeGraphQl: graphQlSchema,
  importExecutionResults: importExecutionSchema
};