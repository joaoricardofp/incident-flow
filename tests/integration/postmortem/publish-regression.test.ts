import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Role } from "@/generated/prisma/enums";

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { publishPostmortem } from "@/modules/postmortem/actions";
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

function doc(text: string) {
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}

/**
 * Mimics React's temporary client reference proxy: any property read
 * outside a small allowlist throws, exactly like flight-decoded `$T`
 * values behave on the server.
 */
function makeUnreadableProxy(): unknown {
  const target = () => {};
  return new Proxy(target, {
    get(_t, name) {
      if (
        name === "$$typeof" ||
        name === "name" ||
        name === "toJSON" ||
        name === Symbol.toStringTag ||
        name === "then"
      ) {
        return undefined;
      }
      throw new Error(
        `Cannot access ${String(name)} on the server. You cannot dot into a temporary client reference from a server component. You can only pass the value through to the client.`,
      );
    },
    set() {
      throw new Error("Cannot assign");
    },
  });
}

describe("publishPostmortem with non-plain JSON content", () => {
  beforeAll(() => requireTestDatabase());
  afterAll(async () => prisma.$disconnect());

  it("rejects a nested function with a validation error (no version, no throw)", async () => {
    const context = await createTestContext([{ role: Role.ADMIN }]);
    const incident = await createTestIncident({
      workspaceId: context.workspace.id,
      createdById: context.users[0].id,
    });
    const postmortem = await prisma.postmortem.create({
      data: {
        incidentId: incident.id,
        createdById: context.users[0].id,
        content: doc("draft"),
      },
      select: { id: true },
    });

    try {
      authenticateAs(context.users[0].id);

      const evil = doc("evil") as Record<string, unknown>;
      (evil.content as unknown[]).push({
        type: "paragraph",
        content: [{ type: "text", text: "x", onClick: () => {} }],
      });

      const result = await publishPostmortem(
        { postmortemId: postmortem.id, workspaceId: context.workspace.id },
        // biome-ignore lint/suspicious/noExplicitAny: intentional non-JSON payload
        { content: evil as any },
      );

      expect(result).toMatchObject({ success: false });
      await expect(
        prisma.postmortemVersion.count({
          where: { postmortemId: postmortem.id },
        }),
      ).resolves.toBe(0);
    } finally {
      await deleteTestContext(context);
    }
  });

  it("rejects a nested unreadable proxy with a validation error (no throw)", async () => {
    const context = await createTestContext([{ role: Role.ADMIN }]);
    const incident = await createTestIncident({
      workspaceId: context.workspace.id,
      createdById: context.users[0].id,
    });
    const postmortem = await prisma.postmortem.create({
      data: {
        incidentId: incident.id,
        createdById: context.users[0].id,
        content: doc("draft"),
      },
      select: { id: true },
    });

    try {
      authenticateAs(context.users[0].id);

      const evil = doc("evil") as Record<string, unknown>;
      (evil.content as unknown[]).push({
        type: "paragraph",
        content: [{ type: "text", text: "x", meta: makeUnreadableProxy() }],
      });

      const result = await publishPostmortem(
        { postmortemId: postmortem.id, workspaceId: context.workspace.id },
        // biome-ignore lint/suspicious/noExplicitAny: intentional non-JSON payload
        { content: evil as any },
      );

      expect(result).toMatchObject({ success: false });
      await expect(
        prisma.postmortemVersion.count({
          where: { postmortemId: postmortem.id },
        }),
      ).resolves.toBe(0);
    } finally {
      await deleteTestContext(context);
    }
  });
});
