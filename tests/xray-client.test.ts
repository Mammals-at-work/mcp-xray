import { describe, expect, it } from "vitest";
import { AuthTokenProvider } from "../src/application/auth-token-provider.js";
import { XrayClient } from "../src/application/xray-client.js";
import { HttpClient, HttpRequest, HttpResponse } from "../src/domain/http-client.js";
import { XrayConfig } from "../src/domain/xray-config.js";
import { XrayError } from "../src/domain/xray-error.js";

class QueueHttpClient implements HttpClient {
  public readonly requests: HttpRequest[] = [];

  public constructor(private readonly responses: Array<HttpResponse<unknown>>) {}

  public async request<TBody>(request: HttpRequest): Promise<HttpResponse<TBody>> {
    this.requests.push(request);
    const response = this.responses.shift();

    if (!response) {
      throw new Error("Missing stubbed response");
    }

    return response as HttpResponse<TBody>;
  }
}

const config: XrayConfig = {
  clientId: "client-id",
  clientSecret: "client-secret",
  baseUrl: "https://xray.cloud.getxray.app",
  apiBaseUrl: "https://xray.cloud.getxray.app/api/v2",
  graphQlUrl: "https://xray.cloud.getxray.app/api/v2/graphql",
  tokenTtlSeconds: 10
};

describe("XrayClient", () => {
  it("reports a successful connection once authenticated", async () => {
    const httpClient = new QueueHttpClient([{ status: 200, ok: true, body: '"token"' }]);
    const tokenProvider = new AuthTokenProvider(httpClient, config, () => 0);
    const client = new XrayClient(httpClient, tokenProvider, config);

    await expect(client.checkConnection()).resolves.toEqual({
      baseUrl: "https://xray.cloud.getxray.app",
      authenticated: true
    });
  });

  it("executes GraphQL requests with the bearer token", async () => {
    const httpClient = new QueueHttpClient([
      { status: 200, ok: true, body: '"token"' },
      { status: 200, ok: true, body: { data: { project: { key: "CALC" } } } }
    ]);
    const tokenProvider = new AuthTokenProvider(httpClient, config, () => 0);
    const client = new XrayClient(httpClient, tokenProvider, config);

    await expect(
      client.graphQl<{ project: { key: string } }>("query { project { key } }")
    ).resolves.toEqual({ project: { key: "CALC" } });

    expect(httpClient.requests[1]?.headers?.authorization).toBe("Bearer token");
  });

  it("throws when GraphQL returns errors", async () => {
    const httpClient = new QueueHttpClient([
      { status: 200, ok: true, body: '"token"' },
      { status: 200, ok: true, body: { errors: [{ message: "boom" }] } }
    ]);
    const tokenProvider = new AuthTokenProvider(httpClient, config, () => 0);
    const client = new XrayClient(httpClient, tokenProvider, config);

    await expect(client.graphQl("query { project { key } }")).rejects.toBeInstanceOf(XrayError);
  });

  it("throws when GraphQL does not include data", async () => {
    const httpClient = new QueueHttpClient([
      { status: 200, ok: true, body: '"token"' },
      { status: 200, ok: true, body: {} }
    ]);
    const tokenProvider = new AuthTokenProvider(httpClient, config, () => 0);
    const client = new XrayClient(httpClient, tokenProvider, config);

    await expect(client.graphQl("query { project { key } }")).rejects.toBeInstanceOf(XrayError);
  });

  it("builds import execution URLs with query params", async () => {
    const httpClient = new QueueHttpClient([
      { status: 200, ok: true, body: '"token"' },
      { status: 200, ok: true, body: { testExecIssue: { key: "CALC-1" } } }
    ]);
    const tokenProvider = new AuthTokenProvider(httpClient, config, () => 0);
    const client = new XrayClient(httpClient, tokenProvider, config);

    await client.importExecutionResults({
      format: "junit",
      reportContent: "<xml />",
      projectKey: "CALC",
      testExecKey: "CALC-1"
    });

    expect(httpClient.requests[1]?.url).toBe(
      "https://xray.cloud.getxray.app/api/v2/import/execution/junit?projectKey=CALC&testExecKey=CALC-1"
    );
    expect(httpClient.requests[1]?.headers?.["content-type"]).toBe("text/xml");
  });

  it("uses JSON content-type for JSON imports", async () => {
    const httpClient = new QueueHttpClient([
      { status: 200, ok: true, body: '"token"' },
      { status: 200, ok: true, body: { success: true } }
    ]);
    const tokenProvider = new AuthTokenProvider(httpClient, config, () => 0);
    const client = new XrayClient(httpClient, tokenProvider, config);

    await client.importExecutionResults({
      format: "json",
      reportContent: '{"tests":[]}'
    });

    expect(httpClient.requests[1]?.headers?.["content-type"]).toBe("application/json");
  });
});