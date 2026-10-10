"use client";

import { CrownIcon, EyeIcon, MoreHorizontalIcon, UserMinus2Icon, UserPlus2Icon, UserRoundXIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { leaveWorkspace, removeMember, updateMemberRole } from "../actions";
import type { WorkspaceMember } from "../queries";

type MembersManagerProps = {
  workspaceId: string;
  members: WorkspaceMember[];
  currentUserId: string;
  currentRole: "ADMIN" | "VIEWER";
};

type RoleTarget = {
  member: WorkspaceMember;
  role: "ADMIN" | "VIEWER";
};

export function MembersManager({
  workspaceId,
  members,
  currentUserId,
  currentRole,
}: MembersManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [roleTarget, setRoleTarget] = useState<RoleTarget | null>(null);
  const [removeTarget, setRemoveTarget] = useState<WorkspaceMember | null>(
    null,
  );
  const [leaveOpen, setLeaveOpen] = useState(false);

  const isAdmin = currentRole === "ADMIN";

  function run(membershipId: string | null, task: () => Promise<void>) {
    setPendingId(membershipId);
    startTransition(async () => {
      try {
        await task();
      } finally {
        setPendingId(null);
      }
    });
  }

  function handleRoleConfirm() {
    if (!roleTarget) return;
    const target = roleTarget;
    setRoleTarget(null);
    run(target.member.id, async () => {
      const result = await updateMemberRole({
        workspaceId,
        membershipId: target.member.id,
        role: target.role,
      });
      if (!result.success) {
        toast.add({
          type: "error",
          description: result.error,
          priority: "high",
        });
        return;
      }
      toast.add({ type: "success", description: "Member role updated." });
      router.refresh();
    });
  }

  function handleRemoveConfirm() {
    if (!removeTarget) return;
    const target = removeTarget;
    setRemoveTarget(null);
    run(target.id, async () => {
      const result = await removeMember({
        workspaceId,
        membershipId: target.id,
      });
      if (!result.success) {
        toast.add({
          type: "error",
          description: result.error,
          priority: "high",
        });
        return;
      }
      toast.add({ type: "success", description: "Member removed." });
      router.refresh();
    });
  }

  function handleLeaveConfirm() {
    setLeaveOpen(false);
    run("self", async () => {
      const result = await leaveWorkspace({ workspaceId });
      if (!result.success) {
        toast.add({
          type: "error",
          description: result.error,
          priority: "high",
        });
        return;
      }
      toast.add({ type: "success", description: "You left the workspace." });
      router.push("/dashboard");
      router.refresh();
    });
  }

  if (members.length === 0) {
    return <p className="text-sm text-muted-foreground">No members found.</p>;
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {members.map((member) => {
          const self = member.user.id === currentUserId;
          const busy = isPending && pendingId === member.id;
          const showMenu = self || isAdmin;

          return (
            <div key={member.id} className="flex flex-wrap items-center gap-2">
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium">
                  {member.user.name}
                  {self ? " (you)" : ""}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {member.user.email}
                </span>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Badge
                  variant="ghost"
                >
                  {member.role === "ADMIN" ? (
                    <CrownIcon className="h-4 w-4 text-amber-500" />
                  ) : (
                    <EyeIcon className="h-4 w-4 text-muted-foreground" />
                  )}
                </Badge>
                {busy ? <Spinner /> : null}
                {showMenu ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={isPending}
                          aria-label={`Actions to ${member.user.name}`}
                        >
                          <MoreHorizontalIcon />
                        </Button>
                      }
                    />
                    <DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width) min-w-44 rounded-lg" align="end">
                      {self ? (
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={isPending}
                          onClick={() => setLeaveOpen(true)}
                        >
                          <UserRoundXIcon />
                          Leave the workspace
                        </DropdownMenuItem>
                      ) : null}
                      {isAdmin && !self && member.role === "VIEWER" ? (
                        <DropdownMenuItem
                          disabled={isPending}
                          onClick={() =>
                            setRoleTarget({ member, role: "ADMIN" })
                          }
                        >
                          <UserPlus2Icon />
                          Promote to administrator
                        </DropdownMenuItem>
                      ) : null}
                      {isAdmin && !self && member.role === "ADMIN" ? (
                        <DropdownMenuItem
                          disabled={isPending}
                          onClick={() =>
                            setRoleTarget({ member, role: "VIEWER" })
                          }
                        >
                          <UserMinus2Icon />
                          Downgrade to viewer
                        </DropdownMenuItem>
                      ) : null}
                      {isAdmin && !self ? (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            disabled={isPending}
                            onClick={() => setRemoveTarget(member)}
                          >
                            <UserRoundXIcon />
                            Remove from workspace
                          </DropdownMenuItem>
                        </>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog
        open={roleTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRoleTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {roleTarget?.role === "ADMIN"
                ? "Promote to administrator?"
                : "Downgrade to viewer?"}
            </DialogTitle>
            <DialogDescription>
              {roleTarget
                ? roleTarget.role === "ADMIN"
                  ? `${roleTarget.member.user.name} will be able to manage this workspace.`
                  : `${roleTarget.member.user.name} will lose administrator permissions.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleRoleConfirm}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={removeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove member?</DialogTitle>
            <DialogDescription>
              {removeTarget
                ? `${removeTarget.user.name} will lose access to this workspace.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemoveConfirm}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave workspace?</DialogTitle>
            <DialogDescription>
              You will lose access to this workspace and be redirected to the
              dashboard.
              {isAdmin
                ? " If you are the only admin and other members remain, promote another member to admin first."
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLeaveOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleLeaveConfirm}>
              Leave
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
