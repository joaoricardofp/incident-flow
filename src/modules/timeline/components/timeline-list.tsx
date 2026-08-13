import type { TimelineItem } from "../queries";
import { TimelineChangeMarker } from "./timeline-change-marker";
import { TimelineComment } from "./timeline-comment";
import { TimelineMalformedItem } from "./timeline-malformed-item";

type TimelineListProps = {
  items: TimelineItem[];
};

export function TimelineList({ items }: TimelineListProps) {
  return items.map((item) => {
    switch (item.type) {
      case "COMMENT":
        return <TimelineComment item={item} key={item.id} />;

      case "STATUS_CHANGED":
      case "SEVERITY_CHANGED":
        return <TimelineChangeMarker item={item} key={item.id} />;

      case "MALFORMED":
        return <TimelineMalformedItem item={item} key={item.id} />;

      default: {
        const exhaustiveCheck: never = item;
        return exhaustiveCheck;
      }
    }
  });
}
