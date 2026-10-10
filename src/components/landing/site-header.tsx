"use client";

import { MenuIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  AuthCta,
  type AuthState,
  getPrimaryAppHref,
  getPrimaryAppLabel,
} from "@/components/landing/auth-cta";
import { BrandMark } from "@/components/landing/brand-mark";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "#funcionalidades", label: "Features" },
  { href: "#como-funciona", label: "How it works" },
  { href: "#demonstracao", label: "Demo" },
] as const;

type SiteHeaderProps = AuthState;

export function SiteHeader({ isAuthenticated }: SiteHeaderProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="IncidentFlow — home"
        >
          <BrandMark size="sm" />
        </Link>

        <nav
          aria-label="Page sections"
          className="ml-4 hidden items-center gap-1 md:flex"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors",
                "hover:bg-muted hover:text-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          {!isAuthenticated ? (
            <Button variant="ghost" size="sm" render={<Link href="/sign-in" />}>
              Sign in
            </Button>
          ) : null}
          <Button
            size="sm"
            render={<Link href={getPrimaryAppHref({ isAuthenticated })} />}
          >
            {getPrimaryAppLabel({ isAuthenticated })}
          </Button>
        </div>

        <div className="ml-auto md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Open navigation menu"
                />
              }
            >
              <MenuIcon />
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(100%,20rem)]">
              <SheetHeader>
                <SheetTitle>
                  <BrandMark size="sm" />
                </SheetTitle>
              </SheetHeader>
              <nav
                aria-label="Page sections"
                className="flex flex-col gap-1 px-4"
              >
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "rounded-md px-3 py-2.5 text-sm text-foreground transition-colors",
                      "hover:bg-muted",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    )}
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
              <div className="mt-4 border-t border-border px-4 pt-4">
                <AuthCta
                  isAuthenticated={isAuthenticated}
                  className="flex-col items-stretch [&>a]:w-full [&>button]:w-full"
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
