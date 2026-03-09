export interface HttpRequest {
  readonly url: string;
  readonly method: "GET" | "POST";
  readonly headers?: Record<string, string>;
  readonly body?: string;
}

export interface HttpResponse<TBody = unknown> {
  readonly status: number;
  readonly ok: boolean;
  readonly body: TBody;
}

export interface HttpClient {
  request<TBody = unknown>(request: HttpRequest): Promise<HttpResponse<TBody>>;
}