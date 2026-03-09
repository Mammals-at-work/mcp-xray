import { HttpClient } from "../domain/http-client.js";
import { XrayConfig } from "../domain/xray-config.js";
import { XrayError } from "../domain/xray-error.js";
import { assertSuccessfulResponse } from "../infrastructure/http/fetch-http-client.js";
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

export class XrayClient {
  public constructor(
    private readonly httpClient: HttpClient,
    private readonly tokenProvider: AuthTokenProvider,
    private readonly config: XrayConfig
  ) {}

  public async checkConnection(): Promise<{ readonly baseUrl: string; readonly authenticated: true }> {
    await this.tokenProvider.getToken();

    return {
      baseUrl: this.config.baseUrl,
      authenticated: true
    };
  }

  public async graphQl<TData>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<TData> {
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

  public async importExecutionResults(
    request: ImportExecutionRequest
  ): Promise<unknown> {
    const token = await this.tokenProvider.getToken();
    const endpoint = buildImportEndpoint(this.config.apiBaseUrl, request);

    const response = await this.httpClient.request<unknown>({
      url: endpoint,
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": guessContentType(request.format)
      },
      body: request.reportContent
    });

    assertSuccessfulResponse(response, "Xray import execution request failed");

    return response.body;
  }
}

function buildImportEndpoint(apiBaseUrl: string, request: ImportExecutionRequest): string {
  const url = new URL(`${apiBaseUrl}/import/execution/${request.format}`);

  if (request.projectKey) {
    url.searchParams.set("projectKey", request.projectKey);
  }

  if (request.testExecKey) {
    url.searchParams.set("testExecKey", request.testExecKey);
  }

  return url.toString();
}

function guessContentType(format: string): string {
  const normalizedFormat = format.toLowerCase();

  if (["junit", "nunit", "xunit", "robot", "testng"].includes(normalizedFormat)) {
    return "text/xml";
  }

  return "application/json";
}