import type { Prisma } from "@/generated/prisma/client";
import type { TimelineType } from "@/generated/prisma/enums";
import prisma from "@/lib/prisma";

export type TimelineItem = {
  id: string;
  type: TimelineType;
  metadata: Prisma.JsonValue | null;
  message: string | null;
  createdAt: Date;
  author: { name: string } | null;
};

export async function getTimelineByIncident({
  incidentId,
  workspaceId,
}: {
  incidentId: string;
  workspaceId: string;
}): Promise<TimelineItem[]> {
  return prisma.timeline.findMany({
    where: {
      incidentId,
      incident: {
        workspaceId,
      },
    },
    select: {
      id: true,
      type: true,
      metadata: true,
      message: true,
      createdAt: true,
      author: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}
