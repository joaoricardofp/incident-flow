import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Role } from "@/generated/prisma/enums";

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { renameWorkspace } from "@/modules/workspace/actions";
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

describe("renameWorkspace", () => {
  beforeAll(() => requireTestDatabase());
  afterAll(async () => prisma.$disconnect());

  it("allows an ADMIN to rename their own workspace", async () => {
    const context = await createTestContext([{ role: Role.ADMIN }]);
    try {
      authenticateAs(context.users[0].id);

      const result = await renameWorkspace({
        workspaceId: context.workspace.id,
        name: "  Renamed Workspace  ",
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.name).toBe("Renamed Workspace");
      expect(result.slug).toMatch(/^renamed-workspace-[0-9a-f]{8}$/);
      await expect(
        prisma.workspace.findUnique({
          where: { id: context.workspace.id },
        }),
      ).resolves.toMatchObject({
        name: "Renamed Workspace",
        slug: result.slug,
      });
    } finally {
      await deleteTestContext(context);
    }
  });

  it("updates the slug so the URL follows the new name", async () => {
    const context = await createTestContext([{ role: Role.ADMIN }]);
    try {
      authenticateAs(context.users[0].id);
      const slugBefore = context.workspace.slug;

      const result = await renameWorkspace({
        workspaceId: context.workspace.id,
        name: "Completely Different Name",
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.slug).not.toBe(slugBefore);
      // The old slug no longer resolves; the new one does.
      await expect(
        prisma.workspace.findUnique({ where: { slug: slugBefore } }),
      ).resolves.toBeNull();
      await expect(
        prisma.workspace.findUnique({ where: { slug: result.slug } }),
      ).resolves.toMatchObject({ id: context.workspace.id });
    } finally {
      await deleteTestContext(context);
    }
  });

  it("generates distinct slugs when two workspaces share a name", async () => {
    const first = await createTestContext([{ role: Role.ADMIN }]);
    const second = await createTestContext([{ role: Role.ADMIN }]);
    try {
      authenticateAs(first.users[0].id);
      const renamedFirst = await renameWorkspace({
        workspaceId: first.workspace.id,
        name: "Shared Name",
      });

      authenticateAs(second.users[0].id);
      const renamedSecond = await renameWorkspace({
        workspaceId: second.workspace.id,
        name: "Shared Name",
      });

      expect(renamedFirst.success).toBe(true);
      expect(renamedSecond.success).toBe(true);
      if (!renamedFirst.success || !renamedSecond.success) return;
      expect(renamedFirst.slug).not.toBe(renamedSecond.slug);
    } finally {
      await deleteTestContext(first);
      await deleteTestContext(second);
    }
  });

  it("keeps members, incidents, postmortems and versions linked", async () => {
    const context = await createTestContext([
      { role: Role.ADMIN },
      { role: Role.VIEWER },
    ]);
    try {
      const incident = await createTestIncident({
        workspaceId: context.workspace.id,
        createdById: context.users[0].id,
      });
      const postmortem = await prisma.postmortem.create({
        data: {
          incidentId: incident.id,
          createdById: context.users[0].id,
          content: { summary: "kept" },
        },
      });
      await prisma.postmortemVersion.create({
        data: {
          postmortemId: postmortem.id,
          editedById: context.users[0].id,
          content: { version: 1 },
        },
      });

      authenticateAs(context.users[0].id);
      const result = await renameWorkspace({
        workspaceId: context.workspace.id,
        name: "Renamed With Relations",
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      await expect(
        prisma.membership.count({
          where: { workspaceId: context.workspace.id },
        }),
      ).resolves.toBe(2);
      await expect(
        prisma.incident.findUnique({ where: { id: incident.id } }),
      ).resolves.toMatchObject({
        workspaceId: context.workspace.id,
        title: incident.title,
      });
      await expect(
        prisma.postmortem.findUnique({ where: { id: postmortem.id } }),
      ).resolves.toMatchObject({ content: { summary: "kept" } });
      await expect(
        prisma.postmortemVersion.count({
          where: { postmortemId: postmortem.id },
        }),
      ).resolves.toBe(1);
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
      authenticateAs(context.users[1].id);

      const result = await renameWorkspace({
        workspaceId: context.workspace.id,
        name: "Hacked Name",
      });

      expect(result).toMatchObject({ success: false });
      await expect(
        prisma.workspace.findUnique({
          where: { id: context.workspace.id },
        }),
      ).resolves.toMatchObject({ name: context.workspace.name });
    } finally {
      await deleteTestContext(context);
    }
  });

  it("rejects a non-member attempting to rename", async () => {
    const context = await createTestContext([{ role: Role.ADMIN }]);
    const outsider = await createTestContext([{ role: Role.ADMIN }]);
    try {
      authenticateAs(outsider.users[0].id);

      const result = await renameWorkspace({
        workspaceId: context.workspace.id,
        name: "Hacked Name",
      });

      expect(result).toMatchObject({ success: false });
    } finally {
      await deleteTestContext(context);
      await deleteTestContext(outsider);
    }
  });

  it("rejects empty and overlong names without persisting changes", async () => {
    const context = await createTestContext([{ role: Role.ADMIN }]);
    try {
      authenticateAs(context.users[0].id);

      await expect(
        renameWorkspace({ workspaceId: context.workspace.id, name: "   " }),
      ).resolves.toMatchObject({ success: false });

      await expect(
        renameWorkspace({
          workspaceId: context.workspace.id,
          name: "a".repeat(101),
        }),
      ).resolves.toMatchObject({ success: false });

      await expect(
        prisma.workspace.findUnique({
          where: { id: context.workspace.id },
        }),
      ).resolves.toMatchObject({ name: context.workspace.name });
    } finally {
      await deleteTestContext(context);
    }
  });

  it("rejects unauthenticated rename attempts", async () => {
    const context = await createTestContext([{ role: Role.ADMIN }]);
    try {
      mockedGetSession.mockResolvedValue(null);

      await expect(
        renameWorkspace({
          workspaceId: context.workspace.id,
          name: "New Name",
        }),
      ).resolves.toEqual({ success: false, error: "Unauthorized" });
    } finally {
      await deleteTestContext(context);
    }
  });
});
