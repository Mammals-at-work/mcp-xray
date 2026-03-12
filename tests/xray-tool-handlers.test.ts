import { describe, expect, it, vi } from "vitest";
import { XrayClient } from "../src/application/xray-client.js";
import { createToolHandlers } from "../src/presentation/xray-tool-handlers.js";

describe("createToolHandlers", () => {
  it("serializes the connection response as JSON text", async () => {
    const client = {
      checkConnection: vi.fn().mockResolvedValue({
        deployment: "cloud",
        xrayBaseUrl: "https://xray.cloud.getxray.app",
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
              deployment: "cloud",
              xrayBaseUrl: "https://xray.cloud.getxray.app",
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

  it("delegates test execution creation to the client", async () => {
    const client = {
      createTestExecution: vi.fn().mockResolvedValue({ key: "CALC-1" })
    } as unknown as XrayClient;

    const handlers = createToolHandlers(client);

    await handlers.createTestExecution({
      projectKey: "CALC",
      summary: "Smoke execution",
      description: "Triggered by CI"
    });

    expect(client.createTestExecution).toHaveBeenCalledWith({
      projectKey: "CALC",
      summary: "Smoke execution",
      description: "Triggered by CI"
    });
  });

  it("delegates test plan search to the client", async () => {
    const client = {
      searchTestPlans: vi.fn().mockResolvedValue({ issues: [] })
    } as unknown as XrayClient;

    const handlers = createToolHandlers(client);

    await handlers.searchTestPlans({
      projectKey: "CALC",
      maxResults: 5
    });

    expect(client.searchTestPlans).toHaveBeenCalledWith({
      projectKey: "CALC",
      maxResults: 5
    });
  });
});