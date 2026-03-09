import { randomBytes } from "crypto";

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "RATE_LIMIT"
  | "INTERNAL"
  | "NOT_READY"
  | "PII_BLOCKED";

const CODE_TO_STATUS: Record<ApiErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION: 400,
  CONFLICT: 409,
  RATE_LIMIT: 429,
  INTERNAL: 500,
  NOT_READY: 503,
  PII_BLOCKED: 422,
};

export class ApiError extends Error {
  public readonly code: ApiErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(code: ApiErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.statusCode = CODE_TO_STATUS[code];
    this.details = details;
  }
}

export interface ErrorResponse {
  error: {
    code: ApiErrorCode;
    message: string;
    requestId: string;
    details?: Record<string, unknown>;
  };
}

export function toErrorResponse(err: unknown, requestId?: string): { status: number; body: ErrorResponse } {
  const rid = requestId || randomBytes(8).toString("hex");

  if (err instanceof ApiError) {
    return {
      status: err.statusCode,
      body: {
        error: {
          code: err.code,
          message: err.message,
          requestId: rid,
          ...(err.details ? { details: err.details } : {}),
        },
      },
    };
  }

  const message = err instanceof Error ? err.message : "Internal Server Error";
  return {
    status: 500,
    body: {
      error: {
        code: "INTERNAL",
        message,
        requestId: rid,
      },
    },
  };
}
