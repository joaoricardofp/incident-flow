import type { Metadata } from "next";
import Link from "next/link";
import {
  AuthCta,
  getPrimaryAppHref,
  getPrimaryAppLabel,
} from "@/components/landing/auth-cta";
import { FeaturesSection } from "@/components/landing/features-section";
import { FinalCta } from "@/components/landing/final-cta";
import { HeroVisual } from "@/components/landing/hero-visual";
import { HowItWorksSection } from "@/components/landing/how-it-works";
import { ProductDemo } from "@/components/landing/product-demo";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { buttonVariants } from "@/components/ui/button";
import { getSession } from "@/lib/auth";
import { cn } from "@/lib/utils";
import "@/components/landing/landing.css";

export const metadata: Metadata = {
  title: "IncidentFlow — Incident management and postmortems",
  description:
    "IncidentFlow helps engineering teams organize incidents by workspace, follow the timeline, and document postmortems with drafts and published versions.",
};

export default async function HomePage() {
  const session = await getSession();
  const isAuthenticated = Boolean(session);

  return (
    <div className="landing flex min-h-full flex-col">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        Skip to content
      </a>
      <SiteHeader isAuthenticated={isAuthenticated} />

      <main id="conteudo">
        <section
          className="landing-section border-b border-border"
          aria-labelledby="hero-heading"
        >
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-12 lg:py-20">
            <div>
              <p className="landing-reveal font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
                Incidents · Timeline · Postmortems
              </p>
              <h1
                id="hero-heading"
                className="landing-reveal landing-reveal-delay-1 mt-4 max-w-xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl"
              >
                Incidents happen. What we learn from them stays.
              </h1>
              <p className="landing-reveal landing-reveal-delay-2 mt-5 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                IncidentFlow is a platform for engineering teams to organize
                incident work by workspace, follow the timeline, and document
                postmortems — from draft to published version.
              </p>
              <div className="landing-reveal landing-reveal-delay-3 mt-8 flex flex-wrap items-center gap-3">
                <AuthCta isAuthenticated={isAuthenticated} size="lg" />
                <a
                  href="#demonstracao"
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "lg" }),
                  )}
                >
                  View demo
                </a>
              </div>
              <p className="mt-6 font-mono text-xs text-muted-foreground">
                {isAuthenticated ? (
                  <>
                    Active session ·{" "}
                    <Link
                      href={getPrimaryAppHref({ isAuthenticated })}
                      className="underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {getPrimaryAppLabel({ isAuthenticated })}
                    </Link>
                  </>
                ) : (
                  "Email and password accounts · GitHub OAuth available"
                )}
              </p>
            </div>

            <HeroVisual />
          </div>
        </section>

        <section
          id="demonstracao"
          className="landing-section border-b border-border"
          aria-labelledby="demo-heading"
        >
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
            <div className="max-w-2xl">
              <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
                Demo
              </p>
              <h2
                id="demo-heading"
                className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl"
              >
                A window into the real flow: incident, timeline, and postmortem.
              </h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                Select a fictional incident and switch between the timeline and
                the postmortem. The data is local and illustrative — it does not
                come from your database.
              </p>
            </div>
            <div className="mt-10">
              <ProductDemo />
            </div>
          </div>
        </section>

        <FeaturesSection />
        <HowItWorksSection />
        <FinalCta isAuthenticated={isAuthenticated} />
      </main>

      <SiteFooter isAuthenticated={isAuthenticated} />
    </div>
  );
}
