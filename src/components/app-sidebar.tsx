import type React from "react";
import { IncidentSidebar } from "@/modules/incident/components/incident-sidebar";
import { getIncidentsByWorkspace } from "@/modules/incident/queries";
import { WorkspaceSettingsDialog } from "@/modules/workspace/components/workspace-settings-dialog";
import {
  getWorkspaceBySlug,
  getWorkspaceMembers,
  getWorkspacesByUser,
} from "@/modules/workspace/queries";
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
  const [workspaces, incidents, members, workspace] = await Promise.all([
    user ? getWorkspacesByUser({ userId: user.id }) : Promise.resolve([]),
    workspaceId
      ? getIncidentsByWorkspace({ workspaceId })
      : Promise.resolve([]),
    workspaceId ? getWorkspaceMembers({ workspaceId }) : Promise.resolve([]),
    workspaceSlug
      ? getWorkspaceBySlug({ slug: workspaceSlug })
      : Promise.resolve(null),
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

      <SidebarFooter>
        {workspaceId && workspaceSlug && user && currentWorkspace ? (
          <WorkspaceSettingsDialog
            workspaceId={workspaceId}
            workspaceSlug={workspaceSlug}
            workspaceName={currentWorkspace.name}
            workspaceInviteToken={workspace?.inviteToken}
            members={members}
            currentUserId={user.id}
            currentRole={currentWorkspace.role}
          />
        ) : null}
        {user ? <AppUser user={user} /> : null}
      </SidebarFooter>
    </Sidebar>
  );
}

export { AppSidebar };
