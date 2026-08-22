import { ClipboardList, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface HeaderProps {
  breadcrumb?: string;
}

export default function Header({ breadcrumb }: HeaderProps) {
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center shrink-0">
            <ClipboardList className="w-5 h-5 text-white" strokeWidth={2.25} />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-slate-900 tracking-tight">TaskFlow</span>
            {breadcrumb && (
              <>
                <span className="text-slate-300">/</span>
                <span className="text-slate-600 truncate">{breadcrumb}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden sm:block text-sm text-slate-500 truncate max-w-[180px]">{user?.email}</span>
          <button
            type="button"
            onClick={signOut}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
