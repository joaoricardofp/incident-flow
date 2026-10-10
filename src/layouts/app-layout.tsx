import type React from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { AppContent } from "../components/app-content";
import { AppHeader } from "../components/app-header";
import { AppShell } from "../components/app-shell";

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
  canRotateInvite?: boolean;
};

export default function AppLayout({
  children,
  user,
  breadcrumb,
  workspaceId,
  workspaceSlug,
  incidentId,
  workspaceInviteToken,
  canRotateInvite,
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
        <AppHeader
          breadcrumb={breadcrumb}
          workspaceInviteToken={workspaceInviteToken}
          workspaceId={workspaceId}
          canRotateInvite={canRotateInvite}
        />
        <AppContent variant="sidebar">{children}</AppContent>
      </SidebarInset>
    </AppShell>
  );
}
