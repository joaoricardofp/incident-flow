# TaskFlow — Incident Management & Postmortem Platform

**TaskFlow** is an open-source incident management and postmortem platform designed for engineering teams to track system outages, log real-time incident timelines, and collaborate on postmortems.

> [!NOTE]
> **Project Status:** TaskFlow is currently an **in-progress Minimum Viable Product (MVP)**. The core domain schema, database migrations, authentication system, and two-layer workspace authorization are implemented. UI pages and business logic for managing incidents, timelines, and postmortems are planned for upcoming milestones.

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
- [Endpoints](#endpoints)
- [Authentication & Authorization Flow](#authentication--authorization-flow)
- [Conventions Adopted](#conventions-adopted)
- [How to Contribute](#how-to-contribute)
- [License](#license)
- [Pending Information](#pending-information)

---

## Purpose

System outages and degraded service events require structured coordination, transparent communication, and thorough root-cause analysis. TaskFlow provides a workspace-based incident command center where teams can:

- Create and organize workspace environments with role-based access control (`ADMIN`, `VIEWER`).
- Log incidents with status progression (`OPEN` $\rightarrow$ `INVESTIGATING` $\rightarrow$ `RESOLVED`) and severity classification (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
- Maintain append-only incident timelines for auditability.
- Draft, review, and publish incident postmortems with version tracking.

---

## Key Features

### Implemented

- **Database & Domain Modeling:** Complete PostgreSQL schema with Prisma ORM 7 covering Users, Sessions, Accounts, Workspaces, Memberships, Incidents, Timelines, Postmortems, and Postmortem Versions.
- **Authentication:** Integrated Better Auth with support for Email/Password credentials and GitHub OAuth provider (`/api/auth/[...all]`).
- **Two-Layer Authorization System:**
  - _Route level:_ Route group protection via `(protected)/layout.tsx` enforcing active session checks.
  - _Workspace/Resource level:_ Programmatic workspace membership verification (`requireMembership` / `getMembership`) with role hierarchy checks (`ADMIN` > `VIEWER`).
- **Workspace Navigation & Dashboard:** User workspace listing view with `WorkspaceCard` components displaying user roles and workspace dynamic routes (`/[workspace]`).
- **Database Seeding:** Reproducible seed script (`prisma/seed.ts`) populating mock workspaces, memberships, resolved incidents, timeline events, and postmortem version histories.
- **Modern UI Design System:** Built on Next.js 16 (App Router), Tailwind CSS 4, `@base-ui/react`, Radix/shadcn primitives, Lucide icons, and Sonner notifications.

### Planned / Under Active Development

- **Incident Command Center:** UI forms and Server Actions for creating, updating status/severity, and assigning incidents.
- **Interactive Timeline Stream:** Real-time event logging (comments, status changes, severity updates) on incident pages.
- **Real-Time Collaborative Postmortems:** Editor integration utilizing Liveblocks (`@liveblocks/react-tiptap`) and Tiptap for multi-user postmortem editing.
- **Member Management:** UI for inviting users, managing workspace roles, and revoking memberships.

---

## Tech Stack

| Category                    | Technology                    | Version / Details                                            |
| :-------------------------- | :---------------------------- | :----------------------------------------------------------- |
| **Framework**               | Next.js                       | `16.2.10` (App Router, Server Components)                    |
| **Runtime & Language**      | Node.js / TypeScript          | TypeScript `^5.9.3`, React `19.2.4`                          |
| **Database**                | PostgreSQL                    | Neon Postgres / Native PostgreSQL                            |
| **ORM**                     | Prisma                        | `^7.8.0` with `@prisma/adapter-pg` driver adapter            |
| **Authentication**          | Better Auth                   | `^1.6.23` with `@better-auth/prisma-adapter`                 |
| **Styling & Components**    | Tailwind CSS, Base UI, Lucide | Tailwind CSS `^4`, `@base-ui/react`, `lucide-react`          |
| **Real-Time Collaboration** | Liveblocks _(Configured)_     | `@liveblocks/client`, `@liveblocks/react-tiptap` (`^3.22.0`) |
| **Form Management**         | React Hook Form & Zod         | `react-hook-form` `^7.82.0`, `zod` `^4.4.3`                  |
| **Linter & Formatter**      | Biome                         | `@biomejs/biome` `2.2.0`                                     |

---

## Architecture

TaskFlow adopts a **Domain-Driven Modular Architecture** combined with Next.js App Router conventions:

1. **Domain-Driven Modules (`src/modules/*`):** Domain logic, queries, actions, schema validations, and domain-specific UI components are organized by domain (e.g., `src/modules/workspace/`).
2. **Layered Data Access:** Read queries are encapsulated in `queries.ts` files within each module using Prisma Client. Write operations are designed to use Server Actions.
3. **Explicit Two-Layer Authorization:** Authorization is handled imperatively using utility helpers in `src/lib/membership.ts`:
   - `getMembership({ userId, workspaceId })` fetches the user's role in a workspace.
   - `requireMembership({ userId, workspaceId, minRole })` asserts membership and role requirements, throwing `AuthorizationError` if unsatisfied.
4. **App Router Layout Hierarchy:**
   - `src/app/(auth)/`: Unprotected authentication routes (`/sign-in`, `/sign-up`).
   - `src/app/(protected)/`: Protected routes requiring an active session.
   - `src/app/(protected)/[workspace]/`: Workspace-scoped routes enforcing workspace membership validation in `layout.tsx`.

---

## Project Structure

```text
task-flow/
├── prisma/
│   ├── schema.prisma         # Complete PostgreSQL schema (Domain models & Better Auth)
│   └── seed.ts               # Database seed script for development data
├── src/
│   ├── app/                  # Next.js App Router pages, layouts, and route handlers
│   │   ├── (auth)/           # Authentication route group (sign-in, sign-up)
│   │   │   ├── sign-in/
│   │   │   └── sign-up/
│   │   ├── (protected)/      # Protected route group
│   │   │   ├── [workspace]/  # Dynamic workspace layout & page shell
│   │   │   ├── dashboard/    # Workspace list view
│   │   │   └── layout.tsx    # Session verification layout
│   │   ├── api/
│   │   │   └── auth/         # Better Auth HTTP handler (/api/auth/[...all])
│   │   ├── globals.css
│   │   ├── layout.tsx        # Root layout
│   │   └── page.tsx          # Landing page
│   ├── components/           # Shared UI components & forms
│   │   ├── forms/            # Shared forms (sign-in-form, sign-up-form)
│   │   ├── ui/               # Primitive UI components (button, card, badge, etc.)
│   │   ├── app-sidebar.tsx
│   │   └── icons.tsx
│   ├── generated/
│   │   └── prisma/           # Generated Prisma client output
│   ├── lib/                  # Core utility singletons & authorization helpers
│   │   ├── auth-client.ts   # Better Auth client for React
│   │   ├── auth.ts          # Better Auth server configuration
│   │   ├── membership.ts    # Workspace membership & role authorization helpers
│   │   ├── prisma.ts        # PrismaClient instance with pg adapter
│   │   └── utils.ts         # Utility helpers (cn)
│   └── modules/              # Feature modules by domain
│       └── workspace/
│           ├── components/   # Workspace components (e.g., workspace-card.tsx)
│           └── queries.ts    # Workspace database queries
├── .env                      # Local environment configuration
├── biome.json                # Biome code quality configuration
├── liveblocks.config.ts      # Liveblocks type definitions configuration
├── next.config.ts            # Next.js configuration
├── package.json              # Dependencies & npm scripts
├── prisma.config.ts          # Prisma CLI configuration
└── tsconfig.json             # TypeScript compiler settings
```

---

## Prerequisites

Before running the project locally, ensure you have the following installed:

- **Node.js:** `v20.x` or higher
- **Package Manager:** `npm`, `pnpm`, or `bun` (project includes `pnpm-lock.yaml`)
- **PostgreSQL Database:** A running PostgreSQL instance (local or hosted, e.g., Neon Postgres)

---

## Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/joaoricardofp/incident-flow.git
   cd task-flow
   ```

2. **Install dependencies:**

   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Configure environment variables:**

   Create a `.env` file in the root directory (see [Environment Variables](#environment-variables) below for details):

   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/taskflow_db"
   BETTER_AUTH_SECRET="your-random-32-character-secret"
   BETTER_AUTH_URL="http://localhost:3000"
   GITHUB_CLIENT_ID="your-github-client-id"
   GITHUB_CLIENT_SECRET="your-github-client-secret"
   LIVEBLOCKS_SECRET_KEY="your-liveblocks-secret-key"
   ```

4. **Generate Prisma Client and apply migrations:**

   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Seed the database (Optional):**

   > [!IMPORTANT]
   > The seed script (`prisma/seed.ts`) links seed data to pre-existing user accounts (`admin@example.com`, `alice@example.com`, `bob@example.com`). Register these users via the app sign-up form before running the seed script.

   ```bash
   npx prisma db seed
   ```

---

## Environment Variables

The following environment variables are required to configure the application:

| Variable Name           | Description                                                                | Required | Example / Notes                           |
| :---------------------- | :------------------------------------------------------------------------- | :------: | :---------------------------------------- |
| `DATABASE_URL`          | PostgreSQL connection string used by Prisma ORM and driver adapter.        | **Yes**  | `postgresql://user:pass@host:5432/dbname` |
| `BETTER_AUTH_SECRET`    | Secret key used by Better Auth to sign authentication sessions and tokens. | **Yes**  | Random 32+ char string                    |
| `BETTER_AUTH_URL`       | Base URL of the application for authentication redirects.                  | **Yes**  | `http://localhost:3000`                   |
| `GITHUB_CLIENT_ID`      | OAuth Client ID for GitHub social sign-in.                                 |    No    | Required if GitHub OAuth enabled          |
| `GITHUB_CLIENT_SECRET`  | OAuth Client Secret for GitHub social sign-in.                             |    No    | Required if GitHub OAuth enabled          |
| `LIVEBLOCKS_SECRET_KEY` | Secret key for Liveblocks real-time collaboration API.                     |    No    | Required for Liveblocks features          |

---

## Running in Development and Production

### Development Mode

Start the Next.js development server with hot-reloading:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

1. Build the production bundle:

   ```bash
   npm run build
   ```

2. Start the production server:

   ```bash
   npm run start
   ```

---

## Running Tests

> [!NOTE]
> **Test Suite Status:** Currently, **no automated test suite** (such as Jest, Vitest, or Playwright) is configured or present in the repository. Testing scripts and setup will be introduced as core domain feature modules are completed.

---

## Available Scripts

The following scripts are defined in `package.json`:

| Command          | Action                                                                  |
| :--------------- | :---------------------------------------------------------------------- |
| `npm run dev`    | Starts the Next.js development server on `http://localhost:3000`.       |
| `npm run build`  | Compiles the Next.js application for production.                        |
| `npm run start`  | Launches the built production server.                                   |
| `npm run lint`   | Runs Biome code linter (`biome check`) across the codebase.             |
| `npm run format` | Runs Biome code formatter (`biome format --write`) to auto-format code. |

---

## Endpoints

The project uses Next.js Server Components and Server Actions as its primary mutation mechanism. HTTP Route Handlers are reserved for auth integrations and webhooks:

| Method       | Endpoint             | Description                                                                          |           Auth Required           |
| :----------- | :------------------- | :----------------------------------------------------------------------------------- | :-------------------------------: |
| `GET / POST` | `/api/auth/[...all]` | Catch-all HTTP handler for Better Auth (sign-in, sign-up, session, OAuth callbacks). | Handled internally by Better Auth |

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
                App-->>User: Render Workspace Dashboard
            end
        end
    end
```

### Authorization Rules (`src/lib/membership.ts`)

- **Role Hierarchy:** `ADMIN` (level 2) > `VIEWER` (level 1).
- `hasMinimumRole({ role, minRole })` ensures higher roles satisfy lower minimum role requirements.
- Failures in workspace membership verification result in an `AuthorizationError` which triggers a `notFound()` response, preventing workspace enumeration by unauthorized users.

---

## Conventions Adopted

- **Module Organization:** Features are encapsulated in domain modules under `src/modules/<domain>/` containing `components/`, `queries.ts`, and planned `actions.ts`.
- **Server Actions for Mutations:** Data modifications use Next.js Server Actions rather than standalone REST controllers.
- **Strict Linting & Formatting:** Enforced using [Biome](https://biomejs.dev/) (`npm run lint`, `npm run format`).
- **Two-Layer Route Protection:** Global route protection at the layout level (`(protected)/layout.tsx`) combined with resource/workspace-specific checks (`[workspace]/layout.tsx`).

---

## How to Contribute

Currently, no formal `CONTRIBUTING.md` exists. To contribute:

1. Fork the repository and create a feature branch (`git checkout -b feature/your-feature-name`).
2. Follow existing code conventions and formatting rules (`npm run format` & `npm run lint`).
3. Ensure all TypeScript types compile without errors (`npx tsc --noEmit`).
4. Commit changes using [Conventional Commits](https://www.conventionalcommits.org/) (e.g., `feat(workspace): description`).
5. Open a Pull Request against the `main` branch.

---

## License

No `LICENSE` file is currently included in the repository, and `package.json` designates the project as `"private": true`. All rights are reserved by the project owners unless stated otherwise.

---

## Pending Information

The following items could not be confirmed from the codebase and should be documented once established:

1. **License File:** No `LICENSE` file exists in the repository root, and `package.json` contains `"private": true`.
2. **Environment Example File:** No `.env.example` file is present in the repository root (variables documented in this README were derived from `.env` and source code inspection).
3. **Automated Test Framework:** No testing libraries (Jest, Vitest, Cypress, Playwright) or test scripts are defined in `package.json`.
4. **CI/CD Pipeline:** No `.github/workflows` directory or CI configuration files exist in the repository.
5. **Docker Containerization:** No `Dockerfile` or `docker-compose.yml` file is present in the repository.
6. **Liveblocks Real-Time Editor Integration:** Packages (`@liveblocks/client`, `@liveblocks/react-tiptap`) and `liveblocks.config.ts` are present, but the API route (`/api/liveblocks`) and Tiptap editor integration components are not yet created in `src/`.
