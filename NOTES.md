Aqui está a orientação detalhada sobre como integrar o Dashboard de forma elegante e a lista completa de inconsistências, bugs sutis e quebras
  de padrões identificadas nas alterações recentes.
  ──────
  ### 1. Como orientar o Dashboard para não deixá-lo órfão

  A melhor abordagem é adotar o Layout Unificado com Sidebar (AppLayout) também no Dashboard. Isso traz paridade com ferramentas modernas como
  Linear, Vercel e Supabase.

  #### Por que é a melhor escolha?

  1. O AppSidebar já está preparado para páginas sem workspace ativo:
      • Quando workspaceId e workspaceSlug não são passados, ele simplesmente não renderiza o IncidentSidebar.
      • O WorkspaceSwitcher entra no estado neutro ("Select workspace" com o ícone de caixas), permitindo que o usuário alterne rapidamente para
      qualquer um dos seus workspaces direto da barra lateral.
      • O rodapé com perfil do usuário (AppUser) e logout continuam acessíveis.
  2. Elimina a duplicidade de sistemas de navegação:
      • Uma vez migrado o Dashboard, o componente legado navigation.tsx pode ser completamente removido da base de código.


  #### Como aplicar na prática em src/app/(protected)/dashboard/page.tsx/dashboard/page.tsx):

    import { BugOffIcon } from "lucide-react";
    import { redirect } from "next/navigation";
    import AppLayout from "@/layouts/app-layout";
    import {
      Empty,
      EmptyDescription,
      EmptyHeader,
      EmptyMedia,
      EmptyTitle,
    } from "@/components/ui/empty";
    import { Heading } from "@/components/ui/typography";
    import { getSession } from "@/lib/auth";
    import { CreateWorkspaceButton } from "@/modules/workspace/components/create-workspace-button";
    import { WorkspaceCard } from "@/modules/workspace/components/workspace-card";
    import { getWorkspacesByUser } from "@/modules/workspace/queries";

    export default async function DashboardPage() {
      const session = await getSession();

      if (!session) redirect("/sign-in");

      const workspaces = await getWorkspacesByUser({
        userId: session.user.id,
      });

      return (
        <AppLayout user={session.user} breadcrumb={[{ label: "Dashboard" }]}>
          <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
            <div className="flex items-center flex-wrap">
              <Heading variant="h2">
                {`Your Workspace${workspaces.length !== 1 ? "s" : ""}`}
              </Heading>
              <div className="ml-auto">
                <CreateWorkspaceButton />
              </div>
            </div>
            {workspaces.length > 0 ? (
              <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                {workspaces.map((workspace) => (
                  <WorkspaceCard key={workspace.id} {...workspace} />
                ))}
              </div>
            ) : (
              <Empty className="border border-dashed border-border">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <BugOffIcon />
                  </EmptyMedia>
                  <EmptyTitle>No workspaces found</EmptyTitle>
                  <EmptyDescription>
                    You don't have any workspaces yet.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </div>
        </AppLayout>
      );
    }
  ──────
  ### 2. Inconsistências e Quebras de Padrões Identificadas

  Avaliamos a fundo todos os novos arquivos e alterações. Aqui estão os pontos de atenção:
  ──────
  #### 🚨 1. Tags <SidebarInset> aninhadas (<main> dentro de <main>)

  • Local: app-layout.tsx:51-54 e app-content.tsx:14
  • O Problema:
  No AppLayout, você tem:
    <SidebarInset>
      <AppHeader ... />
      <AppContent variant="sidebar">{children}</AppContent>
    </SidebarInset>
  Porém, dentro de AppContent, se variant === "sidebar", ele retorna outro <SidebarInset>:
    if (variant === "sidebar") {
      return <SidebarInset {...props}>{children}</SidebarInset>;
    }
  Como o SidebarInset é renderizado como uma tag HTML <main>, você acaba com dois <main> aninhados no DOM. Isso viola as diretrizes de
  acessibilidade (WCAG) e causa conflito nas classes de margem e padding do Tailwind.
  • Correção: No AppContent, para a variante sidebar, retorne apenas um container regular (por exemplo, <div className="flex flex-1 flex-col" {..
  .props}>{children}</div>).
  ──────
  #### 🚨 2. Pacote cn externo vs @/lib/utils

  • Local: popover.tsx:5 e package.json:31
  • O Problema:
  popover.tsx faz:
    import { cn } from "cn";
  Isso forçou a instalação do pacote "cn": "^0.4.0" no package.json. No resto de todo o projeto, a função de classes utilitárias é sempre
  importada de @/lib/utils (que utiliza twMerge + clsx). O pacote "cn" da npm não resolve conflitos do Tailwind CSS.
  • Correção: Trocar para import { cn } from "@/lib/utils" e remover a dependência "cn" do package.json.
  ──────
  #### ⚠️ 3. Duplicação de Queries no Banco por falta de cache()

  • Local: queries.ts e queries.ts
  • O Problema:
      • getWorkspaceBySlug está envolvido em cache(...) do React, mas getWorkspacesByUser e getIncidentsByWorkspace não estão.
      • No AppSidebar, ambas as queries são executadas. Porém, na página [workspace]/page.tsx, getIncidentsByWorkspace é chamado novamente. No
      Dashboard, getWorkspacesByUser também é chamado de novo.
      • Resultado: para a mesma requisição HTTP, o Next.js dispara duas queries idênticas ao banco.
  • Correção: Envolver essas funções de query com cache() do pacote react para deduplicação automática no ciclo de vida do Server Component:
    import { cache } from "react";
    export const getWorkspacesByUser = cache(async ({ userId }: { userId: string }) => { ... });
    export const getIncidentsByWorkspace = cache(async ({ workspaceId }: { workspaceId: string }) => { ... });

  ──────
  #### ⚠️ 4. Spinner preso para sempre no WorkspaceSwitcher

  • Local: workspace-switcher.tsx:112
  • O Problema:
    const isPendingWorkspace = item.id === pendingWorkspaceId;
  O estado isPendingWorkspace não verifica isPending.
  Quando a transição do React termina, pendingWorkspaceId não é limpo. Se o componente continuar montado (em layouts persistentes ou soft
  navigations), o Spinner continuará girando para sempre e o CheckIcon nunca volta a aparecer.
  • Correção:
    const isPendingWorkspace = isPending && item.id === pendingWorkspaceId;

  ──────
  #### ⚠️ 5. Falha no botão de convite (/invite/undefined) em NavActions

  • Local: nav-actions.tsx:24-65 e [workspace]/incidents/[id]/page.tsx file:///C:/dev/incident-
  flow/src/app/(protected)/[workspace]/incidents/[id]/page.tsx#L62
  • O Problema:
      1. Em [workspace]/incidents/[id]/page.tsx, esqueceu-se de passar workspaceInviteToken={workspace.inviteToken} para o <AppLayout>.
      2. Como o NavActions é renderizado incondicionalmente no AppHeader, tanto no detalhe do incidente quanto no Dashboard o usuário vê o botão
      de compartilhar exibindo a URL: http://.../invite/undefined.
      3. Se process.env.NEXT_PUBLIC_APP_URL não estiver configurado no .env, a string gerada fica "undefined/invite/...".
  • Correção:
      • No AppHeader: só renderizar NavActions se houver token:
        {workspaceInviteToken && (
          <div className="ml-auto px-6">
            <NavActions workspaceInviteToken={workspaceInviteToken} />
	  </div>
	)}

      • No NavActions: adicionar fallback para window.location.origin no lado do cliente.
      • No IncidentPage: repassar workspaceInviteToken={workspace.inviteToken} para o AppLayout.

  ──────
  #### 🔍 6. Inconsistência nos Seletores de Estado Base UI (data-open vs data-[state=open])

  • Local: app-user.tsx:41 e nav-actions.tsx:46
  • O Problema:
      • No workspace-switcher.tsx, usou-se a convenção correta do Base UI: data-open:....
      • No app-user.tsx e nav-actions.tsx, usou-se a sintaxe do Radix UI: data-[state=open]:....
      • Com isso, o highlight de "menu aberto" não funciona no botão de usuário e no botão de ações.
  • Correção: Padronizar para data-open:... em ambos.
  ──────
  #### 🧹 7. Resíduos e Limpeza de Código

  1. Imports não utilizados: import { Navigation } from "@/components/navigation"; continuou sobrando no topo de [workspace]/page.tsx
  file:///C:/dev/incident-flow/src/app/(protected)/[workspace]/page.tsx#L8 e [workspace]/incidents/[id]/page.tsx file:///C:/dev/incident-
  flow/src/app/(protected)/[workspace]/incidents/[id]/page.tsx#L9.
  2. Fragment redundante: <> <AppLayout ...> ... </AppLayout> </> em [workspace]/page.tsx.
  3. Typo em tipagem: Em app-content.tsx, o tipo foi nomeado como type AppShelContentProps (com apenas um 'l').
  4. Item estático no menu: Em app-user.tsx, o item <DropdownMenuItem><BadgeCheckIcon />Account</DropdownMenuItem> não possui href nem evento de
  clique configurado.
