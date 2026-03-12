import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { XrayError } from "../domain/xray-error.js";

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

export function asErrorResult(error: unknown): CallToolResult {
  if (error instanceof XrayError) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              error: error.message,
              status: error.status,
              details: error.details
            },
            null,
            2
          )
        }
      ]
    };
  }

  return {
    isError: true,
    content: [
      {
        type: "text",
        text: error instanceof Error ? error.message : String(error)
      }
    ]
  };
}