import { describe, it, expect } from "vitest";
import { requireRole, requireOneOfRoles } from "../server/rbac";
import { ApiError } from "../server/errors";

describe("requireRole", () => {
  it("allows owner for any minimum role", () => {
    expect(() => requireRole("owner", "viewer")).not.toThrow();
    expect(() => requireRole("owner", "analyst")).not.toThrow();
    expect(() => requireRole("owner", "admin")).not.toThrow();
    expect(() => requireRole("owner", "owner")).not.toThrow();
  });

  it("allows admin for analyst and below", () => {
    expect(() => requireRole("admin", "viewer")).not.toThrow();
    expect(() => requireRole("admin", "analyst")).not.toThrow();
    expect(() => requireRole("admin", "admin")).not.toThrow();
  });

  it("blocks admin from owner-only actions", () => {
    expect(() => requireRole("admin", "owner")).toThrow(ApiError);
  });

  it("allows analyst for analyst and viewer", () => {
    expect(() => requireRole("analyst", "viewer")).not.toThrow();
    expect(() => requireRole("analyst", "analyst")).not.toThrow();
  });

  it("blocks analyst from admin actions", () => {
    expect(() => requireRole("analyst", "admin")).toThrow(ApiError);
  });

  it("blocks viewer from analyst actions", () => {
    expect(() => requireRole("viewer", "analyst")).toThrow(ApiError);
  });

  it("allows viewer for viewer-level access", () => {
    expect(() => requireRole("viewer", "viewer")).not.toThrow();
  });

  it("throws ApiError with FORBIDDEN code", () => {
    try {
      requireRole("viewer", "admin");
      expect(true).toBe(false);
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).code).toBe("FORBIDDEN");
      expect((err as ApiError).message).toContain("Insufficient permissions");
    }
  });

  it("throws for unknown roles", () => {
    expect(() => requireRole("unknown_role", "viewer")).toThrow(ApiError);
  });

  it("includes role names in error message", () => {
    try {
      requireRole("viewer", "analyst");
      expect(true).toBe(false);
    } catch (err) {
      const msg = (err as ApiError).message;
      expect(msg).toContain("analyst");
      expect(msg).toContain("viewer");
    }
  });
});

describe("requireOneOfRoles", () => {
  it("allows when role is in list", () => {
    expect(() => requireOneOfRoles("admin", ["admin", "owner"])).not.toThrow();
    expect(() => requireOneOfRoles("viewer", ["viewer", "analyst"])).not.toThrow();
  });

  it("blocks when role is not in list", () => {
    expect(() => requireOneOfRoles("viewer", ["admin", "owner"])).toThrow(ApiError);
  });

  it("throws FORBIDDEN error", () => {
    try {
      requireOneOfRoles("viewer", ["admin"]);
    } catch (err) {
      expect((err as ApiError).code).toBe("FORBIDDEN");
    }
  });
});
