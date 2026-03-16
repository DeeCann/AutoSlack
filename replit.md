# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Messaging**: Slack Web API + Socket Mode (real-time events)
- **Real-time**: Socket.IO (server → client event forwarding)

## Structure

```text
artifacts-monorepo/
├── android/                # Native Android Automotive OS app (Kotlin + Jetpack Compose)
│   ├── app/                # Main app module
│   │   ├── src/main/java/com/autoslack/  # Kotlin source
│   │   │   ├── di/         # Hilt DI modules
│   │   │   ├── data/       # API services, models, repositories
│   │   │   ├── ui/         # Compose screens (login, dashboard, sidebar, chat)
│   │   │   └── util/       # TokenStorage, QrCodeEncoder
│   │   └── src/main/res/   # Android resources
│   ├── build.gradle.kts    # Root Gradle build
│   └── settings.gradle.kts # Gradle settings
├── artifacts/              # Web deployable applications
│   ├── api-server/         # Express API server (OAuth callback + Slack service)
│   └── messenger-automotive/  # React Slack client (web fallback)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server with Slack integration and Socket.IO for real-time messaging.

- Entry: `src/index.ts` — reads `PORT`, starts Express + Socket.IO, restores Slack session
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Slack service: `src/slack/service.ts` — SlackService class (OAuth token, conversations, messages, Socket Mode real-time)
- Auth routes: `src/routes/auth.ts` — QR code generation (→ Slack OAuth URL), OAuth callback, session polling, logout
- Slack routes: `src/routes/slack.ts` — GET conversations, GET/POST messages
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health`
- Depends on: `@workspace/db`, `@workspace/api-zod`, `@slack/web-api`, `@slack/socket-mode`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)

**Required environment variables:**
- `SLACK_CLIENT_ID` — Slack app client ID (from api.slack.com)
- `SLACK_CLIENT_SECRET` — Slack app client secret
- `SLACK_APP_TOKEN` — (optional) App-level token with `connections:write` scope for Socket Mode real-time events

**Auth flow:**
1. Car screen calls `GET /api/auth/qr-code` → receives Slack OAuth URL
2. QR code shown on car screen, user scans with phone
3. Phone opens Slack OAuth, user authorizes
4. Slack redirects to `GET /api/auth/slack/callback` with code
5. Server exchanges code for access token, saves session
6. Car polls `GET /api/auth/qr-status/:token` → gets `success` → redirects to dashboard

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.

### `android/` (Native AAOS App)

Native Android Automotive OS application built with Kotlin + Jetpack Compose.

**Stack:** Kotlin 1.9.22, Jetpack Compose BOM 2024.02, Hilt 2.50, Retrofit 2.9, OkHttp 4.12, Coil 2.5, ZXing 3.5

**Architecture:** MVVM + Repository pattern, StateFlow for reactive UI, single Activity with Compose Navigation.

**How to run:**
1. Open `android/` folder in Android Studio
2. Sync Gradle
3. Run on AAOS emulator (API 29+, landscape)

**OAuth flow:** The app uses the deployed Replit API server (`artifacts/api-server`) ONLY for the Slack OAuth code-to-token exchange (requires `client_secret`). After login, ALL Slack API calls go directly from Android to `https://slack.com/api/`. The OAuth base URL is hardcoded in `BuildConfig.OAUTH_BASE_URL`.

**Key packages:**
- `com.autoslack.di` — Hilt DI modules (NetworkModule, RepositoryModule)
- `com.autoslack.data.api` — Retrofit interfaces (SlackApiService, AuthApiService)
- `com.autoslack.data.model` — Data classes for Slack API responses
- `com.autoslack.data.repository` — AuthRepository, SlackRepository
- `com.autoslack.ui.login` — QR code login screen
- `com.autoslack.ui.dashboard` — Main dashboard (sidebar + chat)
- `com.autoslack.ui.sidebar` — Channel/DM list with search
- `com.autoslack.ui.chat` — Message list with send input
- `com.autoslack.util` — TokenStorage (EncryptedSharedPreferences), QrCodeEncoder (ZXing)
