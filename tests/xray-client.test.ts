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

const cloudConfig: XrayConfig = {
  deployment: "cloud",
  xrayClientId: "client-id",
  xrayClientSecret: "client-secret",
  xrayBaseUrl: "https://xray.cloud.getxray.app",
  xrayApiBaseUrl: "https://xray.cloud.getxray.app/api/v2",
  graphQlUrl: "https://xray.cloud.getxray.app/api/v2/graphql",
  tokenTtlSeconds: 10,
  jiraBaseUrl: "https://example.atlassian.net",
  jiraApiBaseUrl: "https://example.atlassian.net/rest/api/3",
  jiraApiVersion: "3",
  jiraEmail: "me@example.com",
  jiraApiToken: "api-token"
};

const dataCenterConfig: XrayConfig = {
  deployment: "datacenter",
  xrayBaseUrl: "https://jira.example.com",
  xrayApiBaseUrl: "https://jira.example.com/rest/raven/1.0",
  tokenTtlSeconds: 10,
  jiraBaseUrl: "https://jira.example.com",
  jiraApiBaseUrl: "https://jira.example.com/rest/api/2",
  jiraApiVersion: "2",
  jiraPat: "pat-token"
};

describe("XrayClient", () => {
  it("reports a successful cloud connection once authenticated", async () => {
    const httpClient = new QueueHttpClient([
      { status: 200, ok: true, body: '"token"' },
      { status: 200, ok: true, body: { name: "carlo" } }
    ]);
    const tokenProvider = new AuthTokenProvider(httpClient, cloudConfig, () => 0);
    const client = new XrayClient(httpClient, tokenProvider, cloudConfig);

    await expect(client.checkConnection()).resolves.toEqual({
      deployment: "cloud",
      xrayBaseUrl: "https://xray.cloud.getxray.app",
      jiraBaseUrl: "https://example.atlassian.net",
      authenticated: true
    });
  });

  it("reports a successful datacenter connection using Jira auth", async () => {
    const httpClient = new QueueHttpClient([{ status: 200, ok: true, body: { name: "carlo" } }]);
    const tokenProvider = new AuthTokenProvider(httpClient, cloudConfig, () => 0);
    const client = new XrayClient(httpClient, tokenProvider, dataCenterConfig);

    await expect(client.checkConnection()).resolves.toEqual({
      deployment: "datacenter",
      xrayBaseUrl: "https://jira.example.com",
      jiraBaseUrl: "https://jira.example.com",
      authenticated: true
    });
    expect(httpClient.requests[0]?.url).toBe("https://jira.example.com/rest/api/2/myself");
    expect(httpClient.requests[0]?.headers?.authorization).toBe("Bearer pat-token");
  });

  it("executes GraphQL requests with the bearer token", async () => {
    const httpClient = new QueueHttpClient([
      { status: 200, ok: true, body: '"token"' },
      { status: 200, ok: true, body: { data: {  project: { key: "CALC" } } } }
    ]);
    const tokenProvider = new AuthTokenProvider(httpClient, cloudConfig, () => 0);
    const client = new XrayClient(httpClient, tokenProvider, cloudConfig);

    await expect(
      client.graphQl<{ project: { key: string } }>("query { project { key } }")
    ).resolves.toEqual({ project: { key: "CALC" } });

    expect(httpClient.requests[1]?.headers?.authorization).toBe("Bearer token");
  });

  it("rejects GraphQL on datacenter", async () => {
    const httpClient = new QueueHttpClient([]);
    const tokenProvider = new AuthTokenProvider(httpClient, cloudConfig, () => 0);
    const client = new XrayClient(httpClient, tokenProvider, dataCenterConfig);

    await expect(client.graphQl("query { project { key } }")).rejects.toBeInstanceOf(XrayError);
  });

  it("throws when GraphQL returns errors", async () => {
    const httpClient = new QueueHttpClient([
      { status: 200, ok: true, body: '"token"' },
      { status: 200, ok: true, body: { errors: [{ message: "boom" }] } }
    ]);
    const tokenProvider = new AuthTokenProvider(httpClient, cloudConfig, () => 0);
    const client = new XrayClient(httpClient, tokenProvider, cloudConfig);

    await expect(client.graphQl("query { project { key } }")).rejects.toBeInstanceOf(XrayError);
  });

  it("throws when GraphQL does not include data", async () => {
    const httpClient = new QueueHttpClient([
      { status: 200, ok: true, body: '"token"' },
      { status: 200, ok: true, body: {} }
    ]);
    const tokenProvider = new AuthTokenProvider(httpClient, cloudConfig, () => 0);
    const client = new XrayClient(httpClient, tokenProvider, cloudConfig);

    await expect(client.graphQl("query { project { key } }")).rejects.toBeInstanceOf(XrayError);
  });

  it("builds cloud import execution URLs with query params", async () => {
    const httpClient = new QueueHttpClient([
      { status: 200, ok: true, body: '"token"' },
      { status: 200, ok: true, body: { testExecIssue: { key: "CALC-1" } } }
    ]);
    const tokenProvider = new AuthTokenProvider(httpClient, cloudConfig, () => 0);
    const client = new XrayClient(httpClient, tokenProvider, cloudConfig);

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

  it("builds datacenter import execution URLs without cloud query params", async () => {
    const httpClient = new QueueHttpClient([{ status: 200, ok: true, body: { success: true } }]);
    const tokenProvider = new AuthTokenProvider(httpClient, cloudConfig, () => 0);
    const client = new XrayClient(httpClient, tokenProvider, dataCenterConfig);

    await client.importExecutionResults({
      format: "json",
      reportContent: '{"tests":[]}',
      projectKey: "IGNORED"
    });

    expect(httpClient.requests[0]?.url).toBe("https://jira.example.com/rest/raven/1.0/import/execution/json");
    expect(httpClient.requests[0]?.headers?.authorization).toBe("Bearer pat-token");
  });

  it("searches test execution issues through Jira REST", async () => {
    const httpClient = new QueueHttpClient([{ status: 200, ok: true, body: { issues: [] } }]);
    const tokenProvider = new AuthTokenProvider(httpClient, cloudConfig, () => 0);
    const client = new XrayClient(httpClient, tokenProvider, dataCenterConfig);

    await client.searchTestExecutions({
      projectKey: "CALC",
      jql: 'status = "Done"',
      maxResults: 10,
      fields: ["summary"]
    });

    expect(httpClient.requests[0]?.url).toBe("https://jira.example.com/rest/api/2/search");
    expect(httpClient.requests[0]?.body).toBe(
      JSON.stringify({
        jql: 'issuetype = "Test Execution" AND project = "CALC" AND (status = "Done")',
        maxResults: 10,
        fields: ["summary"]
      })
    );
  });

  it("appends ORDER BY when orderBy is provided", async () => {
    const httpClient = new QueueHttpClient([{ status: 200, ok: true, body: { issues: [] } }]);
    const tokenProvider = new AuthTokenProvider(httpClient, cloudConfig, () => 0);
    const client = new XrayClient(httpClient, tokenProvider, dataCenterConfig);

    await client.searchTestExecutions({
      projectKey: "OQA10",
      orderBy: "created DESC",
      maxResults: 25
    });

    expect(httpClient.requests[0]?.body).toBe(
      JSON.stringify({
        jql: 'issuetype = "Test Execution" AND project = "OQA10" ORDER BY created DESC',
        maxResults: 25
      })
    );
  });

  it("creates a cloud test plan using Atlassian document format description", async () => {
    const httpClient = new QueueHttpClient([{ status: 200, ok: true, body: { key: "CALC-9" } }]);
    const tokenProvider = new AuthTokenProvider(httpClient, cloudConfig, () => 0);
    const client = new XrayClient(httpClient, tokenProvider, cloudConfig);

    await client.createTestPlan({
      projectKey: "CALC",
      summary: "Regression plan",
      description: "Nightly regression",
      fields: { labels: ["nightly"] }
    });

    expect(httpClient.requests[0]?.url).toBe("https://example.atlassian.net/rest/api/3/issue");
    expect(httpClient.requests[0]?.headers?.authorization).toBe(
      `Basic ${Buffer.from("me@example.com:api-token", "utf8").toString("base64")}`
    );
    expect(httpClient.requests[0]?.body).toContain('"name":"Test Plan"');
    expect(httpClient.requests[0]?.body).toContain('"type":"doc"');
    expect(httpClient.requests[0]?.body).toContain('"labels":["nightly"]');
  });

  it("gets a single test execution issue with selected fields", async () => {
    const httpClient = new QueueHttpClient([{ status: 200, ok: true, body: { key: "CALC-1" } }]);
    const tokenProvider = new AuthTokenProvider(httpClient, cloudConfig, () => 0);
    const client = new XrayClient(httpClient, tokenProvider, dataCenterConfig);

    await client.getTestExecution("CALC-1", ["summary", "status"]);

    expect(httpClient.requests[0]?.url).toBe(
      "https://jira.example.com/rest/api/2/issue/CALC-1?fields=summary%2Cstatus"
    );
  });
});