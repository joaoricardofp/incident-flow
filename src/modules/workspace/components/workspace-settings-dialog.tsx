"use client";

import { Check, Copy, PencilLineIcon, SettingsIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { Text } from "@/components/ui/typography";
import type { WorkspaceMember } from "../queries";
import { MembersManager } from "./members-manager";
import {
  RenameWorkspaceForm,
  type RenameWorkspaceSuccess,
} from "./rename-workspace-form";
import { RotateInviteButton } from "./rotate-invite-button";

type WorkspaceSettingsDialogProps = {
  workspaceId: string;
  workspaceSlug: string;
  workspaceName: string;
  workspaceInviteToken?: string;
  members: WorkspaceMember[];
  currentUserId: string;
  currentRole: "ADMIN" | "VIEWER";
};

export function WorkspaceSettingsDialog({
  workspaceId,
  workspaceSlug,
  workspaceName,
  workspaceInviteToken,
  members,
  currentUserId,
  currentRole,
}: WorkspaceSettingsDialogProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(workspaceName);
  const [copied, setCopied] = useState(false);
  const configuredAppUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const [appUrl, setAppUrl] = useState(configuredAppUrl);

  useEffect(() => {
    if (!appUrl) setAppUrl(window.location.origin);
  }, [appUrl]);

  const isAdmin = currentRole === "ADMIN";

  const inviteUrl = workspaceInviteToken
    ? appUrl
      ? `${appUrl}/invite/${workspaceInviteToken}`
      : `/invite/${workspaceInviteToken}`
    : "";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      toast.add({
        type: "error",
        title: "Failed to copy invite token",
        description: "Failed to copy invite token to clipboard",
      });
    }
  }

  function handleRenamed(result: RenameWorkspaceSuccess) {
    setRenaming(false);
    setName(result.name);
    const prefix = `/${workspaceSlug}`;
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      router.push(pathname.replace(prefix, `/${result.slug}`));
    } else {
      router.push(`/${result.slug}`);
    }
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <SidebarMenu>
        <SidebarMenuItem>
          <DialogTrigger
            render={
              <SidebarMenuButton tooltip="Configurações do workspace">
                <SettingsIcon data-icon="inline-start" />
                <span>Settings</span>
              </SidebarMenuButton>
            }
          />
        </SidebarMenuItem>
      </SidebarMenu>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Workspace Settings</DialogTitle>
          <DialogDescription>
            Manage this workspace, its members and its invite link.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="geral">
          <TabsList className="w-full">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            {isAdmin ? <TabsTrigger value="invite">Invite</TabsTrigger> : null}
          </TabsList>
          <TabsContent value="general" className="flex flex-col gap-4 pt-2">
            <div>
              <Text className="text-xs font-semibold tracking-wider uppercase">
                Rename this workspace
              </Text>
              <Text variant="muted">
                Rename your workspace to better identify it.
              </Text>
            </div>
            {renaming && isAdmin ? (
              <RenameWorkspaceForm
                workspaceId={workspaceId}
                currentName={name}
                onSuccess={handleRenamed}
                onCancel={() => setRenaming(false)}
              />
            ) : (
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {name}
                </span>
                {isAdmin ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setRenaming(true)}
                  >
                    <PencilLineIcon />
                  </Button>
                ) : null}
              </div>
            )}
          </TabsContent>
          <TabsContent value="members" className="flex flex-col gap-4 pt-2">
            <div>
              <Text className="text-xs font-semibold tracking-wider uppercase">
                Members of this workspace
              </Text>
              <Text variant="muted">
                Manage and change what members of this workspace can do.
              </Text>
            </div>
            <MembersManager
              workspaceId={workspaceId}
              members={members}
              currentUserId={currentUserId}
              currentRole={currentRole}
            />
          </TabsContent>
          {isAdmin ? (
            <TabsContent value="invite" className="flex flex-col gap-4 pt-2">
              <div>
                <Text className="text-xs font-semibold tracking-wider uppercase">
                  Share this workspace
                </Text>
                <Text variant="muted">
                  Share this workspace with others to collaborate on incidents.
                </Text>
              </div>
              {workspaceInviteToken ? (
                <div className="flex items-center gap-2">
                  <Input value={inviteUrl} disabled />

                  <Button variant="ghost" size="icon" onClick={handleCopy}>
                    {copied ? <Check /> : <Copy />}
                  </Button>
                </div>
              ) : null}
              <Separator />
              <div className="mt-3 flex flex-col gap-1.5">
                <RotateInviteButton workspaceId={workspaceId} />
                <Text variant="muted">
                  Rotating generates a new link and invalidates the previous one
                  immediately.
                </Text>
              </div>
            </TabsContent>
          ) : null}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
