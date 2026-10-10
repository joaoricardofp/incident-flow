"use server";

import { Prisma } from "@/generated/prisma/client";
import { getSession } from "@/lib/auth";
import { AuthorizationError, requireMembership } from "@/lib/membership";
import prisma from "@/lib/prisma";
import {
  type CreatePostmortemSchema,
  createPostmortemSchema,
  emptyTiptapDoc,
  type PublishPostmortemSchema,
  publishPostmortemSchema,
  type SaveDraftSchema,
  saveDraftSchema,
} from "./schema";

type PostmortemResult =
  | { success: true; postmortemId: string; updatedAt?: string }
  | { success: false; error: string };

type PublishResult =
  | {
      success: true;
      postmortemId: string;
      versionId: string;
      updatedAt?: string;
    }
  | { success: false; error: string };

class PostmortemNotFoundError extends Error {
  constructor() {
    super("Postmortem not found");
    this.name = "PostmortemNotFoundError";
  }
}

class ConflictError extends Error {
  constructor() {
    super("Document changed by another user. Reload before saving.");
    this.name = "ConflictError";
  }
}

async function resolveWorkspaceIdForIncident({
  incidentId,
  workspaceId,
}: {
  incidentId: string;
  workspaceId: string;
}) {
  const incident = await prisma.incident.findFirst({
    where: { id: incidentId, workspaceId },
    select: { id: true },
  });
  return incident;
}

export async function createPostmortem(
  { workspaceId }: { workspaceId: string },
  data: CreatePostmortemSchema,
): Promise<PostmortemResult> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    await requireMembership({
      userId: session.user.id,
      workspaceId,
      minRole: "ADMIN",
    });

    const parsed = createPostmortemSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((i) => i.message).join(", "),
      };
    }

    const incident = await resolveWorkspaceIdForIncident({
      incidentId: parsed.data.incidentId,
      workspaceId,
    });
    if (!incident) {
      return { success: false, error: "Incident not found" };
    }

    const postmortem = await prisma.postmortem.create({
      data: {
        incidentId: incident.id,
        createdById: session.user.id,
        content: (parsed.data.content ??
          emptyTiptapDoc()) as Prisma.InputJsonValue,
      },
      select: { id: true },
    });

    return { success: true, postmortemId: postmortem.id };
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { success: false, error: error.message };
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        error: "Postmortem already exists for this incident",
      };
    }
    throw error;
  }
}

export async function savePostmortemDraft(
  {
    postmortemId,
    workspaceId,
  }: {
    postmortemId: string;
    workspaceId: string;
  },
  data: SaveDraftSchema,
): Promise<PostmortemResult> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    await requireMembership({
      userId: session.user.id,
      workspaceId,
      minRole: "ADMIN",
    });

    const parsed = saveDraftSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((i) => i.message).join(", "),
      };
    }

    const existing = await prisma.postmortem.findFirst({
      where: {
        id: postmortemId,
        incident: { workspaceId },
      },
      select: { id: true, status: true, content: true, updatedAt: true },
    });
    if (!existing) {
      return { success: false, error: "Postmortem not found" };
    }

    const base = new Date(parsed.data.baseUpdatedAt);

    const diverges =
      JSON.stringify(existing.content) !== JSON.stringify(parsed.data.content);
    const nextStatus =
      existing.status === "PUBLISHED" && diverges ? "DRAFT" : existing.status;

    const updated = await prisma.postmortem.updateMany({
      where: { id: postmortemId, updatedAt: base },
      data: {
        content: parsed.data.content as Prisma.InputJsonValue,
        status: nextStatus,
      },
    });

    if (updated.count === 0) {
      throw new ConflictError();
    }

    const fresh = await prisma.postmortem.findUnique({
      where: { id: postmortemId },
      select: { updatedAt: true },
    });

    return {
      success: true,
      postmortemId,
      updatedAt: fresh?.updatedAt.toISOString(),
    };
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof ConflictError) {
      return { success: false, error: error.message };
    }
    throw error;
  }
}

export async function publishPostmortem(
  {
    postmortemId,
    workspaceId,
  }: {
    postmortemId: string;
    workspaceId: string;
  },
  data: PublishPostmortemSchema,
): Promise<PublishResult> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    await requireMembership({
      userId: session.user.id,
      workspaceId,
      minRole: "ADMIN",
    });

    const parsed = publishPostmortemSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((i) => i.message).join(", "),
      };
    }

    return await prisma.$transaction(async (tx) => {
      const existing = await tx.postmortem.findFirst({
        where: {
          id: postmortemId,
          incident: { workspaceId },
        },
        select: { id: true, updatedAt: true },
      });
      if (!existing) {
        throw new PostmortemNotFoundError();
      }

      const base = parsed.data.baseUpdatedAt
        ? new Date(parsed.data.baseUpdatedAt)
        : null;
      if (base && existing.updatedAt.getTime() !== base.getTime()) {
        throw new ConflictError();
      }

      const version = await tx.postmortemVersion.create({
        data: {
          postmortemId,
          editedById: session.user.id,
          content: parsed.data.content as Prisma.InputJsonValue,
        },
        select: { id: true },
      });

      let updatedAt: Date;
      if (base) {
        const updated = await tx.postmortem.updateMany({
          where: { id: postmortemId, updatedAt: base },
          data: {
            content: parsed.data.content as Prisma.InputJsonValue,
            status: "PUBLISHED",
          },
        });
        if (updated.count === 0) {
          throw new ConflictError();
        }
        updatedAt = (
          await tx.postmortem.findUniqueOrThrow({
            where: { id: postmortemId },
            select: { updatedAt: true },
          })
        ).updatedAt;
      } else {
        updatedAt = (
          await tx.postmortem.update({
            where: { id: postmortemId },
            data: {
              content: parsed.data.content as Prisma.InputJsonValue,
              status: "PUBLISHED",
            },
            select: { updatedAt: true },
          })
        ).updatedAt;
      }

      return {
        success: true as const,
        postmortemId,
        versionId: version.id,
        updatedAt: updatedAt.toISOString(),
      };
    });
  } catch (error) {
    if (
      error instanceof AuthorizationError ||
      error instanceof PostmortemNotFoundError ||
      error instanceof ConflictError
    ) {
      return { success: false, error: error.message };
    }
    throw error;
  }
}
