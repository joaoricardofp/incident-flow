"use client";

import { PencilIcon } from "lucide-react";
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
import { RenameIncidentForm } from "./rename-incident-form";

type RenameIncidentDialogProps = {
  incidentId: string;
  workspaceId: string;
  currentTitle: string;
};

export function RenameIncidentDialog({
  incidentId,
  workspaceId,
  currentTitle,
}: RenameIncidentDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" aria-label="Rename incident">
            <PencilIcon data-icon="inline-start" />
            <span>Rename</span>
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename incident</DialogTitle>
          <DialogDescription>
            Choose a new title for this incident. Only the title changes.
          </DialogDescription>
        </DialogHeader>
        <RenameIncidentForm
          incidentId={incidentId}
          workspaceId={workspaceId}
          currentTitle={currentTitle}
          onSuccess={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
