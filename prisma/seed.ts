import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import {
  PrismaClient,
  Role,
  Severity,
  Status,
  StatusPostmortem,
  TimelineType,
} from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL!;

const pool = new Pool({
  connectionString,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

async function getUser(email: string) {
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    throw new Error(
      `Usuário "${email}" não encontrado. Execute primeiro a seed do Better Auth.`,
    );
  }

  return user;
}

async function main() {
  console.log("🌱 Seeding database...");

  // Usuários criados pelo Better Auth
  const admin = await getUser("admin@example.com");
  const alice = await getUser("alice@example.com");
  const bob = await getUser("bob@example.com");

  // Workspace
  const workspace = await prisma.workspace.upsert({
    where: {
      slug: "acme",
    },
    update: {},
    create: {
      name: "Acme Inc.",
      slug: "acme",
    },
  });

  // Memberships
  await prisma.membership.upsert({
    where: {
      userId_workspaceId: {
        userId: admin.id,
        workspaceId: workspace.id,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      workspaceId: workspace.id,
      role: Role.ADMIN,
    },
  });

  await prisma.membership.upsert({
    where: {
      userId_workspaceId: {
        userId: alice.id,
        workspaceId: workspace.id,
      },
    },
    update: {},
    create: {
      userId: alice.id,
      workspaceId: workspace.id,
      role: Role.VIEWER,
    },
  });

  await prisma.membership.upsert({
    where: {
      userId_workspaceId: {
        userId: bob.id,
        workspaceId: workspace.id,
      },
    },
    update: {},
    create: {
      userId: bob.id,
      workspaceId: workspace.id,
      role: Role.VIEWER,
    },
  });

  // Incidente resolvido
  const incident = await prisma.incident.create({
    data: {
      workspaceId: workspace.id,
      title: "API indisponível",
      description: "A API principal retornou HTTP 503.",
      severity: Severity.CRITICAL,
      status: Status.RESOLVED,
      resolvedAt: new Date(),
      createdById: admin.id,
    },
  });

  // Timeline
  await prisma.timeline.createMany({
    data: [
      {
        incidentId: incident.id,
        authorId: admin.id,
        type: TimelineType.COMMENT,
        message: "Incidente identificado.",
      },
      {
        incidentId: incident.id,
        authorId: alice.id,
        type: TimelineType.STATUS_CHANGED,
        metadata: {
          from: "INVESTIGATING",
          to: "RESOLVED",
        },
      },
      {
        incidentId: incident.id,
        authorId: bob.id,
        type: TimelineType.COMMENT,
        message: "Serviço normalizado.",
      },
    ],
  });

  // Postmortem
  const postmortem = await prisma.postmortem.create({
    data: {
      incidentId: incident.id,
      createdById: admin.id,
      status: StatusPostmortem.PUBLISHED,
      content: {
        summary: "Falha causada pela exaustão do pool de conexões.",
        impact: "API indisponível durante 18 minutos.",
        rootCause: "Configuração incorreta do pool.",
        actionItems: [
          "Aumentar limite do pool.",
          "Adicionar monitoramento.",
          "Criar testes de carga.",
        ],
      },
    },
  });

  // Histórico do Postmortem
  await prisma.postmortemVersion.createMany({
    data: [
      {
        postmortemId: postmortem.id,
        editedById: admin.id,
        content: {
          version: 1,
          notes: "Versão inicial.",
        },
      },
      {
        postmortemId: postmortem.id,
        editedById: alice.id,
        content: {
          version: 2,
          notes: "Revisão e ajustes finais.",
        },
      },
    ],
  });

  console.log("✅ Seed concluída com sucesso.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (error) => {
    console.error(error);

    await prisma.$disconnect();
    await pool.end();

    process.exit(1);
  });
