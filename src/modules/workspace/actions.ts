"use server";

import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { randomUUID } from "crypto";

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

    try {
      const workspace = await prisma.$transaction(async (tx) => {
        const workspace = await tx.workspace.create({
          data: {
            name,
            slug,
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

      if (!isSlugCollision) {
        throw error;
      }
    }
  }

  return {
    success: false,
    error: "Unable to create workspace after multiple slug collisions",
  };
}
