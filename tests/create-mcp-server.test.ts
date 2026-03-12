import { describe, expect, it, vi } from "vitest";
import { XrayClient } from "../src/application/xray-client.js";
import { createMcpServer } from "../src/presentation/create-mcp-server.js";

describe("createMcpServer", () => {
  it("registers the expected Xray tools", () => {
    const client = {
      checkConnection: vi.fn().mockResolvedValue({ authenticated: true, xrayBaseUrl: "https://xray.cloud.getxray.app" }),
      graphQl: vi.fn().mockResolvedValue({ viewer: { name: "codex" } }),
      importExecutionResults: vi.fn().mockResolvedValue({ success: true }),
      getTestExecution: vi.fn(),
      searchTestExecutions: vi.fn(),
      createTestExecution: vi.fn(),
      getTestPlan: vi.fn(),
      searchTestPlans: vi.fn(),
      createTestPlan: vi.fn()
    } as unknown as XrayClient;

    const server = createMcpServer(client) as any;

    expect(Object.keys(server._registeredTools)).toEqual([
      "xray_check_connection",
      "xray_graphql",
      "xray_import_execution_results",
      "xray_get_test_execution",
      "xray_search_test_executions",
      "xray_create_test_execution",
      "xray_get_test_plan",
      "xray_search_test_plans",
      "xray_create_test_plan"
    ]);
  });

  it("wires test plan and execution handlers to the Xray client", async () => {
    const client = {
      checkConnection: vi.fn().mockResolvedValue({ authenticated: true, xrayBaseUrl: "https://xray.cloud.getxray.app" }),
      graphQl: vi.fn().mockResolvedValue({ viewer: { name: "codex" } }),
      importExecutionResults: vi.fn().mockResolvedValue({ success: true }),
      getTestExecution: vi.fn().mockResolvedValue({ key: "CALC-1" }),
      searchTestExecutions: vi.fn().mockResolvedValue({ issues: [] }),
      createTestExecution: vi.fn().mockResolvedValue({ key: "CALC-2" }),
      getTestPlan: vi.fn().mockResolvedValue({ key: "CALC-3" }),
      searchTestPlans: vi.fn().mockResolvedValue({ issues: [] }),
      createTestPlan: vi.fn().mockResolvedValue({ key: "CALC-4" })
    } as unknown as XrayClient;

    const server = createMcpServer(client) as any;

    await server._registeredTools.xray_get_test_execution.handler({ issueKey: "CALC-1" }, {});
    await server._registeredTools.xray_search_test_executions.handler({ projectKey: "CALC" }, {});
    await server._registeredTools.xray_create_test_execution.handler({ projectKey: "CALC", summary: "Run" }, {});
    await server._registeredTools.xray_get_test_plan.handler({ issueKey: "CALC-3" }, {});
    await server._registeredTools.xray_search_test_plans.handler({ projectKey: "CALC" }, {});
    await server._registeredTools.xray_create_test_plan.handler({ projectKey: "CALC", summary: "Plan" }, {});

    expect(client.getTestExecution).toHaveBeenCalledWith("CALC-1", undefined);
    expect(client.searchTestExecutions).toHaveBeenCalledWith({ projectKey: "CALC" });
    expect(client.createTestExecution).toHaveBeenCalledWith({ projectKey: "CALC", summary: "Run" });
    expect(client.getTestPlan).toHaveBeenCalledWith("CALC-3", undefined);
    expect(client.searchTestPlans).toHaveBeenCalledWith({ projectKey: "CALC" });
    expect(client.createTestPlan).toHaveBeenCalledWith({ projectKey: "CALC", summary: "Plan" });
  });
});