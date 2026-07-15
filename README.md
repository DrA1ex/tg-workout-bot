# TG Workout Bot

TG Workout Bot is a Telegram bot with a companion WebUI for logging workouts, managing exercises, reviewing history,
and tracking progress. Both runtimes use the same SQLite database and the same data-access layer.

<img width="400" alt="Screenshot" src="https://github.com/user-attachments/assets/21538094-16ea-497c-ac2e-7303b95c1b94" />

## Requirements

- Node.js 20 or newer
- npm
- A Telegram bot token from BotFather
- HTTPS in production for Telegram authentication and secure cookies

## Installation

```bash
npm install
```

Create a `.env` file in the project root:

```dotenv
BOT_TOKEN=123456789:telegram_bot_token
WEB_SESSION_SECRET=replace-with-at-least-32-random-bytes
WEB_BOT_USERNAME=your_bot_username

# Optional
SQLITE_FILE=./db.sqlite
WEB_PORT=8080
WEB_COOKIE_SECURE=true
```

Generate a session secret, for example:

```bash
openssl rand -base64 48
```

`WEB_SESSION_SECRET` is intentionally independent from `BOT_TOKEN`. The WebUI refuses to start when the session secret
is missing, too short, or when a numeric/boolean WebUI setting is malformed.

## Running the Telegram bot

```bash
npm start
```

## Running the WebUI

Build the static client first:

```bash
npm run build:web
```

Then start the HTTP server:

```bash
npm run web
```

The default address is `http://localhost:8080`. In production, place the server behind an HTTPS reverse proxy and keep
`WEB_COOKIE_SECURE=true`.

For local UI development only, Telegram authentication can be bypassed explicitly:

```dotenv
WEB_DEV_AUTH=true
WEB_DEV_AUTH_TELEGRAM_ID=123456789
WEB_COOKIE_SECURE=false
```

Do not enable development authentication on a public deployment.

## WebUI environment variables

| Variable | Default | Description |
| --- | ---: | --- |
| `WEB_SESSION_SECRET` | none | Required HMAC secret, at least 32 bytes |
| `WEB_PORT` / `PORT` | `8080` | HTTP listen port |
| `WEB_BOT_USERNAME` | empty | Bot username used by the Telegram login UI |
| `WEB_AUTH_MAX_AGE_SECONDS` | `86400` | Maximum age of Telegram authentication data |
| `WEB_AUTH_FUTURE_SKEW_SECONDS` | `300` | Allowed clock skew for future `auth_date` values |
| `WEB_SESSION_MAX_AGE_SECONDS` | `2592000` | Web session lifetime |
| `WEB_SESSION_COOKIE` | `tg_workout_session` | Session cookie name |
| `WEB_MAX_BODY_BYTES` | `131072` | Maximum JSON request-body size |
| `WEB_REQUEST_TIMEOUT_MS` | `30000` | HTTP request timeout |
| `WEB_COOKIE_SECURE` | production: `true` | Adds the `Secure` cookie flag and HSTS header |
| `WEB_DEV_AUTH` | `false` | Enables local-only authentication bypass |
| `WEB_DEV_AUTH_TELEGRAM_ID` | empty | User ID used by the local authentication bypass |

## Database and migrations

The project uses Sequelize with SQLite. It enables:

- WAL journal mode for file-backed databases
- `busy_timeout=5000`
- foreign-key enforcement
- retry handling for `SQLITE_BUSY` and `SQLITE_LOCKED`
- a single connection per process

The schema is migration-owned; the application no longer calls `sequelize.sync()`. Pending migrations are applied by
`ensureDb()` when either runtime starts, and can also be applied explicitly before deployment:

```bash
npm run migrate
```

Migration files live in `src/db/migrations/` and use incrementing names such as
`0006_session_version.js`. A migration exports:

```js
export async function up(sequelize, transaction) {
    await sequelize.query(
        "CREATE INDEX IF NOT EXISTS example_idx ON workouts (telegramId, date);",
        {transaction},
    );
}
```

Each migration and its version record are committed in the same SQLite `IMMEDIATE` transaction. The migration runner
is idempotent and safe against two application processes attempting to apply the same pending migration.

Back up `db.sqlite` before deploying schema changes. When WAL is active, use SQLite-aware backup tooling or stop both
runtimes before copying the database files.

## Exercise-write consistency

User exercises are currently stored as a JSON array on the user row. All supported mutations now go through a shared
service that:

1. acquires a per-user in-process lock;
2. starts an SQLite `IMMEDIATE` transaction;
3. rereads and validates the latest JSON value;
4. applies the requested `{added, deleted}` delta;
5. writes the merged result.

Malformed exercise JSON is treated as a data-integrity error and is never converted into an empty list. This protects
against silent data loss while retaining compatibility with the existing schema.

## Project structure

```text
src/
  dao/                         Database access
  db/                          Sequelize models and migrations
  domain/                      Domain error types
  flows/                       Telegram bot flows
  runtime/                     Telegram flow runtime
  utils/                       Shared date, timezone, backup, and lock utilities
  web/server/
    auth/                      Telegram and session authentication
    routes/                    HTTP controllers grouped by feature
    services/                  Web application services
www/                           WebUI source files
scripts/build-web.js           WebUI build
__tests__/                     Unit and integration tests
```

The WebUI route layer resolves authentication and dispatches to feature controllers. Controllers parse HTTP input,
services implement application behavior, and DAOs/models own persistence.

## Timezones

User timezones may be IANA identifiers such as `Europe/Berlin` or fixed offsets such as `+05:00`. IANA offsets are
calculated for each relevant date through `Intl`, so daylight-saving changes are respected. Server-generated user date
keys are used by the WebUI instead of the browser's local timezone.

## Testing

Run the unit and integration test suite:

```bash
npm test
```

Build the WebUI:

```bash
npm run build:web
```

Install the Playwright Chromium runtime once, then run the real-application WebUI smoke tests:

```bash
npm run test:web:e2e:install
npm run test:web:e2e
```

The E2E command builds the production client bundle, starts the real HTTP backend on a temporary SQLite database,
enables the existing local development authentication mode for the isolated test user, and drives the interface in
Chromium. It does not start or exercise the Telegram bot. The covered flows include core navigation, IANA timezone
persistence, first-run onboarding, exercise management, workout CRUD, progress rendering, and editing historical
workouts whose exercise is no longer in the catalog.

A locally installed Chromium can be used instead of the Playwright-managed browser:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/path/to/chromium npm run test:web:e2e
```

Failure traces, screenshots, and the HTML report are written to `test-results/` and `playwright-report/`. Video is off
by default to keep the test runtime small; enable retained failure videos with `PLAYWRIGHT_VIDEO=true`. Headed and UI
runners are available through `npm run test:web:e2e:headed` and `npm run test:web:e2e:ui`.

Optional coverage report:

```bash
npm run test:coverage
```

The test configuration ignores macOS archive metadata such as `__MACOSX`. Project archives should not include those
files, `node_modules`, generated `dist`, test databases, Playwright output, or SQLite WAL/SHM files.

## Dependency installation policy

The lock file resolves only through the public npm registry. Required native/postinstall scripts are approved by exact
package version in `package.json#allowScripts`; upgrading one of those packages intentionally requires reviewing and
updating the approval. Sequelize 6 still depends on the deprecated `dottie` npm package, so the fixed MIT-licensed
2.0.7 compatibility implementation is vendored under `vendor/dottie` and covered by compatibility and
prototype-pollution tests. Remove it when migrating to a Sequelize release that no longer needs `dottie`.

## Security notes

The WebUI validates Telegram `auth_date`, uses signed versioned session cookies, limits request bodies, applies request
timeouts, sends a Content Security Policy and other browser security headers, and does not expose internal exception
messages in HTTP 500 responses.

Logging out increments the user's session version, invalidating all WebUI session tokens previously issued for that
user. This is deliberately broader than deleting only the browser cookie.

## License

MIT
