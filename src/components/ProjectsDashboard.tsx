import { useEffect, useState, useCallback } from 'react';
import { Plus, FolderKanban, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchMyProjects, createProject, ProjectWithRole } from '@/lib/projectsApi';
import Header from '@/components/Header';
import ProjectCard from '@/components/ProjectCard';
import NewProjectModal from '@/components/NewProjectModal';
import type { Project } from '@/types/database';

interface ProjectsDashboardProps {
  onOpenProject: (project: Project) => void;
}

export default function ProjectsDashboard({ onOpenProject }: ProjectsDashboardProps) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMyProjects(user.id);
      setProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (name: string, description: string) => {
    await createProject(name, description);
    await load();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Your Projects</h1>
            <p className="text-sm text-slate-500 mt-1">Projects you own or belong to</p>
          </div>
          <button
            type="button"
            onClick={() => setShowNewProject(true)}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm px-4 py-2.5 rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </div>

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-24 border border-dashed border-slate-200 rounded-2xl bg-white">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
              <FolderKanban className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="font-medium text-slate-900">No projects yet</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm">
              Create your first project to start organizing tasks with your team.
            </p>
            <button
              type="button"
              onClick={() => setShowNewProject(true)}
              className="mt-5 flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm px-4 py-2.5 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} onOpen={() => onOpenProject(project)} />
            ))}
          </div>
        )}
      </main>

      {showNewProject && (
        <NewProjectModal onCreate={handleCreate} onClose={() => setShowNewProject(false)} />
      )}
    </div>
  );
}
