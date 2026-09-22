import { randomUUID } from "node:crypto";
import { type Role, Severity, Status } from "@/generated/prisma/enums";
import prisma from "@/lib/prisma";

export type TestUser = {
  id: string;
  name: string;
  email: string;
};

export type TestContext = {
  workspace: {
    id: string;
    name: string;
    slug: string;
  };
  users: TestUser[];
};

export function requireTestDatabase() {
  if (!process.env.DATABASE_URL_TEST) {
    throw new Error(
      "Integration tests require DATABASE_URL_TEST and never use DATABASE_URL.",
    );
  }
}

export async function createTestContext(
  memberships: Array<{ role: Role }>,
): Promise<TestContext> {
  const suffix = randomUUID();
  const workspace = await prisma.workspace.create({
    data: {
      name: `Test Workspace ${suffix}`,
      slug: `test-workspace-${suffix}`,
    },
  });

  const users: TestUser[] = [];

  for (const membership of memberships) {
    const user = {
      id: randomUUID(),
      name: `Test User ${randomUUID()}`,
      email: `test-${randomUUID()}@example.com`,
    };

    await prisma.user.create({
      data: {
        ...user,
        emailVerified: true,
        memberships: {
          create: {
            workspaceId: workspace.id,
            role: membership.role,
          },
        },
      },
    });

    users.push(user);
  }

  return { workspace, users };
}

export async function createTestIncident({
  workspaceId,
  createdById,
  status = Status.OPEN,
  severity = Severity.MEDIUM,
}: {
  workspaceId: string;
  createdById: string;
  status?: Status;
  severity?: Severity;
}) {
  return prisma.incident.create({
    data: {
      workspaceId,
      createdById,
      title: `Test Incident ${randomUUID()}`,
      description: "Incident created by an integration fixture.",
      status,
      severity,
      resolvedAt: status === Status.RESOLVED ? new Date() : null,
    },
  });
}

export async function deleteTestContext(context: TestContext) {
  await prisma.workspace.delete({ where: { id: context.workspace.id } });

  for (const user of context.users) {
    await prisma.user.delete({ where: { id: user.id } });
  }
}
