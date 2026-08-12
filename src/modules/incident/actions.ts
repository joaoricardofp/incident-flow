"use server";

import { z } from "zod";
import { Status, TimelineType } from "@/generated/prisma/enums";
import { getSession } from "@/lib/auth";
import { AuthorizationError, requireMembership } from "@/lib/membership";
import prisma from "@/lib/prisma";
import { createTimelineEntry } from "@/modules/timeline/service";
import { type IncidentSchema, incidentSchema } from "./schema";

type CreateIncidentResult =
  { success: true; incidentId: string } | { success: false; error: string };

const updateStatusSchema = z.object({
  status: z.enum(Status),
});

export type UpdateStatusSchema = z.infer<typeof updateStatusSchema>;

type UpdateIncidentStatusResult =
  { success: true; noop?: true } | { success: false; error: string };

class IncidentNotFoundError extends Error {
  constructor() {
    super("Incident not found");
    this.name = "IncidentNotFoundError";
  }
}

export async function createIncident(
  { workspaceId }: { workspaceId: string },
  data: IncidentSchema,
): Promise<CreateIncidentResult> {
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

    const parsedData = incidentSchema.safeParse(data);

    if (!parsedData.success) {
      return {
        success: false,
        error: parsedData.error.issues.map((issue) => issue.message).join(", "),
      };
    }

    const incident = await prisma.incident.create({
      data: {
        workspaceId,
        title: parsedData.data.title,
        description: parsedData.data.description,
        severity: parsedData.data.severity,
        createdById: session.user.id,
      },
      select: {
        id: true,
      },
    });

    return { success: true, incidentId: incident.id };
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { success: false, error: error.message };
    }

    throw error;
  }
}

export async function updateIncidentStatus(
  {
    incidentId,
    workspaceId,
  }: {
    incidentId: string;
    workspaceId: string;
  },
  data: UpdateStatusSchema,
): Promise<UpdateIncidentStatusResult> {
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

    const parsedData = updateStatusSchema.safeParse(data);

    if (!parsedData.success) {
      return {
        success: false,
        error: parsedData.error.issues.map((issue) => issue.message).join(", "),
      };
    }

    return await prisma.$transaction(async (tx) => {
      const incident = await tx.incident.findFirst({
        where: {
          id: incidentId,
          workspaceId,
        },
        select: {
          status: true,
        },
      });

      if (!incident) {
        throw new IncidentNotFoundError();
      }

      const from = incident.status;
      const to = parsedData.data.status;

      if (from === to) {
        return { success: true, noop: true };
      }

      await tx.incident.update({
        where: {
          id: incidentId,
        },
        data: {
          status: to,
          resolvedAt: to === Status.RESOLVED ? new Date() : null,
        },
      });

      await createTimelineEntry(tx, {
        incidentId,
        authorId: session.user.id,
        type: TimelineType.STATUS_CHANGED,
        metadata: {
          from,
          to,
        },
      });

      return { success: true };
    });
  } catch (error) {
    if (
      error instanceof AuthorizationError ||
      error instanceof IncidentNotFoundError
    ) {
      return { success: false, error: error.message };
    }

    throw error;
  }
}
