"use client"

import { Check, Copy, MoreHorizontalIcon } from "lucide-react"
import { useState } from "react"

import { Button } from "./ui/button"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "./ui/popover"
import { Input } from "./ui/input"
import { toast } from "./ui/toast"

export function NavActions({ workspaceInviteToken }: { workspaceInviteToken?: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(`${process.env.NEXT_PUBLIC_APP_URL}/invite/${workspaceInviteToken}` ?? "")
      setCopied(true)

      setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch (error) {
      toast.add({
        type: "error",
        title: "Failed to copy invite token",
        description: "Failed to copy invite token to clipboard",
      })
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 data-[state=open]:bg-accent"
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
          <Input value={`${process.env.NEXT_PUBLIC_APP_URL}/invite/${workspaceInviteToken}`} disabled />

          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
          >
            {copied ? <Check /> : <Copy />}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
