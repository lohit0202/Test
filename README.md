# Autonomous Chess Match (OpenAI vs Gemini)

A Next.js 14 App Router project that runs a fully autonomous chess match between OpenAI (White) and Google Gemini (Black). Each `/api/step` call enforces a **minimum 10-second server-side duration** and produces exactly one ply with no human input.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables and add your API keys:

```bash
cp .env.example .env.local
```

3. Start the dev server:

```bash
npm run dev
```

Open `http://localhost:3000` to use the UI.

## Environment Variables

- `OPENAI_API_KEY` - required for OpenAI (White).
- `GEMINI_API_KEY` - required for Gemini (Black).
- `OPENAI_MODEL` - optional, defaults to `gpt-4o-mini`.
- `GEMINI_MODEL` - optional, defaults to `gemini-1.5-flash`.

## API Endpoints

- `POST /api/new` - reset to the initial position.
- `GET /api/state` - fetch current game state.
- `POST /api/step` - make exactly one ply (server enforces >= 10 seconds).

All endpoints return JSON containing the full game state.

## Using the UI

- **New Game**: resets to the starting position.
- **Step**: advances one ply (OpenAI or Gemini based on side to move).
- **Auto-Run**: repeatedly calls `/api/step` on an interval. Buttons are disabled while a step is running.
- **Board View**: the UI renders a simple chessboard from the current FEN.

## Security Warning

**Never commit your API keys.** Keep `.env.local` private and out of version control.
