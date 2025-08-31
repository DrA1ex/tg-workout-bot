# TG Workout Bot

TG Workout Bot is an interactive Telegram bot for tracking bodybuilding, fitness, or other exercise routines. Designed for a smooth user experience, it leverages Telegram's rich interface features to make logging and viewing workouts intuitive and fast.

## Features

- **Main Menu Keyboard:** Instantly access core actions (Add Workout, Add Exercise, View Progress, etc.) from a persistent Telegram button menu.
- **Step-by-Step Flows:** Each bot action guides you through simple steps—selecting dates, choosing exercises, entering details—using Telegram messages and inline buttons.
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
   - The project uses `sqlite3` for storage, and will automatically create a `db.sqlite` file in the project directory when started. No additional setup is required.

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
- `src/runtime/` – Session handling and flow management
- `src/modules/calendar.js` – Inline calendar picker
- `src/i18n/` – Language support

## License

MIT
