import { describe, expect, it, vi } from "vitest";
import type { Prisma } from "@/generated/prisma/client";
import { Severity, Status, TimelineType } from "@/generated/prisma/enums";
import { createTimelineEntry } from "@/modules/timeline/service";

function createTransactionMock() {
  const create = vi.fn().mockResolvedValue({ id: "timeline-1" });
  const transaction = {
    timeline: { create },
  } as unknown as Prisma.TransactionClient;

  return { create, transaction };
}

describe("createTimelineEntry", () => {
  it("creates a comment event with its message", async () => {
    const { create, transaction } = createTransactionMock();

    await createTimelineEntry(transaction, {
      incidentId: "incident-1",
      authorId: "user-1",
      type: TimelineType.COMMENT,
      message: "Investigating the alert.",
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        incidentId: "incident-1",
        authorId: "user-1",
        type: TimelineType.COMMENT,
        message: "Investigating the alert.",
      },
    });
  });

  it("creates status and severity events with metadata", async () => {
    const statusMock = createTransactionMock();
    await createTimelineEntry(statusMock.transaction, {
      incidentId: "incident-1",
      authorId: "user-1",
      type: TimelineType.STATUS_CHANGED,
      metadata: { from: Status.OPEN, to: Status.INVESTIGATING },
    });

    const severityMock = createTransactionMock();
    await createTimelineEntry(severityMock.transaction, {
      incidentId: "incident-1",
      authorId: "user-1",
      type: TimelineType.SEVERITY_CHANGED,
      metadata: { from: Severity.MEDIUM, to: Severity.HIGH },
    });

    expect(statusMock.create).toHaveBeenCalledWith({
      data: {
        incidentId: "incident-1",
        authorId: "user-1",
        type: TimelineType.STATUS_CHANGED,
        metadata: { from: Status.OPEN, to: Status.INVESTIGATING },
      },
    });
    expect(severityMock.create).toHaveBeenCalledWith({
      data: {
        incidentId: "incident-1",
        authorId: "user-1",
        type: TimelineType.SEVERITY_CHANGED,
        metadata: { from: Severity.MEDIUM, to: Severity.HIGH },
      },
    });
  });

  it("rejects an unsupported runtime event type", async () => {
    const { transaction } = createTransactionMock();

    await expect(
      createTimelineEntry(transaction, {
        incidentId: "incident-1",
        authorId: "user-1",
        type: "UNKNOWN" as never,
      } as never),
    ).rejects.toThrow("Unsupported timeline type");
  });
});
