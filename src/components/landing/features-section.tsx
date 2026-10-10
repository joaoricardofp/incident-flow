const FEATURES = [
  {
    id: "workspaces",
    kicker: "01",
    title: "Workspaces with clear roles",
    body: "Each team works in its own workspace. Members join as Admin or Viewer, with distinct permissions to create incidents, comment on the timeline, and manage the space.",
    aside: "Admin · Viewer",
  },
  {
    id: "incidents",
    kicker: "02",
    title: "Incidents with status and memory",
    body: "Record severity and track progression Open → Investigating → Resolved. The timeline keeps status changes, severity changes, and comments in an append-only stream.",
    aside: "Auditable timeline",
  },
  {
    id: "postmortems",
    kicker: "03",
    title: "Postmortems with draft and publish",
    body: "Document what happened in an editor tied to the incident. Save drafts, publish versions, and keep history — so knowledge does not live only in the response chat.",
    aside: "Draft → Published",
  },
  {
    id: "invites",
    kicker: "04",
    title: "Workspace invite links",
    body: "Share an invite link to bring teammates into the workspace. Admins can rotate the token when they need to invalidate an old invite.",
    aside: "Link + rotation",
  },
] as const;

export function FeaturesSection() {
  return (
    <section
      id="funcionalidades"
      className="landing-section border-t border-border"
      aria-labelledby="features-heading"
    >
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16 lg:py-24">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
            Features
          </p>
          <h2
            id="features-heading"
            className="mt-3 max-w-sm text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            The essentials for organizing the response and what comes after.
          </h2>
          <p className="mt-4 max-w-md text-base leading-7 text-muted-foreground">
            IncidentFlow covers the cycle from incident logging, through active
            follow-up, to postmortem documentation — inside your team workspace.
          </p>
        </div>

        <div className="flex flex-col">
          {FEATURES.map((feature, index) => (
            <article
              key={feature.id}
              className={
                index === 0
                  ? "border-t border-border py-8 first:border-t-0 first:pt-0 sm:py-10"
                  : "border-t border-border py-8 sm:py-10"
              }
            >
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <p className="font-mono text-xs text-muted-foreground">
                  {feature.kicker}
                </p>
                <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
                  {feature.aside}
                </p>
              </div>
              <h3 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">
                {feature.title}
              </h3>
              <p className="mt-3 max-w-xl text-base leading-7 text-muted-foreground">
                {feature.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
