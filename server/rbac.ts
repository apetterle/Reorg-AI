import { storage } from "./storage";
import { ApiError } from "./errors";

const ROLE_HIERARCHY: Record<string, number> = {
  owner: 4,
  admin: 3,
  analyst: 2,
  viewer: 1,
};

export type Role = "owner" | "admin" | "analyst" | "viewer";

export async function getMembershipOrThrow(userId: string, tenantSlug: string) {
  const tenant = await storage.getTenantBySlug(tenantSlug);
  if (!tenant) throw new ApiError("NOT_FOUND", "Tenant not found");

  const membership = await storage.getMembership(tenant.id, userId);
  if (!membership) throw new ApiError("FORBIDDEN", "You are not a member of this tenant");

  return { tenant, membership };
}

export function requireRole(userRole: string, minimumRole: Role): void {
  const userLevel = ROLE_HIERARCHY[userRole];
  const requiredLevel = ROLE_HIERARCHY[minimumRole];

  if (userLevel === undefined || requiredLevel === undefined) {
    throw new ApiError("FORBIDDEN", `Unknown role: ${userRole}`);
  }

  if (userLevel < requiredLevel) {
    throw new ApiError(
      "FORBIDDEN",
      `Insufficient permissions. Required: ${minimumRole} or higher, current: ${userRole}`
    );
  }
}

export function requireOneOfRoles(userRole: string, allowedRoles: Role[]): void {
  if (!allowedRoles.includes(userRole as Role)) {
    throw new ApiError(
      "FORBIDDEN",
      `Insufficient permissions. Required one of: ${allowedRoles.join(", ")}, current: ${userRole}`
    );
  }
}
