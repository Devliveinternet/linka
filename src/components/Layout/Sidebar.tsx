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
  ChevronRight,
  X,
} from 'lucide-react';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  allowedViews: string[];
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onViewChange,
  isCollapsed,
  onToggleCollapse,
  allowedViews,
  isMobileOpen = false,
  onMobileClose,
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

  const visibleItems = menuItems.filter((item) => allowedViews.includes(item.id));
  const itemsToRender = visibleItems.length ? visibleItems : menuItems;

  const handleSelectView = (view: string) => {
    onViewChange(view);
    if (onMobileClose) {
      onMobileClose();
    }
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          isMobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onMobileClose}
        aria-hidden="true"
      />
      <aside
        className={`bg-slate-900 text-white transition-all duration-300 ${
          isCollapsed ? 'w-16' : 'w-64'
        } lg:min-h-screen flex flex-col fixed inset-y-0 left-0 z-50 transform ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:static lg:translate-x-0`}
      >
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center justify-between gap-2">
            {!isCollapsed && (
              <h1 className="text-lg sm:text-xl font-bold text-white">LINKA</h1>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={onToggleCollapse}
                className="p-1 rounded-md hover:bg-slate-800 transition-colors"
                aria-label={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
              >
                {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
              </button>
              {onMobileClose && (
                <button
                  type="button"
                  onClick={onMobileClose}
                  className="lg:hidden p-1.5 rounded-md hover:bg-slate-800 transition-colors"
                >
                  <span className="sr-only">Fechar menu lateral</span>
                  <X size={18} />
                </button>
              )}
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-1 sm:space-y-2">
            {itemsToRender.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;

              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleSelectView(item.id)}
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
    </>
  );
};
