import { supabase } from '@/lib/supabase';
import type { Project, ProjectMember } from '@/types/database';

export interface ProjectWithRole extends Project {
  role: ProjectMember['role'];
  member_count: number;
}

export async function fetchMyProjects(userId: string): Promise<ProjectWithRole[]> {
  const { data: memberships, error: membershipError } = await supabase
    .from('project_members')
    .select('project_id, role')
    .eq('user_id', userId);

  if (membershipError) throw membershipError;
  if (!memberships || memberships.length === 0) return [];

  const projectIds = memberships.map((m) => m.project_id);

  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('*')
    .in('id', projectIds)
    .order('created_at', { ascending: false });

  if (projectsError) throw projectsError;

  const { data: allMembers, error: countError } = await supabase
    .from('project_members')
    .select('project_id')
    .in('project_id', projectIds);

  if (countError) throw countError;

  const roleByProject = new Map(memberships.map((m) => [m.project_id, m.role]));
  const countByProject = new Map<string, number>();
  for (const m of allMembers ?? []) {
    countByProject.set(m.project_id, (countByProject.get(m.project_id) ?? 0) + 1);
  }

  return (projects ?? []).map((p) => ({
    ...p,
    role: roleByProject.get(p.id) ?? 'member',
    member_count: countByProject.get(p.id) ?? 1,
  }));
}

export async function createProject(name: string, description: string): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .insert({ name: name.trim(), description: description.trim() })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteProject(projectId: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', projectId);
  if (error) throw error;
}
