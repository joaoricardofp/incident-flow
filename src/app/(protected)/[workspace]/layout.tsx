import { getSession } from "@/lib/auth";
import { AuthorizationError, requireMembership } from "@/lib/membership";
import { getWorkspaceBySlug } from "@/modules/workspace/queries";
import { notFound, redirect } from "next/navigation";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspace: string }>;
}) {
  const session = await getSession();

  if (!session) redirect("/sign-in");

  const { workspace } = await params;

  const workspaceBySlug = await getWorkspaceBySlug({ slug: workspace });

  if (!workspaceBySlug) notFound();

  try {
    await requireMembership({
      userId: session.user.id,
      workspaceId: workspaceBySlug.id,
      minRole: "VIEWER",
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      notFound();
    } else {
      throw error;
    }
  }

  return <>{children}</>;
}
