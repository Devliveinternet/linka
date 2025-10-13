import React from 'react';
import { Bell, Search, User, LogOut, Menu } from 'lucide-react';

interface HeaderProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
  alertCount: number;
  onLogout: () => void | Promise<void>;
  onToggleSidebar?: () => void;
}

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  master: 'Usuário Mestre',
  child: 'Usuário Filho',
};

export const Header: React.FC<HeaderProps> = ({ user, alertCount, onLogout, onToggleSidebar }) => {
  const handleLogout = () => {
    Promise.resolve(onLogout()).catch((err) => {
      console.warn('Erro ao encerrar sessão', err);
    });
  };

  return (
    <header className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors lg:hidden"
              aria-label="Abrir menu"
            >
              <Menu size={18} />
            </button>
          )}

          <div className="hidden sm:block flex-1 max-w-lg">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Buscar veículos, motoristas..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell size={18} />
            {alertCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center">
                {alertCount > 9 ? '9+' : alertCount}
              </span>
            )}
            <span className="absolute -bottom-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Conectado ao Traccar"></span>
          </button>

          <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-4 border-l border-gray-200">
            <div className="hidden sm:block text-right">
              <div className="text-sm font-medium text-gray-900 truncate max-w-[180px]">{user.name}</div>
              <div className="text-xs text-gray-500 capitalize">{roleLabels[user.role] || user.role}</div>
            </div>
            <button className="flex items-center gap-2 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Perfil do usuário">
              <User size={18} />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              aria-label="Encerrar sessão"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="sm:hidden mt-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Buscar veículos, motoristas..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
      </div>
    </header>
  );
};
