import { CircleAlertIcon } from "lucide-react";
import { formatEnum } from "@/lib/format-enum";
import type { FallbackTimelineItem } from "../queries";

type TimelineMalformedItemProps = {
  item: FallbackTimelineItem;
};

export function TimelineMalformedItem({ item }: TimelineMalformedItemProps) {
  return (
    <article className="flex gap-2 text-sm text-muted-foreground">
      <CircleAlertIcon aria-hidden="true" className="size-4 shrink-0" />
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span>Unable to display the details of this event.</span>
        <span className="text-xs">
          Originally: {formatEnum(item.originalType)}
        </span>
        <time
          className="text-xs text-muted-foreground"
          dateTime={item.createdAt.toISOString()}
        >
          {item.createdAt.toLocaleDateString()}
        </time>
      </div>
    </article>
  );
}
