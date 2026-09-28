"use client";

import { PlusIcon } from "lucide-react";
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
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { CreateIncidentForm } from "./create-incident-form";

type CreateIncidentDialogProps = {
  workspaceId: string;
  variant?: "default" | "sidebar";
};

export function CreateIncidentDialog({
  workspaceId,
  variant = "default",
}: CreateIncidentDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {variant === "sidebar" ? (
        <DialogTrigger
          render={
            <SidebarMenuButton tooltip="Create incident">
              <PlusIcon data-icon="inline-start" />
              <span>Create incident</span>
            </SidebarMenuButton>
          }
        />
      ) : (
        <DialogTrigger render={<Button />}>Create incident</DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create incident</DialogTitle>
          <DialogDescription>
            Record a new incident for this workspace.
          </DialogDescription>
        </DialogHeader>
        <CreateIncidentForm
          workspaceId={workspaceId}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
