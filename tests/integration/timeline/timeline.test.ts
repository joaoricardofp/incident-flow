import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Role, Severity, Status, TimelineType } from "@/generated/prisma/enums";
import prisma from "@/lib/prisma";
import { getTimelineByIncident } from "@/modules/timeline/queries";
import {
  createTestContext,
  createTestIncident,
  deleteTestContext,
  requireTestDatabase,
} from "../../helpers/test-database";

describe("incident timeline queries", () => {
  beforeAll(() => requireTestDatabase());
  afterAll(async () => prisma.$disconnect());

  it("returns valid events and marks invalid metadata as MALFORMED", async () => {
    const context = await createTestContext([{ role: Role.ADMIN }]);
    const incident = await createTestIncident({
      workspaceId: context.workspace.id,
      createdById: context.users[0].id,
    });

    try {
      const validComment = await prisma.timeline.create({
        data: {
          incidentId: incident.id,
          authorId: context.users[0].id,
          type: TimelineType.COMMENT,
          message: "  investigation started  ",
        },
      });
      const validStatus = await prisma.timeline.create({
        data: {
          incidentId: incident.id,
          authorId: context.users[0].id,
          type: TimelineType.STATUS_CHANGED,
          metadata: { from: Status.OPEN, to: Status.INVESTIGATING },
        },
      });
      const validSeverity = await prisma.timeline.create({
        data: {
          incidentId: incident.id,
          authorId: context.users[0].id,
          type: TimelineType.SEVERITY_CHANGED,
          metadata: { from: Severity.MEDIUM, to: Severity.HIGH },
        },
      });
      const malformed = await prisma.timeline.create({
        data: {
          incidentId: incident.id,
          authorId: context.users[0].id,
          type: TimelineType.STATUS_CHANGED,
          message: "legacy metadata",
          metadata: { from: Status.OPEN, to: "INVALID" },
        },
      });

      const result = await getTimelineByIncident({
        incidentId: incident.id,
        workspaceId: context.workspace.id,
      });
      const byId = new Map(result.map((item) => [item.id, item]));

      expect(byId.get(validComment.id)).toMatchObject({
        type: TimelineType.COMMENT,
        message: "investigation started",
        metadata: { message: "investigation started" },
      });
      expect(byId.get(validStatus.id)).toMatchObject({
        type: TimelineType.STATUS_CHANGED,
        metadata: { from: Status.OPEN, to: Status.INVESTIGATING },
      });
      expect(byId.get(validSeverity.id)).toMatchObject({
        type: TimelineType.SEVERITY_CHANGED,
        metadata: { from: Severity.MEDIUM, to: Severity.HIGH },
      });
      expect(byId.get(malformed.id)).toMatchObject({
        type: "MALFORMED",
        originalType: TimelineType.STATUS_CHANGED,
        message: "legacy metadata",
        metadata: null,
      });
    } finally {
      await deleteTestContext(context);
    }
  });

  it("does not return timeline events through another workspace", async () => {
    const ownerContext = await createTestContext([{ role: Role.ADMIN }]);
    const otherContext = await createTestContext([{ role: Role.ADMIN }]);
    const incident = await createTestIncident({
      workspaceId: ownerContext.workspace.id,
      createdById: ownerContext.users[0].id,
    });

    try {
      await prisma.timeline.create({
        data: {
          incidentId: incident.id,
          authorId: ownerContext.users[0].id,
          type: TimelineType.COMMENT,
          message: "private event",
        },
      });

      await expect(
        getTimelineByIncident({
          incidentId: incident.id,
          workspaceId: otherContext.workspace.id,
        }),
      ).resolves.toEqual([]);
    } finally {
      await deleteTestContext(ownerContext);
      await deleteTestContext(otherContext);
    }
  });
});
