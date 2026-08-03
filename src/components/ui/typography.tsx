import { cva, type VariantProps } from "class-variance-authority";
import NextLink from "next/link";
import type React from "react";
import { cn } from "@/lib/utils";

type LinkProps = React.ComponentPropsWithoutRef<"a"> & {
  href: string;
};

function Link({ className, href, ...props }: LinkProps) {
  const base = cn(
    "text-primary underline underline-offset-[3px] decoration-2 decoration-primary",
    "hover:text-primary/80 hover:decoration-primary/80",
    "transition-colors duration-75",
    className,
  );

  if (href.startsWith("#")) {
    return <a href={href} className={base} {...props} />;
  } else if (href.startsWith("/")) {
    return <NextLink href={href} className={base} {...props} />;
  } else {
    return (
      <a
        href={href}
        className={base}
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      />
    );
  }
}

const headingVariants = cva("tracking-tight", {
  variants: {
    variant: {
      h1: "text-4xl font-bold",
      h2: "text-3xl font-semibold",
      h3: "text-2xl font-semibold",
      h4: "text-xl font-semibold",
      h5: "text-lg font-medium",
    },
  },
  defaultVariants: {
    variant: "h1",
  },
});

function Heading({
  className,
  variant = "h1",
  ...props
}: React.HTMLAttributes<HTMLHeadingElement> &
  VariantProps<typeof headingVariants>) {
  const Comp = variant || "h1";

  return (
    <Comp className={cn(headingVariants({ variant, className }))} {...props} />
  );
}

const textVariants = cva("", {
  variants: {
    variant: {
      default: "not-first:mt-6 text-base leading-7",
      lead: "text-lg leading-8 text-muted-foreground",
      small: "text-sm text-muted-foreground leading-6",
      muted: "text-xs text-muted-foreground leading-5",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

function Text({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"p"> & VariantProps<typeof textVariants>) {
  return <p className={cn(textVariants({ variant, className }))} {...props} />;
}

function Strong({ className, ...props }: React.ComponentProps<"strong">) {
  return <strong className={cn("font-semibold", className)} {...props} />;
}

const numericVariants = cva("tabular-nums tracking-tight", {
  variants: {
    variant: {
      default: "text-base font-mono font-medium",
      display: "text-3xl sm:text-4xl font-semibold leading-tight",
    },
    style: {
      default: "text-foreground",
      negative: "text-red-600",
      positive: "text-emerald-600",
    },
  },
  defaultVariants: {
    variant: "default",
    style: "default",
  },
});

function Numeric({
  className,
  variant = "default",
  style = "default",
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof numericVariants>) {
  return (
    <span
      className={cn(numericVariants({ variant, style, className }))}
      {...props}
    />
  );
}

function Code({ className, ...props }: React.ComponentProps<"code">) {
  return (
    <code
      className={cn("text-sm font-mono bg-muted px-2 py-1 rounded", className)}
      {...props}
    />
  );
}

function Blockquote({
  className,
  ...props
}: React.ComponentProps<"blockquote">) {
  return (
    <blockquote
      className={cn("border-l-4 border-primary pl-4 italic", className)}
      {...props}
    />
  );
}

export { Blockquote, Code, Heading, Link, Numeric, Strong, Text };
