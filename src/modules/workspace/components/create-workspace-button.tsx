"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
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
