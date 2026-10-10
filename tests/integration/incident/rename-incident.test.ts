import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Role } from "@/generated/prisma/enums";

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { renameIncident } from "@/modules/incident/actions";
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
      id: `session-${userId}`,
      userId,
      expiresAt: new Date(Date.now() + 60_000),
    },
  } as never);
}

describe("renameIncident", () => {
  beforeAll(() => requireTestDatabase());
  afterAll(async () => prisma.$disconnect());

  it("allows an ADMIN to rename an incident in their own workspace", async () => {
    const context = await createTestContext([{ role: Role.ADMIN }]);
    try {
      authenticateAs(context.users[0].id);
      const incident = await createTestIncident({
        workspaceId: context.workspace.id,
        createdById: context.users[0].id,
      });

      const result = await renameIncident(
        { incidentId: incident.id, workspaceId: context.workspace.id },
        { title: "  Renamed incident  " },
      );

      expect(result).toEqual({ success: true, title: "Renamed incident" });
      await expect(
        prisma.incident.findUnique({ where: { id: incident.id } }),
      ).resolves.toMatchObject({ title: "Renamed incident" });
    } finally {
      await deleteTestContext(context);
    }
  });

  it("rejects a VIEWER attempting to rename", async () => {
    const context = await createTestContext([
      { role: Role.ADMIN },
      { role: Role.VIEWER },
    ]);
    try {
      const incident = await createTestIncident({
        workspaceId: context.workspace.id,
        createdById: context.users[0].id,
      });
      authenticateAs(context.users[1].id);

      const result = await renameIncident(
        { incidentId: incident.id, workspaceId: context.workspace.id },
        { title: "Hacked title" },
      );

      expect(result).toMatchObject({ success: false });
      await expect(
        prisma.incident.findUnique({ where: { id: incident.id } }),
      ).resolves.toMatchObject({ title: incident.title });
    } finally {
      await deleteTestContext(context);
    }
  });

  it("rejects an incident from another workspace without leaking data", async () => {
    const contextA = await createTestContext([{ role: Role.ADMIN }]);
    const contextB = await createTestContext([{ role: Role.ADMIN }]);
    try {
      const incidentB = await createTestIncident({
        workspaceId: contextB.workspace.id,
        createdById: contextB.users[0].id,
      });
      authenticateAs(contextA.users[0].id);

      const result = await renameIncident(
        { incidentId: incidentB.id, workspaceId: contextA.workspace.id },
        { title: "Hacked title" },
      );

      expect(result).toEqual({ success: false, error: "Incident not found" });
      await expect(
        prisma.incident.findUnique({ where: { id: incidentB.id } }),
      ).resolves.toMatchObject({ title: incidentB.title });
    } finally {
      await deleteTestContext(contextA);
      await deleteTestContext(contextB);
    }
  });

  it("rejects a nonexistent incident id", async () => {
    const context = await createTestContext([{ role: Role.ADMIN }]);
    try {
      authenticateAs(context.users[0].id);

      await expect(
        renameIncident(
          {
            incidentId: "incident-does-not-exist",
            workspaceId: context.workspace.id,
          },
          { title: "New title" },
        ),
      ).resolves.toEqual({ success: false, error: "Incident not found" });
    } finally {
      await deleteTestContext(context);
    }
  });

  it("rejects empty and overlong titles without persisting changes", async () => {
    const context = await createTestContext([{ role: Role.ADMIN }]);
    try {
      authenticateAs(context.users[0].id);
      const incident = await createTestIncident({
        workspaceId: context.workspace.id,
        createdById: context.users[0].id,
      });

      await expect(
        renameIncident(
          { incidentId: incident.id, workspaceId: context.workspace.id },
          { title: "   " },
        ),
      ).resolves.toMatchObject({ success: false });

      await expect(
        renameIncident(
          { incidentId: incident.id, workspaceId: context.workspace.id },
          { title: "a".repeat(151) },
        ),
      ).resolves.toMatchObject({ success: false });

      await expect(
        prisma.incident.findUnique({ where: { id: incident.id } }),
      ).resolves.toMatchObject({ title: incident.title });
    } finally {
      await deleteTestContext(context);
    }
  });

  it("does not alter postmortem versions or content when renaming", async () => {
    const context = await createTestContext([{ role: Role.ADMIN }]);
    try {
      authenticateAs(context.users[0].id);
      const incident = await createTestIncident({
        workspaceId: context.workspace.id,
        createdById: context.users[0].id,
      });
      const content = {
        summary: "Root cause analysis",
        impact: "10 minutes of downtime",
      };
      const postmortem = await prisma.postmortem.create({
        data: {
          incidentId: incident.id,
          createdById: context.users[0].id,
          content,
        },
      });
      await prisma.postmortemVersion.create({
        data: {
          postmortemId: postmortem.id,
          editedById: context.users[0].id,
          content: { version: 1 },
        },
      });

      const result = await renameIncident(
        { incidentId: incident.id, workspaceId: context.workspace.id },
        { title: "Renamed incident" },
      );
      expect(result.success).toBe(true);

      await expect(
        prisma.postmortem.findUnique({ where: { id: postmortem.id } }),
      ).resolves.toMatchObject({ content, status: "DRAFT" });
      await expect(
        prisma.postmortemVersion.count({
          where: { postmortemId: postmortem.id },
        }),
      ).resolves.toBe(1);
    } finally {
      await deleteTestContext(context);
    }
  });

  it("rejects unauthenticated rename attempts", async () => {
    const context = await createTestContext([{ role: Role.ADMIN }]);
    try {
      const incident = await createTestIncident({
        workspaceId: context.workspace.id,
        createdById: context.users[0].id,
      });
      mockedGetSession.mockResolvedValue(null);

      await expect(
        renameIncident(
          { incidentId: incident.id, workspaceId: context.workspace.id },
          { title: "New title" },
        ),
      ).resolves.toEqual({ success: false, error: "Unauthorized" });
    } finally {
      await deleteTestContext(context);
    }
  });
});
