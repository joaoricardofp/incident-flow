"use server";

import { randomBytes, randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import type { Role } from "@/generated/prisma/enums";
import { getSession } from "@/lib/auth";
import {
  AuthorizationError,
  hasMinimumRole,
  requireMembership,
} from "@/lib/membership";
import prisma from "@/lib/prisma";
import { renameWorkspaceSchema } from "./schema";

type CreateWorkspaceResult =
  | { success: true; slug: string }
  | { success: false; error: string };

export async function createWorkspace(): Promise<CreateWorkspaceResult> {
  const session = await getSession();

  if (!session) {
    return { success: false, error: "Unauthorized" };
  }

  const name = "Untitled Workspace";
  const maxAttempts = 3;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const slug =
      name.replace(/ /g, "-").toLowerCase() + "-" + randomUUID().slice(0, 8);
    const inviteToken = randomBytes(32).toString("hex");

    try {
      const workspace = await prisma.$transaction(async (tx) => {
        const workspace = await tx.workspace.create({
          data: {
            name,
            slug,
            inviteToken,
          },
          select: {
            id: true,
            slug: true,
          },
        });

        await tx.membership.create({
          data: {
            userId: session.user.id,
            workspaceId: workspace.id,
            role: "ADMIN",
          },
        });

        return workspace;
      });

      return { success: true, slug: workspace.slug };
    } catch (error) {
      const isSlugCollision =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        (error.meta?.target === "slug" ||
          (Array.isArray(error.meta?.target) &&
            error.meta.target.includes("slug")));

      const isInviteTokenCollision =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        (error.meta?.target === "inviteToken" ||
          (Array.isArray(error.meta?.target) &&
            error.meta.target.includes("inviteToken")));

      if (!isSlugCollision && !isInviteTokenCollision) {
        throw error;
      }
    }
  }

  return {
    success: false,
    error: "Unable to create workspace after multiple slug collisions",
  };
}

type JoinWorkspaceResult =
  | { success: true; slug: string }
  | { success: false; error: string; code: "USER_NOT_FOUND" }
  | { success: false; error: string; code: "TOKEN_REQUIRED" }
  | { success: false; error: string; code: "INVALID_TOKEN" }
  | { success: false; error: string; code: "ALREADY_MEMBER"; slug: string };

export async function joinWorkspace({
  token,
}: {
  token: string;
}): Promise<JoinWorkspaceResult> {
  const session = await getSession();

  if (!session) {
    return { success: false, error: "Unauthorized", code: "USER_NOT_FOUND" };
  }

  if (!token) {
    return {
      success: false,
      error: "Token is required",
      code: "TOKEN_REQUIRED",
    };
  }

  const workspace = await prisma.workspace.findUnique({
    where: { inviteToken: token },
    select: {
      id: true,
      slug: true,
      memberships: { where: { userId: session.user.id }, select: { id: true } },
    },
  });

  if (!workspace) {
    return { success: false, error: "Invalid token", code: "INVALID_TOKEN" };
  }

  if (workspace.memberships.length > 0) {
    return {
      success: false,
      error: "Already a member",
      code: "ALREADY_MEMBER",
      slug: workspace.slug,
    };
  }

  await prisma.membership.create({
    data: {
      userId: session.user.id,
      workspaceId: workspace.id,
      role: "VIEWER",
    },
  });

  return { success: true, slug: workspace.slug };
}

// --- Workspace member management -------------------------------------------
// Tables (Prisma @@map): "workspace"("id"), "membership"("id","userId",
// "workspaceId","role"). The raw SELECT below locks the workspace row with
// FOR UPDATE so concurrent demotions/removals of ADMINs serialize per
// workspace: the second transaction only counts ADMINs after the first one
// commits or rolls back.

type MemberActionResult = { success: true } | { success: false; error: string };

async function lockWorkspaceRow(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  workspaceId: string,
) {
  await tx.$executeRaw`SELECT "id" FROM "workspace" WHERE "id" = ${workspaceId} FOR UPDATE`;
}

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Outside the Next.js runtime (e.g. Vitest) there is no static-generation
    // store; revalidation is a no-op there.
  }
}

async function revalidateWorkspace(workspaceId: string) {
  safeRevalidate("/dashboard");
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { slug: true },
  });
  if (workspace) safeRevalidate(`/${workspace.slug}`);
}

export async function updateMemberRole({
  workspaceId,
  membershipId,
  role,
}: {
  workspaceId: string;
  membershipId: string;
  role: Role;
}): Promise<MemberActionResult> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "Unauthorized" };

    if (!workspaceId || !membershipId)
      return { success: false, error: "Membership not found" };
    if (role !== "ADMIN" && role !== "VIEWER")
      return { success: false, error: "Invalid role" };

    const outcome = await prisma.$transaction(async (tx) => {
      await lockWorkspaceRow(tx, workspaceId);

      const actor = await tx.membership.findUnique({
        where: {
          userId_workspaceId: {
            userId: session.user.id,
            workspaceId,
          },
        },
        select: { id: true, role: true },
      });
      if (!actor || !hasMinimumRole({ role: actor.role, minRole: "ADMIN" }))
        throw new AuthorizationError("User does not have the required role");

      const target = await tx.membership.findUnique({
        where: { id: membershipId },
        select: { id: true, userId: true, workspaceId: true, role: true },
      });
      if (!target || target.workspaceId !== workspaceId)
        return { ok: false as const, error: "Membership not found" };
      if (target.role === role) return { ok: true as const };

      if (target.role === "ADMIN" && role !== "ADMIN") {
        const adminCount = await tx.membership.count({
          where: { workspaceId, role: "ADMIN" },
        });
        if (adminCount <= 1)
          return {
            ok: false as const,
            error:
              "Cannot demote the last admin. Promote another member to admin first.",
          };
      }

      await tx.membership.update({
        where: { id: target.id },
        data: { role },
      });
      return { ok: true as const };
    });

    if (!outcome.ok) return { success: false, error: outcome.error };
    await revalidateWorkspace(workspaceId);
    return { success: true };
  } catch (error) {
    if (error instanceof AuthorizationError)
      return { success: false, error: error.message };
    throw error;
  }
}

export async function removeMember({
  workspaceId,
  membershipId,
}: {
  workspaceId: string;
  membershipId: string;
}): Promise<MemberActionResult> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "Unauthorized" };

    if (!workspaceId || !membershipId)
      return { success: false, error: "Membership not found" };

    const outcome = await prisma.$transaction(async (tx) => {
      await lockWorkspaceRow(tx, workspaceId);

      const actor = await tx.membership.findUnique({
        where: {
          userId_workspaceId: {
            userId: session.user.id,
            workspaceId,
          },
        },
        select: { id: true, role: true },
      });
      if (!actor || !hasMinimumRole({ role: actor.role, minRole: "ADMIN" }))
        throw new AuthorizationError("User does not have the required role");

      const target = await tx.membership.findUnique({
        where: { id: membershipId },
        select: { id: true, userId: true, workspaceId: true, role: true },
      });
      if (!target || target.workspaceId !== workspaceId)
        return { ok: false as const, error: "Membership not found" };
      if (target.userId === session.user.id)
        return {
          ok: false as const,
          error: "You cannot remove yourself. Use leave workspace instead.",
        };

      if (target.role === "ADMIN") {
        const adminCount = await tx.membership.count({
          where: { workspaceId, role: "ADMIN" },
        });
        if (adminCount <= 1)
          return {
            ok: false as const,
            error:
              "Cannot remove the last admin. Promote another member to admin first.",
          };
      }

      await tx.membership.delete({ where: { id: target.id } });
      return { ok: true as const };
    });

    if (!outcome.ok) return { success: false, error: outcome.error };
    await revalidateWorkspace(workspaceId);
    return { success: true };
  } catch (error) {
    if (error instanceof AuthorizationError)
      return { success: false, error: error.message };
    throw error;
  }
}

export async function leaveWorkspace({
  workspaceId,
}: {
  workspaceId: string;
}): Promise<MemberActionResult> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "Unauthorized" };

    if (!workspaceId)
      return {
        success: false,
        error: "User is not a member of this workspace",
      };

    const outcome = await prisma.$transaction(async (tx) => {
      await lockWorkspaceRow(tx, workspaceId);

      const actor = await tx.membership.findUnique({
        where: {
          userId_workspaceId: {
            userId: session.user.id,
            workspaceId,
          },
        },
        select: { id: true, role: true },
      });
      if (!actor)
        throw new AuthorizationError("User is not a member of this workspace");

      if (actor.role === "ADMIN") {
        const [adminCount, memberCount] = await Promise.all([
          tx.membership.count({ where: { workspaceId, role: "ADMIN" } }),
          tx.membership.count({ where: { workspaceId } }),
        ]);
        // Sole member may leave freely. With other members present, the last
        // admin must promote someone else first. Both counts are read after
        // the workspace lock, inside the same transaction as the delete.
        if (adminCount <= 1 && memberCount > 1)
          return {
            ok: false as const,
            error:
              "You are the only admin of this workspace. Promote another member to admin before leaving.",
          };
      }

      await tx.membership.delete({ where: { id: actor.id } });
      return { ok: true as const };
    });

    if (!outcome.ok) return { success: false, error: outcome.error };
    await revalidateWorkspace(workspaceId);
    return { success: true };
  } catch (error) {
    if (error instanceof AuthorizationError)
      return { success: false, error: error.message };
    throw error;
  }
}

type RotateInviteTokenResult =
  | { success: true; inviteToken: string }
  | { success: false; error: string };

export async function rotateInviteToken({
  workspaceId,
}: {
  workspaceId: string;
}): Promise<RotateInviteTokenResult> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "Unauthorized" };
    if (!workspaceId)
      return {
        success: false,
        error: "User is not a member of this workspace",
      };

    const maxAttempts = 3;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const inviteToken = randomBytes(32).toString("hex");

      try {
        await prisma.$transaction(async (tx) => {
          await lockWorkspaceRow(tx, workspaceId);

          const actor = await tx.membership.findUnique({
            where: {
              userId_workspaceId: {
                userId: session.user.id,
                workspaceId,
              },
            },
            select: { role: true },
          });
          if (!actor || !hasMinimumRole({ role: actor.role, minRole: "ADMIN" }))
            throw new AuthorizationError(
              "User does not have the required role",
            );

          await tx.workspace.update({
            where: { id: workspaceId },
            data: { inviteToken },
          });
        });

        await revalidateWorkspace(workspaceId);
        return { success: true, inviteToken };
      } catch (error) {
        const isTokenCollision =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002" &&
          (error.meta?.target === "inviteToken" ||
            (Array.isArray(error.meta?.target) &&
              error.meta.target.includes("inviteToken")));
        if (isTokenCollision) continue;
        throw error;
      }
    }

    return { success: false, error: "Unable to rotate the invite link" };
  } catch (error) {
    if (error instanceof AuthorizationError)
      return { success: false, error: error.message };
    throw error;
  }
}

type RenameWorkspaceResult =
  | { success: true; name: string; slug: string }
  | { success: false; error: string };

function slugifyWorkspaceName(name: string): string {
  const base =
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "workspace";
  return `${base}-${randomUUID().slice(0, 8)}`;
}

function isUniqueViolation(error: unknown, target: string): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    (error.meta?.target === target ||
      (Array.isArray(error.meta?.target) && error.meta.target.includes(target)))
  );
}

export async function renameWorkspace({
  workspaceId,
  name,
}: {
  workspaceId: string;
  name: string;
}): Promise<RenameWorkspaceResult> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "Unauthorized" };

    await requireMembership({
      userId: session.user.id,
      workspaceId,
      minRole: "ADMIN",
    });

    const parsed = renameWorkspaceSchema.safeParse({ name });
    if (!parsed.success) {
      return { success: false, error: "Workspace name is invalid" };
    }

    const current = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { slug: true },
    });
    if (!current) return { success: false, error: "Workspace not found" };

    const maxAttempts = 3;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const slug = slugifyWorkspaceName(parsed.data.name);
      if (slug === current.slug) {
        const renamed = await prisma.workspace.update({
          where: { id: workspaceId },
          data: { name: parsed.data.name },
          select: { name: true, slug: true },
        });
        await revalidateWorkspace(workspaceId);
        return { success: true, name: renamed.name, slug: renamed.slug };
      }

      try {
        const renamed = await prisma.workspace.update({
          where: { id: workspaceId },
          data: { name: parsed.data.name, slug },
          select: { name: true, slug: true },
        });

        safeRevalidate("/dashboard");
        safeRevalidate(`/${current.slug}`);
        safeRevalidate(`/${renamed.slug}`);
        return { success: true, name: renamed.name, slug: renamed.slug };
      } catch (error) {
        if (isUniqueViolation(error, "slug")) continue;
        throw error;
      }
    }

    return {
      success: false,
      error: "Unable to rename workspace after multiple slug collisions",
    };
  } catch (error) {
    if (error instanceof AuthorizationError)
      return { success: false, error: error.message };
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    )
      return { success: false, error: "Workspace not found" };
    throw error;
  }
}
