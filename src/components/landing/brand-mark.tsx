import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
  showWordmark?: boolean;
  size?: "sm" | "md";
};

export function BrandSymbol({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? 22 : 28;

  return (
    <svg
      width={dim}
      height={dim}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn("shrink-0 text-foreground", className)}
    >
      <rect
        x="1.5"
        y="1.5"
        width="25"
        height="25"
        rx="3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.35"
      />
      <path
        d="M6 18.5C9.5 18.5 10.5 9.5 14 9.5S18.5 18.5 22 18.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        className="landing-flow-path"
      />
      <circle cx="6" cy="18.5" r="2" fill="currentColor" />
      <circle cx="14" cy="9.5" r="2" fill="currentColor" />
      <circle
        cx="22"
        cy="18.5"
        r="2"
        fill="var(--landing-signal, currentColor)"
        stroke="currentColor"
        strokeWidth="0"
      />
    </svg>
  );
}

export function BrandMark({
  className,
  showWordmark = true,
  size = "md",
}: BrandMarkProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 text-foreground",
        className,
      )}
    >
      <BrandSymbol size={size} />
      {showWordmark ? (
        <span
          className={cn(
            "font-mono font-semibold tracking-tight",
            size === "sm" ? "text-sm" : "text-base",
          )}
        >
          IncidentFlow
        </span>
      ) : null}
    </span>
  );
}
