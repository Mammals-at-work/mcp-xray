import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/infrastructure/config/load-config.js";

describe("loadConfig", () => {
  it("builds the derived urls from environment variables", () => {
    const config = loadConfig({
      XRAY_CLIENT_ID: "client-id",
      XRAY_CLIENT_SECRET: "client-secret",
      XRAY_BASE_URL: "https://example.getxray.app/",
      XRAY_TOKEN_TTL_SECONDS: "60"
    });

    expect(config).toEqual({
      clientId: "client-id",
      clientSecret: "client-secret",
      baseUrl: "https://example.getxray.app",
      apiBaseUrl: "https://example.getxray.app/api/v2",
      graphQlUrl: "https://example.getxray.app/api/v2/graphql",
      tokenTtlSeconds: 60
    });
  });

  it("throws when the client id is missing", () => {
    expect(() =>
      loadConfig({
        XRAY_CLIENT_SECRET: "client-secret"
      })
    ).toThrowError("XRAY_CLIENT_ID is required");
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