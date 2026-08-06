import { BugOffIcon } from "lucide-react";
import { notFound, redirect } from "next/navigation";
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
import { CreateIncidentDialog } from "@/modules/incident/components/create-incident-dialog";
import { IncidentTable } from "@/modules/incident/components/incident-table";
import { getIncidentsByWorkspace } from "@/modules/incident/queries";
import { getWorkspaceBySlug } from "@/modules/workspace/queries";

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const session = await getSession();

  if (!session) redirect("/sign-in");

  const { workspace: slug } = await params;
  const workspace = await getWorkspaceBySlug({ slug });

  if (!workspace) notFound();

  const incidents = await getIncidentsByWorkspace({
    workspaceId: workspace.id,
  });

  return (
    <>
      <Navigation
        name={session.user.name}
        email={session.user.email}
        image={session.user.image}
      >
        <Heading className="text-sm font-medium">{workspace.name}</Heading>
      </Navigation>
      <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
        <div className="flex items-center flex-wrap">
          <Heading variant="h2">Incidents</Heading>
          <div className="ml-auto">
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
    </>
  );
}
