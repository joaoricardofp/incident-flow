import { ActivityIcon, ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Navigation } from "@/components/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Heading, Text } from "@/components/ui/typography";
import { getSession } from "@/lib/auth";
import { formatEnum } from "@/lib/format-enum";
import { getMembership } from "@/lib/membership";
import { getIncidentById } from "@/modules/incident/queries";
import { CreateCommentForm } from "@/modules/timeline/components/create-comment-form";
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

  const [incident, timeline, membership] = await Promise.all([
    getIncidentById({ incidentId: id, workspaceId: workspace.id }),
    getTimelineByIncident({ incidentId: id, workspaceId: workspace.id }),
    getMembership({ userId: session.user.id, workspaceId: workspace.id }),
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
      <main className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
        <header className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-4">
              <Heading className="max-w-4xl text-3xl leading-tight sm:text-4xl">
                {incident.title}
              </Heading>
              <Text variant="muted" className="font-mono">
                {incident.id}
              </Text>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{formatEnum(incident.severity)}</Badge>
              <Badge>{formatEnum(incident.status)}</Badge>
            </div>
            <Text variant="lead" className="max-w-3xl">
              {incident.description ?? "No description provided."}
            </Text>
          </div>
        </header>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          <div className="flex min-w-0 flex-col gap-6">
            {membership?.role === "ADMIN" && (
              <Card>
                <CardContent>
                  <CreateCommentForm
                    incidentId={incident.id}
                    workspaceId={workspace.id}
                  />
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader>
                <CardTitle className="text-xs font-semibold tracking-wider uppercase">
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TimelineList items={timeline} />
              </CardContent>
            </Card>
          </div>

          <aside className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-xs font-semibold tracking-wider uppercase">
                  Details
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-4">
                  <Text variant="small">Status</Text>
                  <Badge>{formatEnum(incident.status)}</Badge>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <Text variant="small">Severity</Text>
                  <Badge variant="outline">
                    {formatEnum(incident.severity)}
                  </Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-4">
                  <Text variant="small">Opened at</Text>
                  <Text className="mt-0 text-right text-sm leading-5">
                    {incident.createdAt.toLocaleDateString()}
                  </Text>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <Text variant="small">Closed at</Text>
                  <Text className="mt-0 text-right text-sm leading-5">
                    {incident.resolvedAt?.toLocaleDateString() ?? "-"}
                  </Text>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <Text variant="small">Created by</Text>
                  <Text className="mt-0 text-right text-sm leading-5">
                    {incident.createdBy?.name ?? "Deleted user"}
                  </Text>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xs font-semibold tracking-wider uppercase">
                  Postmortem
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Text variant="small" className="mt-0">
                  No postmortem information is available for this incident.
                </Text>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </>
  );
}
