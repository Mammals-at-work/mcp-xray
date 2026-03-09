import { XrayConfig } from "../../domain/xray-config.js";

export class JiraAuthHeaderProvider {
  public constructor(private readonly config: XrayConfig) {}

  public buildHeaders(): Record<string, string> {
    if (this.config.deployment === "cloud") {
      if (!this.config.jiraEmail || !this.config.jiraApiToken) {
        throw new Error("JIRA_EMAIL and JIRA_API_TOKEN are required to use Jira-backed tools in cloud deployments");
      }

      return {
        authorization: `Basic ${toBase64(`${this.config.jiraEmail}:${this.config.jiraApiToken}`)}`
      };
    }

    if (this.config.jiraPat) {
      return {
        authorization: `Bearer ${this.config.jiraPat}`
      };
    }

    if (this.config.jiraUsername && this.config.jiraPassword) {
      return {
        authorization: `Basic ${toBase64(`${this.config.jiraUsername}:${this.config.jiraPassword}`)}`
      };
    }

    throw new Error("JIRA_PAT or JIRA_USERNAME/JIRA_PASSWORD are required for datacenter Jira tools");
  }
}

function toBase64(value: string): string {
  return Buffer.from(value, "utf8").toString("base64");
}