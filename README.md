# TaskFlow — Incident Management & Postmortem Platform

**TaskFlow** is an incident management and postmortem platform designed for engineering teams to track system outages, log incident timelines, and collaborate on postmortems.

> [!NOTE]
> **Project Status:** TaskFlow is currently an **in-progress Minimum Viable Product (MVP)**. The core domain schema, database migrations, authentication system, workspace creation Server Action, and two-layer workspace authorization are implemented. UI pages and business logic for managing incidents, timelines, and postmortems are under active development.

---

## Table of Contents

- [Purpose](#purpose)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running in Development and Production](#running-in-development-and-production)
- [Running Tests](#running-tests)
- [Available Scripts](#available-scripts)
- [Usage Examples](#usage-examples)
- [Endpoints](#endpoints)
- [Authentication & Authorization Flow](#authentication--authorization-flow)
- [Conventions Adopted](#conventions-adopted)
- [How to Contribute](#how-to-contribute)
- [License](#license)
- [Pending Information](#pending-information)

---

## Purpose

System outages and degraded service events require structured coordination, transparent communication, and thorough root-cause analysis. TaskFlow provides a workspace-based incident command center where engineering teams can:

- Create and manage isolated workspaces with role-based access control (`ADMIN`, `VIEWER`).
- Log incidents with status progression (`OPEN` $\rightarrow$ `INVESTIGATING` $\rightarrow$ `RESOLVED`) and severity classification (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
- Maintain append-only incident timelines for auditability (`COMMENT`, `STATUS_CHANGED`, `SEVERITY_CHANGED`).
- Draft, review, and publish incident postmortems (`DRAFT` $\rightarrow$ `PUBLISHED`) with revision history tracking.

---

## Key Features

### Implemented

- **Domain Schema & Database Migrations:** Complete PostgreSQL domain schema via Prisma ORM 7 covering `User`, `Session`, `Account`, `Verification`, `Workspace`, `Membership`, `Incident`, `Timeline`, `Postmortem`, and `PostmortemVersion`.
- **Authentication:** Session-based authentication via Better Auth (`^1.6.23`) supporting Email/Password credentials and GitHub OAuth provider (`/api/auth/[...all]`).
- **Two-Layer Authorization System:**
  - *Route level:* Session enforcement in route groups via `(protected)/layout.tsx`.
  - *Workspace level:* Programmatic authorization helpers (`requireMembership` / `getMembership` in `src/lib/membership.ts`) enforcing workspace membership and role hierarchy (`ADMIN` > `VIEWER`).
- **Workspace Management:** Dashboard listing user workspaces, role badges, workspace creation Server Action (`createWorkspace`), and dynamic route matching (`/[workspace]`).
- **Database Seeding:** Reproducible seed script (`prisma/seed.ts`) populating mock workspaces, memberships, resolved incidents, timeline events, and postmortem versions.
- **Modern UI & Design System:** Built on Next.js 16 (App Router), Tailwind CSS 4, `@base-ui/react`, Radix/shadcn primitives, Lucide icons, and Sonner toast notifications.

### Planned / Under Active Development

- **Incident Command Center:** UI components, views, and Server Actions for creating, assigning, and updating incident status and severity.
- **Interactive Timeline Stream:** Real-time incident activity stream for adding comments, status updates, and severity changes.
- **Collaborative Postmortem Editor:** Integration of Liveblocks (`@liveblocks/react-tiptap`) and Tiptap for multi-user postmortem drafting and publishing.
- **Member & Role Administration:** UI forms for inviting workspace members and modifying assigned roles.

---

## Tech Stack

| Category | Technology | Version / Details |
| :--- | :--- | :--- |
| **Framework** | Next.js | `16.2.10` (App Router, Server Components & Server Actions) |
| **Runtime & Language** | Node.js / TypeScript | Node.js `>=20.x`, TypeScript `^5.9.3`, React `19.2.4` |
| **Database** | PostgreSQL | PostgreSQL instance (local or hosted, e.g., Neon Postgres) |
| **ORM & Driver Adapter** | Prisma | `@prisma/client` `^7.8.0`, CLI `^7.9.0`, `@prisma/adapter-pg` `^7.8.0` |
| **Authentication** | Better Auth | `better-auth` `^1.6.23` with `@better-auth/prisma-adapter` |
| **Styling & UI Primitives** | Tailwind CSS & Base UI | Tailwind CSS `^4`, `@base-ui/react` `^1.6.0`, `lucide-react` `^1.25.0` |
| **Real-Time Collaboration** | Liveblocks *(Configured)* | `@liveblocks/client`, `@liveblocks/react-tiptap` (`^3.22.0`) |
| **Form & Validation** | React Hook Form & Zod | `react-hook-form` `^7.82.0`, `zod` `^4.4.3` |
| **Code Quality** | Biome | `@biomejs/biome` `2.2.0` |

---

## Architecture

TaskFlow adopts a **Domain-Driven Modular Architecture** paired with Next.js App Router patterns:

1. **Domain-Driven Modules (`src/modules/*`):** Code is partitioned by domain entity (e.g., `src/modules/workspace/`). Each module encapsulates its database queries (`queries.ts`), Server Actions (`actions.ts`), type schemas, and domain components.
2. **Server Actions as Primary Mutation Layer:** Data mutations use Next.js Server Actions rather than traditional REST API endpoints.
3. **Explicit Two-Layer Authorization:** Authorization logic is centralized in `src/lib/membership.ts`:
   - `getMembership({ userId, workspaceId })`: Retrieves user role in a workspace.
   - `requireMembership({ userId, workspaceId, minRole })`: Validates user access against required minimum role (`ADMIN` or `VIEWER`), throwing `AuthorizationError` on failure.
4. **App Router Layout Hierarchy:**
   - `src/app/(auth)/`: Unprotected authentication routes (`/sign-in`, `/sign-up`).
   - `src/app/(protected)/`: Protected application layout verifying user sessions.
   - `src/app/(protected)/[workspace]/`: Workspace-scoped routes enforcing workspace membership validation in `layout.tsx`.

---

## Project Structure

```text
task-flow/
├── prisma/
│   ├── schema.prisma         # Complete PostgreSQL domain & auth schema
│   └── seed.ts               # Database seed script for development
├── src/
│   ├── app/                  # Next.js App Router pages & route handlers
│   │   ├── (auth)/           # Auth route group (sign-in, sign-up)
│   │   │   ├── sign-in/
│   │   │   └── sign-up/
│   │   ├── (protected)/      # Protected route group
│   │   │   ├── [workspace]/  # Dynamic workspace layout & page shell
│   │   │   ├── dashboard/    # Workspace dashboard view
│   │   │   └── layout.tsx    # Global session verification layout
│   │   ├── api/
│   │   │   └── auth/         # Better Auth HTTP handler (/api/auth/[...all])
│   │   ├── globals.css       # Global styles & Tailwind CSS imports
│   │   ├── layout.tsx        # Root layout
│   │   └── page.tsx          # Landing page
│   ├── components/           # Shared UI components & forms
│   │   ├── forms/            # Shared form components (sign-in, sign-up)
│   │   ├── ui/               # Primitive UI elements (button, card, empty, etc.)
│   │   ├── app-sidebar.tsx   # Sidebar navigation component
│   │   ├── icons.tsx         # Icon definitions
│   │   └── navigation.tsx    # Top navigation header
│   ├── generated/
│   │   └── prisma/           # Prisma generated client output
│   ├── hooks/                # Custom React hooks (use-mobile)
│   ├── lib/                  # Singletons, auth, & authorization utilities
│   │   ├── auth-client.ts    # Better Auth client for React
│   │   ├── auth.ts           # Better Auth server configuration
│   │   ├── membership.ts     # Workspace authorization & role checking
│   │   ├── prisma.ts         # Prisma Client instance with pg adapter
│   │   └── utils.ts          # Utility functions (cn)
│   └── modules/              # Domain-driven feature modules
│       └── workspace/
│           ├── components/   # Workspace components (card, create button)
│           ├── actions.ts    # Workspace Server Actions (createWorkspace)
│           └── queries.ts    # Workspace queries (getWorkspacesByUser, etc.)
├── .env                      # Local environment configuration
├── biome.json                # Biome linter & formatter configuration
├── liveblocks.config.ts      # Liveblocks type definitions configuration
├── next.config.ts            # Next.js configuration
├── package.json              # Project metadata, dependencies, & scripts
├── prisma.config.ts          # Prisma CLI configuration
└── tsconfig.json             # TypeScript compiler configuration
```

---

## Prerequisites

Ensure your development environment meets the following requirements:

- **Node.js:** `v20.x` or higher
- **Package Manager:** `pnpm` (repository contains `pnpm-lock.yaml`)
- **PostgreSQL Database:** A PostgreSQL database instance (local or hosted, e.g., Neon Postgres)

---

## Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/joaoricardofp/incident-flow.git
   cd task-flow
   ```

2. **Install dependencies:**

   ```bash
   pnpm install
   ```

3. **Configure environment variables:**

   Create a `.env` file in the root directory (refer to [Environment Variables](#environment-variables)):

   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/taskflow_db"
   BETTER_AUTH_SECRET="your-random-32-character-secret"
   BETTER_AUTH_URL="http://localhost:3000"
   GITHUB_CLIENT_ID="your-github-client-id"
   GITHUB_CLIENT_SECRET="your-github-client-secret"
   LIVEBLOCKS_SECRET_KEY="your-liveblocks-secret-key"
   ```

4. **Generate Prisma Client and push database schema:**

   ```bash
   pnpm dlx prisma generate
   pnpm dlx prisma db push
   ```

5. **Seed the database (Optional):**

   > [!IMPORTANT]
   > The seed script (`prisma/seed.ts`) links mock data to pre-existing user accounts (`admin@example.com`, `alice@example.com`, `bob@example.com`). Register these users via the application sign-up form before executing the seed script.

   ```bash
   pnpm dlx prisma db seed
   ```

---

## Environment Variables

The application configures environment variables as listed below:

| Variable Name | Description | Required | Notes |
| :--- | :--- | :---: | :--- |
| `DATABASE_URL` | PostgreSQL connection string used by Prisma ORM and the `@prisma/adapter-pg` driver adapter. | **Yes** | `postgresql://user:pass@host:5432/dbname` |
| `BETTER_AUTH_SECRET` | Secret key used by Better Auth to sign authentication sessions and tokens. | **Yes** | Random string (32+ characters) |
| `BETTER_AUTH_URL` | Base URL of the application used for authentication callbacks and redirects. | **Yes** | e.g. `http://localhost:3000` |
| `GITHUB_CLIENT_ID` | OAuth Client ID for GitHub social sign-in. | No | Required if GitHub OAuth is enabled |
| `GITHUB_CLIENT_SECRET` | OAuth Client Secret for GitHub social sign-in. | No | Required if GitHub OAuth is enabled |
| `LIVEBLOCKS_SECRET_KEY` | Secret key for Liveblocks real-time collaboration services. | No | Required for Liveblocks features |

---

## Running in Development and Production

### Development Mode

Start the Next.js development server with hot-reloading:

```bash
pnpm run dev
```

Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

1. Build the production application bundle:

   ```bash
   pnpm run build
   ```

2. Launch the production server:

   ```bash
   pnpm run start
   ```

---

## Running Tests

> [!NOTE]
> **Test Suite Status:** Currently, **no automated test suite** (such as Jest, Vitest, Cypress, or Playwright) is configured or present in the repository. Testing frameworks and scripts will be introduced as core domain feature modules mature.

---

## Available Scripts

The following scripts are defined in `package.json`:

| Command | Action |
| :--- | :--- |
| `pnpm run dev` | Starts the Next.js development server on `http://localhost:3000`. |
| `pnpm run build` | Compiles and builds the Next.js application for production. |
| `pnpm run start` | Runs the compiled production server. |
| `pnpm run lint` | Runs Biome code linter (`biome check`) across the codebase. |
| `pnpm run format` | Runs Biome code formatter (`biome format --write`) to auto-format code. |

---

## Usage Examples

### Programmatic Workspace Authorization

Authorization is checked in workspace layouts or Server Actions using `requireMembership` from `src/lib/membership.ts`:

```typescript
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
```

---

## Endpoints

The project uses Next.js Server Actions as its primary mutation mechanism. HTTP Route Handlers are reserved for auth catch-all routes and third-party webhooks:

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET / POST` | `/api/auth/[...all]` | Catch-all HTTP route handler for Better Auth (credentials sign-in/up, sessions, OAuth callbacks). | Managed internally by Better Auth |

---

## Authentication & Authorization Flow

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant App as Next.js App Router
    participant Auth as Better Auth (/api/auth)
    participant AuthLib as src/lib/membership.ts
    participant DB as PostgreSQL (Prisma)

    User->>App: Access /[workspace]
    App->>Auth: Check Session (getSession)
    alt No Active Session
        Auth-->>App: null
        App-->>User: Redirect to /sign-in
    else Session Valid
        Auth-->>App: Session User object
        App->>DB: Query Workspace by Slug
        alt Workspace Not Found
            DB-->>App: null
            App-->>User: 404 Not Found
        else Workspace Exists
            App->>AuthLib: requireMembership({ userId, workspaceId, minRole: "VIEWER" })
            AuthLib->>DB: Query Membership (userId + workspaceId)
            alt Not Member or Insufficient Role
                AuthLib-->>App: Throw AuthorizationError
                App-->>User: 404 Not Found
            else Valid Member
                AuthLib-->>App: { role: Role }
                App-->>User: Render Workspace Page
            end
        end
    end
```

### Authorization Rules (`src/lib/membership.ts`)

- **Role Hierarchy:** `ADMIN` (level 2) > `VIEWER` (level 1).
- `hasMinimumRole({ role, minRole })` validates role privileges against required minimum levels.
- Failures during workspace authorization throw an `AuthorizationError`, which is handled by rendering a `notFound()` 404 response to prevent workspace enumeration.

---

## Conventions Adopted

- **Domain-Driven Module Pattern:** Features are grouped under `src/modules/<domain>/` containing domain-specific `components/`, `queries.ts`, and `actions.ts`.
- **Server Actions for Data Mutations:** Mutations rely on Next.js Server Actions with active session checking rather than REST endpoints.
- **Two-Layer Route Protection:** Session validation at the route group level (`(protected)/layout.tsx`) combined with resource membership enforcement (`[workspace]/layout.tsx`).
- **Code Quality & Formatting:** Code standards are enforced using [Biome](https://biomejs.dev/) (`pnpm run lint`, `pnpm run format`).

---

## How to Contribute

Please refer to the [CONTRIBUTING.md](CONTRIBUTING.md) guide for detailed guidelines on setting up the local development environment, coding standards, Biome formatting, type checking, and Conventional Commits conventions.

---

## License

This project is licensed under the Apache License 2.0. See the [LICENSE](LICENSE) file for details.

---

## Pending Information

The following items could not be confirmed from the codebase and should be updated once available:

1. **Environment Example File:** No `.env.example` file exists in the repository root (variables documented in this README were identified through `.env` and source code inspection).
2. **Automated Test Framework:** No testing dependencies (Jest, Vitest, Playwright, Cypress) or test execution scripts are configured in `package.json`.
3. **CI/CD Configuration:** No `.github/workflows` directory or CI pipeline definitions exist in the repository.
4. **Containerization Setup:** No `Dockerfile` or `docker-compose.yml` file is present in the repository root.
5. **Liveblocks API Route & Editor UI Components:** Liveblocks packages (`@liveblocks/client`, `@liveblocks/react-tiptap`, `@liveblocks/node`) and `liveblocks.config.ts` are present, but the HTTP route handler (`/api/liveblocks`) and Tiptap editor UI components have not yet been implemented in `src/`.
