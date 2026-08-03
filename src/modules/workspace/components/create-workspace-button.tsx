"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createWorkspace } from "../actions";
import { useTransition } from "react";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

export function CreateWorkspaceButton() {
  const [isPending, startTransion] = useTransition();
  const router = useRouter();

  async function handleClick() {
    startTransion(async () => {
      const result = await createWorkspace();
      if (result.success) {
        router.push(`/${result.slug}`);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Button onClick={handleClick} disabled={isPending}>
      {isPending ? <Spinner /> : "Create Workspace"}
    </Button>
  );
}
