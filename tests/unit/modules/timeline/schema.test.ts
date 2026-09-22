import { describe, expect, it } from "vitest";
import { Severity, Status } from "@/generated/prisma/enums";
import {
  severityChangeMetadataSchema,
  statusChangeMetadataSchema,
  timelineCommentSchema,
} from "@/modules/timeline/schema";

describe("timeline schemas", () => {
  it("trims and accepts a valid comment", () => {
    const result = timelineCommentSchema.safeParse({ message: "  noted  " });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.message).toBe("noted");
  });

  it("rejects blank and oversized comments", () => {
    expect(timelineCommentSchema.safeParse({ message: "   " }).success).toBe(
      false,
    );
    expect(
      timelineCommentSchema.safeParse({ message: "a".repeat(2001) }).success,
    ).toBe(false);
  });

  it("validates status change metadata", () => {
    expect(
      statusChangeMetadataSchema.safeParse({
        from: Status.OPEN,
        to: Status.INVESTIGATING,
      }).success,
    ).toBe(true);
    expect(
      statusChangeMetadataSchema.safeParse({ from: "OPEN", to: "CLOSED" })
        .success,
    ).toBe(false);
  });

  it("validates severity change metadata", () => {
    expect(
      severityChangeMetadataSchema.safeParse({
        from: Severity.MEDIUM,
        to: Severity.HIGH,
      }).success,
    ).toBe(true);
    expect(
      severityChangeMetadataSchema.safeParse({ from: "MEDIUM", to: "URGENT" })
        .success,
    ).toBe(false);
  });
});
