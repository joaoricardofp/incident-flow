import type React from "react";
import { getIncidentsByWorkspace } from "@/modules/incident/queries";
import { IncidentSidebar } from "@/modules/incident/components/incident-sidebar";
import { getWorkspacesByUser } from "@/modules/workspace/queries";
import { AppUser } from "./app-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "./ui/sidebar";
import { WorkspaceSwitcher } from "./workspace-switcher";

type AppSidebarProps = {
  user?: {
    id: string;
    name: string;
    email: string;
    image?: string | null | undefined;
  };
  workspaceId?: string;
  workspaceSlug?: string;
  incidentId?: string;
};

async function AppSidebar({
  user,
  workspaceId,
  workspaceSlug,
  incidentId,
  ...props
}: React.ComponentProps<typeof Sidebar> & AppSidebarProps) {
  const [workspaces, incidents] = await Promise.all([
    user ? getWorkspacesByUser({ userId: user.id }) : Promise.resolve([]),
    workspaceId
      ? getIncidentsByWorkspace({ workspaceId })
      : Promise.resolve([]),
  ]);
  const currentWorkspace =
    workspaces.find((workspace) => workspace.id === workspaceId) ?? null;

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <WorkspaceSwitcher
          workspace={currentWorkspace}
          workspaces={workspaces}
        />
      </SidebarHeader>

      <SidebarContent>
        {workspaceId && workspaceSlug ? (
          <IncidentSidebar
            incidents={incidents}
            workspaceId={workspaceId}
            workspaceSlug={workspaceSlug}
            activeIncidentId={incidentId}
          />
        ) : null}
      </SidebarContent>

      <SidebarFooter>{user ? <AppUser user={user} /> : null}</SidebarFooter>
    </Sidebar>
  );
}

export { AppSidebar };
