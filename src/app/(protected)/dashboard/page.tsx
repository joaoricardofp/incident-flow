import { getSession } from "@/lib/auth";
import { WorkspaceCard } from "@/modules/workspace/components/workspace-card";
import { getWorkspacesByUser } from "@/modules/workspace/queries";

export default async function DashboardPage() {
  const session = await getSession();

  const workspaces = await getWorkspacesByUser({
    userId: session?.user.id as string,
  });

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="grid auto-rows-min gap-4 md:grid-cols-3">
        {workspaces.map((workspace) => (
          <WorkspaceCard key={workspace.id} {...workspace} />
        ))}
      </div>
    </div>
  );
}
