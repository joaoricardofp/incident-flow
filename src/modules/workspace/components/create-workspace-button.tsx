"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { createWorkspace } from "../actions";

export function CreateWorkspaceButton() {
  const [isPending, startTransion] = useTransition();
  const router = useRouter();

  async function handleClick() {
    startTransion(async () => {
      const result = await createWorkspace();
      if (result.success) {
        router.push(`/${result.slug}`);
      } else {
        toast.add({
          type: "error",
          description: result.error,
          priority: "high",
        });
      }
    });
  }

  return (
    <Button onClick={handleClick} disabled={isPending}>
      {isPending ? <Spinner /> : "Create Workspace"}
    </Button>
  );
}
