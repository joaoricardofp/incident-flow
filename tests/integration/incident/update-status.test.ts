import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Role, Severity, Status, TimelineType } from "@/generated/prisma/enums";

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { updateIncidentStatus } from "@/modules/incident/actions";
import {
  createTestContext,
  createTestIncident,
  deleteTestContext,
  requireTestDatabase,
} from "../../helpers/test-database";

const mockedGetSession = vi.mocked(getSession);

function authenticateAs(userId: string) {
  mockedGetSession.mockResolvedValue({
    user: {
      id: userId,
      name: "Test User",
      email: "test@example.com",
      emailVerified: true,
    },
    session: {
      id: "session-1",
      userId,
      expiresAt: new Date(Date.now() + 60_000),
    },
  } as never);
}

describe("updateIncidentStatus", () => {
  beforeAll(() => requireTestDatabase());
  afterAll(async () => prisma.$disconnect());

  it("updates status and records a status timeline event", async () => {
    const context = await createTestContext([{ role: Role.ADMIN }]);
    const incident = await createTestIncident({
      workspaceId: context.workspace.id,
      createdById: context.users[0].id,
    });

    try {
      authenticateAs(context.users[0].id);

      const result = await updateIncidentStatus(
        { incidentId: incident.id, workspaceId: context.workspace.id },
        { status: Status.INVESTIGATING },
      );

      expect(result).toEqual({ success: true });
      await expect(
        prisma.incident.findUnique({ where: { id: incident.id } }),
      ).resolves.toMatchObject({
        status: Status.INVESTIGATING,
        resolvedAt: null,
      });
      await expect(
        prisma.timeline.findMany({ where: { incidentId: incident.id } }),
      ).resolves.toMatchObject([
        {
          type: TimelineType.STATUS_CHANGED,
          authorId: context.users[0].id,
          metadata: {
            from: Status.OPEN,
            to: Status.INVESTIGATING,
          },
        },
      ]);
    } finally {
      await deleteTestContext(context);
    }
  });

  it("sets resolvedAt when resolving an incident", async () => {
    const context = await createTestContext([{ role: Role.ADMIN }]);
    const incident = await createTestIncident({
      workspaceId: context.workspace.id,
      createdById: context.users[0].id,
      status: Status.INVESTIGATING,
    });

    try {
      authenticateAs(context.users[0].id);

      const result = await updateIncidentStatus(
        { incidentId: incident.id, workspaceId: context.workspace.id },
        { status: Status.RESOLVED },
      );

      expect(result).toEqual({ success: true });
      const updated = await prisma.incident.findUnique({
        where: { id: incident.id },
      });
      expect(updated?.status).toBe(Status.RESOLVED);
      expect(updated?.resolvedAt).toBeInstanceOf(Date);
    } finally {
      await deleteTestContext(context);
    }
  });

  it("returns a no-op and creates no event for the current status", async () => {
    const context = await createTestContext([{ role: Role.ADMIN }]);
    const incident = await createTestIncident({
      workspaceId: context.workspace.id,
      createdById: context.users[0].id,
      status: Status.RESOLVED,
    });
    const resolvedAt = incident.resolvedAt;

    try {
      authenticateAs(context.users[0].id);

      await expect(
        updateIncidentStatus(
          { incidentId: incident.id, workspaceId: context.workspace.id },
          { status: Status.RESOLVED },
        ),
      ).resolves.toEqual({ success: true, noop: true });
      await expect(
        prisma.timeline.count({ where: { incidentId: incident.id } }),
      ).resolves.toBe(0);
      await expect(
        prisma.incident.findUnique({ where: { id: incident.id } }),
      ).resolves.toMatchObject({ resolvedAt });
    } finally {
      await deleteTestContext(context);
    }
  });

  it("rejects unauthenticated and VIEWER requests", async () => {
    const context = await createTestContext([{ role: Role.VIEWER }]);
    const incident = await createTestIncident({
      workspaceId: context.workspace.id,
      createdById: context.users[0].id,
    });

    try {
      mockedGetSession.mockResolvedValue(null);
      await expect(
        updateIncidentStatus(
          { incidentId: incident.id, workspaceId: context.workspace.id },
          { status: Status.INVESTIGATING },
        ),
      ).resolves.toEqual({ success: false, error: "Unauthorized" });

      authenticateAs(context.users[0].id);
      await expect(
        updateIncidentStatus(
          { incidentId: incident.id, workspaceId: context.workspace.id },
          { status: Status.INVESTIGATING },
        ),
      ).resolves.toMatchObject({
        success: false,
        error: "User does not have the required role",
      });
    } finally {
      await deleteTestContext(context);
    }
  });

  it("does not update an incident from another workspace", async () => {
    const incidentContext = await createTestContext([{ role: Role.ADMIN }]);
    const callerContext = await createTestContext([{ role: Role.ADMIN }]);
    const incident = await createTestIncident({
      workspaceId: incidentContext.workspace.id,
      createdById: incidentContext.users[0].id,
    });

    try {
      authenticateAs(callerContext.users[0].id);

      await expect(
        updateIncidentStatus(
          {
            incidentId: incident.id,
            workspaceId: callerContext.workspace.id,
          },
          { status: Status.RESOLVED },
        ),
      ).resolves.toEqual({ success: false, error: "Incident not found" });
      await expect(
        prisma.incident.findUnique({ where: { id: incident.id } }),
      ).resolves.toMatchObject({ status: Status.OPEN, resolvedAt: null });
    } finally {
      await deleteTestContext(incidentContext);
      await deleteTestContext(callerContext);
    }
  });

  it("rejects invalid status input before mutating the incident", async () => {
    const context = await createTestContext([{ role: Role.ADMIN }]);
    const incident = await createTestIncident({
      workspaceId: context.workspace.id,
      createdById: context.users[0].id,
      severity: Severity.HIGH,
    });

    try {
      authenticateAs(context.users[0].id);

      const result = await updateIncidentStatus(
        { incidentId: incident.id, workspaceId: context.workspace.id },
        { status: "INVALID" as Status },
      );

      expect(result.success).toBe(false);
      await expect(
        prisma.incident.findUnique({ where: { id: incident.id } }),
      ).resolves.toMatchObject({ status: Status.OPEN });
      await expect(
        prisma.timeline.count({ where: { incidentId: incident.id } }),
      ).resolves.toBe(0);
    } finally {
      await deleteTestContext(context);
    }
  });
});
