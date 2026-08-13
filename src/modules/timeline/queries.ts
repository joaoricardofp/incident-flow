import { TimelineType } from "@/generated/prisma/enums";
import prisma from "@/lib/prisma";
import {
  type SeverityChangeMetadata,
  type StatusChangeMetadata,
  severityChangeMetadataSchema,
  statusChangeMetadataSchema,
  type TimelineCommentSchema,
  timelineCommentSchema,
} from "./schema";

type TimelineItemBase = {
  id: string;
  createdAt: Date;
  author: { name: string } | null;
};

export type CommentTimelineItem = TimelineItemBase & {
  type: typeof TimelineType.COMMENT;
  message: string;
  metadata: TimelineCommentSchema;
};

export type StatusChangedTimelineItem = TimelineItemBase & {
  type: typeof TimelineType.STATUS_CHANGED;
  message: null;
  metadata: StatusChangeMetadata;
};

export type SeverityChangedTimelineItem = TimelineItemBase & {
  type: typeof TimelineType.SEVERITY_CHANGED;
  message: null;
  metadata: SeverityChangeMetadata;
};

export type FallbackTimelineItem = TimelineItemBase & {
  type: "MALFORMED";
  originalType: TimelineType;
  message: string | null;
  metadata: null;
};

export type TimelineItem =
  | CommentTimelineItem
  | StatusChangedTimelineItem
  | SeverityChangedTimelineItem
  | FallbackTimelineItem;

export async function getTimelineByIncident({
  incidentId,
  workspaceId,
}: {
  incidentId: string;
  workspaceId: string;
}): Promise<TimelineItem[]> {
  const timeline = await prisma.timeline.findMany({
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

  return timeline.map((entry): TimelineItem => {
    switch (entry.type) {
      case TimelineType.COMMENT: {
        const parsedMetadata = timelineCommentSchema.safeParse({
          message: entry.message,
        });

        if (!parsedMetadata.success) {
          return {
            id: entry.id,
            type: "MALFORMED",
            originalType: entry.type,
            message: entry.message,
            metadata: null,
            createdAt: entry.createdAt,
            author: entry.author,
          };
        }

        return {
          id: entry.id,
          type: entry.type,
          message: parsedMetadata.data.message,
          metadata: parsedMetadata.data,
          createdAt: entry.createdAt,
          author: entry.author,
        };
      }
      case TimelineType.STATUS_CHANGED: {
        const parsedMetadata = statusChangeMetadataSchema.safeParse(
          entry.metadata,
        );

        if (!parsedMetadata.success) {
          return {
            id: entry.id,
            type: "MALFORMED",
            originalType: entry.type,
            message: entry.message,
            metadata: null,
            createdAt: entry.createdAt,
            author: entry.author,
          };
        }

        return {
          id: entry.id,
          type: entry.type,
          message: null,
          metadata: parsedMetadata.data,
          createdAt: entry.createdAt,
          author: entry.author,
        };
      }
      case TimelineType.SEVERITY_CHANGED: {
        const parsedMetadata = severityChangeMetadataSchema.safeParse(
          entry.metadata,
        );

        if (!parsedMetadata.success) {
          return {
            id: entry.id,
            type: "MALFORMED",
            originalType: entry.type,
            message: entry.message,
            metadata: null,
            createdAt: entry.createdAt,
            author: entry.author,
          };
        }

        return {
          id: entry.id,
          type: entry.type,
          message: null,
          metadata: parsedMetadata.data,
          createdAt: entry.createdAt,
          author: entry.author,
        };
      }
      default: {
        const exhaustiveCheck: never = entry.type;
        return exhaustiveCheck;
      }
    }
  });
}
