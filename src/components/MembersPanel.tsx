import { useState } from 'react';
import { Crown, UserPlus, UserMinus } from 'lucide-react';
import { addMember, removeMember } from '@/lib/membersApi';
import type { ProjectMember } from '@/types/database';
import AddMemberModal from '@/components/AddMemberModal';
import ConfirmDialog from '@/components/ConfirmDialog';

interface MembersPanelProps {
  projectId: string;
  members: ProjectMember[];
  isOwner: boolean;
  currentUserId: string;
  onMembersChanged: () => Promise<void>;
}

export default function MembersPanel({
  projectId,
  members,
  isOwner,
  currentUserId,
  onMembersChanged,
}: MembersPanelProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<ProjectMember | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async (userId: string) => {
    await addMember(projectId, userId);
    await onMembersChanged();
  };

  const handleRemove = async () => {
    if (!memberToRemove) return;
    try {
      await removeMember(memberToRemove.id);
      setMemberToRemove(null);
      await onMembersChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
      setMemberToRemove(null);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900">Members ({members.length})</h3>
        {isOwner && (
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:bg-teal-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Add Member
          </button>
        )}
      </div>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5 mb-3">
          {error}
        </div>
      )}

      <ul className="space-y-2">
        {members.map((member) => (
          <li
            key={member.id}
            className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-semibold shrink-0">
                {(member.profile?.display_name ?? member.profile?.email ?? '?').slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {member.profile?.display_name ?? 'Unknown user'}
                  {member.user_id === currentUserId && <span className="text-slate-400 font-normal"> (you)</span>}
                </p>
                <p className="text-xs text-slate-500 truncate">{member.profile?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {member.role === 'owner' ? (
                <span className="flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                  <Crown className="w-3 h-3" />
                  Owner
                </span>
              ) : (
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  Member
                </span>
              )}
              {isOwner && member.role !== 'owner' && (
                <button
                  type="button"
                  onClick={() => setMemberToRemove(member)}
                  aria-label="Remove member"
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                >
                  <UserMinus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {showAddModal && (
        <AddMemberModal existingMembers={members} onAdd={handleAdd} onClose={() => setShowAddModal(false)} />
      )}

      {memberToRemove && (
        <ConfirmDialog
          title="Remove member"
          message={`Remove ${memberToRemove.profile?.display_name ?? 'this member'} from the project?`}
          confirmLabel="Remove"
          onConfirm={handleRemove}
          onCancel={() => setMemberToRemove(null)}
        />
      )}
    </div>
  );
}
