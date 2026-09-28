import { CircleAlertIcon } from "lucide-react";
import Link from "next/link";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { IncidentSummary } from "../queries";
import { CreateIncidentDialog } from "./create-incident-dialog";

type IncidentSidebarProps = {
  incidents: IncidentSummary[];
  workspaceId: string;
  workspaceSlug: string;
  activeIncidentId?: string;
};

export function IncidentSidebar({
  incidents,
  workspaceId,
  workspaceSlug,
  activeIncidentId,
}: IncidentSidebarProps) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Incidents</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {incidents.length === 0 ? (
            <SidebarMenuItem>
              <span className="px-2 py-1.5 text-sm text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
                No incidents yet
              </span>
            </SidebarMenuItem>
          ) : (
            incidents.map((incident) => {
              const isActive = incident.id === activeIncidentId;

              return (
                <SidebarMenuItem key={incident.id}>
                  <SidebarMenuButton
                    render={
                      <Link
                        href={`/${workspaceSlug}/incidents/${incident.id}`}
                      />
                    }
                    isActive={isActive}
                    aria-current={isActive ? "page" : undefined}
                    tooltip={incident.title}
                  >
                    <CircleAlertIcon data-icon="inline-start" />
                    <span>{incident.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })
          )}
          <SidebarMenuItem>
            <CreateIncidentDialog workspaceId={workspaceId} variant="sidebar" />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
