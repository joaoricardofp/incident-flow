"use client";

import {
  BadgeCheckIcon,
  BadgeQuestionMarkIcon,
  BookIcon,
  LogOutIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment } from "react";
import {
  Breadcrumb,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbItem as BreadcrumbListItem,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { toast } from "@/components/ui/toast";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export type BreadcrumbItem =
  | {
      label: string;
      href: string;
    }
  | {
      label: string;
      href?: never;
    };

type NavigationProps = React.ComponentProps<"nav"> & {
  name: string;
  email: string;
  image?: string | null | undefined;
  breadcrumb?: BreadcrumbItem[];
};

export function Navigation({
  children,
  className,
  name,
  email,
  image,
  breadcrumb,
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
        {breadcrumb && breadcrumb.length > 0 && (
          <Breadcrumb className="max-sm:hidden">
            <BreadcrumbList>
              {breadcrumb.map((item, index) => {
                const isLastItem = index === breadcrumb.length - 1;
                const key = item.href
                  ? `${item.href}-${item.label}`
                  : item.label;

                return (
                  <Fragment key={key}>
                    <BreadcrumbListItem>
                      {isLastItem ? (
                        <BreadcrumbPage>{item.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink
                          render={
                            <Link href={item.href as string}>{item.label}</Link>
                          }
                        />
                      )}
                    </BreadcrumbListItem>
                    {!isLastItem && <BreadcrumbSeparator />}
                  </Fragment>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        )}
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
                    <AvatarFallback>{name.charAt(0)}</AvatarFallback>
                  </Avatar>
                </Button>
              }
            />
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              align="end"
            >
              <DropdownMenuGroup>
                <DropdownMenuLabel>{email}</DropdownMenuLabel>
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
                <DropdownMenuItem
                  onClick={async () => {
                    await authClient.signOut({
                      fetchOptions: {
                        onSuccess: () => {
                          toast.add({
                            description: "Logged out successfully",
                          });
                          router.push("/sign-in");
                        },
                      },
                    });
                  }}
                >
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
