import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/typography";
import { formatEnum } from "@/lib/format-enum";
import type { PostmortemSummary } from "../queries";
import { CreatePostmortemButton } from "./create-postmortem-button";

type PostmortemCardProps = {
  incidentId: string;
  workspaceId: string;
  workspaceSlug: string;
  postmortem: PostmortemSummary | null;
  canEdit: boolean;
};

export function PostmortemCard({
  incidentId,
  workspaceId,
  workspaceSlug,
  postmortem,
  canEdit,
}: PostmortemCardProps) {
  if (!postmortem) {
    return (
      <div className="flex flex-col gap-3">
        <Text variant="small" className="mt-0">
          No postmortem information is available for this incident.
        </Text>
        {canEdit && (
          <div>
            <CreatePostmortemButton
              incidentId={incidentId}
              workspaceId={workspaceId}
              workspaceSlug={workspaceSlug}
            />
          </div>
        )}
      </div>
    );
  }

  const label =
    postmortem.status === "PUBLISHED" && postmortem.versionCount > 0
      ? "Published"
      : postmortem.versionCount > 0
        ? "Draft — previously published"
        : "Draft";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <Badge
          variant={postmortem.status === "PUBLISHED" ? "default" : "outline"}
        >
          {formatEnum(postmortem.status)}
        </Badge>
        <Text variant="muted" className="mt-0 text-xs">
          {label}
          {postmortem.versionCount > 0
            ? ` · ${postmortem.versionCount} version${postmortem.versionCount === 1 ? "" : "s"}`
            : ""}
        </Text>
      </div>
      <div>
        <Link
          href={`/${workspaceSlug}/incidents/${incidentId}/postmortem`}
          className="inline-flex"
        >
          <Button variant="outline">
            {canEdit ? "Open and edit" : "View postmortem"}
          </Button>
        </Link>
      </div>
    </div>
  );
}
