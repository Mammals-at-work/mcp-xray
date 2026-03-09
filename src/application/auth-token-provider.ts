import { HttpClient } from "../domain/http-client.js";
import { XrayConfig } from "../domain/xray-config.js";
import { XrayError } from "../domain/xray-error.js";
import { assertSuccessfulResponse } from "../infrastructure/http/fetch-http-client.js";

interface AuthenticationPayload {
  readonly client_id: string;
  readonly client_secret: string;
}

type Now = () => number;

export class AuthTokenProvider {
  private cachedToken?: { readonly value: string; readonly expiresAt: number };

  public constructor(
    private readonly httpClient: HttpClient,
    private readonly config: XrayConfig,
    private readonly now: Now = () => Date.now()
  ) {}

  public async getToken(): Promise<string> {
    if (this.config.deployment !== "cloud") {
      throw new XrayError("Xray token authentication is only available for cloud deployments");
    }

    if (!this.config.xrayClientId || !this.config.xrayClientSecret) {
      throw new XrayError("Cloud deployments require XRAY_CLIENT_ID and XRAY_CLIENT_SECRET");
    }

    if (this.cachedToken && this.cachedToken.expiresAt > this.now()) {
      return this.cachedToken.value;
    }

    const response = await this.httpClient.request<string>({
      url: `${this.config.xrayApiBaseUrl}/authenticate`,
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        client_id: this.config.xrayClientId,
        client_secret: this.config.xrayClientSecret
      } satisfies AuthenticationPayload)
    });

    assertSuccessfulResponse(response, "Failed to authenticate with Xray");

    if (typeof response.body !== "string" || response.body.length === 0) {
      throw new XrayError("Xray authentication did not return a valid token", {
        details: response.body
      });
    }

    const token = response.body.replace(/^"+|"+$/g, "");

    this.cachedToken = {
      value: token,
      expiresAt: this.now() + this.config.tokenTtlSeconds * 1000
    };

    return token;
  }
}