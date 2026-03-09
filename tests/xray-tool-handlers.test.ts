import { describe, expect, it, vi } from "vitest";
import { XrayClient } from "../src/application/xray-client.js";
import { createToolHandlers } from "../src/presentation/xray-tool-handlers.js";

describe("createToolHandlers", () => {
  it("serializes the connection response as JSON text", async () => {
    const client = {
      checkConnection: vi.fn().mockResolvedValue({
        baseUrl: "https://xray.cloud.getxray.app",
        authenticated: true
      })
    } as unknown as XrayClient;

    const handlers = createToolHandlers(client);

    await expect(handlers.checkConnection()).resolves.toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              baseUrl: "https://xray.cloud.getxray.app",
              authenticated: true
            },
            null,
            2
          )
        }
      ]
    });
  });

  it("delegates GraphQL execution to the client", async () => {
    const client = {
      graphQl: vi.fn().mockResolvedValue({ project: { key: "CALC" } })
    } as unknown as XrayClient;

    const handlers = createToolHandlers(client);

    await handlers.executeGraphQl({
      query: "query { project { key } }",
      variables: { projectKey: "CALC" }
    });

    expect(client.graphQl).toHaveBeenCalledWith("query { project { key } }", {
      projectKey: "CALC"
    });
  });

  it("validates import inputs before delegating", async () => {
    const client = {
      importExecutionResults: vi.fn().mockResolvedValue({ success: true })
    } as unknown as XrayClient;

    const handlers = createToolHandlers(client);

    await expect(
      handlers.importExecutionResults({
        format: "junit",
        reportContent: "<xml />"
      })
    ).resolves.toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify({ success: true }, null, 2)
        }
      ]
    });
  });
});