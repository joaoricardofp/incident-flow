"use client";

import { Check, Copy, MoreHorizontalIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { RotateInviteButton } from "@/modules/workspace/components/rotate-invite-button";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "./ui/popover";
import { toast } from "./ui/toast";
import { Text } from "./ui/typography";

export function NavActions({
  workspaceInviteToken,
  workspaceId,
  canRotate,
}: {
  workspaceInviteToken: string;
  workspaceId?: string;
  canRotate?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const configuredAppUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const [appUrl, setAppUrl] = useState(configuredAppUrl);

  useEffect(() => {
    if (!appUrl) setAppUrl(window.location.origin);
  }, [appUrl]);

  const inviteUrl = appUrl
    ? `${appUrl}/invite/${workspaceInviteToken}`
    : `/invite/${workspaceInviteToken}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      toast.add({
        type: "error",
        title: "Failed to copy invite token",
        description: "Failed to copy invite token to clipboard",
      });
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 data-open:bg-accent"
          >
            <MoreHorizontalIcon />
          </Button>
        }
      />

      <PopoverContent className="w-100" align="end">
        <PopoverHeader>
          <PopoverTitle className="text-xs font-semibold tracking-wider uppercase">
            Share this workspace
          </PopoverTitle>

          <PopoverDescription className="text-xs">
            Share this workspace with others to collaborate on incidents.
          </PopoverDescription>
        </PopoverHeader>

        <div className="flex items-center gap-2">
          <Input value={inviteUrl} disabled />

          <Button variant="ghost" size="icon" onClick={handleCopy}>
            {copied ? <Check /> : <Copy />}
          </Button>
        </div>

        {canRotate && workspaceId ? (
          <div className="mt-3 flex flex-col gap-1.5">
            <RotateInviteButton workspaceId={workspaceId} />
            <Text variant="muted">
              Rotating generates a new link and invalidates the previous one
              immediately.
            </Text>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
