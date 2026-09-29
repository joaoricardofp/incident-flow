import type React from "react";

import { AppShell } from "../components/app-shell";
import { AppContent } from "../components/app-content";
import { AppHeader } from "../components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset } from "@/components/ui/sidebar";

export type BreadcrumbItem =
  | {
      label: string;
      href: string;
    }
  | {
      label: string;
      href?: never;
    };

type AppLayoutProps = {
  children: React.ReactNode;
  user?: {
    id: string;
    name: string;
    email: string;
    image?: string | null | undefined;
  };
  breadcrumb?: BreadcrumbItem[];
  workspaceId?: string;
  workspaceSlug?: string;
  incidentId?: string;
  workspaceInviteToken?: string;
};

export default function AppLayout({
  children,
  user,
  breadcrumb,
  workspaceId,
  workspaceSlug,
  incidentId,
  workspaceInviteToken,
}: AppLayoutProps) {
  return (
    <AppShell variant="sidebar">
      <AppSidebar
        user={user}
        workspaceId={workspaceId}
        workspaceSlug={workspaceSlug}
        incidentId={incidentId}
      />
      <SidebarInset>
        <AppHeader breadcrumb={breadcrumb} workspaceInviteToken={workspaceInviteToken} />
        <AppContent variant="sidebar">{children}</AppContent>
      </SidebarInset>
    </AppShell>
  );
}
