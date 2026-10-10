import { Badge } from "@/components/ui/badge";

const STEPS = [
  { label: "Open", detail: "14:12", tone: "muted" as const },
  { label: "Investigating", detail: "14:18", tone: "signal" as const },
  { label: "Resolved", detail: "15:05", tone: "ok" as const },
  { label: "Postmortem", detail: "Draft", tone: "muted" as const },
];

export function HeroVisual() {
  return (
    <div
      className="landing-reveal landing-reveal-delay-2 relative isolate overflow-hidden border border-border bg-[var(--landing-panel)]"
      aria-hidden="true"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-foreground/15" />
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5 font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
        <span>flow · incident</span>
        <span>ops-platform</span>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">High</Badge>
            <Badge>Investigating</Badge>
          </div>
          <div>
            <p className="font-mono text-xs text-muted-foreground">INC-1842</p>
            <p className="mt-1 text-lg font-semibold tracking-tight sm:text-xl">
              Elevated latency on the checkout API
            </p>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Status, timeline, and documentation in one place — so the team can
              keep the thread while resolving.
            </p>
          </div>

          <ol className="relative space-y-0">
            {STEPS.map((step, index) => (
              <li
                key={step.label}
                className="relative flex gap-3 pb-5 last:pb-0"
              >
                {index < STEPS.length - 1 ? (
                  <span
                    className="absolute top-3 left-[7px] h-[calc(100%-0.25rem)] w-px bg-border"
                    aria-hidden="true"
                  />
                ) : null}
                <span
                  className={
                    step.tone === "signal"
                      ? "mt-1 size-3.5 shrink-0 rounded-full bg-[var(--landing-signal)] ring-4 ring-[color-mix(in_oklch,var(--landing-signal)_20%,transparent)]"
                      : step.tone === "ok"
                        ? "mt-1 size-3.5 shrink-0 rounded-full bg-[var(--landing-ok)]"
                        : "mt-1 size-3.5 shrink-0 rounded-full border-2 border-foreground/40 bg-background"
                  }
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{step.label}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {step.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="border-t border-border bg-background/60 p-5 sm:p-6 lg:border-t-0 lg:border-l">
          <p className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
            Timeline
          </p>
          <ul className="mt-4 space-y-4">
            <li className="border-l-2 border-foreground/20 pl-3">
              <p className="font-mono text-[11px] text-muted-foreground">
                14:18 · Ana Costa
              </p>
              <p className="mt-1 text-sm">Status: Open → Investigating</p>
            </li>
            <li className="border-l-2 border-foreground/20 pl-3">
              <p className="font-mono text-[11px] text-muted-foreground">
                14:26 · Miguel Santos
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Read-replica connection pool saturated.
              </p>
            </li>
            <li className="border-l-2 border-[var(--landing-signal)] pl-3">
              <p className="font-mono text-[11px] text-muted-foreground">
                14:31 · Severity
              </p>
              <p className="mt-1 text-sm">Medium → High</p>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
