import { supabase } from '@/lib/supabase';
import type { Task, TaskPriority, TaskStatus } from '@/types/database';

export interface TaskFilters {
  status?: TaskStatus | 'All';
  priority?: TaskPriority | 'All';
  search?: string;
}

export async function fetchTasks(projectId: string, filters: TaskFilters = {}): Promise<Task[]> {
  let query = supabase.from('tasks').select('*').eq('project_id', projectId);

  if (filters.status && filters.status !== 'All') {
    query = query.eq('status', filters.status);
  }
  if (filters.priority && filters.priority !== 'All') {
    query = query.eq('priority', filters.priority);
  }
  if (filters.search && filters.search.trim().length > 0) {
    query = query.ilike('title', `%${filters.search.trim()}%`);
  }

  const { data: tasks, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  if (!tasks || tasks.length === 0) return [];

  const assigneeIds = [...new Set(tasks.map((t) => t.assignee_id).filter((id): id is string => !!id))];
  if (assigneeIds.length === 0) return tasks.map((t) => ({ ...t, assignee: null }));

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .in('id', assigneeIds);

  if (profilesError) throw profilesError;
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  return tasks.map((t) => ({ ...t, assignee: t.assignee_id ? profileById.get(t.assignee_id) ?? null : null }));
}

export interface TaskInput {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id: string | null;
}

export async function createTask(projectId: string, input: TaskInput): Promise<void> {
  const title = input.title.trim();
  if (!title) throw new Error('Title is required');

  const { error } = await supabase.from('tasks').insert({
    project_id: projectId,
    title,
    description: input.description.trim(),
    status: input.status,
    priority: input.priority,
    assignee_id: input.assignee_id,
  });

  if (error) throw error;
}

export async function updateTask(taskId: string, input: TaskInput): Promise<void> {
  const title = input.title.trim();
  if (!title) throw new Error('Title is required');

  const { error } = await supabase
    .from('tasks')
    .update({
      title,
      description: input.description.trim(),
      status: input.status,
      priority: input.priority,
      assignee_id: input.assignee_id,
    })
    .eq('id', taskId);

  if (error) throw error;
}

export async function deleteTask(taskId: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  if (error) throw error;
}
