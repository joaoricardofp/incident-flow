"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { createPostmortem } from "../actions";
import { emptyTiptapDoc } from "../schema";

type CreatePostmortemButtonProps = {
  incidentId: string;
  workspaceId: string;
  workspaceSlug: string;
};

export function CreatePostmortemButton({
  incidentId,
  workspaceId,
  workspaceSlug,
}: CreatePostmortemButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const result = await createPostmortem(
        { workspaceId },
        { incidentId, content: emptyTiptapDoc() },
      );

      if (!result.success) {
        toast.add({
          type: "error",
          description: result.error,
          priority: "high",
        });
        return;
      }

      toast.add({
        type: "success",
        description: "Postmortem created successfully.",
      });
      router.push(`/${workspaceSlug}/incidents/${incidentId}/postmortem`);
      router.refresh();
    });
  }

  return (
    <Button onClick={onClick} disabled={isPending}>
      {isPending ? <Spinner /> : "Create postmortem"}
    </Button>
  );
}
