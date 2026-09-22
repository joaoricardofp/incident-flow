import { beforeEach, describe, expect, it, vi } from "vitest";
import { TimelineType } from "@/generated/prisma/enums";

vi.mock("@/lib/prisma", () => ({
  default: {
    timeline: {
      findMany: vi.fn(),
    },
  },
}));

import prisma from "@/lib/prisma";
import { getTimelineByIncident } from "@/modules/timeline/queries";

const findMany = vi.mocked(prisma.timeline.findMany);

function entry(overrides: Record<string, unknown>) {
  return {
    id: "timeline-1",
    type: TimelineType.STATUS_CHANGED,
    metadata: { from: "OPEN", to: "RESOLVED" },
    message: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    author: { name: "Test User" },
    ...overrides,
  };
}

describe("getTimelineByIncident parser", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns valid status events with typed metadata", async () => {
    findMany.mockResolvedValue([entry({})] as never);

    await expect(
      getTimelineByIncident({
        incidentId: "incident-1",
        workspaceId: "workspace-1",
      }),
    ).resolves.toMatchObject([
      {
        type: TimelineType.STATUS_CHANGED,
        message: null,
        metadata: { from: "OPEN", to: "RESOLVED" },
      },
    ]);
  });

  it("parses comments through the comment schema", async () => {
    findMany.mockResolvedValue([
      entry({
        type: TimelineType.COMMENT,
        metadata: null,
        message: "  comment  ",
      }),
    ] as never);

    await expect(
      getTimelineByIncident({
        incidentId: "incident-1",
        workspaceId: "workspace-1",
      }),
    ).resolves.toMatchObject([
      {
        type: TimelineType.COMMENT,
        message: "comment",
        metadata: { message: "comment" },
      },
    ]);
  });

  it("falls back to MALFORMED while preserving available fields", async () => {
    findMany.mockResolvedValue([
      entry({
        type: TimelineType.STATUS_CHANGED,
        metadata: { from: "OPEN", to: "INVALID" },
        message: "legacy data",
      }),
    ] as never);

    await expect(
      getTimelineByIncident({
        incidentId: "incident-1",
        workspaceId: "workspace-1",
      }),
    ).resolves.toMatchObject([
      {
        type: "MALFORMED",
        originalType: TimelineType.STATUS_CHANGED,
        message: "legacy data",
        metadata: null,
      },
    ]);
  });

  it("falls back for an unknown runtime event type", async () => {
    findMany.mockResolvedValue([entry({ type: "UNKNOWN_EVENT" })] as never);

    await expect(
      getTimelineByIncident({
        incidentId: "incident-1",
        workspaceId: "workspace-1",
      }),
    ).resolves.toMatchObject([
      {
        type: "MALFORMED",
        originalType: "UNKNOWN_EVENT",
        metadata: null,
      },
    ]);
  });
});
