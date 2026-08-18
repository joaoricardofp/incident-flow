import { RefreshCwIcon } from "lucide-react";
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";
import { TimelineType } from "@/generated/prisma/enums";
import { formatEnum } from "@/lib/format-enum";
import type {
  SeverityChangedTimelineItem,
  StatusChangedTimelineItem,
} from "../queries";
import { Badge } from "@/components/ui/badge";

type TimelineChangeMarkerProps = {
  item: StatusChangedTimelineItem | SeverityChangedTimelineItem;
};

function getChangeLabel(item: TimelineChangeMarkerProps["item"]) {
  switch (item.type) {
    case TimelineType.STATUS_CHANGED:
      return "Status changed";
    case TimelineType.SEVERITY_CHANGED:
      return "Severity changed";
    default: {
      const exhaustiveCheck: never = item;
      return exhaustiveCheck;
    }
  }
}

export function TimelineChangeMarker({ item }: TimelineChangeMarkerProps) {
  return (
    <Marker variant="default">
      <MarkerIcon>
        <RefreshCwIcon />
      </MarkerIcon>
      <MarkerContent>
        {getChangeLabel(item)} ·{" "}
        <Badge variant="outline">{formatEnum(item.metadata.from)}</Badge>{" "}
        to{" "}
        <Badge variant="default">{formatEnum(item.metadata.to)}</Badge>
      </MarkerContent>
    </Marker>
  );
}
