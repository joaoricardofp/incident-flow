import type { Prisma } from "@/generated/prisma/client";
import {
  type Severity,
  type Status,
  TimelineType,
} from "@/generated/prisma/enums";

type TimelineEntryPayload =
  | {
      type: typeof TimelineType.COMMENT;
      message: string;
    }
  | {
      type: typeof TimelineType.STATUS_CHANGED;
      metadata: { from: Status; to: Status };
    }
  | {
      type: typeof TimelineType.SEVERITY_CHANGED;
      metadata: { from: Severity; to: Severity };
    };

export type CreateTimelineEntryInput = {
  incidentId: string;
  authorId: string;
} & TimelineEntryPayload;

export async function createTimelineEntry(
  tx: Prisma.TransactionClient,
  input: CreateTimelineEntryInput,
) {
  switch (input.type) {
    case TimelineType.COMMENT:
      return tx.timeline.create({
        data: {
          incidentId: input.incidentId,
          authorId: input.authorId,
          type: input.type,
          message: input.message,
        },
      });
    case TimelineType.STATUS_CHANGED:
    case TimelineType.SEVERITY_CHANGED:
      return tx.timeline.create({
        data: {
          incidentId: input.incidentId,
          authorId: input.authorId,
          type: input.type,
          metadata: input.metadata,
        },
      });
    default: {
      const exhaustiveCheck: never = input;
      throw new Error(`Unsupported timeline type: ${exhaustiveCheck}`);
    }
  }
}
