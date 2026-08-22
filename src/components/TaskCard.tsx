import { Pencil, Trash2, User } from 'lucide-react';
import type { Task, TaskStatus } from '@/types/database';

interface TaskCardProps {
  task: Task;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: TaskStatus) => void;
}

const PRIORITY_STYLES: Record<Task['priority'], string> = {
  Low: 'bg-slate-100 text-slate-600',
  Medium: 'bg-blue-50 text-blue-700',
  High: 'bg-red-50 text-red-700',
};

const STATUS_OPTIONS: TaskStatus[] = ['To Do', 'In Progress', 'Done'];

export default function TaskCard({ task, canDelete, onEdit, onDelete, onStatusChange }: TaskCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-sm transition-shadow group">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-medium text-slate-900 text-sm leading-snug">{task.title}</h4>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            type="button"
            onClick={onEdit}
            aria-label="Edit task"
            className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-md transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          {canDelete && (
            <button
              type="button"
              onClick={onDelete}
              aria-label="Delete task"
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {task.description && <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{task.description}</p>}

      <div className="flex items-center justify-between mt-3.5">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITY_STYLES[task.priority]}`}>
          {task.priority}
        </span>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <User className="w-3.5 h-3.5" />
          {task.assignee?.display_name ?? 'Unassigned'}
        </div>
      </div>

      <select
        value={task.status}
        onChange={(e) => onStatusChange(e.target.value as TaskStatus)}
        aria-label="Change task status"
        className="w-full mt-3 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
      >
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}
