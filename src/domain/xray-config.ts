export interface XrayConfig {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly baseUrl: string;
  readonly apiBaseUrl: string;
  readonly graphQlUrl: string;
  readonly tokenTtlSeconds: number;
}