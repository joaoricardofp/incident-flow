# Contributing to TaskFlow

First off, thank you for considering contributing to **TaskFlow**! It's contributions like yours that make TaskFlow a powerful incident management and postmortem platform for engineering teams.

This document outlines a set of guidelines and best practices to help you get started with contributing.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Local Setup](#local-setup)
- [Development Workflow](#development-workflow)
  - [Branching Strategy](#branching-strategy)
  - [Project Structure & Architecture](#project-structure--architecture)
- [Coding Standards & Conventions](#coding-standards--conventions)
  - [Linting and Formatting (Biome)](#linting-and-formatting-biome)
  - [Type Checking](#type-checking)
  - [Domain-Driven Module Pattern](#domain-driven-module-pattern)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [License](#license)

---

## Code of Conduct

We are committed to providing a welcoming, inclusive, and harassment-free environment for everyone. Please maintain respectful, constructive, and professional communication in all issues, pull requests, and discussions.

---

## Getting Started

### Prerequisites

Ensure you have the following installed on your machine:

- **Node.js**: `v20.x` or higher
- **Package Manager**: [`pnpm`](https://pnpm.io/) (v9+ recommended)
- **Database**: PostgreSQL (v14+ recommended)

### Local Setup

1. **Fork and Clone the Repository**

   ```bash
   git clone https://github.com/your-username/task-flow.git
   cd task-flow
   ```

2. **Install Dependencies**

   ```bash
   pnpm install
   ```

3. **Configure Environment Variables**

   Copy or create a `.env` file in the project root:

   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/taskflow_db"
   BETTER_AUTH_SECRET="your-32-character-secret-key-here"
   BETTER_AUTH_URL="http://localhost:3000"
   # Optional: GitHub OAuth & Liveblocks keys
   GITHUB_CLIENT_ID=""
   GITHUB_CLIENT_SECRET=""
   LIVEBLOCKS_SECRET_KEY=""
   ```

4. **Set Up Database Schema & Seed Data**

   Apply database migrations and seed mock data:

   ```bash
   pnpm dlx prisma db push
   pnpm dlx prisma db seed
   ```

5. **Start Development Server**

   ```bash
   pnpm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Development Workflow

### Branching Strategy

- `main`: Production-ready branch.
- Create topic branches from `main` using descriptive names prefixed by feature type:
  - `feat/incident-timeline-ui`
  - `fix/membership-role-check`
  - `docs/contributing-guide`
  - `refactor/auth-helpers`

### Project Structure & Architecture

TaskFlow uses Next.js 16 (App Router) with a **domain-driven module architecture**:

```text
src/
├── app/                  # Next.js App Router pages, layouts, and API routes
│   ├── (auth)/          # Authentication routes (sign-in, sign-up)
│   ├── (protected)/     # Protected route group with session checks
│   └── api/             # API handlers (Better Auth, Liveblocks, etc.)
├── components/          # Reusable UI primitives (Base UI, Tailwind v4, Sonner)
├── lib/                 # Core shared utilities (prisma, auth, membership)
└── modules/             # Domain feature modules
    └── <domain>/        # e.g., workspace, incident, timeline, postmortem
        ├── components/  # Domain-specific UI components
        ├── queries.ts   # Database read queries (Prisma)
        └── actions.ts   # Next.js Server Actions for mutations
```

---

## Coding Standards & Conventions

### Linting and Formatting (Biome)

We use [Biome](https://biomejs.dev/) to enforce code formatting and quality standards across TypeScript, React, and JSON files.

- **Check for lint errors:**
  ```bash
  pnpm run lint
  ```
- **Auto-format code:**
  ```bash
  pnpm run format
  ```

*Make sure your changes pass `pnpm run lint` before creating a Pull Request.*

### Type Checking

Always verify strict TypeScript type safety without generating output files:

```bash
pnpm dlx tsc --noEmit
```

### Domain-Driven Module Pattern

- Keep business logic and Prisma queries inside domain modules (`src/modules/<domain>/`).
- Implement data mutations using **Next.js Server Actions** with session and workspace authorization checks (`requireMembership` in `src/lib/membership.ts`).
- Avoid direct database calls inside page/component files; use module queries/actions instead.

---

## Commit Message Guidelines

We enforce [Conventional Commits](https://www.conventionalcommits.org/) to ensure clear commit history and automated changelog generation.

### Format

```text
<type>(<scope>): <short summary>
```

### Supported Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Code style changes (formatting, white-space, missing semi-colons, etc.)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `test`: Adding missing tests or correcting existing tests
- `chore`: Maintenance tasks, dependencies update, configuration changes

### Examples

- `feat(incident): implement status progression Server Action`
- `fix(auth): handle expired session redirection in protected layout`
- `docs(license): add Apache 2.0 license file`
- `chore(deps): update prisma ORM to 7.9.0`

---

## Submitting a Pull Request

1. **Verify Code Quality:**
   - Run `pnpm run lint`
   - Run `pnpm run format`
   - Run `pnpm dlx tsc --noEmit`
2. **Push Branch:** Push your feature branch to your fork.
3. **Open PR:** Open a Pull Request targeting the `main` branch of the upstream repository.
4. **Describe Changes:** Provide a concise summary of what was changed and reference any related issues.
5. **Code Review:** Respond to feedback from maintainers and update your PR if necessary.

---

## License

By contributing to TaskFlow, you agree that your contributions will be licensed under the [Apache License 2.0](LICENSE).
