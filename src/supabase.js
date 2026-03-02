import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase env vars. Create a .env file in the project root (same folder as package.json) with:\n' +
      '  VITE_SUPABASE_URL=your-project-url\n' +
      '  VITE_SUPABASE_ANON_KEY=your-anon-key\n' +
      'Then restart the dev server (pnpm dev or npm run dev).'
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey)