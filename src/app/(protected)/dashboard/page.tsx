import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getSession } from "@/lib/auth";
import { CreateWorkspaceButton } from "@/modules/workspace/components/create-workspace-button";
import { WorkspaceCard } from "@/modules/workspace/components/workspace-card";
import { getWorkspacesByUser } from "@/modules/workspace/queries";
import { ArrowUpRightIcon, BugOffIcon } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) redirect("/sign-in");

  const workspaces = await getWorkspacesByUser({
    userId: session.user.id,
  });

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      {workspaces.length > 0 ? (
        <div className="grid auto-rows-min gap-4 md:grid-cols-3">
          {workspaces.map((workspace) => (
            <WorkspaceCard key={workspace.id} {...workspace} />
          ))}
        </div>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BugOffIcon />
            </EmptyMedia>
            <EmptyTitle>No workspaces found</EmptyTitle>
            <EmptyDescription>
              You don't have any workspaces yet.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="flex-row justify-center gap-2">
            <CreateWorkspaceButton />
          </EmptyContent>
        </Empty>
      )}
    </div>
  );
}
