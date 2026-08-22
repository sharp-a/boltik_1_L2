import { Users, ChevronRight, Crown } from 'lucide-react';
import type { ProjectWithRole } from '@/lib/projectsApi';

interface ProjectCardProps {
  project: ProjectWithRole;
  onOpen: () => void;
}

export default function ProjectCard({ project, onOpen }: ProjectCardProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group text-left bg-white border border-slate-200 rounded-2xl p-5 hover:border-teal-300 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-slate-900 leading-snug truncate">{project.name}</h3>
        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-teal-500 shrink-0 mt-0.5 transition-colors" />
      </div>
      <p className="text-sm text-slate-500 mt-1.5 line-clamp-2 min-h-[2.5rem]">
        {project.description || 'No description'}
      </p>
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Users className="w-3.5 h-3.5" />
          {project.member_count} {project.member_count === 1 ? 'member' : 'members'}
        </div>
        {project.role === 'owner' && (
          <span className="flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
            <Crown className="w-3 h-3" />
            Owner
          </span>
        )}
      </div>
    </button>
  );
}
