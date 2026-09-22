import { describe, expect, it } from "vitest";
import { Severity, Status } from "@/generated/prisma/enums";
import { incidentSchema, updateStatusSchema } from "@/modules/incident/schema";

describe("incident schemas", () => {
  it("accepts a valid incident payload", () => {
    expect(
      incidentSchema.safeParse({
        title: "API outage",
        description: "Requests returned 503.",
        severity: Severity.HIGH,
      }).success,
    ).toBe(true);
  });

  it("allows the optional description to be omitted", () => {
    const result = incidentSchema.safeParse({
      title: "API outage",
      severity: Severity.LOW,
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.description).toBeUndefined();
  });

  it("transforms an empty description into undefined", () => {
    const result = incidentSchema.safeParse({
      title: "API outage",
      description: "",
      severity: Severity.MEDIUM,
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.description).toBeUndefined();
  });

  it("rejects missing, empty, and oversized titles", () => {
    expect(incidentSchema.safeParse({ severity: Severity.LOW }).success).toBe(
      false,
    );
    expect(
      incidentSchema.safeParse({
        title: "",
        severity: Severity.LOW,
      }).success,
    ).toBe(false);
    expect(
      incidentSchema.safeParse({
        title: "a".repeat(151),
        severity: Severity.LOW,
      }).success,
    ).toBe(false);
  });

  it("rejects an invalid severity", () => {
    expect(
      incidentSchema.safeParse({
        title: "API outage",
        severity: "URGENT",
      }).success,
    ).toBe(false);
  });

  it("accepts each status enum value and rejects unknown values", () => {
    for (const status of Object.values(Status)) {
      expect(updateStatusSchema.safeParse({ status }).success).toBe(true);
    }

    expect(updateStatusSchema.safeParse({ status: "CLOSED" }).success).toBe(
      false,
    );
    expect(updateStatusSchema.safeParse({}).success).toBe(false);
  });
});
