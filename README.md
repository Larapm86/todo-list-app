# Todo List App

A simple, responsive todo list with dark/light themes, categories, and optional Supabase-backed auth and persistence.

## Features

- **Tasks**: Add, complete, and delete todos with optional undo
- **Categories**: General, Work, Personal, Errands (filter by category)
- **Status filter**: View all, Active, or Checked
- **Auth**: Sign in / Get started (Supabase Auth) — sign in to sync tasks to your account
- **Theme**: Dark and light mode toggle (persisted in `localStorage`)
- **Animations**: Smooth add/remove transitions; list grows from top center

## Tech stack

- [Vite](https://vite.dev/) — build and dev server
- [Supabase](https://supabase.com/) — auth and database (optional; app runs without it)

## Prerequisites

- Node.js (v18+)
- A Supabase project (optional, for auth and cloud storage)

## Setup

1. **Clone and install**

   ```bash
   cd todo-list-app
   npm install
   ```

2. **Environment (optional)**

   To use Supabase (auth and saving todos to the cloud):

   - Copy `.env.example` to `.env`
   - In the [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Project Settings** → **API**, copy:
     - **Project URL** → `VITE_SUPABASE_URL`
     - **anon public** key → `VITE_SUPABASE_ANON_KEY`

   Without a valid `.env`, the app still runs; you just won’t have sign-in or cloud sync.

3. **Run**

   ```bash
   npm run dev
   ```

   Open the URL shown in the terminal (e.g. `http://localhost:5173`).

## Scripts

| Command        | Description              |
|----------------|--------------------------|
| `npm run dev`  | Start dev server         |
| `npm run build`| Production build         |
| `npm run preview` | Preview production build |

## Project structure

- `index.html` — entry HTML and app shell
- `src/main.js` — app logic, UI, and Supabase calls
- `src/style.css` — styles and theme
- `src/supabase.js` — Supabase client (reads `VITE_SUPABASE_*` from env)

## License

Private / unlicensed.
