import { useState, FormEvent } from 'react';
import { X, Loader2, UserPlus } from 'lucide-react';
import { findProfileByEmail } from '@/lib/membersApi';
import type { ProjectMember } from '@/types/database';

interface AddMemberModalProps {
  existingMembers: ProjectMember[];
  onAdd: (userId: string) => Promise<void>;
  onClose: () => void;
}

export default function AddMemberModal({ existingMembers, onAdd, onClose }: AddMemberModalProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError('Enter an email address');
      return;
    }
    setSubmitting(true);
    try {
      const profile = await findProfileByEmail(email);
      if (!profile) {
        setError('No user found with that email');
        setSubmitting(false);
        return;
      }
      if (existingMembers.some((m) => m.user_id === profile.id)) {
        setError('This user is already a member');
        setSubmitting(false);
        return;
      }
      await onAdd(profile.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add member');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-start justify-between mb-5">
          <h3 className="text-lg font-semibold text-slate-900">Add Member</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 -mt-1 -mr-1 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="member-email" className="block text-sm font-medium text-slate-700 mb-1.5">
              Email address
            </label>
            <input
              id="member-email"
              type="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@example.com"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
            <p className="text-xs text-slate-400 mt-1.5">The user must already have a TaskFlow account.</p>
          </div>

          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-60 rounded-lg transition-colors"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Add Member
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
