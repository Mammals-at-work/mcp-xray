import { HttpClient } from "../domain/http-client.js";
import { XrayConfig } from "../domain/xray-config.js";
import { XrayError } from "../domain/xray-error.js";
import { assertSuccessfulResponse } from "../infrastructure/http/fetch-http-client.js";
import { JiraAuthHeaderProvider } from "../infrastructure/auth/jira-auth-header-provider.js";
import { AuthTokenProvider } from "./auth-token-provider.js";

export interface GraphQlResponse<TData> {
  readonly data?: TData;
  readonly errors?: ReadonlyArray<{
    readonly message: string;
    readonly [key: string]: unknown;
  }>;
}

export interface ImportExecutionRequest {
  readonly format: string;
  readonly reportContent: string;
  readonly projectKey?: string;
  readonly testExecKey?: string;
}

export interface SearchIssuesRequest {
  readonly issueType: "Test Execution" | "Test Plan";
  readonly projectKey?: string;
  readonly jql?: string;
  readonly maxResults?: number;
  readonly fields?: readonly string[];
}

export interface CreateTrackedIssueRequest {
  readonly issueType: "Test Execution" | "Test Plan";
  readonly projectKey: string;
  readonly summary: string;
  readonly description?: string;
  readonly fields?: Record<string, unknown>;
}

export class XrayClient {
  private readonly jiraAuthHeaderProvider: JiraAuthHeaderProvider;

  public constructor(
    private readonly httpClient: HttpClient,
    private readonly tokenProvider: AuthTokenProvider,
    private readonly config: XrayConfig
  ) {
    this.jiraAuthHeaderProvider = new JiraAuthHeaderProvider(config);
  }

  public async checkConnection(): Promise<{
    readonly deployment: string;
    readonly xrayBaseUrl: string;
    readonly jiraBaseUrl?: string;
    readonly authenticated: true;
  }> {
    if (this.config.deployment === "cloud") {
      await this.tokenProvider.getToken();
    } else {
      await this.getJiraCurrentUser();
    }

    return {
      deployment: this.config.deployment,
      xrayBaseUrl: this.config.xrayBaseUrl,
      ...(this.config.jiraBaseUrl ? { jiraBaseUrl: this.config.jiraBaseUrl } : {}),
      authenticated: true
    };
  }

  public async graphQl<TData>(query: string, variables?: Record<string, unknown>): Promise<TData> {
    if (this.config.deployment !== "cloud" || !this.config.graphQlUrl) {
      throw new XrayError("GraphQL is only supported for Xray cloud deployments in this MCP server");
    }

    const token = await this.tokenProvider.getToken();

    const response = await this.httpClient.request<GraphQlResponse<TData>>({
      url: this.config.graphQlUrl,
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        query,
        variables
      })
    });

    assertSuccessfulResponse(response, "Xray GraphQL request failed");

    if (response.body.errors && response.body.errors.length > 0) {
      throw new XrayError("Xray GraphQL returned errors", {
        details: response.body.errors
      });
    }

    if (response.body.data === undefined) {
      throw new XrayError("Xray GraphQL response did not include data", {
        details: response.body
      });
    }

    return response.body.data;
  }

  public async importExecutionResults(request: ImportExecutionRequest): Promise<unknown> {
    const response = await this.httpClient.request<unknown>({
      url: buildImportEndpoint(this.config, request),
      method: "POST",
      headers: {
        ...(await this.buildXrayHeaders()),
        "content-type": guessContentType(request.format)
      },
      body: request.reportContent
    });

    assertSuccessfulResponse(response, "Xray import execution request failed");

    return response.body;
  }

  public async getTestExecution(issueKey: string, fields?: readonly string[]): Promise<unknown> {
    return this.getIssue(issueKey, fields);
  }

  public async searchTestExecutions(request: Omit<SearchIssuesRequest, "issueType"> = {}): Promise<unknown> {
    return this.searchIssues({ ...request, issueType: "Test Execution" });
  }

  public async createTestExecution(request: Omit<CreateTrackedIssueRequest, "issueType">): Promise<unknown> {
    return this.createTrackedIssue({ ...request, issueType: "Test Execution" });
  }

  public async getTestPlan(issueKey: string, fields?: readonly string[]): Promise<unknown> {
    return this.getIssue(issueKey, fields);
  }

  public async searchTestPlans(request: Omit<SearchIssuesRequest, "issueType"> = {}): Promise<unknown> {
    return this.searchIssues({ ...request, issueType: "Test Plan" });
  }

  public async createTestPlan(request: Omit<CreateTrackedIssueRequest, "issueType">): Promise<unknown> {
    return this.createTrackedIssue({ ...request, issueType: "Test Plan" });
  }

  private async getIssue(issueKey: string, fields?: readonly string[]): Promise<unknown> {
    const jiraApiBaseUrl = this.requireJiraApiBaseUrl();
    const url = new URL(`${jiraApiBaseUrl}/issue/${issueKey}`);

    if (fields && fields.length > 0) {
      url.searchParams.set("fields", fields.join(","));
    }

    const response = await this.httpClient.request<unknown>({
      url: url.toString(),
      method: "GET",
      headers: await this.buildJiraHeaders()
    });

    assertSuccessfulResponse(response, `Failed to fetch Jira issue ${issueKey}`);

    return response.body;
  }

  private async searchIssues(request: SearchIssuesRequest): Promise<unknown> {
    const jiraApiBaseUrl = this.requireJiraApiBaseUrl();
    const response = await this.httpClient.request<unknown>({
      url: `${jiraApiBaseUrl}/search`,
      method: "POST",
      headers: {
        ...(await this.buildJiraHeaders()),
        "content-type": "application/json"
      },
      body: JSON.stringify({
        jql: buildIssueJql(request),
        maxResults: request.maxResults ?? 25,
        ...(request.fields && request.fields.length > 0 ? { fields: request.fields } : {})
      })
    });

    assertSuccessfulResponse(response, `Failed to search ${request.issueType} issues`);

    return response.body;
  }

  private async createTrackedIssue(request: CreateTrackedIssueRequest): Promise<unknown> {
    const jiraApiBaseUrl = this.requireJiraApiBaseUrl();
    const response = await this.httpClient.request<unknown>({
      url: `${jiraApiBaseUrl}/issue`,
      method: "POST",
      headers: {
        ...(await this.buildJiraHeaders()),
        "content-type": "application/json"
      },
      body: JSON.stringify({
        fields: {
          project: {
            key: request.projectKey
          },
          issuetype: {
            name: request.issueType
          },
          summary: request.summary,
          ...(request.description ? { description: formatDescription(this.config, request.description) } : {}),
          ...(request.fields ?? {})
        }
      })
    });

    assertSuccessfulResponse(response, `Failed to create ${request.issueType}`);

    return response.body;
  }

  private async buildXrayHeaders(): Promise<Record<string, string>> {
    if (this.config.deployment === "cloud") {
      const token = await this.tokenProvider.getToken();
      return {
        authorization: `Bearer ${token}`
      };
    }

    return this.buildJiraHeaders();
  }

  private async buildJiraHeaders(): Promise<Record<string, string>> {
    return this.jiraAuthHeaderProvider.buildHeaders();
  }

  private requireJiraApiBaseUrl(): string {
    if (!this.config.jiraApiBaseUrl) {
      throw new XrayError("Jira-backed tools require JIRA_BASE_URL and matching Jira credentials");
    }

    return this.config.jiraApiBaseUrl;
  }

  private async getJiraCurrentUser(): Promise<unknown> {
    const jiraApiBaseUrl = this.requireJiraApiBaseUrl();
    const response = await this.httpClient.request<unknown>({
      url: `${jiraApiBaseUrl}/myself`,
      method: "GET",
      headers: await this.buildJiraHeaders()
    });

    assertSuccessfulResponse(response, "Failed to authenticate against Jira");

    return response.body;
  }
}

function buildImportEndpoint(config: XrayConfig, request: ImportExecutionRequest): string {
  if (config.deployment === "cloud") {
    const url = new URL(`${config.xrayApiBaseUrl}/import/execution/${request.format}`);

    if (request.projectKey) {
      url.searchParams.set("projectKey", request.projectKey);
    }

    if (request.testExecKey) {
      url.searchParams.set("testExecKey", request.testExecKey);
    }

    return url.toString();
  }

  return `${config.xrayApiBaseUrl}/import/execution/${request.format}`;
}

function buildIssueJql(request: SearchIssuesRequest): string {
  const clauses = [`issuetype = "${request.issueType}"`];

  if (request.projectKey) {
    clauses.push(`project = "${request.projectKey}"`);
  }

  if (request.jql) {
    clauses.push(`(${request.jql})`);
  }

  return clauses.join(" AND ");
}

function formatDescription(config: XrayConfig, description: string): unknown {
  if (config.deployment === "cloud") {
    return {
      type: "doc",
      version: 1,
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: description
            }
          ]
        }
      ]
    };
  }

  return description;
}

function guessContentType(format: string): string {
  const normalizedFormat = format.toLowerCase();

  if (["junit", "nunit", "xunit", "robot", "testng"].includes(normalizedFormat)) {
    return "text/xml";
  }

  return "application/json";
}