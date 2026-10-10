import { BugOffIcon } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Heading } from "@/components/ui/typography";
import AppLayout from "@/layouts/app-layout";
import { getSession } from "@/lib/auth";
import { getMembership } from "@/lib/membership";
import { CreateIncidentDialog } from "@/modules/incident/components/create-incident-dialog";
import { IncidentTable } from "@/modules/incident/components/incident-table";
import { getIncidentsByWorkspace } from "@/modules/incident/queries";
import {
  getWorkspaceBySlug,
  getWorkspaceMembers,
} from "@/modules/workspace/queries";

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const [session, resolvedParams] = await Promise.all([getSession(), params]);

  if (!session) redirect("/sign-in");

  const { workspace: slug } = resolvedParams;
  const workspace = await getWorkspaceBySlug({ slug });

  if (!workspace) notFound();

  const [incidents, membership, members] = await Promise.all([
    getIncidentsByWorkspace({
      workspaceId: workspace.id,
    }),
    getMembership({ userId: session.user.id, workspaceId: workspace.id }),
    getWorkspaceMembers({ workspaceId: workspace.id }),
  ]);

  if (!membership) notFound();

  return (
    <AppLayout
      user={session.user}
      breadcrumb={[{ label: workspace.name }]}
      workspaceId={workspace.id}
      workspaceSlug={slug}
      workspaceInviteToken={workspace.inviteToken}
      canRotateInvite={membership.role === "ADMIN"}
    >
      <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
        <div className="flex items-center flex-wrap">
          <Heading>Incidents</Heading>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <CreateIncidentDialog workspaceId={workspace.id} />
          </div>
        </div>
        {incidents.length > 0 ? (
          <IncidentTable incidents={incidents} workspaceSlug={slug} />
        ) : (
          <Empty className="border border-dashed border-border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BugOffIcon />
              </EmptyMedia>
              <EmptyTitle>No incidents yet</EmptyTitle>
              <EmptyDescription>
                There are no incidents in this workspace yet.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>
    </AppLayout>
  );
}
