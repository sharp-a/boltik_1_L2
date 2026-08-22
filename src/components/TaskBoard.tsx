import { useCallback, useEffect, useState } from 'react';
import { Plus, Search, Loader2 } from 'lucide-react';
import { fetchTasks, createTask, updateTask, deleteTask, TaskFilters } from '@/lib/tasksApi';
import type { ProjectMember, Task, TaskPriority, TaskStatus } from '@/types/database';
import TaskCard from '@/components/TaskCard';
import TaskModal from '@/components/TaskModal';
import ConfirmDialog from '@/components/ConfirmDialog';

interface TaskBoardProps {
  projectId: string;
  members: ProjectMember[];
  isOwner: boolean;
}

const STATUS_COLUMNS: TaskStatus[] = ['To Do', 'In Progress', 'Done'];

export default function TaskBoard({ projectId, members, isOwner }: TaskBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'All'>('All');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'All'>('All');

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const filters: TaskFilters = { status: statusFilter, priority: priorityFilter, search };
    try {
      const data = await fetchTasks(projectId, filters);
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [projectId, statusFilter, priorityFilter, search]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditingTask(null);
    setShowModal(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setShowModal(true);
  };

  const handleSave = async (input: Parameters<typeof createTask>[1]) => {
    if (editingTask) {
      await updateTask(editingTask.id, input);
    } else {
      await createTask(projectId, input);
    }
    await load();
  };

  const handleStatusChange = async (task: Task, status: TaskStatus) => {
    try {
      await updateTask(task.id, {
        title: task.title,
        description: task.description,
        status,
        priority: task.priority,
        assignee_id: task.assignee_id,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
    }
  };

  const handleDelete = async () => {
    if (!taskToDelete) return;
    try {
      await deleteTask(taskToDelete.id);
      setTaskToDelete(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task');
      setTaskToDelete(null);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks by title"
            aria-label="Search tasks by title"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'All')}
          aria-label="Filter by status"
          className="text-sm px-3 py-2 rounded-lg border border-slate-300 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="All">All Statuses</option>
          {STATUS_COLUMNS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | 'All')}
          aria-label="Filter by priority"
          className="text-sm px-3 py-2 rounded-lg border border-slate-300 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="All">All Priorities</option>
          {(['Low', 'Medium', 'High'] as TaskPriority[]).map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm px-4 py-2 rounded-lg transition-colors shadow-sm sm:ml-auto"
        >
          <Plus className="w-4 h-4" />
          New Task
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-6">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {STATUS_COLUMNS.map((column) => {
            const columnTasks = tasks.filter((t) => t.status === column);
            return (
              <div key={column} className="bg-slate-50 rounded-2xl p-3">
                <div className="flex items-center justify-between px-1 mb-3">
                  <h3 className="text-sm font-semibold text-slate-700">{column}</h3>
                  <span className="text-xs font-medium text-slate-400 bg-white border border-slate-200 rounded-full px-2 py-0.5">
                    {columnTasks.length}
                  </span>
                </div>
                <div className="space-y-3 min-h-[80px]">
                  {columnTasks.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">No tasks</p>
                  ) : (
                    columnTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        canDelete={isOwner}
                        onEdit={() => openEdit(task)}
                        onDelete={() => setTaskToDelete(task)}
                        onStatusChange={(status) => handleStatusChange(task, status)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <TaskModal
          task={editingTask}
          members={members}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}

      {taskToDelete && (
        <ConfirmDialog
          title="Delete task"
          message={`Delete "${taskToDelete.title}"? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setTaskToDelete(null)}
        />
      )}
    </div>
  );
}
