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
import {
  leaveWorkspace,
  removeMember,
  updateMemberRole,
} from "@/modules/workspace/actions";
import {
  createTestContext,
  deleteTestContext,
  requireTestDatabase,
  type TestContext,
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

/** Queue distinct sessions for concurrent calls (each action reads it once). */
function authenticateConcurrently(userIds: string[]) {
  const queue = userIds.map(sessionFor);
  mockedGetSession.mockImplementation(async () => {
    const next = queue.shift();
    if (!next) throw new Error("No more queued sessions");
    return next;
  });
}

async function membershipsByUser(context: TestContext) {
  const memberships = await prisma.membership.findMany({
    where: { workspaceId: context.workspace.id },
    select: { id: true, userId: true, role: true },
  });
  return new Map(memberships.map((m) => [m.userId, m]));
}

function mustId(
  memberships: Map<string, { id: string }>,
  userId: string,
): string {
  const membership = memberships.get(userId);
  if (!membership) throw new Error("Fixture membership missing");
  return membership.id;
}

async function adminCount(workspaceId: string) {
  return prisma.membership.count({
    where: { workspaceId, role: Role.ADMIN },
  });
}

describe("workspace admin integrity", () => {
  beforeAll(() => requireTestDatabase());
  afterAll(async () => prisma.$disconnect());

  it("rejects demoting the only ADMIN", async () => {
    const context = await createTestContext([{ role: Role.ADMIN }]);
    try {
      authenticateAs(context.users[0].id);
      const memberships = await membershipsByUser(context);

      const result = await updateMemberRole({
        workspaceId: context.workspace.id,
        membershipId: mustId(memberships, context.users[0].id),
        role: Role.VIEWER,
      });

      expect(result).toMatchObject({ success: false });
      await expect(adminCount(context.workspace.id)).resolves.toBe(1);
    } finally {
      await deleteTestContext(context);
    }
  });

  it("allows demoting an ADMIN when another ADMIN remains", async () => {
    const context = await createTestContext([
      { role: Role.ADMIN },
      { role: Role.ADMIN },
    ]);
    try {
      authenticateAs(context.users[0].id);
      const memberships = await membershipsByUser(context);

      const result = await updateMemberRole({
        workspaceId: context.workspace.id,
        membershipId: mustId(memberships, context.users[1].id),
        role: Role.VIEWER,
      });

      expect(result).toEqual({ success: true });
      await expect(
        prisma.membership.findUnique({
          where: { id: mustId(memberships, context.users[1].id) },
          select: { role: true },
        }),
      ).resolves.toMatchObject({ role: Role.VIEWER });
    } finally {
      await deleteTestContext(context);
    }
  });

  it("rejects removing yourself and allows the sole member to leave instead", async () => {
    const context = await createTestContext([{ role: Role.ADMIN }]);
    try {
      authenticateAs(context.users[0].id);
      const memberships = await membershipsByUser(context);

      const removeResult = await removeMember({
        workspaceId: context.workspace.id,
        membershipId: mustId(memberships, context.users[0].id),
      });
      expect(removeResult.success).toBe(false);

      const leaveResult = await leaveWorkspace({
        workspaceId: context.workspace.id,
      });
      expect(leaveResult).toEqual({ success: true });

      await expect(adminCount(context.workspace.id)).resolves.toBe(0);
    } finally {
      await deleteTestContext(context);
    }
  });

  it("allows removing an ADMIN when another ADMIN remains", async () => {
    const context = await createTestContext([
      { role: Role.ADMIN },
      { role: Role.ADMIN },
      { role: Role.VIEWER },
    ]);
    try {
      authenticateAs(context.users[0].id);
      const memberships = await membershipsByUser(context);

      const result = await removeMember({
        workspaceId: context.workspace.id,
        membershipId: mustId(memberships, context.users[1].id),
      });

      expect(result).toEqual({ success: true });
      await expect(adminCount(context.workspace.id)).resolves.toBe(1);
      await expect(
        prisma.membership.findUnique({
          where: { id: mustId(memberships, context.users[1].id) },
        }),
      ).resolves.toBeNull();
    } finally {
      await deleteTestContext(context);
    }
  });

  it("rejects the only ADMIN leaving while other members remain", async () => {
    const context = await createTestContext([
      { role: Role.ADMIN },
      { role: Role.VIEWER },
    ]);
    try {
      authenticateAs(context.users[0].id);

      const result = await leaveWorkspace({
        workspaceId: context.workspace.id,
      });

      expect(result).toEqual({
        success: false,
        error:
          "You are the only admin of this workspace. Promote another member to admin before leaving.",
      });
      await expect(adminCount(context.workspace.id)).resolves.toBe(1);
    } finally {
      await deleteTestContext(context);
    }
  });

  it("allows the sole member to leave even as ADMIN", async () => {
    const context = await createTestContext([{ role: Role.ADMIN }]);
    try {
      authenticateAs(context.users[0].id);

      const result = await leaveWorkspace({
        workspaceId: context.workspace.id,
      });

      expect(result).toEqual({ success: true });
      await expect(
        prisma.membership.count({
          where: { workspaceId: context.workspace.id },
        }),
      ).resolves.toBe(0);
    } finally {
      await deleteTestContext(context);
    }
  });

  it("allows an ADMIN to leave when another ADMIN remains", async () => {
    const context = await createTestContext([
      { role: Role.ADMIN },
      { role: Role.ADMIN },
    ]);
    try {
      authenticateAs(context.users[0].id);

      const result = await leaveWorkspace({
        workspaceId: context.workspace.id,
      });

      expect(result).toEqual({ success: true });
      await expect(adminCount(context.workspace.id)).resolves.toBe(1);
    } finally {
      await deleteTestContext(context);
    }
  });

  it("allows at most one of two concurrent demotions that would remove all ADMINs", async () => {
    const context = await createTestContext([
      { role: Role.ADMIN },
      { role: Role.ADMIN },
    ]);
    try {
      const memberships = await membershipsByUser(context);
      const membershipA = mustId(memberships, context.users[0].id);
      const membershipB = mustId(memberships, context.users[1].id);

      // Actor A demotes B while actor B demotes A.
      authenticateConcurrently([context.users[0].id, context.users[1].id]);

      const [first, second] = await Promise.all([
        updateMemberRole({
          workspaceId: context.workspace.id,
          membershipId: membershipB,
          role: Role.VIEWER,
        }),
        updateMemberRole({
          workspaceId: context.workspace.id,
          membershipId: membershipA,
          role: Role.VIEWER,
        }),
      ]);

      const successes = [first, second].filter((r) => r.success).length;
      expect(successes).toBeLessThanOrEqual(1);
      await expect(
        adminCount(context.workspace.id),
      ).resolves.toBeGreaterThanOrEqual(1);
    } finally {
      await deleteTestContext(context);
    }
  });

  it("allows at most one of two concurrent leaves that would remove all ADMINs", async () => {
    const context = await createTestContext([
      { role: Role.ADMIN },
      { role: Role.ADMIN },
      { role: Role.VIEWER },
    ]);
    try {
      authenticateConcurrently([context.users[0].id, context.users[1].id]);

      const [first, second] = await Promise.all([
        leaveWorkspace({ workspaceId: context.workspace.id }),
        leaveWorkspace({ workspaceId: context.workspace.id }),
      ]);

      const successes = [first, second].filter((r) => r.success).length;
      expect(successes).toBeLessThanOrEqual(1);
      await expect(
        adminCount(context.workspace.id),
      ).resolves.toBeGreaterThanOrEqual(1);
    } finally {
      await deleteTestContext(context);
    }
  });

  it("never leaves members behind without an ADMIN under concurrent leave, remove and demote", async () => {
    const context = await createTestContext([
      { role: Role.ADMIN },
      { role: Role.ADMIN },
      { role: Role.VIEWER },
    ]);
    try {
      const memberships = await membershipsByUser(context);
      authenticateConcurrently([
        context.users[0].id,
        context.users[0].id,
        context.users[1].id,
      ]);

      await Promise.all([
        leaveWorkspace({ workspaceId: context.workspace.id }),
        removeMember({
          workspaceId: context.workspace.id,
          membershipId: mustId(memberships, context.users[1].id),
        }),
        updateMemberRole({
          workspaceId: context.workspace.id,
          membershipId: mustId(memberships, context.users[1].id),
          role: Role.VIEWER,
        }),
      ]);

      const [remaining, admins] = await Promise.all([
        prisma.membership.count({
          where: { workspaceId: context.workspace.id },
        }),
        adminCount(context.workspace.id),
      ]);
      expect(remaining === 0 || admins >= 1).toBe(true);
    } finally {
      await deleteTestContext(context);
    }
  });
});

describe("workspace removal and leave authorization", () => {
  beforeAll(() => requireTestDatabase());
  afterAll(async () => prisma.$disconnect());

  it("rejects a VIEWER attempting to remove a member", async () => {
    const context = await createTestContext([
      { role: Role.ADMIN },
      { role: Role.VIEWER },
    ]);
    try {
      authenticateAs(context.users[1].id);
      const memberships = await membershipsByUser(context);

      const result = await removeMember({
        workspaceId: context.workspace.id,
        membershipId: mustId(memberships, context.users[0].id),
      });

      expect(result).toMatchObject({ success: false });
      await expect(
        prisma.membership.findUnique({
          where: { id: mustId(memberships, context.users[0].id) },
        }),
      ).resolves.not.toBeNull();
    } finally {
      await deleteTestContext(context);
    }
  });

  it("rejects a VIEWER attempting to change a role", async () => {
    const context = await createTestContext([
      { role: Role.ADMIN },
      { role: Role.VIEWER },
    ]);
    try {
      authenticateAs(context.users[1].id);
      const memberships = await membershipsByUser(context);

      const result = await updateMemberRole({
        workspaceId: context.workspace.id,
        membershipId: mustId(memberships, context.users[1].id),
        role: Role.ADMIN,
      });

      expect(result).toMatchObject({ success: false });
    } finally {
      await deleteTestContext(context);
    }
  });

  it("rejects an ADMIN removing a member of another workspace without leaking data", async () => {
    const contextA = await createTestContext([{ role: Role.ADMIN }]);
    const contextB = await createTestContext([{ role: Role.VIEWER }]);
    try {
      authenticateAs(contextA.users[0].id);
      const membershipsB = await membershipsByUser(contextB);

      const result = await removeMember({
        workspaceId: contextA.workspace.id,
        membershipId: mustId(membershipsB, contextB.users[0].id),
      });

      expect(result).toEqual({ success: false, error: "Membership not found" });
      await expect(
        prisma.membership.findUnique({
          where: { id: mustId(membershipsB, contextB.users[0].id) },
        }),
      ).resolves.not.toBeNull();
    } finally {
      await deleteTestContext(contextA);
      await deleteTestContext(contextB);
    }
  });

  it("rejects an ADMIN changing a role in another workspace without leaking data", async () => {
    const contextA = await createTestContext([{ role: Role.ADMIN }]);
    const contextB = await createTestContext([{ role: Role.VIEWER }]);
    try {
      authenticateAs(contextA.users[0].id);
      const membershipsB = await membershipsByUser(contextB);

      const result = await updateMemberRole({
        workspaceId: contextA.workspace.id,
        membershipId: mustId(membershipsB, contextB.users[0].id),
        role: Role.ADMIN,
      });

      expect(result).toEqual({ success: false, error: "Membership not found" });
    } finally {
      await deleteTestContext(contextA);
      await deleteTestContext(contextB);
    }
  });

  it("prevents using removeMember to remove yourself", async () => {
    const context = await createTestContext([
      { role: Role.ADMIN },
      { role: Role.ADMIN },
    ]);
    try {
      authenticateAs(context.users[0].id);
      const memberships = await membershipsByUser(context);

      const result = await removeMember({
        workspaceId: context.workspace.id,
        membershipId: mustId(memberships, context.users[0].id),
      });

      expect(result.success).toBe(false);
      await expect(
        prisma.membership.findUnique({
          where: { id: mustId(memberships, context.users[0].id) },
        }),
      ).resolves.not.toBeNull();
    } finally {
      await deleteTestContext(context);
    }
  });

  it("leave only removes the authenticated member, never someone else", async () => {
    const context = await createTestContext([
      { role: Role.ADMIN },
      { role: Role.VIEWER },
    ]);
    try {
      authenticateAs(context.users[1].id);
      const before = await membershipsByUser(context);

      const result = await leaveWorkspace({
        workspaceId: context.workspace.id,
      });

      expect(result).toEqual({ success: true });
      await expect(
        prisma.membership.findUnique({
          where: { id: mustId(before, context.users[1].id) },
        }),
      ).resolves.toBeNull();
      // The other member is untouched.
      await expect(
        prisma.membership.findUnique({
          where: { id: mustId(before, context.users[0].id) },
        }),
      ).resolves.not.toBeNull();
    } finally {
      // The admin membership may remain; deleteTestContext removes the workspace
      // (cascading memberships) plus all fixture users.
      await deleteTestContext(context);
    }
  });

  it("handles invalid membership ids safely", async () => {
    const context = await createTestContext([{ role: Role.ADMIN }]);
    try {
      authenticateAs(context.users[0].id);

      await expect(
        removeMember({
          workspaceId: context.workspace.id,
          membershipId: "membership-does-not-exist",
        }),
      ).resolves.toEqual({ success: false, error: "Membership not found" });

      await expect(
        updateMemberRole({
          workspaceId: context.workspace.id,
          membershipId: "membership-does-not-exist",
          role: Role.VIEWER,
        }),
      ).resolves.toEqual({ success: false, error: "Membership not found" });
    } finally {
      await deleteTestContext(context);
    }
  });

  it("rejects unauthenticated removal, role change and leave", async () => {
    const context = await createTestContext([{ role: Role.ADMIN }]);
    try {
      mockedGetSession.mockResolvedValue(null);
      const memberships = await membershipsByUser(context);

      await expect(
        removeMember({
          workspaceId: context.workspace.id,
          membershipId: mustId(memberships, context.users[0].id),
        }),
      ).resolves.toEqual({ success: false, error: "Unauthorized" });

      await expect(
        updateMemberRole({
          workspaceId: context.workspace.id,
          membershipId: mustId(memberships, context.users[0].id),
          role: Role.VIEWER,
        }),
      ).resolves.toEqual({ success: false, error: "Unauthorized" });

      await expect(
        leaveWorkspace({ workspaceId: context.workspace.id }),
      ).resolves.toEqual({ success: false, error: "Unauthorized" });
    } finally {
      await deleteTestContext(context);
    }
  });
});
