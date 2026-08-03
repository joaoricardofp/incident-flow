"use client"

import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { BadgeCheckIcon, BadgeQuestionMarkIcon, BookIcon, LogOutIcon } from "lucide-react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type NavigationProps = React.ComponentProps<"nav"> & {
  name: string;
  email: string;
  image?: string | null | undefined;
};

export function Navigation({
  children,
  className,
  name,
  email,
  image,
  ...props
}: NavigationProps) {
  const router = useRouter();

  return (
    <nav
      className={cn(
        "flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)",
        className,
      )}
      {...props}
    >
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        {children}
        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={image ? `${image}` : undefined}
                      alt="Avatar"
                    />
                    <AvatarFallback>
                      {name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              }
            />
            <DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg" align="end">
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  {email}
                </DropdownMenuLabel>
                <DropdownMenuItem render={<Link href="/account" />}>
                  <BadgeCheckIcon />
                  Account
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem render={<Link href="/help" />}>
                  <BadgeQuestionMarkIcon />
                  Help
                </DropdownMenuItem>
                <DropdownMenuItem render={<Link href="/docs" />}>
                  <BookIcon />
                  Docs
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={async () => {
                  await authClient.signOut({
                    fetchOptions: {
                      onSuccess: () => {
                        toast("Logged out successfully");
                        router.push("/sign-in");
                      },
                    },
                  });
                }}>
                  <LogOutIcon />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
