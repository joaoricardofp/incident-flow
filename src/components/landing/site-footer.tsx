import Link from "next/link";
import {
  type AuthState,
  getPrimaryAppHref,
} from "@/components/landing/auth-cta";
import { BrandMark } from "@/components/landing/brand-mark";

const REPO_URL = "https://github.com/joaoricardofp/incident-flow";

type SiteFooterProps = AuthState;

export function SiteFooter({ isAuthenticated }: SiteFooterProps) {
  return (
    <footer className="border-t border-border bg-muted/20">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div>
          <BrandMark size="sm" />
          <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
            A platform to manage incidents and document postmortems in team
            workspaces.
          </p>
        </div>

        <nav
          aria-label="Footer"
          className="flex flex-wrap gap-x-6 gap-y-2 text-sm"
        >
          <a
            href="#funcionalidades"
            className="text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Features
          </a>
          <a
            href="#como-funciona"
            className="text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            How it works
          </a>
          <Link
            href={getPrimaryAppHref({ isAuthenticated })}
            className="text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            App
          </Link>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Repository
          </a>
        </nav>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 font-mono text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>IncidentFlow · Apache License 2.0</p>
          <p>Incident management and postmortems</p>
        </div>
      </div>
    </footer>
  );
}
