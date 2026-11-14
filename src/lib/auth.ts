import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type Role = 'admin' | 'manager' | 'agent';

export type CurrentProfile = {
  id: string;
  full_name: string;
  role: Role;
};

// Returns the signed-in user's profile, or redirects to /login.
export async function getCurrentProfile() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', user.id)
    .single();

  // A signed-in user without a profile would bounce between /login and the app, so send them to a dead end.
  if (!data) redirect('/no-access');

  return { supabase, profile: data as CurrentProfile };
}

// Admins and managers can import data and see reports; agents work the shipments.
export function canImport(role: Role) {
  return role === 'admin' || role === 'manager';
}

export function isAdmin(role: Role) {
  return role === 'admin';
}
