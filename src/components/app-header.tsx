"use client";

import React, { Fragment } from "react";

import { SidebarTrigger } from "./ui/sidebar";
import { Separator } from "./ui/separator";
import {
  Breadcrumb,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbItem as BreadcrumbListItem,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Link } from "./ui/typography";
import { NavActions } from "./nav-actions";

export type BreadcrumbItem =
  | {
      label: string;
      href: string;
    }
  | {
      label: string;
      href?: never;
    };

type AppHeaderProps = {
  breadcrumb?: BreadcrumbItem[];
  workspaceInviteToken?: string;
};

function AppHeader({ breadcrumb, workspaceInviteToken }: AppHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b bg-background sticky top-0 z-10">
      <div className="flex justify-center items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />

        <Separator
          orientation="vertical"
          className="mr-2 my-auto data-[orientation=vertical]:h-4"
        />

        {breadcrumb && breadcrumb.length > 0 && (
          <Breadcrumb>
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
      </div>
      <div className="ml-auto px-6">
        <NavActions workspaceInviteToken={workspaceInviteToken} />
      </div>
    </header>
  );
}

export { AppHeader };
