import { getSession } from "@/lib/auth";
import { requireMembership } from "@/lib/membership";
import { getWorkspaceBySlug } from "@/modules/workspace/queries";
import { notFound, redirect } from "next/navigation";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const session = await getSession();

  if (!session) redirect("/sign-in");

  const { slug } = await params;

  const workspace = await getWorkspaceBySlug({ slug });

  if (!workspace) notFound();

  await requireMembership({
    userId: session.user.id,
    workspaceId: workspace.id,
    minRole: "VIEWER",
  });

  return <>{children}</>;
}
