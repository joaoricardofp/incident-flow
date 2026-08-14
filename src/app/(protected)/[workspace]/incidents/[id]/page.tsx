import { notFound, redirect } from "next/navigation";
import { Navigation } from "@/components/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heading, Text } from "@/components/ui/typography";
import { getSession } from "@/lib/auth";
import { formatEnum } from "@/lib/format-enum";
import { getIncidentById } from "@/modules/incident/queries";
import { TimelineList } from "@/modules/timeline/components/timeline-list";
import { getTimelineByIncident } from "@/modules/timeline/queries";
import { getWorkspaceBySlug } from "@/modules/workspace/queries";

export default async function IncidentPage({
  params,
}: {
  params: Promise<{ workspace: string; id: string }>;
}) {
  const [session, resolvedParams] = await Promise.all([getSession(), params]);

  if (!session) redirect("/sign-in");

  const { workspace: slug, id } = resolvedParams;
  const workspace = await getWorkspaceBySlug({ slug });

  if (!workspace) notFound();

  const [incident, timeline] = await Promise.all([
    getIncidentById({
      incidentId: id,
      workspaceId: workspace.id,
    }),
    getTimelineByIncident({
      incidentId: id,
      workspaceId: workspace.id,
    }),
  ]);

  if (!incident) notFound();

  return (
    <>
      <Navigation
        name={session.user.name}
        email={session.user.email}
        image={session.user.image}
        breadcrumb={[
          { label: workspace.name, href: `/${slug}` },
          { label: incident.title },
        ]}
      />
      <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
        <section className="flex flex-wrap items-center gap-3">
          <Heading>{incident.title}</Heading>
          <Badge variant="outline">{formatEnum(incident.severity)}</Badge>
          <Badge>{formatEnum(incident.status)}</Badge>
        </section>
        <section>
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <Text variant="muted">Description</Text>
                <Text>
                  {incident.description ?? "No description provided."}
                </Text>
              </div>
              <div>
                <Text variant="muted">Created by</Text>
                <Text>{incident.createdBy?.name ?? "Deleted user"}</Text>
              </div>
              <div>
                <Text variant="muted">Created at</Text>
                <Text>{incident.createdAt.toLocaleDateString()}</Text>
              </div>
              {incident.resolvedAt && (
                <div>
                  <Text variant="muted">Resolved at</Text>
                  <Text>{incident.resolvedAt.toLocaleDateString()}</Text>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
        <div className="flex flex-col gap-4">
          <TimelineList items={timeline} />
        </div>
      </main>
    </>
  );
}
