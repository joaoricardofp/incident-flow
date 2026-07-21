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
