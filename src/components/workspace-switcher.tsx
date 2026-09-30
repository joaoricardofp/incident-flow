"use client";

import { BoxesIcon, CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "./ui/sidebar";
import { Spinner } from "./ui/spinner";

export type WorkspaceSwitcherWorkspace = {
  id: string;
  name: string;
  slug: string;
};

type WorkspaceSwitcherProps = {
  workspace: WorkspaceSwitcherWorkspace | null;
  workspaces: WorkspaceSwitcherWorkspace[];
};

function getWorkspaceInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

export function WorkspaceSwitcher({
  workspace,
  workspaces,
}: WorkspaceSwitcherProps) {
  const isMobile = useIsMobile();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingWorkspaceId, setPendingWorkspaceId] = useState<string | null>(
    null,
  );
  const hasWorkspaces = workspaces.length > 0;

  function handleWorkspaceSelect(
    selectedWorkspace: WorkspaceSwitcherWorkspace,
  ) {
    if (!hasWorkspaces || isPending || selectedWorkspace.id === workspace?.id) {
      return;
    }

    setPendingWorkspaceId(selectedWorkspace.id);
    startTransition(() => {
      router.push(`/${selectedWorkspace.slug}`);
    });
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                disabled={!hasWorkspaces}
                aria-label={
                  workspace
                    ? `Current workspace: ${workspace.name}`
                    : "Select a workspace"
                }
                className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
              >
                <div
                  aria-hidden="true"
                  className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground"
                >
                  {workspace ? (
                    getWorkspaceInitial(workspace.name)
                  ) : (
                    <BoxesIcon />
                  )}
                </div>
                <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {workspace?.name ??
                      (hasWorkspaces ? "Select workspace" : "No workspaces")}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {workspace ? "Workspace" : "Get started"}
                  </span>
                </div>
                {isPending ? <Spinner /> : <ChevronsUpDownIcon />}
              </SidebarMenuButton>
            }
          />

          <DropdownMenuContent
            className="w-(--anchor-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Workspaces
              </DropdownMenuLabel>
              {hasWorkspaces ? (
                workspaces.map((item) => {
                  const isCurrentWorkspace = item.id === workspace?.id;
                  const isPendingWorkspace =
                    isPending && item.id === pendingWorkspaceId;

                  return (
                    <DropdownMenuItem
                      key={item.id}
                      disabled={isPending}
                      aria-current={isCurrentWorkspace ? "page" : undefined}
                      onClick={() => handleWorkspaceSelect(item)}
                      className={cn("gap-2 p-2", {
                        "bg-accent text-accent-foreground": isCurrentWorkspace,
                      })}
                    >
                      <div
                        aria-hidden="true"
                        className="flex size-6 items-center justify-center rounded-md border text-xs font-medium"
                      >
                        {getWorkspaceInitial(item.name)}
                      </div>
                      <span className="min-w-0 flex-1 truncate">
                        {item.name}
                      </span>
                      {isPendingWorkspace ? <Spinner /> : null}
                      {isCurrentWorkspace && !isPendingWorkspace ? (
                        <CheckIcon aria-label="Selected workspace" />
                      ) : null}
                    </DropdownMenuItem>
                  );
                })
              ) : (
                <DropdownMenuItem disabled>
                  No workspaces available
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
