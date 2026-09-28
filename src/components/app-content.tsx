import React from "react";

import { SidebarInset } from "./ui/sidebar";

type AppShelContentProps = React.ComponentProps<"main"> & {
  variant?: "header" | "sidebar";
};

function AppContent({
  variant = "header",
  children,
  ...props
}: AppShelContentProps) {
  if (variant === "sidebar") {
    return <SidebarInset {...props}>{children}</SidebarInset>;
  }

  return (
    <main
      className="mx-auto flex h-full w-full max-w-7xl flex-1 flex-col gap-4 rounded-xl"
      {...props}
    >
      {children}
    </main>
  );
}

export { AppContent };
