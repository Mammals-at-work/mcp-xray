export class XrayError extends Error {
  public readonly status: number | undefined;
  public readonly details: unknown;

  public constructor(message: string, options?: { status?: number; details?: unknown }) {
    super(message);
    this.name = "XrayError";
    this.status = options?.status;
    this.details = options?.details;
  }
}