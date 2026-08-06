"use server";

import { getSession } from "@/lib/auth";
import { AuthorizationError, requireMembership } from "@/lib/membership";
import prisma from "@/lib/prisma";
import { incidentSchema, IncidentSchema } from "./schema";

type CreateIncidentResult =
  | { success: true; incidentId: string }
  | { success: false; error: string };

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
