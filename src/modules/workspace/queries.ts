import { Role } from "@/generated/prisma/enums";
import prisma from "@/lib/prisma";

export async function getWorkspaceBySlug({
  slug,
}: {
  slug: string;
}): Promise<{ id: string; name: string } | null> {
  const findBySlug = await prisma.workspace.findUnique({
    where: {
      slug,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!findBySlug) return null;

  return { id: findBySlug.id, name: findBySlug.name };
}

type UserWorkspaces = {
  id: string;
  name: string;
  slug: string;
  role: Role;
};

export async function getWorkspacesByUser({
  userId,
}: {
  userId: string;
}): Promise<UserWorkspaces[]> {
  const workspaces = await prisma.membership.findMany({
    where: {
      userId,
    },
    select: {
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      role: true,
    },
  });

  return workspaces.map((item) => ({
    id: item.workspace.id,
    name: item.workspace.name,
    slug: item.workspace.slug,
    role: item.role,
  }));
}
