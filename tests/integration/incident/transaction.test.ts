import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Role, Status } from "@/generated/prisma/enums";

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/modules/timeline/service", () => ({
  createTimelineEntry: vi.fn(),
}));

import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { updateIncidentStatus } from "@/modules/incident/actions";
import { createTimelineEntry } from "@/modules/timeline/service";
import {
  createTestContext,
  createTestIncident,
  deleteTestContext,
  requireTestDatabase,
} from "../../helpers/test-database";

const mockedGetSession = vi.mocked(getSession);
const mockedCreateTimelineEntry = vi.mocked(createTimelineEntry);

describe("incident status transaction", () => {
  beforeAll(() => requireTestDatabase());
  afterAll(async () => prisma.$disconnect());

  it("rolls back the status update when timeline creation fails", async () => {
    const context = await createTestContext([{ role: Role.ADMIN }]);
    const incident = await createTestIncident({
      workspaceId: context.workspace.id,
      createdById: context.users[0].id,
    });

    try {
      mockedGetSession.mockResolvedValue({
        user: {
          id: context.users[0].id,
          name: context.users[0].name,
          email: context.users[0].email,
          emailVerified: true,
        },
        session: {
          id: "session-1",
          userId: context.users[0].id,
          expiresAt: new Date(Date.now() + 60_000),
        },
      } as never);
      mockedCreateTimelineEntry.mockRejectedValue(
        new Error("timeline write failed"),
      );

      await expect(
        updateIncidentStatus(
          { incidentId: incident.id, workspaceId: context.workspace.id },
          { status: Status.RESOLVED },
        ),
      ).rejects.toThrow("timeline write failed");

      await expect(
        prisma.incident.findUnique({ where: { id: incident.id } }),
      ).resolves.toMatchObject({ status: Status.OPEN, resolvedAt: null });
      await expect(
        prisma.timeline.count({ where: { incidentId: incident.id } }),
      ).resolves.toBe(0);
    } finally {
      await deleteTestContext(context);
    }
  });
});
