"use server";

import { randomBytes, randomUUID } from "crypto";
import { Prisma } from "@/generated/prisma/client";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

type CreateWorkspaceResult =
  { success: true; slug: string } | { success: false; error: string };

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
