import type { Severity, Status } from "@/generated/prisma/enums";
import prisma from "@/lib/prisma";

export type IncidentSummary = {
  id: string;
  title: string;
  status: Status;
  severity: Severity;
  createdAt: Date;
  createdBy: { name: string } | null;
};

export async function getIncidentsByWorkspace({
  workspaceId,
}: {
  workspaceId: string;
}): Promise<IncidentSummary[]> {
  return prisma.incident.findMany({
    where: {
      workspaceId,
    },
    select: {
      id: true,
      title: true,
      status: true,
      severity: true,
      createdAt: true,
      createdBy: {
        select: {
          name: true,
        },
      },
    },
  });
}
