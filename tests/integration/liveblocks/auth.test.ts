import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Role } from "@/generated/prisma/enums";

const { allowMock, authorizeMock, prepareSessionMock } = vi.hoisted(() => ({
  allowMock: vi.fn(),
  // Mirrors the Liveblocks cloud `/v2/authorize-user` payload: a JSON
  // document shaped `{ token: "..." }`. `@liveblocks/client` requires
  // exactly this shape (`res.json()` + string `data.token`).
  authorizeMock: vi.fn(async () => ({
    status: 200,
    body: JSON.stringify({ token: "test-token" }),
  })),
  prepareSessionMock: vi.fn(),
}));

vi.mock("@liveblocks/node", () => ({
  Liveblocks: vi.fn(function MockedLiveblocks() {
    return { prepareSession: prepareSessionMock };
  }),
}));

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

import { POST } from "@/app/api/liveblocks/auth/route";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  createTestContext,
  createTestIncident,
  deleteTestContext,
  requireTestDatabase,
} from "../../helpers/test-database";

const mockedGetSession = vi.mocked(getSession);

process.env.LIVEBLOCKS_SECRET_KEY = "sk_test_postmortem_liveblocks";

function authenticateAs(userId: string, name = "Test User") {
  mockedGetSession.mockResolvedValue({
    user: {
      id: userId,
      name,
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

function authedRequest(body: unknown) {
  return new Request("http://localhost/api/liveblocks/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function canonicalDoc(text: string) {
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}

describe("POST /api/liveblocks/auth", () => {
  beforeAll(() => {
    requireTestDatabase();
    prepareSessionMock.mockImplementation(() => ({
      allow: allowMock,
      authorize: authorizeMock,
    }));
  });

  afterAll(async () => prisma.$disconnect());

  it("rejects unauthenticated requests without touching Liveblocks", async () => {
    mockedGetSession.mockResolvedValue(null);
    allowMock.mockClear();

    const res = await POST(authedRequest({ postmortemId: "anything" }));

    expect(res.status).toBe(401);
    expect(allowMock).not.toHaveBeenCalled();
  });

  it("rejects rooms outside the postmortem namespace", async () => {
    const context = await createTestContext([{ role: Role.ADMIN }]);
    try {
      authenticateAs(context.users[0].id);
      allowMock.mockClear();

      const res = await POST(authedRequest({ room: "workspace:evil" }));

      expect(res.status).toBe(403);
      expect(allowMock).not.toHaveBeenCalled();
    } finally {
      await deleteTestContext(context);
    }
  });

  it("rejects mismatched postmortemId and room pairs", async () => {
    const context = await createTestContext([{ role: Role.ADMIN }]);
    try {
      authenticateAs(context.users[0].id);
      allowMock.mockClear();

      const res = await POST(
        authedRequest({ postmortemId: "aaa", room: "postmortem:bbb" }),
      );

      expect(res.status).toBe(403);
      expect(allowMock).not.toHaveBeenCalled();
    } finally {
      await deleteTestContext(context);
    }
  });

  it("returns 404 for unknown postmortems and other workspaces", async () => {
    const contextA = await createTestContext([{ role: Role.ADMIN }]);
    const contextB = await createTestContext([{ role: Role.ADMIN }]);
    const incidentB = await createTestIncident({
      workspaceId: contextB.workspace.id,
      createdById: contextB.users[0].id,
    });
    const foreign = await prisma.postmortem.create({
      data: {
        incidentId: incidentB.id,
        createdById: contextB.users[0].id,
        content: canonicalDoc("secret"),
      },
      select: { id: true },
    });

    try {
      authenticateAs(contextA.users[0].id);
      allowMock.mockClear();

      // Unknown id.
      await expect(
        POST(authedRequest({ postmortemId: "postmortem-does-not-exist" })),
      ).resolves.toMatchObject({ status: 404 });

      // Valid id, wrong workspace (membership check fails -> 404, no enumeration).
      await expect(
        POST(authedRequest({ postmortemId: foreign.id })),
      ).resolves.toMatchObject({ status: 404 });
      await expect(
        POST(authedRequest({ room: `postmortem:${foreign.id}` })),
      ).resolves.toMatchObject({ status: 404 });

      expect(allowMock).not.toHaveBeenCalled();
    } finally {
      await deleteTestContext(contextA);
      await deleteTestContext(contextB);
    }
  });

  it("grants write to ADMIN on the exact server-derived room", async () => {
    const context = await createTestContext([{ role: Role.ADMIN }]);
    const incident = await createTestIncident({
      workspaceId: context.workspace.id,
      createdById: context.users[0].id,
    });
    const postmortem = await prisma.postmortem.create({
      data: {
        incidentId: incident.id,
        createdById: context.users[0].id,
        content: canonicalDoc("draft"),
      },
      select: { id: true },
    });

    try {
      authenticateAs(context.users[0].id);
      allowMock.mockClear();

      const res = await POST(authedRequest({ postmortemId: postmortem.id }));

      expect(res.status).toBe(200);
      expect(allowMock).toHaveBeenCalledTimes(1);
      expect(allowMock).toHaveBeenCalledWith(`postmortem:${postmortem.id}`, [
        "*:write",
      ]);
      // Contract required by `@liveblocks/client` (`res.json()` + string
      // `data.token`); any other shape surfaces in the browser as
      // `Authentication failed: Timed out during auth` after retries.
      const payload = (await res.json()) as { token?: unknown };
      expect(typeof payload.token).toBe("string");
      expect(payload.token).toBe("test-token");
    } finally {
      await deleteTestContext(context);
    }
  });

  it("grants read-only to VIEWER and never write", async () => {
    const context = await createTestContext([
      { role: Role.ADMIN },
      { role: Role.VIEWER },
    ]);
    const incident = await createTestIncident({
      workspaceId: context.workspace.id,
      createdById: context.users[0].id,
    });
    const postmortem = await prisma.postmortem.create({
      data: {
        incidentId: incident.id,
        createdById: context.users[0].id,
        content: canonicalDoc("draft"),
      },
      select: { id: true },
    });

    try {
      authenticateAs(context.users[1].id);
      allowMock.mockClear();

      const res = await POST(
        authedRequest({ room: `postmortem:${postmortem.id}` }),
      );

      expect(res.status).toBe(200);
      expect(allowMock).toHaveBeenCalledTimes(1);
      const [, perms] = allowMock.mock.calls[0] as [string, string[]];
      expect(perms).toEqual(["*:read"]);
      expect(perms).not.toContain("*:write");
      const payload = (await res.json()) as { token?: unknown };
      expect(typeof payload.token).toBe("string");
    } finally {
      await deleteTestContext(context);
    }
  });

  it("rejects members removed from the workspace", async () => {
    const context = await createTestContext([{ role: Role.ADMIN }]);
    const incident = await createTestIncident({
      workspaceId: context.workspace.id,
      createdById: context.users[0].id,
    });
    const postmortem = await prisma.postmortem.create({
      data: {
        incidentId: incident.id,
        createdById: context.users[0].id,
        content: canonicalDoc("draft"),
      },
      select: { id: true },
    });

    try {
      authenticateAs(context.users[0].id);
      // Simulate removal: delete the membership row.
      await prisma.membership.delete({
        where: {
          userId_workspaceId: {
            userId: context.users[0].id,
            workspaceId: context.workspace.id,
          },
        },
      });
      allowMock.mockClear();

      const res = await POST(authedRequest({ postmortemId: postmortem.id }));

      expect(res.status).toBe(404);
      expect(allowMock).not.toHaveBeenCalled();
    } finally {
      // Membership already removed; deleteTestContext removes workspace (cascade)
      // and users.
      await deleteTestContext(context);
    }
  });
});
