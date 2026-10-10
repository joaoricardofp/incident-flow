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
import { createWorkspace } from "@/modules/workspace/actions";
import { getWorkspacesByUser } from "@/modules/workspace/queries";
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
      id: `session-${userId}`,
      userId,
      expiresAt: new Date(Date.now() + 60_000),
    },
  } as never);
}

describe("createWorkspace flow reused by the sidebar", () => {
  beforeAll(() => requireTestDatabase());
  afterAll(async () => prisma.$disconnect());

  it("creates a workspace with the caller as ADMIN and lists it for that user", async () => {
    const context = await createTestContext([{ role: Role.VIEWER }]);
    try {
      authenticateAs(context.users[0].id);

      const result = await createWorkspace();

      expect(result.success).toBe(true);
      if (!result.success) return;

      try {
        const workspace = await prisma.workspace.findUnique({
          where: { slug: result.slug },
          select: { id: true, slug: true },
        });
        expect(workspace).not.toBeNull();
        if (!workspace) return;

        // The creator is the initial ADMIN.
        await expect(
          prisma.membership.findUnique({
            where: {
              userId_workspaceId: {
                userId: context.users[0].id,
                workspaceId: workspace.id,
              },
            },
          }),
        ).resolves.toMatchObject({ role: Role.ADMIN });

        // The new workspace appears in the user's sidebar list, so the
        // sidebar can navigate to `/${slug}` right after creation.
        const workspaces = await getWorkspacesByUser({
          userId: context.users[0].id,
        });
        expect(workspaces.map((w) => w.slug)).toContain(result.slug);
      } finally {
        await prisma.workspace.delete({ where: { slug: result.slug } });
      }
    } finally {
      await deleteTestContext(context);
    }
  });

  it("only lists workspaces the authenticated user belongs to", async () => {
    const contextA = await createTestContext([{ role: Role.ADMIN }]);
    const contextB = await createTestContext([{ role: Role.VIEWER }]);
    try {
      const workspaces = await getWorkspacesByUser({
        userId: contextA.users[0].id,
      });

      expect(workspaces.map((w) => w.id)).toContain(contextA.workspace.id);
      expect(workspaces.map((w) => w.id)).not.toContain(contextB.workspace.id);
    } finally {
      await deleteTestContext(contextA);
      await deleteTestContext(contextB);
    }
  });

  it("rejects unauthenticated creation", async () => {
    mockedGetSession.mockResolvedValue(null);

    await expect(createWorkspace()).resolves.toEqual({
      success: false,
      error: "Unauthorized",
    });
  });
});
