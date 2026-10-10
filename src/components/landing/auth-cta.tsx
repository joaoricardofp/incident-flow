import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AuthState = {
  isAuthenticated: boolean;
};

type AuthCtaProps = AuthState & {
  className?: string;
  size?: "default" | "sm" | "lg";
  primaryClassName?: string;
  secondaryClassName?: string;
};

export function getPrimaryAppHref({ isAuthenticated }: AuthState) {
  return isAuthenticated ? "/dashboard" : "/sign-up";
}

export function getPrimaryAppLabel({ isAuthenticated }: AuthState) {
  return isAuthenticated ? "Open app" : "Create account";
}

export function AuthCta({
  isAuthenticated,
  className,
  size = "default",
  primaryClassName,
  secondaryClassName,
}: AuthCtaProps) {
  const primaryHref = getPrimaryAppHref({ isAuthenticated });
  const primaryLabel = getPrimaryAppLabel({ isAuthenticated });

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Button
        size={size}
        className={primaryClassName}
        render={<Link href={primaryHref} />}
      >
        {primaryLabel}
      </Button>
      {!isAuthenticated ? (
        <Button
          size={size}
          variant="outline"
          className={secondaryClassName}
          render={<Link href="/sign-in" />}
        >
          Sign in
        </Button>
      ) : null}
    </div>
  );
}
