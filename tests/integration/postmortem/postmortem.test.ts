import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Role, StatusPostmortem } from "@/generated/prisma/enums";

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  createPostmortem,
  publishPostmortem,
  savePostmortemDraft,
} from "@/modules/postmortem/actions";
import {
  getPostmortemByIncident,
  getPostmortemVersions,
} from "@/modules/postmortem/queries";
import {
  createTestContext,
  createTestIncident,
  deleteTestContext,
  requireTestDatabase,
  type TestContext,
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

async function setupAdminWithIncident() {
  const context = await createTestContext([{ role: Role.ADMIN }]);
  const incident = await createTestIncident({
    workspaceId: context.workspace.id,
    createdById: context.users[0].id,
  });
  return { context, incident };
}

describe("postmortem authorization", () => {
  beforeAll(() => requireTestDatabase());
  afterAll(async () => prisma.$disconnect());

  it("rejects unauthenticated create/save/publish", async () => {
    mockedGetSession.mockResolvedValue(null);

    await expect(
      createPostmortem(
        { workspaceId: "ws" },
        { incidentId: "incident", content: doc("hi") },
      ),
    ).resolves.toEqual({ success: false, error: "Unauthorized" });

    await expect(
      savePostmortemDraft(
        { postmortemId: "pm", workspaceId: "ws" },
        { content: doc("hi"), baseUpdatedAt: new Date().toISOString() },
      ),
    ).resolves.toEqual({ success: false, error: "Unauthorized" });

    await expect(
      publishPostmortem(
        { postmortemId: "pm", workspaceId: "ws" },
        { content: doc("hi") },
      ),
    ).resolves.toEqual({ success: false, error: "Unauthorized" });
  });

  it("rejects a VIEWER attempting to create, save, or publish", async () => {
    const { context, incident } = await setupAdminWithIncident();
    const viewerContext = await createTestContext([{ role: Role.VIEWER }]);

    try {
      // Seed a postmortem as admin for save/publish attempts.
      authenticateAs(context.users[0].id);
      const created = await createPostmortem(
        { workspaceId: context.workspace.id },
        { incidentId: incident.id, content: doc("draft") },
      );
      expect(created.success).toBe(true);
      if (!created.success) return;

      // Give the viewer membership in the SAME workspace as the postmortem.
      const viewerUser = viewerContext.users[0];
      await prisma.membership.create({
        data: {
          userId: viewerUser.id,
          workspaceId: context.workspace.id,
          role: Role.VIEWER,
        },
      });
      authenticateAs(viewerUser.id);

      await expect(
        createPostmortem(
          { workspaceId: context.workspace.id },
          { incidentId: incident.id, content: doc("x") },
        ),
      ).resolves.toMatchObject({
        success: false,
        error: "User does not have the required role",
      });

      const current = await getPostmortemByIncident({
        incidentId: incident.id,
        workspaceId: context.workspace.id,
      });
      if (!current) throw new Error("Postmortem should exist");
      await expect(
        savePostmortemDraft(
          {
            postmortemId: created.postmortemId,
            workspaceId: context.workspace.id,
          },
          {
            content: doc("viewer edit"),
            baseUpdatedAt: current.updatedAt.toISOString(),
          },
        ),
      ).resolves.toMatchObject({
        success: false,
        error: "User does not have the required role",
      });

      await expect(
        publishPostmortem(
          {
            postmortemId: created.postmortemId,
            workspaceId: context.workspace.id,
          },
          { content: doc("viewer publish") },
        ),
      ).resolves.toMatchObject({
        success: false,
        error: "User does not have the required role",
      });

      // No mutation leaked through.
      await expect(
        prisma.postmortemVersion.count({
          where: { postmortemId: created.postmortemId },
        }),
      ).resolves.toBe(0);
    } finally {
      await deleteTestContext(context);
      await deleteTestContext(viewerContext);
    }
  });

  it("rejects a user without membership in the workspace", async () => {
    const { context, incident } = await setupAdminWithIncident();
    const outsider = await createTestContext([{ role: Role.ADMIN }]);

    try {
      authenticateAs(outsider.users[0].id);

      await expect(
        createPostmortem(
          { workspaceId: context.workspace.id },
          { incidentId: incident.id, content: doc("x") },
        ),
      ).resolves.toMatchObject({
        success: false,
        error: "User is not a member of this workspace",
      });
    } finally {
      await deleteTestContext(context);
      await deleteTestContext(outsider);
    }
  });

  it("rejects cross-workspace access via manipulated ids", async () => {
    const workspaceA = await createTestContext([{ role: Role.ADMIN }]);
    const workspaceB = await createTestContext([{ role: Role.ADMIN }]);
    const incidentB = await createTestIncident({
      workspaceId: workspaceB.workspace.id,
      createdById: workspaceB.users[0].id,
    });

    try {
      // Admin of A tries to operate on B's incident/postmortem.
      authenticateAs(workspaceA.users[0].id);

      await expect(
        createPostmortem(
          { workspaceId: workspaceA.workspace.id },
          { incidentId: incidentB.id, content: doc("cross") },
        ),
      ).resolves.toMatchObject({ success: false, error: "Incident not found" });

      // Admin of B creates the real postmortem; admin of A tries to touch it.
      authenticateAs(workspaceB.users[0].id);
      const created = await createPostmortem(
        { workspaceId: workspaceB.workspace.id },
        { incidentId: incidentB.id, content: doc("real") },
      );
      expect(created.success).toBe(true);
      if (!created.success) return;

      authenticateAs(workspaceA.users[0].id);
      await expect(
        savePostmortemDraft(
          {
            postmortemId: created.postmortemId,
            workspaceId: workspaceA.workspace.id,
          },
          { content: doc("hijack"), baseUpdatedAt: new Date().toISOString() },
        ),
      ).resolves.toMatchObject({
        success: false,
        error: "Postmortem not found",
      });

      await expect(
        publishPostmortem(
          {
            postmortemId: created.postmortemId,
            workspaceId: workspaceA.workspace.id,
          },
          { content: doc("hijack") },
        ),
      ).resolves.toMatchObject({
        success: false,
        error: "Postmortem not found",
      });

      await expect(
        getPostmortemVersions({
          postmortemId: created.postmortemId,
          workspaceId: workspaceA.workspace.id,
        }),
      ).resolves.toEqual([]);

      // B's document is untouched.
      authenticateAs(workspaceB.users[0].id);
      await expect(
        getPostmortemByIncident({
          incidentId: incidentB.id,
          workspaceId: workspaceB.workspace.id,
        }),
      ).resolves.toMatchObject({ content: doc("real") });
    } finally {
      await deleteTestContext(workspaceA);
      await deleteTestContext(workspaceB);
    }
  });
});

describe("postmortem creation and domain rules", () => {
  beforeAll(() => requireTestDatabase());
  afterAll(async () => prisma.$disconnect());

  it("creates a DRAFT postmortem linked to the incident and workspace", async () => {
    const { context, incident } = await setupAdminWithIncident();
    try {
      authenticateAs(context.users[0].id);

      const result = await createPostmortem(
        { workspaceId: context.workspace.id },
        { incidentId: incident.id, content: doc("initial") },
      );
      expect(result.success).toBe(true);
      if (!result.success) return;

      await expect(
        prisma.postmortem.findUnique({ where: { id: result.postmortemId } }),
      ).resolves.toMatchObject({
        incidentId: incident.id,
        createdById: context.users[0].id,
        status: StatusPostmortem.DRAFT,
        content: doc("initial"),
      });
    } finally {
      await deleteTestContext(context);
    }
  });

  it("rejects invalid input without persisting", async () => {
    const { context, incident } = await setupAdminWithIncident();
    try {
      authenticateAs(context.users[0].id);

      const result = await createPostmortem(
        { workspaceId: context.workspace.id },
        { incidentId: incident.id, content: { summary: "legacy" } },
      );
      expect(result.success).toBe(false);
      await expect(
        prisma.postmortem.count({
          where: { incidentId: incident.id },
        }),
      ).resolves.toBe(0);
    } finally {
      await deleteTestContext(context);
    }
  });

  it("rejects duplicate postmortems for the same incident", async () => {
    const { context, incident } = await setupAdminWithIncident();
    try {
      authenticateAs(context.users[0].id);

      const first = await createPostmortem(
        { workspaceId: context.workspace.id },
        { incidentId: incident.id, content: doc("one") },
      );
      expect(first.success).toBe(true);

      await expect(
        createPostmortem(
          { workspaceId: context.workspace.id },
          { incidentId: incident.id, content: doc("two") },
        ),
      ).resolves.toMatchObject({
        success: false,
        error: "Postmortem already exists for this incident",
      });

      await expect(
        prisma.postmortem.count({ where: { incidentId: incident.id } }),
      ).resolves.toBe(1);
    } finally {
      await deleteTestContext(context);
    }
  });

  it("returns not found for a missing incident", async () => {
    const context = await createTestContext([{ role: Role.ADMIN }]);
    try {
      authenticateAs(context.users[0].id);
      await expect(
        createPostmortem(
          { workspaceId: context.workspace.id },
          { incidentId: "incident-does-not-exist", content: doc("x") },
        ),
      ).resolves.toMatchObject({ success: false, error: "Incident not found" });
    } finally {
      await deleteTestContext(context);
    }
  });
});

describe("postmortem persistence and publication", () => {
  beforeAll(() => requireTestDatabase());
  afterAll(async () => prisma.$disconnect());

  async function createDraft(context: TestContext, incidentId: string) {
    authenticateAs(context.users[0].id);
    const created = await createPostmortem(
      { workspaceId: context.workspace.id },
      { incidentId, content: doc("v0") },
    );
    expect(created.success).toBe(true);
    if (!created.success) throw new Error("setup failed");
    return created.postmortemId;
  }

  it("recovers persisted content after reload", async () => {
    const { context, incident } = await setupAdminWithIncident();
    try {
      const postmortemId = await createDraft(context, incident.id);
      const before = await getPostmortemByIncident({
        incidentId: incident.id,
        workspaceId: context.workspace.id,
      });
      if (!before) throw new Error("Postmortem should exist");

      const saved = await savePostmortemDraft(
        { postmortemId, workspaceId: context.workspace.id },
        {
          content: doc("edited"),
          baseUpdatedAt: before.updatedAt.toISOString(),
        },
      );
      expect(saved.success).toBe(true);

      await expect(
        getPostmortemByIncident({
          incidentId: incident.id,
          workspaceId: context.workspace.id,
        }),
      ).resolves.toMatchObject({ content: doc("edited") });
    } finally {
      await deleteTestContext(context);
    }
  });

  it("rejects a stale snapshot instead of silently overwriting", async () => {
    const { context, incident } = await setupAdminWithIncident();
    try {
      const postmortemId = await createDraft(context, incident.id);
      const before = await getPostmortemByIncident({
        incidentId: incident.id,
        workspaceId: context.workspace.id,
      });
      if (!before) throw new Error("Postmortem should exist");

      // Concurrent edit wins first.
      const first = await savePostmortemDraft(
        { postmortemId, workspaceId: context.workspace.id },
        {
          content: doc("winner"),
          baseUpdatedAt: before.updatedAt.toISOString(),
        },
      );
      expect(first.success).toBe(true);

      // Stale snapshot from before the concurrent edit loses.
      await expect(
        savePostmortemDraft(
          { postmortemId, workspaceId: context.workspace.id },
          {
            content: doc("stale"),
            baseUpdatedAt: before.updatedAt.toISOString(),
          },
        ),
      ).resolves.toMatchObject({
        success: false,
        error: "Document changed by another user. Reload before saving.",
      });

      await expect(
        getPostmortemByIncident({
          incidentId: incident.id,
          workspaceId: context.workspace.id,
        }),
      ).resolves.toMatchObject({ content: doc("winner") });
    } finally {
      await deleteTestContext(context);
    }
  });

  it("publishes a version and marks the document PUBLISHED", async () => {
    const { context, incident } = await setupAdminWithIncident();
    try {
      const postmortemId = await createDraft(context, incident.id);

      const published = await publishPostmortem(
        { postmortemId, workspaceId: context.workspace.id },
        { content: doc("final") },
      );
      expect(published.success).toBe(true);
      if (!published.success) return;

      await expect(
        prisma.postmortem.findUnique({ where: { id: postmortemId } }),
      ).resolves.toMatchObject({
        status: StatusPostmortem.PUBLISHED,
        content: doc("final"),
      });

      const versions = await getPostmortemVersions({
        postmortemId,
        workspaceId: context.workspace.id,
      });
      expect(versions).toHaveLength(1);
      expect(versions[0]).toMatchObject({
        content: doc("final"),
        editedBy: { name: expect.any(String) },
      });
    } finally {
      await deleteTestContext(context);
    }
  });

  it("keeps the published version immutable when editing afterwards", async () => {
    const { context, incident } = await setupAdminWithIncident();
    try {
      const postmortemId = await createDraft(context, incident.id);
      await publishPostmortem(
        { postmortemId, workspaceId: context.workspace.id },
        { content: doc("published") },
      );

      const current = await getPostmortemByIncident({
        incidentId: incident.id,
        workspaceId: context.workspace.id,
      });
      if (!current) throw new Error("Postmortem should exist");

      // Post-publish edits flip status back to DRAFT (PUBLISHED invariant).
      const saved = await savePostmortemDraft(
        { postmortemId, workspaceId: context.workspace.id },
        {
          content: doc("new draft"),
          baseUpdatedAt: current.updatedAt.toISOString(),
        },
      );
      expect(saved.success).toBe(true);

      await expect(
        prisma.postmortem.findUnique({ where: { id: postmortemId } }),
      ).resolves.toMatchObject({
        status: StatusPostmortem.DRAFT,
        content: doc("new draft"),
      });

      const versions = await getPostmortemVersions({
        postmortemId,
        workspaceId: context.workspace.id,
      });
      expect(versions).toHaveLength(1);
      expect(versions[0].content).toEqual(doc("published"));
    } finally {
      await deleteTestContext(context);
    }
  });

  it("republishes as a new version while preserving history", async () => {
    const { context, incident } = await setupAdminWithIncident();
    try {
      const postmortemId = await createDraft(context, incident.id);
      await publishPostmortem(
        { postmortemId, workspaceId: context.workspace.id },
        { content: doc("take one") },
      );

      const second = await publishPostmortem(
        { postmortemId, workspaceId: context.workspace.id },
        { content: doc("take two") },
      );
      expect(second.success).toBe(true);

      const versions = await getPostmortemVersions({
        postmortemId,
        workspaceId: context.workspace.id,
      });
      expect(versions).toHaveLength(2);
      // Newest first.
      expect(versions[0].content).toEqual(doc("take two"));
      expect(versions[1].content).toEqual(doc("take one"));

      await expect(
        prisma.postmortem.findUnique({ where: { id: postmortemId } }),
      ).resolves.toMatchObject({
        status: StatusPostmortem.PUBLISHED,
        content: doc("take two"),
      });
    } finally {
      await deleteTestContext(context);
    }
  });

  it("rejects a stale publish snapshot without creating a version", async () => {
    const { context, incident } = await setupAdminWithIncident();
    try {
      const postmortemId = await createDraft(context, incident.id);
      const stale = await getPostmortemByIncident({
        incidentId: incident.id,
        workspaceId: context.workspace.id,
      });
      if (!stale) throw new Error("Postmortem should exist");

      // Concurrent draft save moves updatedAt forward.
      const fresh = await savePostmortemDraft(
        { postmortemId, workspaceId: context.workspace.id },
        {
          content: doc("newer draft"),
          baseUpdatedAt: stale.updatedAt.toISOString(),
        },
      );
      expect(fresh.success).toBe(true);

      await expect(
        publishPostmortem(
          { postmortemId, workspaceId: context.workspace.id },
          {
            content: doc("stale publish"),
            baseUpdatedAt: stale.updatedAt.toISOString(),
          },
        ),
      ).resolves.toMatchObject({
        success: false,
        error: "Document changed by another user. Reload before saving.",
      });

      await expect(
        prisma.postmortemVersion.count({ where: { postmortemId } }),
      ).resolves.toBe(0);
      await expect(
        prisma.postmortem.findUnique({ where: { id: postmortemId } }),
      ).resolves.toMatchObject({
        status: StatusPostmortem.DRAFT,
        content: doc("newer draft"),
      });
    } finally {
      await deleteTestContext(context);
    }
  });

  it("allows only one of two concurrent publishes with the same base", async () => {
    const { context, incident } = await setupAdminWithIncident();
    try {
      const postmortemId = await createDraft(context, incident.id);
      const base = await getPostmortemByIncident({
        incidentId: incident.id,
        workspaceId: context.workspace.id,
      });
      if (!base) throw new Error("Postmortem should exist");

      const [first, second] = await Promise.all([
        publishPostmortem(
          { postmortemId, workspaceId: context.workspace.id },
          {
            content: doc("racer one"),
            baseUpdatedAt: base.updatedAt.toISOString(),
          },
        ),
        publishPostmortem(
          { postmortemId, workspaceId: context.workspace.id },
          {
            content: doc("racer two"),
            baseUpdatedAt: base.updatedAt.toISOString(),
          },
        ),
      ]);

      const successes = [first, second].filter((r) => r.success);
      const failures = [first, second].filter((r) => !r.success);
      expect(successes).toHaveLength(1);
      expect(failures).toHaveLength(1);
      expect(failures[0]).toMatchObject({
        error: "Document changed by another user. Reload before saving.",
      });

      // No duplicate version: the loser's transaction rolled back entirely.
      const versions = await getPostmortemVersions({
        postmortemId,
        workspaceId: context.workspace.id,
      });
      expect(versions).toHaveLength(1);

      // Triple consistency: content, status and latest version agree.
      const winner = successes[0];
      expect(winner.success).toBe(true);
      if (!winner.success) throw new Error("Winner should succeed");
      const finalDoc = await prisma.postmortem.findUnique({
        where: { id: postmortemId },
      });
      expect(finalDoc?.status).toBe(StatusPostmortem.PUBLISHED);
      expect(finalDoc?.content).toEqual(versions[0].content);
    } finally {
      await deleteTestContext(context);
    }
  });

  it("creates no version when persistence fails validation", async () => {
    const { context, incident } = await setupAdminWithIncident();
    try {
      const postmortemId = await createDraft(context, incident.id);

      await expect(
        publishPostmortem(
          { postmortemId, workspaceId: context.workspace.id },
          { content: { version: 1 } as never },
        ),
      ).resolves.toMatchObject({ success: false });

      await expect(
        prisma.postmortemVersion.count({ where: { postmortemId } }),
      ).resolves.toBe(0);
      await expect(
        prisma.postmortem.findUnique({ where: { id: postmortemId } }),
      ).resolves.toMatchObject({ status: StatusPostmortem.DRAFT });
    } finally {
      await deleteTestContext(context);
    }
  });
});
