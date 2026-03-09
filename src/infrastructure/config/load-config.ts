import { XrayConfig } from "../../domain/xray-config.js";

const DEFAULT_BASE_URL = "https://xray.cloud.getxray.app";
const DEFAULT_TOKEN_TTL_SECONDS = 3000;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): XrayConfig {
  const clientId = env.XRAY_CLIENT_ID?.trim();
  const clientSecret = env.XRAY_CLIENT_SECRET?.trim();

  if (!clientId) {
    throw new Error("XRAY_CLIENT_ID is required");
  }

  if (!clientSecret) {
    throw new Error("XRAY_CLIENT_SECRET is required");
  }

  const baseUrl = normalizeBaseUrl(env.XRAY_BASE_URL ?? DEFAULT_BASE_URL);
  const tokenTtlSeconds = parseTokenTtl(env.XRAY_TOKEN_TTL_SECONDS);

  return {
    clientId,
    clientSecret,
    baseUrl,
    apiBaseUrl: `${baseUrl}/api/v2`,
    graphQlUrl: `${baseUrl}/api/v2/graphql`,
    tokenTtlSeconds
  };
}

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

function parseTokenTtl(value: string | undefined): number {
  if (!value) {
    return DEFAULT_TOKEN_TTL_SECONDS;
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error("XRAY_TOKEN_TTL_SECONDS must be a positive integer");
  }

  return parsedValue;
}