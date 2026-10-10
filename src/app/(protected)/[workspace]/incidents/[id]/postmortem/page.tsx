import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heading, Text } from "@/components/ui/typography";
import AppLayout from "@/layouts/app-layout";
import { getSession } from "@/lib/auth";
import { formatEnum } from "@/lib/format-enum";
import { AuthorizationError, requireMembership } from "@/lib/membership";
import { getIncidentById } from "@/modules/incident/queries";
import { PostmortemEditor } from "@/modules/postmortem/components/postmortem-editor";
import {
  getPostmortemByIncident,
  getPostmortemVersions,
} from "@/modules/postmortem/queries";
import { buildPostmortemRoomId } from "@/modules/postmortem/schema";
import { getWorkspaceBySlug } from "@/modules/workspace/queries";

export default async function PostmortemPage({
  params,
}: {
  params: Promise<{ workspace: string; id: string }>;
}) {
  const [session, resolvedParams] = await Promise.all([getSession(), params]);

  if (!session) redirect("/sign-in");

  const { workspace: slug, id: incidentId } = resolvedParams;
  const workspace = await getWorkspaceBySlug({ slug });
  if (!workspace) notFound();

  let role: "ADMIN" | "VIEWER";
  try {
    const membership = await requireMembership({
      userId: session.user.id,
      workspaceId: workspace.id,
      minRole: "VIEWER",
    });
    role = membership.role;
  } catch (error) {
    if (error instanceof AuthorizationError) notFound();
    throw error;
  }

  const incident = await getIncidentById({
    incidentId,
    workspaceId: workspace.id,
  });
  if (!incident) notFound();

  const postmortem = await getPostmortemByIncident({
    incidentId,
    workspaceId: workspace.id,
  });
  if (!postmortem) notFound();

  const versions = await getPostmortemVersions({
    postmortemId: postmortem.id,
    workspaceId: workspace.id,
  });

  const canEdit = role === "ADMIN";
  const roomId = buildPostmortemRoomId(postmortem.id);

  console.log({
    isDate: postmortem.updatedAt instanceof Date,
    value: postmortem.updatedAt,
    iso: postmortem.updatedAt.toISOString(),
  });

  return (
    <AppLayout
      user={session.user}
      breadcrumb={[
        { label: workspace.name, href: `/${slug}` },
        { label: incident.title, href: `/${slug}/incidents/${incidentId}` },
        { label: "Postmortem" },
      ]}
      workspaceId={workspace.id}
      workspaceSlug={slug}
      incidentId={incidentId}
      workspaceInviteToken={workspace.inviteToken}
    >
      <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
        <header className="flex flex-wrap items-center gap-3">
          <Heading className="text-2xl leading-tight sm:text-3xl">
            Postmortem — {incident.title}
          </Heading>
          <Badge
            variant={postmortem.status === "PUBLISHED" ? "default" : "outline"}
          >
            {formatEnum(postmortem.status)}
          </Badge>
        </header>

        <PostmortemEditor
          roomId={roomId}
          postmortemId={postmortem.id}
          workspaceId={workspace.id}
          initialContent={postmortem.content}
          baseUpdatedAt={postmortem.updatedAt.toISOString()}
          canEdit={canEdit}
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-semibold tracking-wider uppercase">
              Published versions ({versions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {versions.length === 0 ? (
              <Text variant="small" className="mt-0">
                No published versions yet. Publishing snapshots the current
                document; snapshots are immutable.
              </Text>
            ) : (
              versions.map((version, index) => (
                <div
                  key={version.id}
                  className="flex flex-col gap-1 rounded-lg ring-1 ring-foreground/10 p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Text variant="small" className="mt-0 font-medium">
                      Version {versions.length - index}
                    </Text>
                    <Text variant="muted" className="mt-0 text-xs">
                      {version.createdAt.toLocaleString()} ·{" "}
                      {version.editedBy?.name ?? "Unknown author"}
                    </Text>
                  </div>
                  <pre className="overflow-x-auto rounded bg-muted p-2 font-mono text-xs">
                    {JSON.stringify(version.content, null, 2).slice(0, 2000)}
                  </pre>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
