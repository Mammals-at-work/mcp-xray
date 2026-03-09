import { afterEach, describe, expect, it, vi } from "vitest";
import { FetchHttpClient, assertSuccessfulResponse } from "../src/infrastructure/http/fetch-http-client.js";
import { XrayError } from "../src/domain/xray-error.js";

describe("FetchHttpClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parses JSON responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      )
    );

    const client = new FetchHttpClient();
    const response = await client.request<{ ok: boolean }>({
      url: "https://example.test/graphql",
      method: "POST",
      headers: { authorization: "Bearer token" },
      body: "{}"
    });

    expect(response).toEqual({
      status: 200,
      ok: true,
      body: { ok: true }
    });
  });

  it("parses text responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("plain-text-token", {
          status: 200,
          headers: { "content-type": "text/plain" }
        })
      )
    );

    const client = new FetchHttpClient();
    const response = await client.request<string>({
      url: "https://example.test/authenticate",
      method: "POST"
    });

    expect(response.body).toBe("plain-text-token");
  });

  it("returns undefined for empty bodies", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(null, {
          status: 204
        })
      )
    );

    const client = new FetchHttpClient();
    const response = await client.request<undefined>({
      url: "https://example.test/no-content",
      method: "GET"
    });

    expect(response.body).toBeUndefined();
  });
});

describe("assertSuccessfulResponse", () => {
  it("throws an XrayError when the response is not ok", () => {
    expect(() =>
      assertSuccessfulResponse(
        {
          status: 401,
          ok: false,
          body: { error: "Unauthorized" }
        },
        "Request failed"
      )
    ).toThrowError(XrayError);
  });
});