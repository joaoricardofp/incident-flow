"use client";

import { useEffect, useState } from "react";

type IncidentDurationProps = {
  openedAt: Date;
  resolvedAt: Date | null;
};

function formatDuration(start: Date, end: Date) {
  const totalMinutes = Math.max(
    0,
    Math.floor((end.getTime() - start.getTime()) / 60_000),
  );
  const days = Math.floor(totalMinutes / 1_440);
  const hours = Math.floor((totalMinutes % 1_440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d${hours > 0 ? ` ${hours}h` : ""}`;
  }

  if (hours > 0) {
    return `${hours}h${minutes > 0 ? ` ${minutes}m` : ""}`;
  }

  return `${minutes}m`;
}

export function IncidentDuration({
  openedAt,
  resolvedAt,
}: IncidentDurationProps) {
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    if (resolvedAt) {
      return;
    }

    const interval = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 60_000);

    return () => window.clearInterval(interval);
  }, [resolvedAt]);

  return <>{formatDuration(openedAt, resolvedAt ?? currentTime)}</>;
}
