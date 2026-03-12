import { HttpClient, HttpRequest, HttpResponse } from "../../domain/http-client.js";
import { XrayError } from "../../domain/xray-error.js";

export class FetchHttpClient implements HttpClient {
  public async request<TBody>(request: HttpRequest): Promise<HttpResponse<TBody>> {
    const init: RequestInit = {
      method: request.method
    };

    if (request.headers) {
      init.headers = request.headers;
    }

    if (request.body !== undefined) {
      init.body = request.body;
    }

    const response = await fetch(request.url, init);
    const contentType = response.headers.get("content-type") ?? "";
    const body = await parseBody<TBody>(response, contentType);

    return {
      status: response.status,
      ok: response.ok,
      body
    };
  }
}

async function parseBody<TBody>(response: Response, contentType: string): Promise<TBody> {
  if (response.status === 204) {
    return undefined as TBody;
  }

  if (contentType.includes("application/json")) {
    return (await response.json()) as TBody;
  }

  const text = await response.text();

  if (text.length === 0) {
    return undefined as TBody;
  }

  return text as TBody;
}

export function assertSuccessfulResponse<TBody>(
  response: HttpResponse<TBody>,
  message: string
): asserts response is HttpResponse<TBody> & { ok: true } {
  if (!response.ok) {
    throw new XrayError(message, {
      status: response.status,
      details: response.body
    });
  }
}