import { ArrowRightLeftIcon, ArrowUpIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";
import { TimelineType } from "@/generated/prisma/enums";
import { formatEnum } from "@/lib/format-enum";
import type {
  SeverityChangedTimelineItem,
  StatusChangedTimelineItem,
} from "../queries";

type TimelineChangeMarkerProps = {
  item: StatusChangedTimelineItem | SeverityChangedTimelineItem;
};

function getChangeLabel(item: TimelineChangeMarkerProps["item"]) {
  return item.type === TimelineType.STATUS_CHANGED
    ? "Status changed"
    : "Severity changed";
}

function getChangeIcon(item: TimelineChangeMarkerProps["item"]) {
  return item.type === TimelineType.SEVERITY_CHANGED
    ? ArrowUpIcon
    : ArrowRightLeftIcon;
}

export function TimelineChangeMarker({ item }: TimelineChangeMarkerProps) {
  const Icon = getChangeIcon(item);

  return (
    <Marker
      variant="default"
      className="relative min-h-8 gap-3 pl-1 before:absolute before:top-7 before:bottom-[-1.5rem] before:left-4 before:w-px before:bg-border last:before:hidden"
    >
      <MarkerIcon className="relative flex size-7 items-center justify-center rounded-full border bg-card text-muted-foreground ring-4 ring-card">
        <Icon />
      </MarkerIcon>
      <MarkerContent className="flex flex-wrap items-center gap-1.5 leading-6">
        <span>{getChangeLabel(item)}</span>
        <Badge variant="outline">{formatEnum(item.metadata.from)}</Badge>
        <span aria-hidden="true">-&gt;</span>
        <Badge variant="default">{formatEnum(item.metadata.to)}</Badge>
      </MarkerContent>
    </Marker>
  );
}
