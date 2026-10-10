import { cookies } from "next/headers";
import type React from "react";

import {
  getSidebarDefaultOpen,
  SIDEBAR_COOKIE_NAME,
} from "@/lib/sidebar-state";
import { SidebarProvider } from "./ui/sidebar";

type Props = {
  children: React.ReactNode;
  variant?: "header" | "sidebar";
};

async function AppShell({ children, variant = "header", ...props }: Props) {
  if (variant === "header") {
    return (
      <div className="flex min-h-screen w-full flex-col" {...props}>
        {children}
      </div>
    );
  }

  const cookieStore = await cookies();
  const defaultOpen = getSidebarDefaultOpen(
    cookieStore.get(SIDEBAR_COOKIE_NAME)?.value,
  );

  return (
    <SidebarProvider defaultOpen={defaultOpen}>{children}</SidebarProvider>
  );
}

export { AppShell };
