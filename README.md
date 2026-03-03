# Todo List App

A simple, responsive todo list with dark/light themes, categories, and optional Supabase-backed auth and persistence.

## Features

- **Tasks**: Add, complete, and delete todos with optional undo; drag the handle to reorder (order is saved per user)
- **Categories**: General, Work, Personal, Errands (filter by category)
- **Status filter**: View all, Active, or Completed
- **Auth**: Try the app without signing in (anonymous session); sign in or create an account to sync tasks. Local-only todos are migrated to your account when you sign in.
- **Offline / no account**: Todos added while anonymous or without Supabase stay in the list locally until you sign in (then they’re migrated) or sign out (anonymous session is restored).
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

   **Drag-and-drop order**: The app stores a `position` column on the `todos` table. Run the migration `supabase/migrations/20260303130000_add_todos_position.sql` (e.g. via `supabase db push` or the SQL editor) so reorder is persisted.

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
- `src/main.js` — init, auth listener, and wiring
- `src/todos.js` — todo CRUD, list render, session and migration logic
- `src/auth.js` — auth UI (modal, tooltip, sign in/up)
- `src/state.js` — mutable app state (todos, user, filters, etc.)
- `src/dom.js` — DOM element references
- `src/supabase.js` — Supabase client (reads `VITE_SUPABASE_*` from env)
- `src/style.css` — styles and theme
- `src/theme.js` — dark/light theme and favicon
- `src/constants.js`, `src/ui.js`, `src/dropdown.js`, `src/confetti.js` — shared UI and helpers

## License

Private / unlicensed.
