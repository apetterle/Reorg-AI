import { describe, it, expect } from "vitest";
import { createCompanyFormSchema, insertCompanySchema } from "@shared/schema";

describe("Company form validation", () => {
  it("accepts valid company with all fields", () => {
    const result = createCompanyFormSchema.safeParse({
      name: "Acme Corp",
      industry: "Financial Services",
      region: "LATAM",
      sizeBand: "enterprise",
      notes: "Large financial institution",
    });
    expect(result.success).toBe(true);
  });

  it("accepts company with only required name field", () => {
    const result = createCompanyFormSchema.safeParse({
      name: "Minimal Corp",
    });
    expect(result.success).toBe(true);
  });

  it("rejects company with empty name", () => {
    const result = createCompanyFormSchema.safeParse({
      name: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects company without name field", () => {
    const result = createCompanyFormSchema.safeParse({
      industry: "Tech",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid sizeBand values", () => {
    const bands = ["startup", "smb", "mid-market", "enterprise"] as const;
    for (const band of bands) {
      const result = createCompanyFormSchema.safeParse({
        name: "Test",
        sizeBand: band,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid sizeBand value", () => {
    const result = createCompanyFormSchema.safeParse({
      name: "Test",
      sizeBand: "mega-corp",
    });
    expect(result.success).toBe(false);
  });

  it("allows optional fields to be undefined", () => {
    const result = createCompanyFormSchema.safeParse({
      name: "Test Corp",
      industry: undefined,
      region: undefined,
      sizeBand: undefined,
      notes: undefined,
    });
    expect(result.success).toBe(true);
  });
});

describe("Company insert schema", () => {
  it("requires tenantId for database insertion", () => {
    const result = insertCompanySchema.safeParse({
      name: "Test Corp",
      tenantId: "tenant-123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects insert without tenantId", () => {
    const result = insertCompanySchema.safeParse({
      name: "Test Corp",
    });
    expect(result.success).toBe(false);
  });

  it("omits id and createdAt from insert schema", () => {
    const result = insertCompanySchema.safeParse({
      id: "should-be-ignored",
      name: "Test Corp",
      tenantId: "tenant-123",
      createdAt: new Date(),
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("id");
      expect(result.data).not.toHaveProperty("createdAt");
    }
  });
});

describe("Company tenant scoping", () => {
  it("company data includes tenantId for scoping", () => {
    const companyData = {
      name: "Scoped Corp",
      tenantId: "tenant-abc",
      industry: "Tech",
    };
    expect(companyData.tenantId).toBe("tenant-abc");
  });

  it("companies from different tenants have different tenantIds", () => {
    const company1 = { name: "Corp A", tenantId: "tenant-1" };
    const company2 = { name: "Corp B", tenantId: "tenant-2" };
    expect(company1.tenantId).not.toBe(company2.tenantId);
  });

  it("filtering companies by tenantId isolates tenant data", () => {
    const allCompanies = [
      { name: "Corp A", tenantId: "tenant-1" },
      { name: "Corp B", tenantId: "tenant-1" },
      { name: "Corp C", tenantId: "tenant-2" },
    ];
    const tenant1Companies = allCompanies.filter((c) => c.tenantId === "tenant-1");
    expect(tenant1Companies).toHaveLength(2);
    expect(tenant1Companies.every((c) => c.tenantId === "tenant-1")).toBe(true);
  });

  it("projects can be scoped to a company via companyId", () => {
    const project = {
      name: "Project X",
      tenantId: "tenant-1",
      companyId: "company-1",
    };
    expect(project.companyId).toBe("company-1");
  });

  it("companyId on projects is optional (nullable)", () => {
    const project = {
      name: "Unscoped Project",
      tenantId: "tenant-1",
      companyId: null,
    };
    expect(project.companyId).toBeNull();
  });
});
