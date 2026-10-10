import { cache } from "react";
import prisma from "@/lib/prisma";

export type PostmortemSummary = {
  id: string;
  incidentId: string;
  status: "DRAFT" | "PUBLISHED";
  content: unknown;
  createdAt: Date;
  updatedAt: Date;
  createdBy: { name: string } | null;
  versionCount: number;
};

export type PostmortemVersionItem = {
  id: string;
  content: unknown;
  createdAt: Date;
  editedBy: { name: string } | null;
};

export const getPostmortemByIncident = cache(
  async ({
    incidentId,
    workspaceId,
  }: {
    incidentId: string;
    workspaceId: string;
  }): Promise<PostmortemSummary | null> => {
    const postmortem = await prisma.postmortem.findFirst({
      where: {
        incidentId,
        incident: {
          workspaceId,
        },
      },
      select: {
        id: true,
        incidentId: true,
        status: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        createdBy: {
          select: {
            name: true,
          },
        },
        _count: {
          select: { postmortemVersions: true },
        },
      },
    });

    if (!postmortem) return null;

    return {
      id: postmortem.id,
      incidentId: postmortem.incidentId,
      status: postmortem.status,
      content: postmortem.content,
      createdAt: postmortem.createdAt,
      updatedAt: postmortem.updatedAt,
      createdBy: postmortem.createdBy,
      versionCount: postmortem._count.postmortemVersions,
    };
  },
);

export async function getPostmortemVersions({
  postmortemId,
  workspaceId,
}: {
  postmortemId: string;
  workspaceId: string;
}): Promise<PostmortemVersionItem[]> {
  const versions = await prisma.postmortemVersion.findMany({
    where: {
      postmortemId,
      postmortem: {
        incident: {
          workspaceId,
        },
      },
    },
    select: {
      id: true,
      content: true,
      createdAt: true,
      editedBy: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return versions;
}
