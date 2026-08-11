"use server";

import { TimelineType } from "@/generated/prisma/enums";
import { getSession } from "@/lib/auth";
import { AuthorizationError, requireMembership } from "@/lib/membership";
import prisma from "@/lib/prisma";
import { getIncidentById } from "@/modules/incident/queries";
import { type TimelineCommentSchema, timelineCommentSchema } from "./schema";
import { createTimelineEntry } from "./service";

type CreateTimelineCommentResult =
  | { success: true }
  | { success: false; error: string };

export async function createTimelineComment(
  {
    incidentId,
    workspaceId,
  }: {
    incidentId: string;
    workspaceId: string;
  },
  data: TimelineCommentSchema,
): Promise<CreateTimelineCommentResult> {
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

    const incident = await getIncidentById({ incidentId, workspaceId });

    if (!incident) {
      return { success: false, error: "Incident not found" };
    }

    const parsedData = timelineCommentSchema.safeParse(data);

    if (!parsedData.success) {
      return {
        success: false,
        error: parsedData.error.issues.map((issue) => issue.message).join(", "),
      };
    }

    await createTimelineEntry(prisma, {
      incidentId,
      authorId: session.user.id,
      type: TimelineType.COMMENT,
      message: parsedData.data.message,
    });

    return { success: true };
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { success: false, error: error.message };
    }

    throw error;
  }
}
