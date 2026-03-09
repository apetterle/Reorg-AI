import { describe, it, expect } from "vitest";
import { ApiError, toErrorResponse, type ApiErrorCode } from "../server/errors";

describe("ApiError", () => {
  it("constructs with correct code and status", () => {
    const err = new ApiError("NOT_FOUND", "Item not found");
    expect(err.code).toBe("NOT_FOUND");
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe("Item not found");
    expect(err.name).toBe("ApiError");
  });

  it("stores optional details", () => {
    const err = new ApiError("VALIDATION", "Invalid input", { field: "name" });
    expect(err.details).toEqual({ field: "name" });
    expect(err.statusCode).toBe(400);
  });

  it("maps all error codes to correct HTTP status", () => {
    const codeMap: [ApiErrorCode, number][] = [
      ["UNAUTHORIZED", 401],
      ["FORBIDDEN", 403],
      ["NOT_FOUND", 404],
      ["VALIDATION", 400],
      ["CONFLICT", 409],
      ["RATE_LIMIT", 429],
      ["INTERNAL", 500],
      ["NOT_READY", 503],
      ["PII_BLOCKED", 422],
    ];

    for (const [code, expectedStatus] of codeMap) {
      const err = new ApiError(code, `Test ${code}`);
      expect(err.statusCode).toBe(expectedStatus);
    }
  });

  it("is an instance of Error", () => {
    const err = new ApiError("INTERNAL", "Server error");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApiError);
  });
});

describe("toErrorResponse", () => {
  it("formats ApiError correctly", () => {
    const err = new ApiError("NOT_FOUND", "Resource not found");
    const { status, body } = toErrorResponse(err, "test-req-id");
    expect(status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
    expect(body.error.message).toBe("Resource not found");
    expect(body.error.requestId).toBe("test-req-id");
  });

  it("includes details in response", () => {
    const err = new ApiError("VALIDATION", "Bad input", { field: "email", reason: "invalid" });
    const { body } = toErrorResponse(err);
    expect(body.error.details).toEqual({ field: "email", reason: "invalid" });
  });

  it("handles generic Error", () => {
    const err = new Error("Something broke");
    const { status, body } = toErrorResponse(err);
    expect(status).toBe(500);
    expect(body.error.code).toBe("INTERNAL");
    expect(body.error.message).toBe("Something broke");
    expect(body.error.requestId).toBeDefined();
    expect(body.error.requestId.length).toBeGreaterThan(0);
  });

  it("handles non-Error objects", () => {
    const { status, body } = toErrorResponse("string error");
    expect(status).toBe(500);
    expect(body.error.code).toBe("INTERNAL");
    expect(body.error.message).toBe("Internal Server Error");
  });

  it("generates requestId when not provided", () => {
    const err = new ApiError("INTERNAL", "test");
    const { body } = toErrorResponse(err);
    expect(body.error.requestId).toBeDefined();
    expect(body.error.requestId.length).toBe(16);
  });
});
