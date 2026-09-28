import React from "react";

import { SidebarProvider } from "./ui/sidebar";

type Props = {
  children: React.ReactNode;
  variant?: "header" | "sidebar";
};

function AppShell({ children, variant = "header", ...props }: Props) {
  if (variant === "header") {
    return (
      <div className="flex min-h-screen w-full flex-col" {...props}>
        {children}
      </div>
    );
  }

  return <SidebarProvider>{children}</SidebarProvider>;
}

export { AppShell };
