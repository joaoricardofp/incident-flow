import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Role, Severity, Status } from "@/generated/prisma/enums";

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createIncident } from "@/modules/incident/actions";
import {
  createTestContext,
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

describe("createIncident", () => {
  beforeAll(() => requireTestDatabase());
  afterAll(async () => prisma.$disconnect());

  it("rejects an unauthenticated request", async () => {
    mockedGetSession.mockResolvedValue(null);

    await expect(
      createIncident(
        { workspaceId: "workspace-does-not-exist" },
        { title: "API outage", severity: Severity.HIGH },
      ),
    ).resolves.toEqual({ success: false, error: "Unauthorized" });
  });

  it("rejects a VIEWER attempting to create an incident", async () => {
    const context = await createTestContext([{ role: Role.VIEWER }]);

    try {
      authenticateAs(context.users[0].id);

      await expect(
        createIncident(
          { workspaceId: context.workspace.id },
          { title: "API outage", severity: Severity.HIGH },
        ),
      ).resolves.toMatchObject({
        success: false,
        error: "User does not have the required role",
      });
      await expect(
        prisma.incident.count({
          where: { workspaceId: context.workspace.id },
        }),
      ).resolves.toBe(0);
    } finally {
      await deleteTestContext(context);
    }
  });

  it("creates an incident with the authorized workspace and creator", async () => {
    const context = await createTestContext([{ role: Role.ADMIN }]);

    try {
      authenticateAs(context.users[0].id);

      const result = await createIncident(
        { workspaceId: context.workspace.id },
        {
          title: "API outage",
          description: "Requests returned 503.",
          severity: Severity.CRITICAL,
        },
      );

      expect(result.success).toBe(true);
      if (!result.success) return;

      await expect(
        prisma.incident.findUnique({ where: { id: result.incidentId } }),
      ).resolves.toMatchObject({
        id: result.incidentId,
        workspaceId: context.workspace.id,
        createdById: context.users[0].id,
        title: "API outage",
        description: "Requests returned 503.",
        status: Status.OPEN,
        severity: Severity.CRITICAL,
        resolvedAt: null,
      });
    } finally {
      await deleteTestContext(context);
    }
  });

  it("rejects invalid input without persisting an incident", async () => {
    const context = await createTestContext([{ role: Role.ADMIN }]);

    try {
      authenticateAs(context.users[0].id);

      const result = await createIncident(
        { workspaceId: context.workspace.id },
        { title: "", severity: "INVALID" as Severity },
      );

      expect(result.success).toBe(false);
      await expect(
        prisma.incident.count({
          where: { workspaceId: context.workspace.id },
        }),
      ).resolves.toBe(0);
    } finally {
      await deleteTestContext(context);
    }
  });

  it("does not allow an admin from another workspace to create data", async () => {
    const authorizedContext = await createTestContext([{ role: Role.ADMIN }]);
    const otherContext = await createTestContext([{ role: Role.ADMIN }]);

    try {
      authenticateAs(authorizedContext.users[0].id);

      await expect(
        createIncident(
          { workspaceId: otherContext.workspace.id },
          { title: "Cross-workspace incident", severity: Severity.LOW },
        ),
      ).resolves.toMatchObject({
        success: false,
        error: "User is not a member of this workspace",
      });
      await expect(
        prisma.incident.count({
          where: { workspaceId: otherContext.workspace.id },
        }),
      ).resolves.toBe(0);
    } finally {
      await deleteTestContext(authorizedContext);
      await deleteTestContext(otherContext);
    }
  });
});
