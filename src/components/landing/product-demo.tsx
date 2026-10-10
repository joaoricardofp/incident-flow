"use client";

import { useId, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatEnum } from "@/lib/format-enum";
import { cn } from "@/lib/utils";
import { DEMO_INCIDENTS, DEMO_WORKSPACE, type DemoIncident } from "./demo-data";

function severityClass(severity: DemoIncident["severity"]) {
  switch (severity) {
    case "CRITICAL":
    case "HIGH":
      return "border-[color-mix(in_oklch,var(--destructive)_45%,var(--border))] text-destructive";
    case "MEDIUM":
      return "border-[color-mix(in_oklch,var(--landing-signal)_50%,var(--border))] text-[var(--landing-signal)]";
    default:
      return "";
  }
}

export function ProductDemo() {
  const listLabelId = useId();
  const [selectedId, setSelectedId] = useState(DEMO_INCIDENTS[0].id);
  const selected =
    DEMO_INCIDENTS.find((incident) => incident.id === selectedId) ??
    DEMO_INCIDENTS[0];

  return (
    <div className="overflow-hidden border border-border bg-background shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-2 sm:px-4">
        <div className="flex min-w-0 items-center gap-2 font-mono text-[11px] text-muted-foreground">
          <span className="size-2 rounded-full bg-[var(--landing-ok)]" />
          <span className="truncate">
            {DEMO_WORKSPACE.name} · role {formatEnum(DEMO_WORKSPACE.role)}
          </span>
        </div>
        <p className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
          Illustrative preview
        </p>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
        <div className="border-b border-border lg:border-r lg:border-b-0">
          <div className="border-b border-border px-3 py-2.5 sm:px-4">
            <p
              id={listLabelId}
              className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase"
            >
              Incidents
            </p>
          </div>
          <ul aria-labelledby={listLabelId} className="divide-y divide-border">
            {DEMO_INCIDENTS.map((incident) => {
              const isSelected = incident.id === selected.id;
              return (
                <li key={incident.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(incident.id)}
                    aria-pressed={isSelected}
                    className={cn(
                      "landing-demo-panel flex w-full flex-col gap-2 px-3 py-3.5 text-left transition-colors sm:px-4",
                      "hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                      isSelected && "bg-muted/70",
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className={severityClass(incident.severity)}
                      >
                        {formatEnum(incident.severity)}
                      </Badge>
                      <Badge
                        variant={
                          incident.status === "RESOLVED"
                            ? "secondary"
                            : "default"
                        }
                      >
                        {formatEnum(incident.status)}
                      </Badge>
                    </div>
                    <span className="text-sm font-medium leading-snug">
                      {incident.title}
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {incident.createdBy} · {incident.createdAt}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="min-w-0 p-3 sm:p-4 lg:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold tracking-tight sm:text-xl">
                {selected.title}
              </h3>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                {selected.description}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge
                variant="outline"
                className={severityClass(selected.severity)}
              >
                {formatEnum(selected.severity)}
              </Badge>
              <Badge>{formatEnum(selected.status)}</Badge>
            </div>
          </div>

          <Tabs defaultValue="timeline" className="mt-5">
            <TabsList aria-label="Incident views">
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="postmortem">Postmortem</TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="mt-4">
              <ul className="space-y-3">
                {selected.timeline.map((entry) => (
                  <li
                    key={entry.id}
                    className="landing-demo-panel border border-border bg-muted/20 px-3 py-3"
                  >
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {entry.at} · {entry.author}
                    </p>
                    {entry.type === "COMMENT" ? (
                      <p className="mt-1.5 text-sm leading-6">{entry.body}</p>
                    ) : entry.type === "STATUS_CHANGED" ? (
                      <p className="mt-1.5 text-sm">
                        Status: {formatEnum(entry.from)} →{" "}
                        {formatEnum(entry.to)}
                      </p>
                    ) : (
                      <p className="mt-1.5 text-sm">
                        Severity: {formatEnum(entry.from)} →{" "}
                        {formatEnum(entry.to)}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </TabsContent>

            <TabsContent value="postmortem" className="mt-4">
              {selected.postmortem ? (
                <div className="landing-demo-panel space-y-4 border border-border bg-muted/20 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge
                      variant={
                        selected.postmortem.status === "PUBLISHED"
                          ? "default"
                          : "outline"
                      }
                    >
                      {formatEnum(selected.postmortem.status)}
                    </Badge>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {selected.postmortem.versionCount > 0
                        ? `${selected.postmortem.versionCount} published version${selected.postmortem.versionCount === 1 ? "" : "s"}`
                        : "No published versions yet"}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
                      Summary
                    </p>
                    <p className="mt-1 text-sm leading-6">
                      {selected.postmortem.summary}
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
                        Impact
                      </p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {selected.postmortem.impact}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
                        Root cause
                      </p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {selected.postmortem.rootCause}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
                      Follow-ups
                    </p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-muted-foreground">
                      {selected.postmortem.actions.map((action) => (
                        <li key={action}>{action}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-border px-4 py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    There is no postmortem for this incident yet. In the app, an
                    admin can create a draft from the incident page.
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
