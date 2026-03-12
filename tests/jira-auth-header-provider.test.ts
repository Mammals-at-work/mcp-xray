import { describe, expect, it } from "vitest";
import { JiraAuthHeaderProvider } from "../src/infrastructure/auth/jira-auth-header-provider.js";

describe("JiraAuthHeaderProvider", () => {
  it("builds cloud basic auth headers", () => {
    const provider = new JiraAuthHeaderProvider({
      deployment: "cloud",
      xrayBaseUrl: "https://xray.cloud.getxray.app",
      xrayApiBaseUrl: "https://xray.cloud.getxray.app/api/v2",
      graphQlUrl: "https://xray.cloud.getxray.app/api/v2/graphql",
      tokenTtlSeconds: 10,
      xrayClientId: "id",
      xrayClientSecret: "secret",
      jiraBaseUrl: "https://example.atlassian.net",
      jiraApiBaseUrl: "https://example.atlassian.net/rest/api/3",
      jiraApiVersion: "3",
      jiraEmail: "me@example.com",
      jiraApiToken: "api-token"
    });

    expect(provider.buildHeaders()).toEqual({
      authorization: `Basic ${Buffer.from("me@example.com:api-token", "utf8").toString("base64")}`
    });
  });

  it("prefers PAT on datacenter", () => {
    const provider = new JiraAuthHeaderProvider({
      deployment: "datacenter",
      xrayBaseUrl: "https://jira.example.com",
      xrayApiBaseUrl: "https://jira.example.com/rest/raven/1.0",
      tokenTtlSeconds: 10,
      jiraBaseUrl: "https://jira.example.com",
      jiraApiBaseUrl: "https://jira.example.com/rest/api/2",
      jiraApiVersion: "2",
      jiraPat: "pat-token"
    });

    expect(provider.buildHeaders()).toEqual({
      authorization: "Bearer pat-token"
    });
  });
});