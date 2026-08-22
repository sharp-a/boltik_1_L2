import { supabase } from '@/lib/supabase';
import type { ProjectMember, Profile } from '@/types/database';

export async function fetchMembers(projectId: string): Promise<ProjectMember[]> {
  const { data: members, error } = await supabase
    .from('project_members')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  if (!members || members.length === 0) return [];

  const userIds = members.map((m) => m.user_id);
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .in('id', userIds);

  if (profilesError) throw profilesError;

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  return members.map((m) => ({ ...m, profile: profileById.get(m.user_id) }));
}

export async function findProfileByEmail(email: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('email', email.trim())
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function addMember(projectId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('project_members')
    .insert({ project_id: projectId, user_id: userId, role: 'member' });

  if (error) throw error;
}

export async function removeMember(memberId: string): Promise<void> {
  const { error } = await supabase.from('project_members').delete().eq('id', memberId);
  if (error) throw error;
}
