# IncidentFlow — Incident Management & Postmortem Platform

**IncidentFlow** is an incident management and postmortem platform designed for engineering teams to track system outages, log incident timelines, and collaborate on postmortems.

> [!NOTE]
> **Project Status:** IncidentFlow is currently an **in-progress Minimum Viable Product (MVP)**. The core domain schema, database migrations, authentication system (credentials, email verification, password reset, GitHub OAuth), workspace management, incident tracking, and append-only timeline streams are implemented. Collaborative postmortem drafting with real-time editing is planned.

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

System outages and degraded service events require structured coordination, transparent communication, and thorough root-cause analysis. IncidentFlow provides a workspace-based incident command center where engineering teams can:

- Create and manage isolated workspaces with role-based access control (`ADMIN`, `VIEWER`).
- Log incidents with status progression (`OPEN` $\rightarrow$ `INVESTIGATING` $\rightarrow$ `RESOLVED`) and severity classification (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
- Maintain append-only incident timelines for auditability (`COMMENT`, `STATUS_CHANGED`, `SEVERITY_CHANGED`).
- Draft, review, and publish incident postmortems (`DRAFT` $\rightarrow$ `PUBLISHED`) with revision history tracking.

---

## Key Features

### Implemented

- **Domain Schema & Database Migrations:** Complete PostgreSQL domain schema via Prisma ORM 7 covering `User`, `Session`, `Account`, `Verification`, `Workspace`, `Membership`, `Incident`, `Timeline`, `Postmortem`, and `PostmortemVersion`.
- **Authentication & Transactional Emails:**
  - Session-based authentication via Better Auth (`^1.6.23`) with `@better-auth/prisma-adapter`.
  - Email/Password sign-up and sign-in with email verification enforcement.
  - Password reset flow via tokenized email links.
  - Transactional email templates powered by `@react-email/components` and sent via [Resend](https://resend.com/).
  - Social authentication support via GitHub OAuth (`/api/auth/[...all]`).
- **Two-Layer Authorization System:**
  - *Route level:* Session enforcement in route groups via `src/app/(protected)/layout.tsx`.
  - *Workspace level:* Programmatic authorization helpers (`requireMembership` / `getMembership` in `src/lib/membership.ts`) enforcing workspace membership and role hierarchy (`ADMIN` > `VIEWER`). Unauthorized workspace access renders a 404 response to prevent slug enumeration.
- **Workspace Management:**
  - Dashboard listing user workspaces with assigned role badges.
  - Workspace creation Server Action (`createWorkspace`) with automated unique slug collision resolution.
  - Dynamic workspace routing (`src/app/(protected)/[workspace]/`).
- **Incident Tracking & Management:**
  - Incident listing table per workspace with severity and status badges.
  - Incident creation dialog and Server Action (`createIncident`) with input validation via Zod.
  - Incident detail view (`src/app/(protected)/[workspace]/incidents/[id]/`) displaying metadata, creator info, timestamps, and timeline.
  - Status transition Server Action (`updateIncidentStatus`) recording resolution timestamps and timeline audit entries.
- **Incident Activity & Timeline Stream:**
  - Append-only timeline stream logging status transitions, severity changes, and user comments.
  - Comment submission dialog and Server Action (`createTimelineComment`) restricted to workspace administrators.
  - Resilient timeline query parser (`getTimelineByIncident`) with schema validation and fallback handling for malformed metadata entries.
- **Database Seeding:** Reproducible seed script (`prisma/seed.ts`) populating mock workspaces, memberships, resolved incidents, timeline events, and postmortem versions.
- **Modern UI & Design System:** Built on Next.js 16 (App Router with React Compiler enabled), Tailwind CSS 4, `@base-ui/react`, Radix/shadcn primitives, Lucide icons, and Sonner toast notifications.

### Planned / Under Active Development

- **Collaborative Postmortem Editor:** Integration of Liveblocks (`@liveblocks/react-tiptap`) and Tiptap editor for real-time collaborative drafting and publishing of incident postmortems.
- **Workspace Member Administration:** UI forms and actions for inviting workspace members and modifying assigned roles.
- **Severity Transition Actions:** UI controls for updating incident severity directly with automatic timeline logging.

---

## Tech Stack

| Category | Technology | Version / Details |
| :--- | :--- | :--- |
| **Framework** | Next.js | `16.2.10` (App Router, Server Components, React Compiler) |
| **Runtime & Language** | Node.js / TypeScript | Node.js `>=20.x`, TypeScript `^5.9.3`, React `19.2.4` |
| **Database** | PostgreSQL | PostgreSQL instance (local or hosted, e.g., Neon Postgres) |
| **ORM & Driver Adapter** | Prisma | `@prisma/client` `^7.8.0`, CLI `^7.9.0`, `@prisma/adapter-pg` `^7.8.0`, `@prisma/extension-accelerate` `^3.0.1` |
| **Authentication** | Better Auth | `better-auth` `^1.6.23` with `@better-auth/prisma-adapter` |
| **Email Delivery** | Resend & React Email | `resend` `^6.18.1`, `@react-email/components` `^1.0.12` |
| **Styling & UI Primitives** | Tailwind CSS & Base UI | Tailwind CSS `^4`, `@base-ui/react` `^1.6.0`, `lucide-react` `^1.25.0` |
| **Real-Time Collaboration** | Liveblocks *(Configured)* | `@liveblocks/client`, `@liveblocks/react-tiptap`, `@liveblocks/node` (`^3.22.0`) |
| **Rich Text Editor** | Tiptap *(Configured)* | `@tiptap/react`, `@tiptap/starter-kit` (`^3.28.0`) |
| **Form & Validation** | React Hook Form & Zod | `react-hook-form` `^7.82.0`, `zod` `^4.4.3`, `@hookform/resolvers` `^5.4.0` |
| **Notifications** | Sonner | `sonner` `^2.0.7` |
| **Code Quality** | Biome | `@biomejs/biome` `2.2.0` |

---

## Architecture

IncidentFlow adopts a **Domain-Driven Modular Architecture** paired with Next.js App Router patterns:

1. **Domain-Driven Feature Modules (`src/modules/*`):** Business logic is grouped by domain entity:
   - `src/modules/workspace/`: Queries, Server Actions, and components for workspace management.
   - `src/modules/incident/`: Queries, Server Actions, schemas, and components for incident creation and status tracking.
   - `src/modules/timeline/`: Queries, Server Actions, service helpers, schemas, and UI components for incident activity streams.
2. **Server Actions as Primary Mutation Layer:** Data mutations use Next.js Server Actions rather than traditional REST API endpoints, enforcing server-side session and permission verification.
3. **Explicit Two-Layer Authorization (`src/lib/membership.ts`):**
   - *Session Layer:* Top-level protected route group (`src/app/(protected)/layout.tsx`) verifies active sessions using `getSession()`.
   - *Resource Layer:* Workspace routes and Server Actions invoke `requireMembership({ userId, workspaceId, minRole })` to validate the user's role against the hierarchy (`ADMIN` > `VIEWER`). Unauthorized attempts throw `AuthorizationError`.
4. **App Router Layout Hierarchy:**
   - `src/app/(auth)/`: Unprotected authentication routes (`/sign-in`, `/sign-up`, `/reset-password`).
   - `src/app/(protected)/`: Protected application layout verifying user sessions.
   - `src/app/(protected)/dashboard/`: Workspace dashboard view.
   - `src/app/(protected)/[workspace]/`: Workspace-scoped routes enforcing workspace membership validation in `layout.tsx`.
   - `src/app/(protected)/[workspace]/incidents/[id]/`: Incident detail and timeline view.


---

## Project Structure

```text
incident-flow/
├── prisma/
│   ├── schema.prisma         # Complete PostgreSQL domain & auth schema
│   └── seed.ts               # Database seed script for development
├── public/                   # Static assets & SVGs
├── src/
│   ├── app/                  # Next.js App Router pages & route handlers
│   │   ├── (auth)/           # Authentication route group
│   │   │   ├── reset-password/ # Password reset request & token confirmation page
│   │   │   ├── sign-in/      # Sign-in page
│   │   │   └── sign-up/      # Sign-up page
│   │   ├── (protected)/      # Protected route group
│   │   │   ├── [workspace]/  # Dynamic workspace routes
│   │   │   │   ├── incidents/[id]/ # Incident detail & timeline page
│   │   │   │   ├── layout.tsx# Workspace authorization & membership check
│   │   │   │   └── page.tsx  # Workspace incidents overview
│   │   │   ├── dashboard/    # User workspaces dashboard
│   │   │   └── layout.tsx    # Root session verification layout
│   │   ├── api/
│   │   │   └── auth/         # Better Auth HTTP handler (/api/auth/[...all])
│   │   ├── globals.css       # Global styles & Tailwind CSS imports
│   │   ├── layout.tsx        # Root HTML layout with providers
│   │   └── page.tsx          # Public landing page
│   ├── components/           # Shared UI components & forms
│   │   ├── forms/            # Auth forms (sign-in, sign-up, reset-password, github-sign-in)
│   │   ├── ui/               # Primitive UI components (button, card, dialog, table, marker, etc.)
│   │   ├── app-sidebar.tsx   # Sidebar navigation component
│   │   ├── icons.tsx         # Icon SVG components
│   │   └── navigation.tsx    # Top navigation header with user dropdown
│   ├── emails/               # React Email transactional templates
│   │   ├── reset-password.tsx# Password reset email template
│   │   └── verifications.tsx # Email verification template
│   ├── generated/
│   │   └── prisma/           # Prisma generated client output
│   ├── hooks/                # Custom React hooks (use-mobile)
│   │   └── use-mobile.ts
│   ├── lib/                  # Singletons, auth, & authorization utilities
│   │   ├── auth-client.ts    # Better Auth client instance for React
│   │   ├── auth.ts           # Better Auth server configuration with Resend integration
│   │   ├── format-enum.ts    # Enum formatting utility
│   │   ├── membership.ts     # Workspace authorization & role hierarchy checks
│   │   ├── prisma.ts         # Prisma Client instance with pg adapter & Accelerate
│   │   ├── resend.ts         # Resend client singleton
│   │   └── utils.ts          # Utility functions (cn / clsx / tailwind-merge)
│   └── modules/              # Domain-driven feature modules
│       ├── incident/         # Incident domain module
│       │   ├── components/   # Incident components (table, create dialog/form)
│       │   ├── actions.ts    # Server Actions (createIncident, updateIncidentStatus)
│       │   ├── queries.ts    # Incident queries (getIncidentsByWorkspace, getIncidentById)
│       │   └── schema.ts     # Zod validation schemas
│       ├── timeline/         # Timeline domain module
│       │   ├── components/   # Timeline components (list, comment, change-marker, fallback)
│       │   ├── actions.ts    # Server Actions (createTimelineComment)
│       │   ├── queries.ts    # Timeline queries (getTimelineByIncident)
│       │   ├── schema.ts     # Zod validation schemas
│       │   └── service.ts    # Timeline entry creation helper
│       └── workspace/        # Workspace domain module
│           ├── components/   # Workspace components (card, create button)
│           ├── actions.ts    # Server Actions (createWorkspace)
│           └── queries.ts    # Workspace queries (getWorkspacesByUser, getWorkspaceBySlug)
├── biome.json                # Biome linter & formatter configuration
├── components.json           # shadcn component library configuration
├── CONTRIBUTING.md           # Contribution guidelines & workflow
├── LICENSE                   # Apache License 2.0
├── liveblocks.config.ts      # Liveblocks type definitions
├── next.config.ts            # Next.js configuration (React Compiler enabled)
├── package.json              # Project metadata, dependencies, & scripts
├── pnpm-lock.yaml            # pnpm dependency lockfile
├── pnpm-workspace.yaml       # pnpm workspace configuration
├── postcss.config.mjs        # PostCSS configuration for Tailwind CSS v4
├── prisma.config.ts          # Prisma CLI configuration
└── tsconfig.json             # TypeScript compiler configuration
```

---

## Prerequisites

Ensure your development environment meets the following requirements:

- **Node.js:** `v20.x` or higher
- **Package Manager:** [`pnpm`](https://pnpm.io/) (repository includes `pnpm-lock.yaml`)
- **PostgreSQL Database:** A PostgreSQL database instance (local or hosted, e.g., Neon Postgres)
- **Resend Account:** API key for sending email verification and password reset emails

---

## Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/joaoricardofp/incident-flow.git
   cd incident-flow
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
   RESEND_API_KEY="re_123456789"
   EMAIL_FROM="onboarding@resend.dev"
   GITHUB_CLIENT_ID=""
   GITHUB_CLIENT_SECRET=""
   LIVEBLOCKS_SECRET_KEY=""
   ```

4. **Generate Prisma Client and apply database schema:**

   ```bash
   pnpm dlx prisma generate
   pnpm dlx prisma db push
   ```

5. **Seed the database (Optional):**

   > [!IMPORTANT]
   > The seed script (`prisma/seed.ts`) links mock data to existing user accounts (`admin@example.com`, `alice@example.com`, `bob@example.com`). Register these users via the application sign-up form before executing the seed script.

   ```bash
   pnpm dlx prisma db seed
   ```

---

## Environment Variables

The application relies on the following environment variables:

| Variable Name | Description | Required | Notes |
| :--- | :--- | :---: | :--- |
| `DATABASE_URL` | PostgreSQL connection string used by Prisma ORM and the `@prisma/adapter-pg` driver adapter. | **Yes** | e.g. `postgresql://user:password@localhost:5432/incidentflow_db` |
| `BETTER_AUTH_SECRET` | Secret key used by Better Auth to sign session cookies and tokens. | **Yes** | Random 32+ character string |
| `BETTER_AUTH_URL` | Base URL of the application used for auth redirects and client requests. | **Yes** | e.g. `http://localhost:3000` |
| `RESEND_API_KEY` | API key used by the Resend client (`src/lib/resend.ts`) to deliver transactional emails. | **Yes** | Required at application startup |
| `EMAIL_FROM` | Sender email address used for password reset and email verification messages. | **Yes** | e.g. `onboarding@resend.dev` or `noreply@yourdomain.com` |
| `GITHUB_CLIENT_ID` | OAuth Client ID for GitHub social authentication. | No | Required if GitHub sign-in is enabled |
| `GITHUB_CLIENT_SECRET` | OAuth Client Secret for GitHub social authentication. | No | Required if GitHub sign-in is enabled |
| `LIVEBLOCKS_SECRET_KEY` | Secret key for Liveblocks real-time postmortem collaboration. | No | Planned for postmortem editor integration |

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
> **Test Suite Status:** Currently, **no automated test suite** (such as Jest, Vitest, Cypress, or Playwright) is configured or present in the repository. Testing frameworks and scripts will be introduced as the core feature set stabilizes.

---

## Available Scripts

The following scripts are defined in `package.json`:

| Command | Action |
| :--- | :--- |
| `pnpm run dev` | Starts the Next.js development server on `http://localhost:3000`. |
| `pnpm run build` | Compiles and builds the Next.js application for production. |
| `pnpm run start` | Runs the compiled Next.js production server. |
| `pnpm run lint` | Runs Biome code linter (`biome check`) across the codebase. |
| `pnpm run format` | Runs Biome code formatter (`biome format --write`) to auto-format files. |

---

## Usage Examples

### Workspace Authorization in App Router Layouts

Dynamic workspace routes validate user sessions and role permissions before rendering children:

```typescript
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AuthorizationError, requireMembership } from "@/lib/membership";
import { getWorkspaceBySlug } from "@/modules/workspace/queries";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspace: string }>;
}) {
  const [session, resolvedParams] = await Promise.all([getSession(), params]);

  if (!session) redirect("/sign-in");

  const { workspace: slug } = resolvedParams;
  const workspaceBySlug = await getWorkspaceBySlug({ slug });

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

### Mutating Data via Server Actions

Domain mutations enforce session and workspace role checks inside Server Actions:

```typescript
"use server";

import { getSession } from "@/lib/auth";
import { AuthorizationError, requireMembership } from "@/lib/membership";
import prisma from "@/lib/prisma";
import { type IncidentSchema, incidentSchema } from "./schema";

export async function createIncident(
  { workspaceId }: { workspaceId: string },
  data: IncidentSchema,
) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  await requireMembership({
    userId: session.user.id,
    workspaceId,
    minRole: "ADMIN",
  });

  const parsedData = incidentSchema.safeParse(data);
  if (!parsedData.success) {
    return {
      success: false,
      error: parsedData.error.issues.map((i) => i.message).join(", "),
    };
  }

  const incident = await prisma.incident.create({
    data: {
      workspaceId,
      title: parsedData.data.title,
      description: parsedData.data.description,
      severity: parsedData.data.severity,
      createdById: session.user.id,
    },
    select: { id: true },
  });

  return { success: true, incidentId: incident.id };
}
```

---

## Endpoints

The project uses Next.js Server Actions for all domain data mutations. HTTP Route Handlers are reserved for authentication and third-party integrations:

| Method | Endpoint | Description | Auth Requirement |
| :--- | :--- | :--- | :---: |
| `GET / POST` | `/api/auth/[...all]` | Catch-all HTTP Route Handler for Better Auth (sign-in, sign-up, email verification, password reset, OAuth callbacks, session validation). | Handled internally by Better Auth |

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
                App-->>User: 404 Not Found (hides workspace existence)
            else Valid Member
                AuthLib-->>App: { role: Role }
                App-->>User: Render Workspace Page
            end
        end
    end
```

### Authorization Rules (`src/lib/membership.ts`)

- **Role Hierarchy:** `ADMIN` (level 2) > `VIEWER` (level 1).
- `hasMinimumRole({ role, minRole })` compares numerical weights to ensure the user has equal or greater privileges than `minRole`.
- Unauthorized access attempts in workspace layouts throw `AuthorizationError`, which is caught to return a `notFound()` 404 response to prevent unauthorized users from discovering existing workspace slugs.

---

## Conventions Adopted

- **Domain-Driven Feature Organization:** Code is structured by domain entity in `src/modules/<domain>/` with separate `queries.ts` (read operations), `actions.ts` (Server Actions), `schema.ts` (Zod schemas), and `components/`.
- **Server Actions for Mutations:** Mutations are executed via Server Actions with server-side session extraction and role verification.
- **Two-Layer Route Protection:** Top-level session checking in `src/app/(protected)/layout.tsx` combined with granular resource authorization in `src/app/(protected)/[workspace]/layout.tsx`.
- **Resilient Timeline Parsing:** Activity feeds validate JSON metadata against Zod schemas and gracefully fall back to a `MALFORMED` event type if parsing fails, preventing crashes from legacy or corrupted data.
- **Code Standards & Linting:** Code formatting and quality rules are enforced using [Biome](https://biomejs.dev/) (`pnpm run lint`, `pnpm run format`).

---

## How to Contribute

Please review [CONTRIBUTING.md](CONTRIBUTING.md) for full details on our development workflow, Conventional Commits formatting, Biome checks, and pull request guidelines.

---

## License

This project is licensed under the Apache License 2.0. See the [LICENSE](LICENSE) file for details.

---

## Pending Information

The following items could not be confirmed from the codebase and should be updated as the project evolves:

1. **Environment Example File:** No `.env.example` file is currently present in the repository root (environment variables documented here were identified from `.env` and direct source code usage).
2. **Automated Test Suite:** No automated testing framework (Jest, Vitest, Cypress, Playwright) or test runners are installed or configured in `package.json`.
3. **CI/CD Pipeline:** No `.github/workflows` directory or automated continuous integration configuration exists in the repository.
4. **Containerization Configuration:** No `Dockerfile` or `docker-compose.yml` file is provided in the repository root.
5. **Collaborative Postmortem Editor & Liveblocks Route Handler:** While Liveblocks packages (`@liveblocks/client`, `@liveblocks/react-tiptap`, `@liveblocks/node`) and `liveblocks.config.ts` are present, the `/api/liveblocks` Route Handler and Postmortem collaborative UI components have not yet been implemented.
