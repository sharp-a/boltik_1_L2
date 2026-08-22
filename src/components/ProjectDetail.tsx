import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Loader2, Trash2, LayoutGrid, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { deleteProject } from '@/lib/projectsApi';
import { fetchMembers } from '@/lib/membersApi';
import Header from '@/components/Header';
import TaskBoard from '@/components/TaskBoard';
import MembersPanel from '@/components/MembersPanel';
import ConfirmDialog from '@/components/ConfirmDialog';
import type { Project, ProjectMember } from '@/types/database';

interface ProjectDetailProps {
  projectId: string;
  onBack: () => void;
}

type Tab = 'tasks' | 'members';

export default function ProjectDetail({ projectId, onBack }: ProjectDetailProps) {
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('tasks');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ data: projectData, error: projectError }, memberData] = await Promise.all([
        supabase.from('projects').select('*').eq('id', projectId).maybeSingle(),
        fetchMembers(projectId),
      ]);
      if (projectError) throw projectError;
      if (!projectData) {
        setError('This project does not exist or you no longer have access to it.');
        setProject(null);
      } else {
        setProject(projectData);
      }
      setMembers(memberData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const isOwner = members.some((m) => m.user_id === user?.id && m.role === 'owner');

  const handleDeleteProject = async () => {
    try {
      await deleteProject(projectId);
      onBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project');
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <div className="flex items-center justify-center py-24 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Projects
          </button>
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>
        </main>
      </div>
    );
  }

  if (!project || !user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Header breadcrumb={project.name} />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 mb-5"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </button>

        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">{project.name}</h1>
            {project.description && <p className="text-sm text-slate-500 mt-1 max-w-2xl">{project.description}</p>}
          </div>
          {isOwner && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors shrink-0"
            >
              <Trash2 className="w-4 h-4" />
              Delete Project
            </button>
          )}
        </div>

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-6">
            {error}
          </div>
        )}

        <div className="flex gap-1 mb-6 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setTab('tasks')}
            className={`flex items-center gap-1.5 text-sm font-medium px-4 py-2.5 border-b-2 transition-colors ${
              tab === 'tasks' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            Tasks
          </button>
          <button
            type="button"
            onClick={() => setTab('members')}
            className={`flex items-center gap-1.5 text-sm font-medium px-4 py-2.5 border-b-2 transition-colors ${
              tab === 'members' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            Members
          </button>
        </div>

        {tab === 'tasks' ? (
          <TaskBoard projectId={projectId} members={members} isOwner={isOwner} />
        ) : (
          <MembersPanel
            projectId={projectId}
            members={members}
            isOwner={isOwner}
            currentUserId={user.id}
            onMembersChanged={load}
          />
        )}
      </main>

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete project"
          message={`Delete "${project.name}"? All tasks and members will be removed. This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={handleDeleteProject}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
