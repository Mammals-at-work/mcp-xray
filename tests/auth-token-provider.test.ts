import { describe, expect, it, vi } from "vitest";
import { AuthTokenProvider } from "../src/application/auth-token-provider.js";
import { HttpClient, HttpRequest } from "../src/domain/http-client.js";
import { XrayConfig } from "../src/domain/xray-config.js";
import { XrayError } from "../src/domain/xray-error.js";

class StubHttpClient implements HttpClient {
  public readonly requests: HttpRequest[] = [];

  public constructor(private readonly responses: string[]) {}

  public async request<TBody>(request: HttpRequest) {
    this.requests.push(request);
    return {
      status: 200,
      ok: true,
      body: this.responses.shift() as TBody
    };
  }
}

const cloudConfig: XrayConfig = {
  deployment: "cloud",
  xrayBaseUrl: "https://xray.cloud.getxray.app",
  xrayApiBaseUrl: "https://xray.cloud.getxray.app/api/v2",
  graphQlUrl: "https://xray.cloud.getxray.app/api/v2/graphql",
  tokenTtlSeconds: 10,
  xrayClientId: "client-id",
  xrayClientSecret: "client-secret"
};

describe("AuthTokenProvider", () => {
  it("caches the token until it expires", async () => {
    const httpClient = new StubHttpClient(['"first-token"', '"second-token"']);
    const now = vi.fn(() => 1000);
    const provider = new AuthTokenProvider(httpClient, cloudConfig, now);

    await expect(provider.getToken()).resolves.toBe("first-token");
    await expect(provider.getToken()).resolves.toBe("first-token");

    expect(httpClient.requests).toHaveLength(1);
  });

  it("refreshes the token after expiration", async () => {
    const httpClient = new StubHttpClient(['"first-token"', '"second-token"']);
    let currentTime = 1000;
    const provider = new AuthTokenProvider(httpClient, cloudConfig, () => currentTime);

    await expect(provider.getToken()).resolves.toBe("first-token");
    currentTime = 12000;

    await expect(provider.getToken()).resolves.toBe("second-token");
    expect(httpClient.requests).toHaveLength(2);
  });

  it("rejects token auth on datacenter deployments", async () => {
    const provider = new AuthTokenProvider(
      new StubHttpClient([]),
      {
        deployment: "datacenter",
        xrayBaseUrl: "https://jira.example.com",
        xrayApiBaseUrl: "https://jira.example.com/rest/raven/1.0",
        tokenTtlSeconds: 10,
        jiraBaseUrl: "https://jira.example.com",
        jiraApiBaseUrl: "https://jira.example.com/rest/api/2",
        jiraApiVersion: "2",
        jiraPat: "pat"
      },
      () => 0
    );

    await expect(provider.getToken()).rejects.toBeInstanceOf(XrayError);
  });
});