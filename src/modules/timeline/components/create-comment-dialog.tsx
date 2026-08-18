"use client";

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
import { CreateCommentForm } from "./create-comment-form";

type CreateCommentDialogProps = {
  incidentId: string;
  workspaceId: string;
};

export function CreateCommentDialog({
  incidentId,
  workspaceId,
}: CreateCommentDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>Add comment</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add comment</DialogTitle>
          <DialogDescription>
            Add a comment to this incident's timeline.
          </DialogDescription>
        </DialogHeader>
        <CreateCommentForm
          incidentId={incidentId}
          workspaceId={workspaceId}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
