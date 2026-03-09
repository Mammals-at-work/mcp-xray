import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export function asJsonResult(payload: unknown): CallToolResult {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(payload, null, 2)
      }
    ]
  };
}