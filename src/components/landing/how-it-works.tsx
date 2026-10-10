const STEPS = [
  {
    n: "01",
    title: "Create a workspace and bring the team",
    body: "Start with your account, create a workspace, and share the invite link. Decide who administers and who only follows along.",
  },
  {
    n: "02",
    title: "Log and track the incident",
    body: "Open the incident with severity and a description. Update status and leave on the timeline what the team needs during the response.",
  },
  {
    n: "03",
    title: "Document and publish the postmortem",
    body: "When the dust settles, write the postmortem, save the draft, and publish a version. History stays attached to the incident.",
  },
] as const;

export function HowItWorksSection() {
  return (
    <section
      id="como-funciona"
      className="landing-section border-t border-border bg-muted/30"
      aria-labelledby="how-heading"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <div className="max-w-2xl">
          <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
            How it works
          </p>
          <h2
            id="how-heading"
            className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            Three steps aligned with the real application flow.
          </h2>
        </div>

        <ol className="mt-12 grid gap-0 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li
              key={step.n}
              className={
                index === 0
                  ? "relative border border-border bg-background p-6 sm:p-7 md:border-r-0"
                  : index === STEPS.length - 1
                    ? "relative border border-border bg-background p-6 sm:p-7 md:border-l-0"
                    : "relative border border-border bg-background p-6 sm:p-7 md:border-x-0"
              }
            >
              {index < STEPS.length - 1 ? (
                <span
                  className="pointer-events-none absolute top-1/2 right-0 hidden h-px w-6 translate-x-full bg-foreground/25 md:block"
                  aria-hidden="true"
                />
              ) : null}
              <p className="font-mono text-sm text-muted-foreground">
                {step.n}
              </p>
              <h3 className="mt-4 text-lg font-semibold tracking-tight">
                {step.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
