import React from 'react';
import { 
  LayoutDashboard, 
  Truck, 
  Users, 
  MapPin, 
  AlertTriangle, 
  Route, 
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeView, 
  onViewChange, 
  isCollapsed, 
  onToggleCollapse 
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'map', label: 'Mapa da Frota', icon: MapPin },
    { id: 'vehicles', label: 'Veículos', icon: Truck },
    { id: 'drivers', label: 'Motoristas', icon: Users },
    { id: 'geofences', label: 'Cercas Virtuais', icon: MapPin },
    { id: 'alerts', label: 'Alertas', icon: AlertTriangle },
    { id: 'trips', label: 'Viagens', icon: Route },
    { id: 'admin', label: 'Administração', icon: Shield },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  return (
    <aside className={`bg-slate-900 text-white transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    } lg:min-h-screen flex flex-col lg:relative fixed lg:translate-x-0 ${
      isCollapsed ? '-translate-x-full lg:translate-x-0' : 'translate-x-0'
    } z-50 lg:z-auto`}>
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <h1 className="text-lg sm:text-xl font-bold text-white">LINKA</h1>
          )}
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded-md hover:bg-slate-800 transition-colors lg:block"
          >
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-1 sm:space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => onViewChange(item.id)}
                  className={`w-full flex items-center gap-3 p-2 sm:p-3 rounded-lg transition-all duration-200 ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-lg' 
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon size={18} className="sm:w-5 sm:h-5" />
                  {!isCollapsed && (
                    <span className="font-medium text-sm sm:text-base">{item.label}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};