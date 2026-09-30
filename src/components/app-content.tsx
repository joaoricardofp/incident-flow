import type React from "react";

type AppShellContentProps =
  | (React.ComponentProps<"main"> & { variant?: "header" })
  | (React.ComponentProps<"div"> & { variant: "sidebar" });

function AppContent(props: AppShellContentProps) {
  if (props.variant === "sidebar") {
    const { children, variant: _variant, ...sidebarProps } = props;

    return (
      <div
        className="flex min-h-0 flex-1 flex-col"
        {...sidebarProps}
      >
        {children}
      </div>
    );
  }

  const { children, variant: _variant, ...mainProps } = props;

  return (
    <main
      className="mx-auto flex h-full w-full max-w-7xl flex-1 flex-col gap-4 rounded-xl"
      {...mainProps}
    >
      {children}
    </main>
  );
}

export { AppContent };
