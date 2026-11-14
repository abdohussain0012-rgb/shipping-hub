// Connection values for Supabase. Locally they come from .env.local,
// on Vercel from Project -> Settings -> Environment Variables.
//
// Next.js only puts NEXT_PUBLIC_ values into the code when they are read
// by their full name, so keep these property accesses exactly as written.
export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !key) {
    throw new Error(
      'Supabase settings are missing. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local, then restart npm run dev.',
    );
  }

  return { url, key };
}
