import { XrayConfig, XrayDeployment } from "../../domain/xray-config.js";

const DEFAULT_CLOUD_XRAY_BASE_URL = "https://xray.cloud.getxray.app";
const DEFAULT_TOKEN_TTL_SECONDS = 3000;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): XrayConfig {
  const deployment = parseDeployment(env.XRAY_DEPLOYMENT);
  const tokenTtlSeconds = parseTokenTtl(env.XRAY_TOKEN_TTL_SECONDS);
  const jiraBaseUrl = env.JIRA_BASE_URL ? normalizeBaseUrl(env.JIRA_BASE_URL) : undefined;

  if (deployment === "cloud") {
    const clientId = env.XRAY_CLIENT_ID?.trim();
    const clientSecret = env.XRAY_CLIENT_SECRET?.trim();

    if (!clientId) {
      throw new Error("XRAY_CLIENT_ID is required for cloud deployments");
    }

    if (!clientSecret) {
      throw new Error("XRAY_CLIENT_SECRET is required for cloud deployments");
    }

    const xrayBaseUrl = normalizeBaseUrl(env.XRAY_BASE_URL ?? DEFAULT_CLOUD_XRAY_BASE_URL);

    return {
      deployment,
      xrayBaseUrl,
      xrayApiBaseUrl: `${xrayBaseUrl}/api/v2`,
      graphQlUrl: `${xrayBaseUrl}/api/v2/graphql`,
      tokenTtlSeconds,
      xrayClientId: clientId,
      xrayClientSecret: clientSecret,
      ...(jiraBaseUrl ? { jiraBaseUrl, jiraApiBaseUrl: `${jiraBaseUrl}/rest/api/3`, jiraApiVersion: "3" as const } : {}),
      ...(env.JIRA_EMAIL?.trim() ? { jiraEmail: env.JIRA_EMAIL.trim() } : {}),
      ...(env.JIRA_API_TOKEN?.trim() ? { jiraApiToken: env.JIRA_API_TOKEN.trim() } : {})
    };
  }

  if (!jiraBaseUrl) {
    throw new Error("JIRA_BASE_URL is required for datacenter deployments");
  }

  return {
    deployment,
    xrayBaseUrl: normalizeBaseUrl(env.XRAY_BASE_URL ?? jiraBaseUrl),
    xrayApiBaseUrl: `${normalizeBaseUrl(env.XRAY_BASE_URL ?? jiraBaseUrl)}/rest/raven/1.0`,
    tokenTtlSeconds,
    jiraBaseUrl,
    jiraApiBaseUrl: `${jiraBaseUrl}/rest/api/2`,
    jiraApiVersion: "2",
    ...(env.JIRA_USERNAME?.trim() ? { jiraUsername: env.JIRA_USERNAME.trim() } : {}),
    ...(env.JIRA_PASSWORD?.trim() ? { jiraPassword: env.JIRA_PASSWORD.trim() } : {}),
    ...(env.JIRA_PAT?.trim() ? { jiraPat: env.JIRA_PAT.trim() } : {})
  };
}

function parseDeployment(value: string | undefined): XrayDeployment {
  if (!value) {
    return "cloud";
  }

  if (value === "cloud" || value === "datacenter") {
    return value;
  }

  throw new Error("XRAY_DEPLOYMENT must be either 'cloud' or 'datacenter'");
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