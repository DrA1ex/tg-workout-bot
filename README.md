# TG Workout Bot

TG Workout Bot is an interactive Telegram bot for tracking bodybuilding, fitness, or other exercise routines. Designed
for a smooth user experience, it leverages Telegram's rich interface features to make logging and viewing workouts
intuitive and fast.

## Features

- **Main Menu Keyboard:** Instantly access core actions (Add Workout, Add Exercise, View Progress, etc.) from a
  persistent Telegram button menu.
- **Step-by-Step Flows:** Each bot action guides you through simple steps—selecting dates, choosing exercises, entering
  details—using Telegram messages and inline buttons.
- **Inline Calendar Picker:** Select workout dates using a visual calendar embedded directly in the chat.
- **Customizable Exercises:** Build your own exercise list and select from it when logging workouts.
- **Progress Review:** View summaries and progress for each exercise, with easy selection via buttons.
- **Workout History:** Browse logged workouts interactively.
- **Language Selection:** Instantly switch bot language from the menu, for a localized experience.

## Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/DrA1ex/tg-workout-bot.git
   cd tg-workout-bot
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configuration:**
    - Create a `.env` file in the root directory:
      ```
      BOT_TOKEN=your_telegram_bot_token
      ```

4. **Database:**
    - The project uses `sqlite3` for storage, and will automatically create a `db.sqlite` file in the project directory
      when started. No additional setup is required.

5. **Run the bot:**
   ```bash
   npm start
   ```

## Usage

- Start the bot on Telegram and press **Start**.
- Use the on-screen keyboard to choose actions.
- Follow prompts and interact using buttons and the inline calendar.
- All workflows are tailored for quick, conversational input—no command memorization required.

## Project Structure

- `src/index.js` – Bot entry and main menu handler
- `src/flows/` – User interaction flows for all main features
- `src/runtime/` – Runtime and effect processing layer
    - `runtime/index.js` – Flow runner: advances generator, routes results, manages session life cycle
    - `runtime/flow-handler.js` – Flow utilities: interruption signal, cleanup, error handling, processing of generator
      values
    - `runtime/effect-processor.js` – Processes effects yielded by flows:
        - Supported effect types: `response`, `response_markdown`, `string`, `choice`, `date`, `cancel`
        - Returns `{type: 'wait'}` for effects that expect user input (`string`, `choice`, `date`)
        - Returns `{type: 'cancel'}` for `cancel` (via `processEffect`)
        - Returns `{type: 'continue'}` for other immediate effects and unknown types
    - `runtime/message-handler.js` – Handles incoming text based on session state (`string`, `choice`, `date`)
    - `runtime/callback-handler.js` – Handles inline button callbacks, including calendar events
    - `runtime/calendar-handler.js` – Day/month/cancel processing for the inline calendar
    - `runtime/session-manager.js` – In‑memory session store and helpers (`skipError`, `getSession`, etc.)
- `src/modules/calendar.js` – Inline calendar markup generator
- `src/i18n/` – Language support and translation lookup
- `src/dao/`, `src/db/` – Persistence and migrations

## Runtime Architecture Overview

Flows are implemented as generator functions. The runtime pulls values from a flow and handles three categories:

- Promises: awaited and fed back into the generator
- Functions: executed with `(session.state, ctx)`; result or error is routed
- Effects (plain objects with `type`): processed by `runtime/effect-processor.js`

Effect outcomes drive the runner (`runtime/index.js`):

- `{type: 'wait'}` – runtime pauses and waits for user input
- `{type: 'cancel'}` – runtime cleans up and ends the session
- `{type: 'continue'}` – runtime proceeds to the next generator step

Unknown or malformed effects are treated as `{type: 'continue'}` (the flow keeps going). Flows that need to wait for
user input must yield one of the waiting effects (`string`, `choice`, `date`).

Inline calendar interactions are handled by `runtime/callback-handler.js` + `runtime/calendar-handler.js` and update the
message markup, selected date, or cancel accordingly.

## License

MIT

---

## Development & Testing

### Install & Run

```bash
npm install
npm start
```

### Tests

- Test runner: Jest (see `jest.config.js`)
- Tests live under `__tests__/runtime/` and use light mocks from `__tests__/mocks/`
    - Telegram context/session mocks: `__tests__/mocks/telegram-mocks.js`
    - Console silencing helpers: `__tests__/mocks/console-mocks.js`

Run the full test suite:

```bash
npm test
```

### Database migrations

The project uses a simple, versioned migration system built on top of Sequelize with SQLite. Migrations are plain JS
files in `src/db/migrations/` named with an incremental version prefix:

- `src/db/migrations/0001_timezone_column.js`

Each migration must export an `async function up(sequelize) { ... }` and perform idempotent changes.

Storage:

- Applied migrations are tracked in the `migrations` table with columns: `version`, `name`, `applied_at`.

Run all pending migrations:

```bash
npm run migrate
```

How it works:

- On app startup `ensureDb()` calls `sequelize.sync()` and then applies pending migrations (`runPendingMigrations()`)
- The CLI `npm run migrate` can be used in CI/CD or manually to apply migrations ahead of time
- New migration example:

```bash
# create a new file: src/db/migrations/0002_add_notes_index.js
```

```js
// src/db/migrations/0002_add_notes_index.js
export async function up(sequelize) {
  await sequelize.query("CREATE INDEX IF NOT EXISTS workouts_notes_idx ON workouts(notes);");
}
```
