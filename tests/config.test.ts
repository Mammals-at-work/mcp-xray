import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/infrastructure/config/load-config.js";

describe("loadConfig", () => {
  it("builds cloud config with Jira support", () => {
    const config = loadConfig({
      XRAY_DEPLOYMENT: "cloud",
      XRAY_CLIENT_ID: "client-id",
      XRAY_CLIENT_SECRET: "client-secret",
      XRAY_BASE_URL: "https://example.getxray.app/",
      XRAY_TOKEN_TTL_SECONDS: "60",
      JIRA_BASE_URL: "https://example.atlassian.net/",
      JIRA_EMAIL: "me@example.com",
      JIRA_API_TOKEN: "api-token"
    });

    expect(config).toEqual({
      deployment: "cloud",
      xrayBaseUrl: "https://example.getxray.app",
      xrayApiBaseUrl: "https://example.getxray.app/api/v2",
      graphQlUrl: "https://example.getxray.app/api/v2/graphql",
      tokenTtlSeconds: 60,
      xrayClientId: "client-id",
      xrayClientSecret: "client-secret",
      jiraBaseUrl: "https://example.atlassian.net",
      jiraApiBaseUrl: "https://example.atlassian.net/rest/api/3",
      jiraApiVersion: "3",
      jiraEmail: "me@example.com",
      jiraApiToken: "api-token"
    });
  });

  it("builds datacenter config", () => {
    const config = loadConfig({
      XRAY_DEPLOYMENT: "datacenter",
      JIRA_BASE_URL: "https://jira.example.com/",
      JIRA_PAT: "token"
    });

    expect(config).toEqual({
      deployment: "datacenter",
      xrayBaseUrl: "https://jira.example.com",
      xrayApiBaseUrl: "https://jira.example.com/rest/raven/1.0",
      tokenTtlSeconds: 3000,
      jiraBaseUrl: "https://jira.example.com",
      jiraApiBaseUrl: "https://jira.example.com/rest/api/2",
      jiraApiVersion: "2",
      jiraPat: "token"
    });
  });

  it("throws when the cloud client id is missing", () => {
    expect(() =>
      loadConfig({
        XRAY_DEPLOYMENT: "cloud",
        XRAY_CLIENT_SECRET: "client-secret"
      })
    ).toThrowError("XRAY_CLIENT_ID is required for cloud deployments");
  });

  it("throws when datacenter jira base url is missing", () => {
    expect(() =>
      loadConfig({
        XRAY_DEPLOYMENT: "datacenter"
      })
    ).toThrowError("JIRA_BASE_URL is required for datacenter deployments");
  });

  it("throws when the token ttl is invalid", () => {
    expect(() =>
      loadConfig({
        XRAY_CLIENT_ID: "client-id",
        XRAY_CLIENT_SECRET: "client-secret",
        XRAY_TOKEN_TTL_SECONDS: "0"
      })
    ).toThrowError("XRAY_TOKEN_TTL_SECONDS must be a positive integer");
  });
});