import { AuthCta, type AuthState } from "@/components/landing/auth-cta";

type FinalCtaProps = AuthState;

export function FinalCta({ isAuthenticated }: FinalCtaProps) {
  return (
    <section
      className="landing-section border-t border-border"
      aria-labelledby="cta-heading"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-16 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:py-24">
        <div className="max-w-xl">
          <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
            Get started
          </p>
          <h2
            id="cta-heading"
            className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            {isAuthenticated
              ? "Continue in your dashboard."
              : "Create an account and open your first workspace."}
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            {isAuthenticated
              ? "Your workspaces, incidents, and postmortems are in the app."
              : "After sign-up and email verification, you can create a workspace, invite the team, and start logging incidents."}
          </p>
        </div>
        <AuthCta isAuthenticated={isAuthenticated} size="lg" />
      </div>
    </section>
  );
}
