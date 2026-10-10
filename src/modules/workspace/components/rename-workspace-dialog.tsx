"use client";

import { PencilIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  RenameWorkspaceForm,
  type RenameWorkspaceSuccess,
} from "./rename-workspace-form";

type RenameWorkspaceDialogProps = {
  workspaceId: string;
  workspaceSlug: string;
  currentName: string;
};

export function RenameWorkspaceDialog({
  workspaceId,
  workspaceSlug,
  currentName,
}: RenameWorkspaceDialogProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function handleSuccess(result: RenameWorkspaceSuccess) {
    setOpen(false);
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
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" aria-label="Rename workspace">
            <PencilIcon data-icon="inline-start" />
            <span>Rename</span>
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename workspace</DialogTitle>
          <DialogDescription>
            Choose a new name for this workspace. The address updates to match
            the new name.
          </DialogDescription>
        </DialogHeader>
        <RenameWorkspaceForm
          workspaceId={workspaceId}
          currentName={currentName}
          onSuccess={handleSuccess}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
