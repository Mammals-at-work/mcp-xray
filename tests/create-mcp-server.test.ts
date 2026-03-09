import { describe, expect, it, vi } from "vitest";
import { XrayClient } from "../src/application/xray-client.js";
import { createMcpServer } from "../src/presentation/create-mcp-server.js";

describe("createMcpServer", () => {
  it("registers the expected Xray tools", () => {
    const client = {
      checkConnection: vi.fn().mockResolvedValue({ authenticated: true, baseUrl: "https://xray.cloud.getxray.app" }),
      graphQl: vi.fn().mockResolvedValue({ viewer: { name: "codex" } }),
      importExecutionResults: vi.fn().mockResolvedValue({ success: true })
    } as unknown as XrayClient;

    const server = createMcpServer(client) as any;

    expect(Object.keys(server._registeredTools)).toEqual([
      "xray_check_connection",
      "xray_graphql",
      "xray_import_execution_results"
    ]);
  });

  it("wires tool handlers to the Xray client", async () => {
    const client = {
      checkConnection: vi.fn().mockResolvedValue({ authenticated: true, baseUrl: "https://xray.cloud.getxray.app" }),
      graphQl: vi.fn().mockResolvedValue({ viewer: { name: "codex" } }),
      importExecutionResults: vi.fn().mockResolvedValue({ success: true })
    } as unknown as XrayClient;

    const server = createMcpServer(client) as any;

    await server._registeredTools.xray_check_connection.handler();
    await server._registeredTools.xray_graphql.handler({ query: "query { viewer { name } }" }, {});
    await server._registeredTools.xray_import_execution_results.handler(
      { format: "json", reportContent: '{"tests":[]}' },
      {}
    );

    expect(client.checkConnection).toHaveBeenCalledTimes(1);
    expect(client.graphQl).toHaveBeenCalledWith("query { viewer { name } }", undefined);
    expect(client.importExecutionResults).toHaveBeenCalledWith({
      format: "json",
      reportContent: '{"tests":[]}'
    });
  });
});