import { Navigation } from "@/components/navigation";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Heading } from "@/components/ui/typography";
import { getSession } from "@/lib/auth";
import { CreateWorkspaceButton } from "@/modules/workspace/components/create-workspace-button";
import { WorkspaceCard } from "@/modules/workspace/components/workspace-card";
import { getWorkspacesByUser } from "@/modules/workspace/queries";
import { BugOffIcon } from "lucide-react";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) redirect("/sign-in");

  const workspaces = await getWorkspacesByUser({
    userId: session.user.id,
  });

  return (
    <>
      <Navigation name={session.user.name} email={session.user.email} image={session.user.image}>
        <Heading className="text-sm font-medium">Dashboard</Heading>
      </Navigation>
      <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
        <div className="flex items-center flex-wrap">
          <Heading variant="h2">
            {`Your Workspace${workspaces.length !== 1 ? "s" : ""}`}
          </Heading>
          <div className="ml-auto">
            <CreateWorkspaceButton />
          </div>
        </div>
        {workspaces.length > 0 ? (
          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            {workspaces.map((workspace) => (
              <WorkspaceCard key={workspace.id} {...workspace} />
            ))}
          </div>
        ) : (
          <Empty className="border border-dashed border-border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BugOffIcon />
              </EmptyMedia>
              <EmptyTitle>No workspaces found</EmptyTitle>
              <EmptyDescription>
                You don't have any workspaces yet.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>
    </>
  );
}
