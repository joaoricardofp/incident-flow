import { randomUUID } from "node:crypto";
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
import { joinWorkspace, rotateInviteToken } from "@/modules/workspace/actions";
import {
  createTestContext,
  deleteTestContext,
  requireTestDatabase,
} from "../../helpers/test-database";

const mockedGetSession = vi.mocked(getSession);

function sessionFor(userId: string) {
  return {
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
  } as never;
}

function authenticateAs(userId: string) {
  mockedGetSession.mockResolvedValue(sessionFor(userId));
}

async function createOutsider() {
  const user = {
    id: randomUUID(),
    name: `Outsider ${randomUUID()}`,
    email: `outsider-${randomUUID()}@example.com`,
  };
  await prisma.user.create({
    data: { ...user, emailVerified: true },
  });
  return user;
}

describe("rotateInviteToken", () => {
  beforeAll(() => requireTestDatabase());
  afterAll(async () => prisma.$disconnect());

  it("rejects a VIEWER attempting rotation", async () => {
    const context = await createTestContext([
      { role: Role.ADMIN },
      { role: Role.VIEWER },
    ]);
    try {
      authenticateAs(context.users[1].id);

      const result = await rotateInviteToken({
        workspaceId: context.workspace.id,
      });

      expect(result).toMatchObject({ success: false });
    } finally {
      await deleteTestContext(context);
    }
  });

  it("rejects a non-member attempting rotation", async () => {
    const context = await createTestContext([{ role: Role.ADMIN }]);
    const outsider = await createOutsider();
    try {
      authenticateAs(outsider.id);

      const result = await rotateInviteToken({
        workspaceId: context.workspace.id,
      });

      expect(result).toMatchObject({ success: false });
    } finally {
      await deleteTestContext(context);
      await prisma.user.delete({ where: { id: outsider.id } });
    }
  });

  it("rejects unauthenticated rotation", async () => {
    const context = await createTestContext([{ role: Role.ADMIN }]);
    try {
      mockedGetSession.mockResolvedValue(null);

      await expect(
        rotateInviteToken({ workspaceId: context.workspace.id }),
      ).resolves.toEqual({ success: false, error: "Unauthorized" });
    } finally {
      await deleteTestContext(context);
    }
  });

  it("rotates the token, invalidates the old one and accepts the new one via joinWorkspace", async () => {
    const context = await createTestContext([{ role: Role.ADMIN }]);
    const outsider = await createOutsider();
    try {
      const before = await prisma.workspace.findUnique({
        where: { id: context.workspace.id },
        select: { inviteToken: true, slug: true },
      });
      expect(before).not.toBeNull();
      if (!before) throw new Error("Fixture workspace missing");

      authenticateAs(context.users[0].id);
      const rotated = await rotateInviteToken({
        workspaceId: context.workspace.id,
      });

      expect(rotated.success).toBe(true);
      if (!rotated.success) return;
      expect(rotated.inviteToken).not.toBe(before.inviteToken);

      const stored = await prisma.workspace.findUnique({
        where: { id: context.workspace.id },
        select: { inviteToken: true },
      });
      expect(stored?.inviteToken).toBe(rotated.inviteToken);

      // Old token is rejected by the real invite flow.
      authenticateAs(outsider.id);
      await expect(
        joinWorkspace({ token: before.inviteToken }),
      ).resolves.toMatchObject({ success: false, code: "INVALID_TOKEN" });

      // New token works through the normal invite flow.
      const joined = await joinWorkspace({ token: rotated.inviteToken });
      expect(joined).toMatchObject({ success: true, slug: before.slug });

      await expect(
        prisma.membership.findUnique({
          where: {
            userId_workspaceId: {
              userId: outsider.id,
              workspaceId: context.workspace.id,
            },
          },
        }),
      ).resolves.not.toBeNull();
    } finally {
      await deleteTestContext(context);
      await prisma.user.deleteMany({ where: { id: outsider.id } });
    }
  });
});
