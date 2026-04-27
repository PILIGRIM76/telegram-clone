'use client';

import { useAuthStore } from '@/store/auth';
import { disconnectSocket } from '@/lib/socket';
import { LogOut, Settings, Users } from 'lucide-react';

export default function Sidebar() {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    disconnectSocket();
  };

  return (
    <div className="w-16 bg-dark flex flex-col items-center py-4 border-r border-gray-800">
      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">
        {user?.displayName?.[0] || 'U'}
      </div>

      <div className="flex-1 flex flex-col items-center gap-4 mt-4">
        <button className="p-2 hover:bg-gray-800 rounded-lg">
          <Users className="w-6 h-6 text-gray-400" />
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <button className="p-2 hover:bg-gray-800 rounded-lg">
          <Settings className="w-6 h-6 text-gray-400" />
        </button>
        <button onClick={handleLogout} className="p-2 hover:bg-gray-800 rounded-lg">
          <LogOut className="w-6 h-6 text-gray-400" />
        </button>
      </div>
    </div>
  );
}