"use client";

import type { TransitionStartFunction } from "react";
import { toast } from "@/components/ui/toast";
import { authClient } from "@/lib/auth-client";

interface GitHubSignInOptions {
  isPending: boolean;
  startTransition: TransitionStartFunction;
}

export function signInWithGitHub({
  isPending,
  startTransition,
}: GitHubSignInOptions) {
  if (isPending) return;

  startTransition(async () => {
    await authClient.signIn.social(
      {
        provider: "github",
        callbackURL: "/dashboard",
      },
      {
        onError: (ctx) => {
          toast.add({
            type: "error",
            description: ctx.error.message,
            priority: "high",
          });
        },
      },
    );
  });
}
