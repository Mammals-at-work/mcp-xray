export type XrayDeployment = "cloud" | "datacenter";

export interface XrayConfig {
  readonly deployment: XrayDeployment;
  readonly xrayBaseUrl: string;
  readonly xrayApiBaseUrl: string;
  readonly graphQlUrl?: string;
  readonly tokenTtlSeconds: number;
  readonly xrayClientId?: string;
  readonly xrayClientSecret?: string;
  readonly jiraBaseUrl?: string;
  readonly jiraApiBaseUrl?: string;
  readonly jiraApiVersion?: "2" | "3";
  readonly jiraEmail?: string;
  readonly jiraApiToken?: string;
  readonly jiraUsername?: string;
  readonly jiraPassword?: string;
  readonly jiraPat?: string;
}